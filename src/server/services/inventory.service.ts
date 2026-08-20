import { Prisma, type MovementType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { InsufficientStockError, NotFoundError } from "./errors";

/**
 * The inventory ledger.
 *
 * `stock_movements` is the source of truth and is append-only. `shop_inventory`
 * is a cache of the running balance, updated inside the same transaction as the
 * movement that caused it. Nothing outside this module may write either table.
 */

export type TxClient = Prisma.TransactionClient;

export interface MovementInput {
  shopId: string;
  productId: string;
  movementType: MovementType;
  /** Signed delta. Negative reduces stock. Must not be zero. */
  quantityChange: number;
  referenceType?: string;
  referenceId?: string;
  reason?: string;
  performedBy: string;
  /** Overrides the movement timestamp. Only used when backfilling seed data. */
  occurredAt?: Date;
}

export interface MovementResult {
  movementId: string;
  quantityBefore: number;
  quantityAfter: number;
}

/**
 * Locks the balance row for a (shop, product) pair and returns the current
 * quantity. Creates the row at zero if the product has never been stocked at
 * this shop. The lock is held until the surrounding transaction ends, which is
 * what prevents two concurrent sales from overselling the same unit.
 */
async function lockBalance(
  tx: TxClient,
  shopId: string,
  productId: string
): Promise<number> {
  await tx.$executeRaw`
    INSERT INTO shop_inventory (id, shop_id, product_id, quantity, updated_at)
    VALUES (gen_random_uuid(), ${shopId}::uuid, ${productId}::uuid, 0, now())
    ON CONFLICT (shop_id, product_id) DO NOTHING
  `;

  const rows = await tx.$queryRaw<{ quantity: number }[]>`
    SELECT quantity
    FROM shop_inventory
    WHERE shop_id = ${shopId}::uuid AND product_id = ${productId}::uuid
    FOR UPDATE
  `;

  if (rows.length === 0) throw new NotFoundError("Inventory record");
  return rows[0].quantity;
}

/**
 * Applies a single signed stock movement inside an existing transaction.
 *
 * Callers are responsible for the transaction boundary so that a multi-line
 * sale either commits every movement or none of them.
 */
export async function applyMovement(
  tx: TxClient,
  input: MovementInput
): Promise<MovementResult> {
  if (input.quantityChange === 0) {
    throw new Error("Movement quantityChange must be non-zero");
  }

  const quantityBefore = await lockBalance(tx, input.shopId, input.productId);
  const quantityAfter = quantityBefore + input.quantityChange;

  if (quantityAfter < 0) {
    const product = await tx.product.findUnique({
      where: { id: input.productId },
      select: { name: true },
    });
    throw new InsufficientStockError(
      product?.name ?? "product",
      quantityBefore,
      Math.abs(input.quantityChange)
    );
  }

  await tx.shopInventory.update({
    where: {
      shopId_productId: { shopId: input.shopId, productId: input.productId },
    },
    data: { quantity: quantityAfter },
  });

  const movement = await tx.stockMovement.create({
    data: {
      shopId: input.shopId,
      productId: input.productId,
      movementType: input.movementType,
      quantityChange: input.quantityChange,
      quantityBefore,
      quantityAfter,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      reason: input.reason,
      performedBy: input.performedBy,
      ...(input.occurredAt ? { createdAt: input.occurredAt } : {}),
    },
    select: { id: true },
  });

  return { movementId: movement.id, quantityBefore, quantityAfter };
}

/**
 * Records an incoming delivery. Always increases stock.
 */
export async function recordStockArrival(input: {
  shopId: string;
  productId: string;
  quantity: number;
  notes?: string;
  performedBy: string;
}): Promise<MovementResult> {
  if (input.quantity <= 0) {
    throw new Error("Arrival quantity must be positive");
  }

  return prisma.$transaction((tx) =>
    applyMovement(tx, {
      shopId: input.shopId,
      productId: input.productId,
      movementType: "ARRIVAL",
      quantityChange: input.quantity,
      referenceType: "stock_arrival",
      reason: input.notes,
      performedBy: input.performedBy,
    })
  );
}

/**
 * Applies an authorized correction. The delta is signed and a reason is
 * mandatory, because an adjustment is the only way stock changes without a
 * corresponding business document.
 */
export async function recordStockAdjustment(input: {
  shopId: string;
  productId: string;
  quantityChange: number;
  reason: string;
  performedBy: string;
}): Promise<MovementResult> {
  if (input.quantityChange === 0) {
    throw new Error("Adjustment must be non-zero");
  }
  if (!input.reason.trim()) {
    throw new Error("Adjustment requires a reason");
  }

  return prisma.$transaction((tx) =>
    applyMovement(tx, {
      shopId: input.shopId,
      productId: input.productId,
      movementType: "ADJUSTMENT",
      quantityChange: input.quantityChange,
      referenceType: "stock_adjustment",
      reason: input.reason,
      performedBy: input.performedBy,
    })
  );
}

/**
 * Moves stock between two shops as one atomic pair of movements.
 */
export async function recordStockTransfer(input: {
  fromShopId: string;
  toShopId: string;
  productId: string;
  quantity: number;
  reason?: string;
  performedBy: string;
}): Promise<{ out: MovementResult; in: MovementResult }> {
  if (input.quantity <= 0) throw new Error("Transfer quantity must be positive");
  if (input.fromShopId === input.toShopId) {
    throw new Error("Cannot transfer stock to the same shop");
  }

  return prisma.$transaction(async (tx) => {
    // Lock in a deterministic order so concurrent opposite-direction transfers
    // cannot deadlock against each other.
    const [firstShop, secondShop] = [input.fromShopId, input.toShopId].sort();
    await lockBalance(tx, firstShop, input.productId);
    await lockBalance(tx, secondShop, input.productId);

    const outResult = await applyMovement(tx, {
      shopId: input.fromShopId,
      productId: input.productId,
      movementType: "TRANSFER_OUT",
      quantityChange: -input.quantity,
      referenceType: "stock_transfer",
      reason: input.reason,
      performedBy: input.performedBy,
    });

    const inResult = await applyMovement(tx, {
      shopId: input.toShopId,
      productId: input.productId,
      movementType: "TRANSFER_IN",
      quantityChange: input.quantity,
      referenceType: "stock_transfer",
      reason: input.reason,
      performedBy: input.performedBy,
    });

    return { out: outResult, in: inResult };
  });
}

/**
 * Verifies that cached balances still equal the sum of their movements.
 * Any row returned indicates a bug or out-of-band write.
 */
export async function findBalanceDiscrepancies(): Promise<
  {
    shopId: string;
    productId: string;
    cachedQuantity: number;
    ledgerQuantity: number;
  }[]
> {
  return prisma.$queryRaw`
    SELECT
      si.shop_id       AS "shopId",
      si.product_id    AS "productId",
      si.quantity      AS "cachedQuantity",
      COALESCE(m.total, 0)::int AS "ledgerQuantity"
    FROM shop_inventory si
    LEFT JOIN (
      SELECT shop_id, product_id, SUM(quantity_change) AS total
      FROM stock_movements
      GROUP BY shop_id, product_id
    ) m ON m.shop_id = si.shop_id AND m.product_id = si.product_id
    WHERE si.quantity <> COALESCE(m.total, 0)
  `;
}
