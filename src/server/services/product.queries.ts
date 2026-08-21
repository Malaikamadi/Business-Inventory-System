import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants";

export interface ProductQuery {
  search?: string;
  categoryId?: string;
  status?: "ACTIVE" | "DISCONTINUED";
  page?: number;
  pageSize?: number;
  /**
   * Limits the catalog to these shops. Each product belongs to one shop.
   * `undefined` means all shops and should only come from `resolveShopScope`.
   */
  shopIds?: string[];
}

/**
 * Catalog listing with stock rolled up across the shops in scope.
 */
export async function listProducts(query: ProductQuery) {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
  const search = query.search?.trim();

  const where: Prisma.ProductWhereInput = {
    status: query.status ?? "ACTIVE",
    ...(query.shopIds ? { shopId: { in: query.shopIds } } : {}),
    ...(query.categoryId ? { categoryId: query.categoryId } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { sku: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        sku: true,
        costPrice: true,
        sellingPrice: true,
        lowStockThreshold: true,
        imageUrl: true,
        status: true,
        category: { select: { id: true, name: true } },
        shop: { select: { id: true, name: true } },
        shopInventory: {
          where: query.shopIds ? { shopId: { in: query.shopIds } } : undefined,
          select: { quantity: true },
        },
      },
    }),
    prisma.product.count({ where }),
  ]);

  return {
    data: products.map((product) => {
      const totalStock = product.shopInventory.reduce(
        (sum, row) => sum + row.quantity,
        0
      );
      // A product below threshold at any one shop needs attention even if the
      // business-wide total looks healthy.
      const shopsNeedingStock = product.shopInventory.filter(
        (row) => row.quantity <= product.lowStockThreshold
      ).length;

      return {
        id: product.id,
        name: product.name,
        sku: product.sku,
        costPrice: product.costPrice,
        sellingPrice: product.sellingPrice,
        lowStockThreshold: product.lowStockThreshold,
        imageUrl: product.imageUrl,
        status: product.status,
        category: product.category,
        shop: product.shop,
        totalStock,
        shopsNeedingStock,
        shopCount: product.shopInventory.length,
      };
    }),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getProductDetail(productId: string) {
  return prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      name: true,
      sku: true,
      description: true,
      costPrice: true,
      sellingPrice: true,
      lowStockThreshold: true,
      imageUrl: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      categoryId: true,
      shopId: true,
      category: { select: { id: true, name: true } },
      shop: { select: { id: true, name: true } },
      shopInventory: {
        select: {
          quantity: true,
          updatedAt: true,
          shop: { select: { id: true, name: true, status: true } },
        },
      },
    },
  });
}

/**
 * Units sold and revenue for a product over a period, used on its detail page.
 * `shopIds` narrows this to the branches the viewer may see, so staff read their
 * own trade rather than the whole business's.
 */
export async function getProductSalesSummary(
  productId: string,
  since: Date,
  shopIds?: string[]
) {
  const result = await prisma.saleItem.aggregate({
    where: {
      productId,
      sale: {
        status: "COMPLETED",
        createdAt: { gte: since },
        ...(shopIds ? { shopId: { in: shopIds } } : {}),
      },
    },
    _sum: { quantity: true, lineTotal: true },
  });

  return {
    unitsSold: result._sum.quantity ?? 0,
    revenue: Number(result._sum.lineTotal ?? 0),
  };
}

export async function listCategories(shopIds?: string[]) {
  const categories = await prisma.category.findMany({
    where: {
      isActive: true,
      ...(shopIds ? { shopId: { in: shopIds } } : {}),
    },
    orderBy: [{ shop: { name: "asc" } }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      description: true,
      shop: { select: { id: true, name: true } },
      _count: { select: { products: true } },
    },
  });

  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    description: category.description,
    shopId: category.shop.id,
    shopName: category.shop.name,
    productCount: category._count.products,
  }));
}
