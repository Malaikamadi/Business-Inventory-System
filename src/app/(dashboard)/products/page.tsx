import Link from "next/link";
import { Package, Plus } from "lucide-react";
import { prisma } from "@/lib/db";
import { PERMISSIONS } from "@/lib/constants";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { assertCan, can, getCurrentUser } from "@/server/auth-context";
import { listProducts } from "@/server/services/product.queries";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProductFilters } from "@/components/products/product-filters";

export const metadata = { title: "Products · InvSys" };

export default async function ProductsPage(props: {
  searchParams: Promise<{
    q?: string;
    category?: string;
    status?: string;
    page?: string;
  }>;
}) {
  const user = await getCurrentUser();
  assertCan(user, PERMISSIONS.PRODUCTS_VIEW);

  const params = await props.searchParams;
  const canManage = can(user, PERMISSIONS.PRODUCTS_CREATE);

  const [result, categories] = await Promise.all([
    listProducts({
      search: params.q,
      categoryId: params.category,
      status: params.status === "DISCONTINUED" ? "DISCONTINUED" : "ACTIVE",
      page: Number(params.page) || 1,
    }),
    prisma.category.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  if (params.category) query.set("category", params.category);
  if (params.status) query.set("status", params.status);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description="The product catalog is business-wide. Stock quantities belong to individual shops."
      >
        {canManage && (
          <Button asChild>
            <Link href="/products/new">
              <Plus className="h-4 w-4" />
              Add product
            </Link>
          </Button>
        )}
      </PageHeader>

      <ProductFilters
        categories={categories}
        selectedCategory={params.category ?? ""}
        selectedStatus={params.status ?? ""}
        search={params.q ?? ""}
      />

      <Card>
        <CardContent className="p-0">
          {result.data.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No products found"
              description={
                params.q || params.category
                  ? "No products match the current filters. Try clearing them."
                  : "Add your first product to start tracking stock across shops."
              }
              actionLabel={canManage ? "Add product" : undefined}
              actionHref={canManage ? "/products/new" : undefined}
            />
          ) : (
            <>
              <div className="data-table-wrapper">
                <table className="w-full text-sm">
                  <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-text-muted">
                    <tr>
                      <th className="px-4 py-3 font-medium">Product</th>
                      <th className="hidden px-4 py-3 font-medium md:table-cell">
                        Category
                      </th>
                      <th className="hidden px-4 py-3 text-right font-medium lg:table-cell">
                        Cost
                      </th>
                      <th className="px-4 py-3 text-right font-medium">Price</th>
                      <th className="px-4 py-3 text-right font-medium">
                        Total stock
                      </th>
                      <th className="px-4 py-3 text-right font-medium">
                        Restock
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {result.data.map((product) => {
                      const margin =
                        Number(product.sellingPrice) - Number(product.costPrice);
                      const marginPct =
                        Number(product.sellingPrice) > 0
                          ? (margin / Number(product.sellingPrice)) * 100
                          : 0;

                      return (
                        <tr key={product.id} className="hover:bg-surface-hover">
                          <td className="px-4 py-3">
                            <Link
                              href={`/products/${product.id}`}
                              className="font-medium text-text-primary hover:text-accent"
                            >
                              {product.name}
                            </Link>
                            <p className="text-xs text-text-muted">
                              {product.sku}
                            </p>
                          </td>
                          <td className="hidden px-4 py-3 text-text-secondary md:table-cell">
                            {product.category?.name ?? "—"}
                          </td>
                          <td className="hidden px-4 py-3 text-right tabular-nums text-text-secondary lg:table-cell">
                            {formatCurrency(Number(product.costPrice))}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="font-medium tabular-nums">
                              {formatCurrency(Number(product.sellingPrice))}
                            </span>
                            <p className="text-xs text-text-muted">
                              {marginPct.toFixed(0)}% margin
                            </p>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold tabular-nums">
                            {formatNumber(product.totalStock)}
                            <p className="text-xs font-normal text-text-muted">
                              across {product.shopCount}{" "}
                              {product.shopCount === 1 ? "shop" : "shops"}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {product.shopsNeedingStock > 0 ? (
                              <Badge variant="warning">
                                {product.shopsNeedingStock}{" "}
                                {product.shopsNeedingStock === 1
                                  ? "shop"
                                  : "shops"}
                              </Badge>
                            ) : (
                              <span className="text-xs text-text-muted">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <Pagination
                page={result.page}
                totalPages={result.totalPages}
                total={result.total}
                baseParams={query}
                basePath="/products"
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
