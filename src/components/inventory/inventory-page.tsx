import { Boxes } from "lucide-react";
import { prisma } from "@/lib/db";
import { PERMISSIONS } from "@/lib/constants";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { can, getCurrentUser, resolveShopScope } from "@/server/auth-context";
import {
  getInventoryValue,
  listInventory,
  type StockFilter,
} from "@/server/services/inventory.queries";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { Card, CardContent } from "@/components/ui/card";
import { InventoryTable } from "./inventory-table";
import { InventoryFilters } from "./inventory-filters";

export interface InventorySearchParams {
  shop?: string;
  category?: string;
  q?: string;
  status?: string;
  page?: string;
}

/**
 * Shared body for the inventory overview and the low/out-of-stock worklists.
 * `lockedFilter` pins a page to one stock level and hides the status control.
 */
export async function InventoryPage({
  title,
  description,
  basePath,
  lockedFilter,
  emptyTitle,
  emptyDescription,
  searchParams,
}: {
  title: string;
  description: string;
  basePath: string;
  lockedFilter?: StockFilter;
  emptyTitle: string;
  emptyDescription: string;
  searchParams: InventorySearchParams;
}) {
  const user = await getCurrentUser();
  const shopIds = resolveShopScope(user, searchParams.shop);
  const canSeeAllShops = can(user, PERMISSIONS.INVENTORY_VIEW_ALL);

  const filter =
    lockedFilter ??
    (["in", "low", "out"].includes(searchParams.status ?? "")
      ? (searchParams.status as StockFilter)
      : "all");

  const [result, shops, categories, totalValue] = await Promise.all([
    listInventory({
      shopIds,
      search: searchParams.q,
      categoryId: searchParams.category,
      filter,
      page: Number(searchParams.page) || 1,
    }),
    canSeeAllShops
      ? prisma.shop.findMany({
          where: { status: "ACTIVE" },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    prisma.category.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    getInventoryValue(shopIds),
  ]);

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries({
    shop: searchParams.shop,
    category: searchParams.category,
    q: searchParams.q,
    status: lockedFilter ? undefined : searchParams.status,
  })) {
    if (value) query.set(key, value);
  }

  const unitsOnPage = result.data.reduce((sum, row) => sum + row.quantity, 0);

  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} />

      <InventoryFilters
        shops={shops}
        categories={categories}
        selectedShop={searchParams.shop ?? ""}
        selectedCategory={searchParams.category ?? ""}
        search={searchParams.q ?? ""}
        showStatusFilter={!lockedFilter}
        selectedStatus={searchParams.status ?? ""}
      />

      <Card>
        <CardContent className="p-0">
          {result.data.length === 0 ? (
            <EmptyState
              icon={Boxes}
              title={emptyTitle}
              description={emptyDescription}
            />
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3 text-sm">
                <span className="text-text-secondary">
                  {formatNumber(result.total)}{" "}
                  {result.total === 1 ? "line" : "lines"}
                  {!lockedFilter && (
                    <> · {formatNumber(unitsOnPage)} units on this page</>
                  )}
                </span>
                {!lockedFilter && (
                  <span className="font-medium">
                    {formatCurrency(totalValue)}{" "}
                    <span className="font-normal text-text-muted">
                      total stock value at cost
                    </span>
                  </span>
                )}
              </div>

              <InventoryTable rows={result.data} showShop={canSeeAllShops} />

              <Pagination
                page={result.page}
                totalPages={result.totalPages}
                total={result.total}
                baseParams={query}
                basePath={basePath}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
