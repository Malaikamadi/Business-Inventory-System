import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  startOfBusinessDay,
  startOfBusinessDaysAgo,
  startOfBusinessMonth,
} from "@/lib/dates";
import type {
  DashboardKPIs,
  SalesDataPoint,
  ShopDashboardKPIs,
  ShopPerformance,
  TopProduct,
} from "@/types";

/**
 * Read-only aggregations for dashboards and reports.
 *
 * Every query takes an explicit shop scope: `undefined` means all shops and is
 * only ever passed by callers that have already verified business-wide access.
 * Voided sales are excluded from revenue everywhere.
 */

const COMPLETED = { status: "COMPLETED" as const };

function shopFilter(shopIds?: string[]): Prisma.SaleWhereInput {
  return shopIds ? { shopId: { in: shopIds } } : {};
}

export async function getOwnerKPIs(shopIds?: string[]): Promise<DashboardKPIs> {
  const todayStart = startOfBusinessDay();
  const monthStart = startOfBusinessMonth();
  const scope = shopFilter(shopIds);

  const [
    shops,
    products,
    inventory,
    today,
    month,
    stockCounts,
  ] = await Promise.all([
    prisma.shop.count({
      where: {
        status: "ACTIVE",
        ...(shopIds ? { id: { in: shopIds } } : {}),
      },
    }),
    prisma.product.count({
      where: {
        status: "ACTIVE",
        ...(shopIds ? { shopId: { in: shopIds } } : {}),
      },
    }),
    prisma.shopInventory.aggregate({
      where: shopIds ? { shopId: { in: shopIds } } : undefined,
      _sum: { quantity: true },
    }),
    prisma.sale.aggregate({
      where: { ...scope, ...COMPLETED, createdAt: { gte: todayStart } },
      _sum: { totalAmount: true },
      _count: true,
    }),
    prisma.sale.aggregate({
      where: { ...scope, ...COMPLETED, createdAt: { gte: monthStart } },
      _sum: { totalAmount: true },
      _count: true,
    }),
    getStockAlertCounts(shopIds),
  ]);

  return {
    totalShops: shops,
    totalProducts: products,
    totalInventoryUnits: inventory._sum.quantity ?? 0,
    totalSales: today._count,
    totalRevenue: Number(today._sum.totalAmount ?? 0),
    monthlySales: month._count,
    monthlyRevenue: Number(month._sum.totalAmount ?? 0),
    lowStockCount: stockCounts.lowStock,
    outOfStockCount: stockCounts.outOfStock,
  };
}

/**
 * Counts SKU/shop pairs at or below their threshold. A product that is low at
 * two shops counts twice, because it needs restocking in two places.
 */
export async function getStockAlertCounts(
  shopIds?: string[]
): Promise<{ lowStock: number; outOfStock: number }> {
  type Row = { low_stock: bigint; out_of_stock: bigint };

  const rows = shopIds
    ? await prisma.$queryRaw<Row[]>`
        SELECT
          COUNT(*) FILTER (
            WHERE si.quantity > 0 AND si.quantity <= p.low_stock_threshold
          ) AS low_stock,
          COUNT(*) FILTER (WHERE si.quantity <= 0) AS out_of_stock
        FROM shop_inventory si
        JOIN products p ON p.id = si.product_id
        JOIN shops s ON s.id = si.shop_id
        WHERE p.status = 'active' AND s.status = 'active'
          AND si.shop_id IN (SELECT unnest(${shopIds}::uuid[]))
      `
    : await prisma.$queryRaw<Row[]>`
        SELECT
          COUNT(*) FILTER (
            WHERE si.quantity > 0 AND si.quantity <= p.low_stock_threshold
          ) AS low_stock,
          COUNT(*) FILTER (WHERE si.quantity <= 0) AS out_of_stock
        FROM shop_inventory si
        JOIN products p ON p.id = si.product_id
        JOIN shops s ON s.id = si.shop_id
        WHERE p.status = 'active' AND s.status = 'active'
      `;

  return {
    lowStock: Number(rows[0]?.low_stock ?? 0),
    outOfStock: Number(rows[0]?.out_of_stock ?? 0),
  };
}

export async function getShopKPIs(shopId: string): Promise<ShopDashboardKPIs> {
  const todayStart = startOfBusinessDay();

  const [sales, items, stockCounts] = await Promise.all([
    prisma.sale.aggregate({
      where: { shopId, ...COMPLETED, createdAt: { gte: todayStart } },
      _sum: { totalAmount: true },
      _count: true,
    }),
    prisma.saleItem.aggregate({
      where: {
        sale: { shopId, ...COMPLETED, createdAt: { gte: todayStart } },
      },
      _sum: { quantity: true },
    }),
    getStockAlertCounts([shopId]),
  ]);

  return {
    todayRevenue: Number(sales._sum.totalAmount ?? 0),
    todaySales: sales._count,
    todayItemsSold: items._sum.quantity ?? 0,
    lowStockCount: stockCounts.lowStock,
    outOfStockCount: stockCounts.outOfStock,
  };
}

