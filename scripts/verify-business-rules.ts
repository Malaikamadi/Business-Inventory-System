/**
 * Exercises the inventory and sales invariants against a real database.
 *
 * These rules are the ones that cost a business money when they break, so they
 * are checked end to end through the service layer rather than mocked. The
 * script creates its own shop and product, and removes them afterwards.
 */
import "dotenv/config";
import { prisma } from "../src/lib/db";
import {
  findBalanceDiscrepancies,
  recordStockAdjustment,
  recordStockArrival,
  recordStockTransfer,
} from "../src/server/services/inventory.service";
import { recordSale, voidSale } from "../src/server/services/sales.service";
import { InsufficientStockError } from "../src/server/services/errors";

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean, detail = "") {
  if (condition) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.error(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function balanceOf(shopId: string, productId: string): Promise<number> {
  const row = await prisma.shopInventory.findUnique({
    where: { shopId_productId: { shopId, productId } },
    select: { quantity: true },
  });
  return row?.quantity ?? 0;
}

async function main() {
  console.log("\nVerifying business rules\n");

  const owner = await prisma.user.findFirstOrThrow({
    where: { role: { name: "owner" } },
    select: { id: true },
  });

  const shopA = await prisma.shop.create({
    data: { name: `__test_shop_a_${Date.now()}` },
    select: { id: true },
  });
  const shopB = await prisma.shop.create({
    data: { name: `__test_shop_b_${Date.now()}` },
    select: { id: true },
  });
  const product = await prisma.product.create({
    data: {
      name: "__test_widget",
      sku: `__TEST-${Date.now()}`,
      costPrice: 4,
      sellingPrice: 10,
      lowStockThreshold: 5,
    },
    select: { id: true },
  });

  try {
    // ── Rule: a stock arrival increases inventory ──────────────────────
    console.log("Stock arrivals");
    await recordStockArrival({
      shopId: shopA.id,
      productId: product.id,
      quantity: 100,
      notes: "test delivery",
      performedBy: owner.id,
    });
    check("arrival increases stock to 100", (await balanceOf(shopA.id, product.id)) === 100);

    const arrivalMovement = await prisma.stockMovement.findFirst({
      where: { shopId: shopA.id, productId: product.id, movementType: "ARRIVAL" },
      select: { quantityChange: true, quantityBefore: true, quantityAfter: true },
    });
    check(
      "arrival writes a movement with before/after balances",
      arrivalMovement?.quantityChange === 100 &&
        arrivalMovement?.quantityBefore === 0 &&
        arrivalMovement?.quantityAfter === 100
    );

    // ── Rule: a completed sale decreases inventory ─────────────────────
    console.log("\nSales");
    const sale = await recordSale({
      shopId: shopA.id,
      salespersonId: owner.id,
      items: [{ productId: product.id, quantity: 5 }],
    });
    check("sale of 5 leaves 95 in stock", (await balanceOf(shopA.id, product.id)) === 95);
    check("sale total is priced from the catalog", sale.totalAmount === "50.00");

    const saleMovement = await prisma.stockMovement.findFirst({
      where: { referenceId: sale.saleId, movementType: "SALE" },
      select: { quantityChange: true },
    });
    check("sale writes a negative movement", saleMovement?.quantityChange === -5);

    // ── Rule: duplicate lines are checked against the combined total ───
    const merged = await recordSale({
      shopId: shopA.id,
      salespersonId: owner.id,
      items: [
        { productId: product.id, quantity: 2 },
        { productId: product.id, quantity: 3 },
      ],
    });
    check("repeated product lines merge into one", merged.itemsCount === 1);
    check("merged sale deducts the combined 5 units", (await balanceOf(shopA.id, product.id)) === 90);

    // ── Rule: a sale cannot exceed available inventory ─────────────────
    console.log("\nOverselling");
    let oversellRejected = false;
    let oversellMessage = "";
    try {
      await recordSale({
        shopId: shopA.id,
        salespersonId: owner.id,
        items: [{ productId: product.id, quantity: 1_000 }],
      });
    } catch (error) {
      oversellRejected = error instanceof InsufficientStockError;
      oversellMessage = (error as Error).message;
    }
    check("selling more than available is rejected", oversellRejected, oversellMessage);
    check("rejected sale leaves stock untouched", (await balanceOf(shopA.id, product.id)) === 90);

    const orphanSales = await prisma.sale.count({
      where: { shopId: shopA.id, items: { none: {} } },
    });
    check("rejected sale is rolled back entirely", orphanSales === 0);

    // ── Rule: a multi-line sale is all-or-nothing ──────────────────────
    const scarce = await prisma.product.create({
      data: {
        name: "__test_scarce",
        sku: `__TEST-SCARCE-${Date.now()}`,
        costPrice: 1,
        sellingPrice: 2,
        lowStockThreshold: 1,
      },
      select: { id: true },
    });
    await recordStockArrival({
      shopId: shopA.id,
      productId: scarce.id,
      quantity: 2,
      performedBy: owner.id,
    });

    let partialRejected = false;
    try {
      await recordSale({
        shopId: shopA.id,
        salespersonId: owner.id,
        items: [
          { productId: product.id, quantity: 1 },
          { productId: scarce.id, quantity: 99 },
        ],
      });
    } catch {
      partialRejected = true;
    }
    check("a sale with one unsatisfiable line is rejected", partialRejected);
    check(
      "the satisfiable line in a rejected sale is not deducted",
      (await balanceOf(shopA.id, product.id)) === 90
    );

    // ── Rule: concurrent sales cannot oversell the same units ──────────
    console.log("\nConcurrency");
    const contested = await prisma.product.create({
      data: {
        name: "__test_contested",
        sku: `__TEST-RACE-${Date.now()}`,
        costPrice: 1,
        sellingPrice: 3,
        lowStockThreshold: 1,
      },
      select: { id: true },
    });
    await recordStockArrival({
      shopId: shopA.id,
      productId: contested.id,
      quantity: 10,
      performedBy: owner.id,
    });

    // Twenty simultaneous single-unit sales against ten units of stock.
    const attempts = await Promise.allSettled(
      Array.from({ length: 20 }, () =>
        recordSale({
          shopId: shopA.id,
          salespersonId: owner.id,
          items: [{ productId: contested.id, quantity: 1 }],
        })
      )
    );
    const fulfilled = attempts.filter((a) => a.status === "fulfilled").length;
    const remaining = await balanceOf(shopA.id, contested.id);

    check(
      "exactly 10 of 20 concurrent sales succeed",
      fulfilled === 10,
      `${fulfilled} succeeded`
    );
    check("stock lands exactly at zero, never negative", remaining === 0, `remaining ${remaining}`);

    const contestedSold = await prisma.saleItem.aggregate({
      where: { productId: contested.id },
      _sum: { quantity: true },
    });
    check(
      "sale lines match the units actually deducted",
      (contestedSold._sum.quantity ?? 0) === 10
    );

    // ── Rule: sale numbers stay unique under concurrency ───────────────
    const numbers = attempts
      .filter((a): a is PromiseFulfilledResult<Awaited<ReturnType<typeof recordSale>>> =>
        a.status === "fulfilled"
      )
      .map((a) => a.value.saleNumber);
    check(
      "concurrent sales receive unique sale numbers",
      new Set(numbers).size === numbers.length
    );

    // ── Rule: voiding restores stock and preserves the record ──────────
    console.log("\nVoiding");
    const before = await balanceOf(shopA.id, product.id);
    await voidSale({
      saleId: sale.saleId,
      reason: "verification test",
      performedBy: owner.id,
    });
    check("void returns the sold units to stock", (await balanceOf(shopA.id, product.id)) === before + 5);

    const voided = await prisma.sale.findUnique({
      where: { id: sale.saleId },
      select: { status: true, voidReason: true, items: { select: { id: true } } },
    });
    check("voided sale is preserved, not deleted", voided !== null);
    check("voided sale keeps its line items", (voided?.items.length ?? 0) > 0);
    check("void reason is recorded", voided?.voidReason === "verification test");

    let doubleVoidRejected = false;
    try {
      await voidSale({
        saleId: sale.saleId,
        reason: "second attempt",
        performedBy: owner.id,
      });
    } catch {
      doubleVoidRejected = true;
    }
    check("a sale cannot be voided twice", doubleVoidRejected);

    // ── Rule: adjustments cannot drive stock negative ──────────────────
    console.log("\nAdjustments and transfers");
    let negativeAdjustmentRejected = false;
    try {
      await recordStockAdjustment({
        shopId: shopA.id,
        productId: product.id,
        quantityChange: -99_999,
        reason: "test",
        performedBy: owner.id,
      });
    } catch (error) {
      negativeAdjustmentRejected = error instanceof InsufficientStockError;
    }
    check("an adjustment below zero is rejected", negativeAdjustmentRejected);

    const beforeAdjustment = await balanceOf(shopA.id, product.id);
    await recordStockAdjustment({
      shopId: shopA.id,
      productId: product.id,
      quantityChange: -3,
      reason: "damaged in storage",
      performedBy: owner.id,
    });
    check(
      "a valid adjustment applies the signed delta",
      (await balanceOf(shopA.id, product.id)) === beforeAdjustment - 3
    );

    // ── Rule: a transfer moves stock atomically between shops ──────────
    const fromBefore = await balanceOf(shopA.id, product.id);
    await recordStockTransfer({
      fromShopId: shopA.id,
      toShopId: shopB.id,
      productId: product.id,
      quantity: 20,
      reason: "rebalancing",
      performedBy: owner.id,
    });
    check("transfer removes stock from the source", (await balanceOf(shopA.id, product.id)) === fromBefore - 20);
    check("transfer adds stock to the destination", (await balanceOf(shopB.id, product.id)) === 20);

    let selfTransferRejected = false;
    try {
      await recordStockTransfer({
        fromShopId: shopA.id,
        toShopId: shopA.id,
        productId: product.id,
        quantity: 1,
        performedBy: owner.id,
      });
    } catch {
      selfTransferRejected = true;
    }
    check("a shop cannot transfer stock to itself", selfTransferRejected);

    // ── Rule: cached balances always equal the movement ledger ─────────
    console.log("\nLedger integrity");
    const discrepancies = await findBalanceDiscrepancies();
    check(
      "every cached balance equals the sum of its movements",
      discrepancies.length === 0,
      discrepancies.length > 0 ? JSON.stringify(discrepancies.slice(0, 3)) : ""
    );

    const brokenChain = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) AS count
      FROM stock_movements
      WHERE quantity_before + quantity_change <> quantity_after
    `;
    check(
      "every movement's before + change equals its after",
      Number(brokenChain[0]?.count ?? 0) === 0
    );

    const negativeBalances = await prisma.shopInventory.count({
      where: { quantity: { lt: 0 } },
    });
    check("no shop holds negative stock", negativeBalances === 0);

    // ── Cleanup ────────────────────────────────────────────────────────
    const testProductIds = [product.id, scarce.id, contested.id];
    const testSaleIds = (
      await prisma.sale.findMany({
        where: { shopId: { in: [shopA.id, shopB.id] } },
        select: { id: true },
      })
    ).map((s) => s.id);

    await prisma.stockMovement.deleteMany({
      where: { shopId: { in: [shopA.id, shopB.id] } },
    });
    await prisma.saleItem.deleteMany({ where: { saleId: { in: testSaleIds } } });
    await prisma.sale.deleteMany({ where: { id: { in: testSaleIds } } });
    await prisma.shopInventory.deleteMany({
      where: { shopId: { in: [shopA.id, shopB.id] } },
    });
    await prisma.product.deleteMany({ where: { id: { in: testProductIds } } });
    await prisma.shop.deleteMany({ where: { id: { in: [shopA.id, shopB.id] } } });
  } catch (error) {
    console.error("\nVerification aborted:", error);
    failed++;
  }

  console.log(`\n${passed} passed, ${failed} failed\n`);
  await prisma.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

void main();
