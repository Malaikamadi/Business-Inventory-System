import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { businessDateString } from "@/lib/dates";
import { applyMovement, type TxClient } from "./inventory.service";
import {
  InsufficientStockError,
  NotFoundError,
  ValidationError,
} from "./errors";

export interface SaleLineInput {
  productId: string;
  quantity: number;
}

export interface RecordSaleInput {
  shopId: string;
  salespersonId: string;
  items: SaleLineInput[];
  notes?: string;
}

export interface RecordSaleResult {
  saleId: string;
  saleNumber: string;
  totalAmount: string;
  itemsCount: number;
}

/**
 * Reserves the next sale number for the current business day.
 *
 * The upsert-and-return is atomic, so two concurrent sales always receive
 * distinct numbers without an application-level lock.
 */
async function nextSaleNumber(tx: TxClient): Promise<string> {
  const businessDate = businessDateString();

  const [{ last_number: sequence }] = await tx.$queryRaw<
    { last_number: number }[]
  >`
    INSERT INTO sale_counters (business_date, last_number)
    VALUES (${businessDate}::date, 1)
    ON CONFLICT (business_date)
    DO UPDATE SET last_number = sale_counters.last_number + 1
    RETURNING last_number
  `;

  return `SL-${businessDate.replace(/-/g, "")}-${String(sequence).padStart(4, "0")}`;
}

/**
 * Records a completed sale.
 *
 * The whole sale is one transaction: prices are snapshotted onto the line
 * items, stock is decremented through the ledger, and any line that cannot be
 * satisfied aborts the entire sale. Authorization is the caller's job.
 */
export async function recordSale(
  input: RecordSaleInput
): Promise<RecordSaleResult> {
  if (input.items.length === 0) {
    throw new ValidationError("A sale must contain at least one item.");
  }

  // Collapse duplicate scans of the same product so stock is checked once
  // against the true total rather than line by line.
  const quantities = new Map<string, number>();
  for (const item of input.items) {
    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      throw new ValidationError("Quantities must be whole numbers of 1 or more.");
    }
    quantities.set(
      item.productId,
      (quantities.get(item.productId) ?? 0) + item.quantity
    );
  }

  // Deterministic ordering prevents deadlocks between concurrent sales that
  // contain the same products in a different sequence.
  const productIds = [...quantities.keys()].sort();

  return prisma.$transaction(async (tx) => {
    const products = await tx.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        name: true,
        status: true,
        costPrice: true,
        sellingPrice: true,
      },
    });

    if (products.length !== productIds.length) {
      throw new NotFoundError("Product");
    }

    const byId = new Map(products.map((p) => [p.id, p]));

    let totalAmount = new Prisma.Decimal(0);
    let totalCost = new Prisma.Decimal(0);
    const lines: Prisma.SaleItemCreateManySaleInput[] = [];

    for (const productId of productIds) {
      const product = byId.get(productId)!;
      const quantity = quantities.get(productId)!;

      if (product.status !== "ACTIVE") {
        throw new ValidationError(
          `${product.name} is discontinued and cannot be sold.`
        );
      }

      const lineTotal = product.sellingPrice.mul(quantity);
      totalAmount = totalAmount.add(lineTotal);
      totalCost = totalCost.add(product.costPrice.mul(quantity));

      lines.push({
        productId,
        productName: product.name,
        quantity,
        unitPrice: product.sellingPrice,
        unitCost: product.costPrice,
        lineTotal,
      });
    }

    const saleNumber = await nextSaleNumber(tx);

    const sale = await tx.sale.create({
      data: {
        saleNumber,
        shopId: input.shopId,
        salespersonId: input.salespersonId,
        totalAmount,
        totalCost,
        itemsCount: lines.length,
        notes: input.notes?.trim() || null,
        items: { createMany: { data: lines } },
      },
      select: { id: true, saleNumber: true },
    });

    for (const productId of productIds) {
      await applyMovement(tx, {
        shopId: input.shopId,
        productId,
        movementType: "SALE",
        quantityChange: -quantities.get(productId)!,
        referenceType: "sale",
        referenceId: sale.id,
        performedBy: input.salespersonId,
      });
    }

    return {
      saleId: sale.id,
      saleNumber: sale.saleNumber,
      totalAmount: totalAmount.toFixed(2),
      itemsCount: lines.length,
    };
  });
}

/**
 * Voids a sale by writing compensating movements. The original sale and its
 * line items are preserved; only the status changes. Sales are never deleted.
 */
export async function voidSale(input: {
  saleId: string;
  reason: string;
  performedBy: string;
}): Promise<{ saleNumber: string }> {
  if (!input.reason.trim()) {
    throw new ValidationError("A reason is required to void a sale.");
  }

  return prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findUnique({
      where: { id: input.saleId },
      select: {
        id: true,
        saleNumber: true,
        shopId: true,
        status: true,
        items: { select: { productId: true, quantity: true } },
      },
    });

    if (!sale) throw new NotFoundError("Sale");
    if (sale.status === "VOIDED") {
      throw new ValidationError("This sale has already been voided.");
    }

    await tx.sale.update({
      where: { id: sale.id },
      data: {
        status: "VOIDED",
        voidedAt: new Date(),
        voidedBy: input.performedBy,
        voidReason: input.reason.trim(),
      },
    });

    const restock = new Map<string, number>();
    for (const item of sale.items) {
      restock.set(
        item.productId,
        (restock.get(item.productId) ?? 0) + item.quantity
      );
    }

    for (const productId of [...restock.keys()].sort()) {
      await applyMovement(tx, {
        shopId: sale.shopId,
        productId,
        movementType: "RETURN",
        quantityChange: restock.get(productId)!,
        referenceType: "sale_void",
        referenceId: sale.id,
        reason: input.reason.trim(),
        performedBy: input.performedBy,
      });
    }

    return { saleNumber: sale.saleNumber };
  });
}

/**
 * Current stock for a set of products at one shop, used to prefill and
 * validate the sale form. This is a hint for the UI only — the authoritative
 * check happens under lock inside `recordSale`.
 */
export async function getAvailableStock(
  shopId: string,
  productIds: string[]
): Promise<Map<string, number>> {
  if (productIds.length === 0) return new Map();

  const rows = await prisma.shopInventory.findMany({
    where: { shopId, productId: { in: productIds } },
    select: { productId: true, quantity: true },
  });

  return new Map(rows.map((r) => [r.productId, r.quantity]));
}

export { InsufficientStockError };
