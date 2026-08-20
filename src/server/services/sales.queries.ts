import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants";

export interface SalesQuery {
  /** `undefined` means all shops and is only passed for business-wide readers. */
  shopIds?: string[];
  salespersonId?: string;
  status?: "COMPLETED" | "VOIDED";
  from?: Date;
  to?: Date;
  search?: string;
  page?: number;
  pageSize?: number;
}

export async function listSales(query: SalesQuery) {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
  const search = query.search?.trim();

  const where: Prisma.SaleWhereInput = {
    ...(query.shopIds ? { shopId: { in: query.shopIds } } : {}),
    ...(query.salespersonId ? { salespersonId: query.salespersonId } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.from || query.to
      ? {
          createdAt: {
            ...(query.from ? { gte: query.from } : {}),
            ...(query.to ? { lt: query.to } : {}),
          },
        }
      : {}),
    ...(search
      ? {
          OR: [
            { saleNumber: { contains: search, mode: "insensitive" } },
            { items: { some: { productName: { contains: search, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };

  const [data, total, totals] = await Promise.all([
    prisma.sale.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        saleNumber: true,
        totalAmount: true,
        itemsCount: true,
        status: true,
        createdAt: true,
        voidedAt: true,
        shop: { select: { id: true, name: true } },
        salesperson: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    prisma.sale.count({ where }),
    prisma.sale.aggregate({
      where: { ...where, status: "COMPLETED" },
      _sum: { totalAmount: true },
    }),
  ]);

  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    /** Revenue for the current filter, excluding voided sales. */
    filteredRevenue: Number(totals._sum.totalAmount ?? 0),
  };
}

export async function getSaleDetail(saleId: string) {
  return prisma.sale.findUnique({
    where: { id: saleId },
    select: {
      id: true,
      saleNumber: true,
      shopId: true,
      totalAmount: true,
      totalCost: true,
      itemsCount: true,
      status: true,
      notes: true,
      createdAt: true,
      voidedAt: true,
      voidReason: true,
      shop: { select: { id: true, name: true, location: true, address: true, phone: true } },
      salesperson: { select: { firstName: true, lastName: true, email: true } },
      voidedByUser: { select: { firstName: true, lastName: true } },
      items: {
        select: {
          id: true,
          productId: true,
          productName: true,
          quantity: true,
          unitPrice: true,
          unitCost: true,
          lineTotal: true,
          product: { select: { sku: true, imageUrl: true, status: true } },
        },
      },
    },
  });
}
