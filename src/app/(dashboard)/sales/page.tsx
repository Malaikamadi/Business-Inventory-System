import Link from "next/link";
import { Plus, Receipt } from "lucide-react";
import { prisma } from "@/lib/db";
import { PERMISSIONS } from "@/lib/constants";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/utils";
import { can, getCurrentUser, resolveShopScope } from "@/server/auth-context";
import { requireCanAny } from "@/server/page-guards";
import { listSales } from "@/server/services/sales.queries";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SalesFilters } from "@/components/sales/sales-filters";

export const metadata = { title: "Sales · InvSys" };

export default async function SalesPage(props: {
  searchParams: Promise<{
    shop?: string;
    status?: string;
    q?: string;
    page?: string;
  }>;
}) {
  const user = await getCurrentUser();
  requireCanAny(
    user,
    [PERMISSIONS.SALES_VIEW_ALL, PERMISSIONS.SALES_VIEW_ASSIGNED],
    "/sales"
  );
  const params = await props.searchParams;

  // Throws if a salesperson hand-edits the shop parameter to another branch.
  const shopIds = resolveShopScope(user, params.shop);
  const canSeeAllShops = can(user, PERMISSIONS.SALES_VIEW_ALL);

  const shops = canSeeAllShops
    ? await prisma.shop.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      })
    : [];

  const status =
    params.status === "VOIDED" || params.status === "COMPLETED"
      ? params.status
      : undefined;

  const result = await listSales({
    shopIds,
    status,
    search: params.q,
    page: Number(params.page) || 1,
  });

  const query = new URLSearchParams();
  if (params.shop) query.set("shop", params.shop);
  if (params.status) query.set("status", params.status);
  if (params.q) query.set("q", params.q);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales"
        description={
          canSeeAllShops
            ? "Sales recorded by shop staff across the business."
            : "Sales you have recorded at your shop."
        }
      >
        {can(user, PERMISSIONS.SALES_CREATE) && (
          <Button asChild>
            <Link href="/sales/new">
              <Plus className="h-4 w-4" />
              Record sale
            </Link>
          </Button>
        )}
      </PageHeader>

      <SalesFilters
        shops={shops}
        selectedShop={params.shop ?? ""}
        selectedStatus={params.status ?? ""}
        search={params.q ?? ""}
      />

      <Card>
        <CardContent className="p-0">
          {result.data.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No sales found"
              description={
                params.q || params.status || params.shop
                  ? "No sales match the current filters. Try clearing them."
                  : "Sales will appear here as soon as they are recorded."
              }
            />
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3 text-sm">
                <span className="text-text-secondary">
                  {formatNumber(result.total)}{" "}
                  {result.total === 1 ? "sale" : "sales"}
                </span>
                <span className="font-medium">
                  {formatCurrency(result.filteredRevenue)}{" "}
                  <span className="font-normal text-text-muted">
                    net revenue
                  </span>
                </span>
              </div>

              <div className="data-table-wrapper">
                <table className="w-full text-sm">
                  <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-text-muted">
                    <tr>
                      <th className="px-4 py-3 font-medium">Sale</th>
                      {canSeeAllShops && (
                        <th className="hidden px-4 py-3 font-medium md:table-cell">
                          Shop
                        </th>
                      )}
                      <th className="hidden px-4 py-3 font-medium sm:table-cell">
                        Recorded by
                      </th>
                      <th className="px-4 py-3 text-right font-medium">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {result.data.map((sale) => (
                      <tr key={sale.id} className="hover:bg-surface-hover">
                        <td className="px-4 py-3">
                          <Link
                            href={`/sales/${sale.id}`}
                            className="font-medium text-text-primary hover:text-accent"
                          >
                            {sale.saleNumber}
                          </Link>
                          <p className="text-xs text-text-muted">
                            {formatDateTime(sale.createdAt)} ·{" "}
                            {sale.itemsCount}{" "}
                            {sale.itemsCount === 1 ? "item" : "items"}
                          </p>
                        </td>
                        {canSeeAllShops && (
                          <td className="hidden px-4 py-3 text-text-secondary md:table-cell">
                            {sale.shop.name}
                          </td>
                        )}
                        <td className="hidden px-4 py-3 text-text-secondary sm:table-cell">
                          {sale.salesperson.firstName}{" "}
                          {sale.salesperson.lastName}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {sale.status === "VOIDED" ? (
                            <div className="flex items-center justify-end gap-2">
                              <Badge variant="danger">Voided</Badge>
                              <span className="tabular-nums text-text-muted line-through">
                                {formatCurrency(Number(sale.totalAmount))}
                              </span>
                            </div>
                          ) : (
                            <span className="font-medium tabular-nums">
                              {formatCurrency(Number(sale.totalAmount))}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Pagination
                page={result.page}
                totalPages={result.totalPages}
                total={result.total}
                baseParams={query}
                basePath="/sales"
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
