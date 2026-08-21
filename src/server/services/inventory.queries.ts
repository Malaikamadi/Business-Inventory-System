import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants";
import type { PaginatedResult } from "@/types";

/**
 * Read models for inventory screens. Stock status is derived in the query so
 * that filtering and sorting by status stay consistent with what is displayed.
 */

export type StockFilter = "all" | "low" | "out" | "in";

export interface InventoryRow {
  shopId: string;
  shopName: string;
  productId: string;
  productName: string;
  sku: string;
  categoryName: string | null;
  quantity: number;
  lowStockThreshold: number;
  sellingPrice: string;
  stockValue: string;
  updatedAt: Date;
  imageUrl: string | null;
}

export interface InventoryQuery {
  shopIds?: string[];
  search?: string;
  categoryId?: string;
  filter?: StockFilter;
  page?: number;
  pageSize?: number;
}

function stockCondition(filter: StockFilter): Prisma.Sql {
  switch (filter) {
    case "out":
      return Prisma.sql`si.quantity <= 0`;
    case "low":
      return Prisma.sql`si.quantity > 0 AND si.quantity <= p.low_stock_threshold`;
    case "in":
      return Prisma.sql`si.quantity > p.low_stock_threshold`;
    default:
      return Prisma.sql`TRUE`;
  }
}

export async function listInventory(
  query: InventoryQuery
): Promise<PaginatedResult<InventoryRow>> {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
  const offset = (page - 1) * pageSize;
  const search = query.search?.trim();

  const conditions = [
    Prisma.sql`p.status = 'active'`,
    Prisma.sql`s.status = 'active'`,
    stockCondition(query.filter ?? "all"),
    query.shopIds
      ? Prisma.sql`si.shop_id IN (SELECT unnest(${query.shopIds}::uuid[]))`
      : Prisma.sql`TRUE`,
    query.categoryId
      ? Prisma.sql`p.category_id = ${query.categoryId}::uuid`
      : Prisma.sql`TRUE`,
    search
      ? Prisma.sql`(p.name ILIKE ${`%${search}%`} OR p.sku ILIKE ${`%${search}%`})`
      : Prisma.sql`TRUE`,
  ];

  const where = Prisma.join(conditions, " AND ");

  const [rows, countRows] = await Promise.all([
    prisma.$queryRaw<InventoryRow[]>`
      SELECT
        si.shop_id              AS "shopId",
        s.name                  AS "shopName",
        si.product_id           AS "productId",
        p.name                  AS "productName",
        p.sku                   AS "sku",
        c.name                  AS "categoryName",
        si.quantity             AS "quantity",
        p.low_stock_threshold   AS "lowStockThreshold",
        p.selling_price::text   AS "sellingPrice",
        (si.quantity * p.cost_price)::text AS "stockValue",
        si.updated_at           AS "updatedAt",
        p.image_url             AS "imageUrl"
      FROM shop_inventory si
      JOIN products p ON p.id = si.product_id
      JOIN shops s ON s.id = si.shop_id
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE ${where}
      ORDER BY si.quantity ASC, p.name ASC
      LIMIT ${pageSize} OFFSET ${offset}
    `,
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) AS count
      FROM shop_inventory si
      JOIN products p ON p.id = si.product_id
      JOIN shops s ON s.id = si.shop_id
      WHERE ${where}
    `,
  ]);

  const total = Number(countRows[0]?.count ?? 0);

  return {
    data: rows,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/**
 * Total cost value of stock on hand, for the inventory valuation KPI.
 */
export async function getInventoryValue(shopIds?: string[]): Promise<number> {
  const rows = shopIds
    ? await prisma.$queryRaw<{ value: string | null }[]>`
        SELECT SUM(si.quantity * p.cost_price)::text AS value
        FROM shop_inventory si
        JOIN products p ON p.id = si.product_id
        WHERE p.status = 'active'
          AND si.shop_id IN (SELECT unnest(${shopIds}::uuid[]))
      `
    : await prisma.$queryRaw<{ value: string | null }[]>`
        SELECT SUM(si.quantity * p.cost_price)::text AS value
        FROM shop_inventory si
        JOIN products p ON p.id = si.product_id
        WHERE p.status = 'active'
      `;
  return Number(rows[0]?.value ?? 0);
}

export interface MovementQuery {
  shopIds?: string[];
  productId?: string;
  movementType?: string | string[];
  page?: number;
  pageSize?: number;
}

export async function listMovements(query: MovementQuery) {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;

  const typeFilter = query.movementType
    ? Array.isArray(query.movementType)
      ? { movementType: { in: query.movementType as Prisma.EnumMovementTypeFilter["in"] } }
      : { movementType: query.movementType as Prisma.EnumMovementTypeFilter["equals"] }
    : {};

  const where: Prisma.StockMovementWhereInput = {
    ...(query.shopIds ? { shopId: { in: query.shopIds } } : {}),
    ...(query.productId ? { productId: query.productId } : {}),
    ...typeFilter,
  };

  const [data, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        movementType: true,
        quantityChange: true,
        quantityBefore: true,
        quantityAfter: true,
        reason: true,
        referenceType: true,
        referenceId: true,
        createdAt: true,
        shop: { select: { id: true, name: true } },
        product: { select: { id: true, name: true, sku: true, imageUrl: true } },
        user: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.stockMovement.count({ where }),
  ]);

  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/**
 * Products that a shop can actually sell right now, for the sale form.
 */
export async function listSellableProducts(shopId: string, search?: string) {
  const term = search?.trim();

  return prisma.$queryRaw<
    {
      productId: string;
      name: string;
      sku: string;
      categoryName: string | null;
      sellingPrice: string;
      quantity: number;
      lowStockThreshold: number;
      imageUrl: string | null;
    }[]
  >`
    SELECT
      p.id                  AS "productId",
      p.name                AS "name",
      p.sku                 AS "sku",
      c.name                AS "categoryName",
      p.selling_price::text AS "sellingPrice",
      COALESCE(si.quantity, 0) AS "quantity",
      p.low_stock_threshold AS "lowStockThreshold",
      p.image_url           AS "imageUrl"
    FROM products p
    LEFT JOIN shop_inventory si
      ON si.product_id = p.id AND si.shop_id = ${shopId}::uuid
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE p.status = 'active'
      AND p.shop_id = ${shopId}::uuid
      AND (${term ?? null}::text IS NULL
           OR p.name ILIKE ${term ? `%${term}%` : null}
           OR p.sku ILIKE ${term ? `%${term}%` : null})
    ORDER BY (COALESCE(si.quantity, 0) > 0) DESC, p.name ASC
    LIMIT 100
  `;
}