/**
 * Daily revenue for the trailing `days` business days, including days with no
 * sales so the chart has no gaps.
 */
export async function getRevenueTrend(
  days = 30,
  shopIds?: string[]
): Promise<SalesDataPoint[]> {
  const from = startOfBusinessDaysAgo(days - 1);

  const sales = await prisma.sale.findMany({
    where: { ...shopFilter(shopIds), ...COMPLETED, createdAt: { gte: from } },
    select: { createdAt: true, totalAmount: true },
  });

  const buckets = new Map<string, { revenue: number; count: number }>();
  for (let i = 0; i < days; i++) {
    const day = new Date(from.getTime() + i * 24 * 60 * 60 * 1000);
    buckets.set(day.toISOString().slice(0, 10), { revenue: 0, count: 0 });
  }

  for (const sale of sales) {
    const key = sale.createdAt.toISOString().slice(0, 10);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.revenue += Number(sale.totalAmount);
    bucket.count += 1;
  }

  return [...buckets.entries()].map(([date, value]) => ({
    date,
    revenue: Math.round(value.revenue * 100) / 100,
    count: value.count,
  }));
}

export async function getShopPerformance(
  since: Date,
  shopIds?: string[]
): Promise<ShopPerformance[]> {
  const grouped = await prisma.sale.groupBy({
    by: ["shopId"],
    where: { ...shopFilter(shopIds), ...COMPLETED, createdAt: { gte: since } },
    _sum: { totalAmount: true },
    _count: true,
  });

  const shops = await prisma.shop.findMany({
    where: shopIds ? { id: { in: shopIds } } : { status: "ACTIVE" },
    select: { id: true, name: true },
  });

  const byShop = new Map(grouped.map((g) => [g.shopId, g]));

  return shops
    .map((shop) => {
      const stats = byShop.get(shop.id);
      return {
        shopId: shop.id,
        shopName: shop.name,
        revenue: Number(stats?._sum.totalAmount ?? 0),
        salesCount: stats?._count ?? 0,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
}

export async function getTopProducts(
  since: Date,
  limit = 10,
  shopIds?: string[]
): Promise<TopProduct[]> {
  const grouped = await prisma.saleItem.groupBy({
    by: ["productId"],
    where: {
      sale: { ...shopFilter(shopIds), ...COMPLETED, createdAt: { gte: since } },
    },
    _sum: { quantity: true, lineTotal: true },
    orderBy: { _sum: { lineTotal: "desc" } },
    take: limit,
  });

  if (grouped.length === 0) return [];

  const products = await prisma.product.findMany({
    where: { id: { in: grouped.map((g) => g.productId) } },
    select: { id: true, name: true },
  });
  const names = new Map(products.map((p) => [p.id, p.name]));

  return grouped.map((g) => ({
    productId: g.productId,
    productName: names.get(g.productId) ?? "Unknown product",
    totalQuantity: g._sum.quantity ?? 0,
    totalRevenue: Number(g._sum.lineTotal ?? 0),
  }));
}

export async function getSalespersonPerformance(
  since: Date,
  shopIds?: string[]
): Promise<
  { userId: string; name: string; revenue: number; salesCount: number }[]
> {
  const grouped = await prisma.sale.groupBy({
    by: ["salespersonId"],
    where: { ...shopFilter(shopIds), ...COMPLETED, createdAt: { gte: since } },
    _sum: { totalAmount: true },
    _count: true,
    orderBy: { _sum: { totalAmount: "desc" } },
  });

  if (grouped.length === 0) return [];

  const users = await prisma.user.findMany({
    where: { id: { in: grouped.map((g) => g.salespersonId) } },
    select: { id: true, firstName: true, lastName: true },
  });
  const byId = new Map(users.map((u) => [u.id, u]));

  return grouped.map((g) => {
    const user = byId.get(g.salespersonId);
    return {
      userId: g.salespersonId,
      name: user ? `${user.firstName} ${user.lastName}` : "Unknown user",
      revenue: Number(g._sum.totalAmount ?? 0),
      salesCount: g._count,
    };
  });
}

export async function getRecentSales(limit = 10, shopIds?: string[]) {
  return prisma.sale.findMany({
    where: shopFilter(shopIds),
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      saleNumber: true,
      totalAmount: true,
      itemsCount: true,
      status: true,
      createdAt: true,
      shop: { select: { id: true, name: true } },
      salesperson: { select: { firstName: true, lastName: true } },
    },
  });
}
