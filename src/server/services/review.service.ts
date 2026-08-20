import { prisma } from "@/lib/db";
import { REVIEW } from "@/lib/constants";
import {
  businessHour,
  startOfBusinessDay,
  startOfBusinessDaysAgo,
} from "@/lib/dates";
import {
  isLargeAfterHoursChange,
  isQuickVoid,
  isUnusualAdjustment,
  type ReviewKind,
} from "@/lib/review-rules";

export type ReviewSeverity = "warning" | "high";

export interface ReviewItem {
  id: string;
  kind: ReviewKind;
  severity: ReviewSeverity;
  title: string;
  description: string;
  href: string;
  occurredAt: Date;
  shopName?: string;
  actorName?: string;
}

function actorName(user: { firstName: string; lastName: string }) {
  return `${user.firstName} ${user.lastName}`;
}

/**
 * Owner-facing review queue. Computed at read time from sales and the
 * movement ledger so flags stay current without a separate store.
 */
export async function listActivityReviews(options?: {
  shopIds?: string[];
  limit?: number;
}): Promise<ReviewItem[]> {
  const shopIds = options?.shopIds;
  const limit = options?.limit ?? 40;
  const now = new Date();
  const voidSince = startOfBusinessDaysAgo(REVIEW.VOID_WINDOW_DAYS, now);
  const movementSince = startOfBusinessDaysAgo(14, now);
  const todayStart = startOfBusinessDay(now);
  const lookbackStart = startOfBusinessDaysAgo(
    REVIEW.LOW_SALES_LOOKBACK_DAYS + 1,
    now
  );

  const shopFilter = shopIds ? { shopId: { in: shopIds } } : {};

  const [voids, adjustments, shopDays] = await Promise.all([
    prisma.sale.findMany({
      where: {
        ...shopFilter,
        status: "VOIDED",
        voidedAt: { gte: voidSince },
      },
      select: {
        id: true,
        saleNumber: true,
        createdAt: true,
        voidedAt: true,
        voidReason: true,
        shop: { select: { name: true } },
        salesperson: { select: { id: true, firstName: true, lastName: true } },
        voidedByUser: { select: { firstName: true, lastName: true } },
      },
      orderBy: { voidedAt: "desc" },
    }),
    prisma.stockMovement.findMany({
      where: {
        ...shopFilter,
        movementType: { in: ["ADJUSTMENT", "ARRIVAL"] },
        createdAt: { gte: movementSince },
      },
      select: {
        id: true,
        movementType: true,
        quantityChange: true,
        quantityBefore: true,
        createdAt: true,
        reason: true,
        shop: { select: { name: true } },
        product: { select: { name: true } },
        user: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.sale.groupBy({
      by: ["shopId"],
      where: {
        ...shopFilter,
        status: "COMPLETED",
        createdAt: { gte: lookbackStart, lt: todayStart },
      },
      _sum: { totalAmount: true },
      _count: { _all: true },
    }),
  ]);

  const items: ReviewItem[] = [];

  const voidsByPerson = new Map<string, typeof voids>();
  for (const sale of voids) {
    const list = voidsByPerson.get(sale.salesperson.id) ?? [];
    list.push(sale);
    voidsByPerson.set(sale.salesperson.id, list);
  }

  for (const [personId, personVoids] of voidsByPerson) {
    if (personVoids.length < REVIEW.REPEAT_VOID_COUNT) continue;
    const latest = personVoids[0];
    items.push({
      id: `repeat-voids-${personId}`,
      kind: "repeat_voids",
      severity: "high",
      title: "Repeated cancelled sales",
      description: `${actorName(latest.salesperson)} voided ${personVoids.length} sales in the last ${REVIEW.VOID_WINDOW_DAYS} days.`,
      href: `/sales?status=VOIDED`,
      occurredAt: latest.voidedAt ?? latest.createdAt,
      shopName: latest.shop.name,
      actorName: actorName(latest.salesperson),
    });
  }

  for (const sale of voids) {
    if (!sale.voidedAt || !isQuickVoid(sale.createdAt, sale.voidedAt)) continue;
    items.push({
      id: `quick-void-${sale.id}`,
      kind: "quick_void",
      severity: "warning",
      title: "Sale voided shortly after recording",
      description: `${sale.saleNumber} was cancelled${sale.voidReason ? ` (${sale.voidReason})` : ""}.`,
      href: `/sales/${sale.id}`,
      occurredAt: sale.voidedAt,
      shopName: sale.shop.name,
      actorName: sale.voidedByUser
        ? actorName(sale.voidedByUser)
        : actorName(sale.salesperson),
    });
  }

  for (const movement of adjustments) {
    if (movement.movementType === "ADJUSTMENT") {
      if (isUnusualAdjustment(movement.quantityChange, movement.quantityBefore)) {
        items.push({
          id: `adj-${movement.id}`,
          kind: "unusual_adjustment",
          severity: "high",
          title: "Unusual stock adjustment",
          description: `${movement.product.name} changed by ${movement.quantityChange > 0 ? "+" : ""}${movement.quantityChange} at ${movement.shop.name}${movement.reason ? ` — ${movement.reason}` : ""}.`,
          href: `/inventory/movements`,
          occurredAt: movement.createdAt,
          shopName: movement.shop.name,
          actorName: actorName(movement.user),
        });
      }
    }

    if (isLargeAfterHoursChange(movement.quantityChange, movement.createdAt)) {
      items.push({
        id: `hours-${movement.id}`,
        kind: "after_hours",
        severity: "warning",
        title: "Large stock change outside normal hours",
        description: `${movement.product.name}: ${movement.quantityChange > 0 ? "+" : ""}${movement.quantityChange} units after hours at ${movement.shop.name}.`,
        href: `/inventory/movements`,
        occurredAt: movement.createdAt,
        shopName: movement.shop.name,
        actorName: actorName(movement.user),
      });
    }
  }

  if (businessHour(now) >= REVIEW.LOW_SALES_AFTER_HOUR) {
    const todayByShop = await prisma.sale.groupBy({
      by: ["shopId"],
      where: {
        ...shopFilter,
        status: "COMPLETED",
        createdAt: { gte: todayStart },
      },
      _sum: { totalAmount: true },
    });

    const shops = await prisma.shop.findMany({
      where: {
        status: "ACTIVE",
        ...(shopIds ? { id: { in: shopIds } } : {}),
      },
      select: { id: true, name: true },
    });
    const shopName = new Map(shops.map((shop) => [shop.id, shop.name]));

    const history = new Map(
      shopDays.map((row) => [
        row.shopId,
        {
          total: Number(row._sum.totalAmount ?? 0),
          count: row._count._all,
        },
      ])
    );

    for (const row of todayByShop) {
      const prior = history.get(row.shopId);
      if (!prior || prior.count < REVIEW.LOW_SALES_MIN_DAYS) continue;
      const dailyAvg = prior.total / REVIEW.LOW_SALES_LOOKBACK_DAYS;
      if (dailyAvg <= 0) continue;
      const today = Number(row._sum.totalAmount ?? 0);
      if (today >= dailyAvg * REVIEW.LOW_SALES_RATIO) continue;

      items.push({
        id: `low-sales-${row.shopId}`,
        kind: "low_sales",
        severity: "warning",
        title: "Sales well below the recent average",
        description: `${shopName.get(row.shopId) ?? "A shop"} is at ${Math.round((today / dailyAvg) * 100)}% of its typical daily take.`,
        href: `/sales?shop=${row.shopId}`,
        occurredAt: now,
        shopName: shopName.get(row.shopId),
      });
    }

    // Shops with zero sales today still deserve a look if they usually sell.
    for (const shop of shops) {
      if (todayByShop.some((row) => row.shopId === shop.id)) continue;
      const prior = history.get(shop.id);
      if (!prior || prior.count < REVIEW.LOW_SALES_MIN_DAYS) continue;
      const dailyAvg = prior.total / REVIEW.LOW_SALES_LOOKBACK_DAYS;
      if (dailyAvg <= 0) continue;
      items.push({
        id: `low-sales-${shop.id}`,
        kind: "low_sales",
        severity: "warning",
        title: "Sales well below the recent average",
        description: `${shop.name} has no completed sales today against a typical daily take.`,
        href: `/sales?shop=${shop.id}`,
        occurredAt: now,
        shopName: shop.name,
      });
    }
  }

  items.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
  return items.slice(0, limit);
}

export async function voidCountsLastWindow(
  salespersonIds: string[]
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (salespersonIds.length === 0) return counts;

  const since = startOfBusinessDaysAgo(REVIEW.VOID_WINDOW_DAYS);
  const grouped = await prisma.sale.groupBy({
    by: ["salespersonId"],
    where: {
      salespersonId: { in: salespersonIds },
      status: "VOIDED",
      voidedAt: { gte: since },
    },
    _count: { _all: true },
  });

  for (const row of grouped) {
    counts.set(row.salespersonId, row._count._all);
  }
  return counts;
}

export function movementReviewLabel(movement: {
  movementType: string;
  quantityChange: number;
  quantityBefore: number;
  createdAt: Date;
}): string | null {
  if (movement.movementType === "ADJUSTMENT") {
    if (isUnusualAdjustment(movement.quantityChange, movement.quantityBefore)) {
      return "Unusual size";
    }
  }
  if (
    (movement.movementType === "ADJUSTMENT" ||
      movement.movementType === "ARRIVAL") &&
    isLargeAfterHoursChange(movement.quantityChange, movement.createdAt)
  ) {
    return "Outside hours";
  }
  return null;
}
