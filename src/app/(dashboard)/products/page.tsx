import Link from "next/link";
import { Package, Plus } from "lucide-react";
import { prisma } from "@/lib/db";
import { PERMISSIONS } from "@/lib/constants";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { can, getCurrentUser, resolveShopScope } from "@/server/auth-context";
import { requireCan } from "@/server/page-guards";
import { listProducts } from "@/server/services/product.queries";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProductFilters } from "@/components/products/product-filters";
import { ProductIdentity } from "@/components/products/product-identity";

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
  requireCan(user, PERMISSIONS.PRODUCTS_VIEW, "/products");

  const params = await props.searchParams;
  const canManage = can(user, PERMISSIONS.PRODUCTS_CREATE);
  const canSeeCost = can(user, PERMISSIONS.PRODUCTS_VIEW_COST);
  const canSeeAllShops = can(user, PERMISSIONS.INVENTORY_VIEW_ALL);
  const shopIds = resolveShopScope(user);

  const [result, categories] = await Promise.all([
    listProducts({
      search: params.q,
      categoryId: params.category,
      status: params.status === "DISCONTINUED" ? "DISCONTINUED" : "ACTIVE",
      page: Number(params.page) || 1,
      shopIds,
    }),
    prisma.category.findMany({
      where: {
        isActive: true,
        ...(shopIds ? { shopId: { in: shopIds } } : {}),
      },
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
        description="Each shop has its own catalog. Stock quantities belong to that shop."
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
                      {canSeeAllShops && (
                        <th className="hidden px-4 py-3 font-medium lg:table-cell">
                          Shop
                        </th>
                      )}
                      <th className="hidden px-4 py-3 font-medium md:table-cell">
                        Category
                      </th>
                      {canSeeCost && (
                        <th className="hidden px-4 py-3 text-right font-medium lg:table-cell">
                          Cost
                        </th>
                      )}
                      <th className="px-4 py-3 text-right font-medium">Price</th>
                      <th className="px-4 py-3 text-right font-medium">
                        {canSeeAllShops ? "Total stock" : "Your stock"}
                      </th>
                      <th className="px-4 py-3 font-medium">Status</th>
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
                            <ProductIdentity
                              href={`/products/${product.id}`}
                              name={product.name}
                              sku={product.sku}
                              imageUrl={product.imageUrl}
                              size="md"
                            />
                          </td>
                          {canSeeAllShops && (
                            <td className="hidden px-4 py-3 text-text-secondary lg:table-cell">
                              {product.shop.name}
                            </td>
                          )}
                          <td className="hidden px-4 py-3 text-text-secondary md:table-cell">
                            {product.category?.name ?? "—"}
                          </td>
                          {canSeeCost && (
                            <td className="hidden px-4 py-3 text-right tabular-nums text-text-secondary lg:table-cell">
                              {formatCurrency(Number(product.costPrice))}
                            </td>
                          )}
                          <td className="px-4 py-3 text-right">
                            <span className="font-medium tabular-nums">
                              {formatCurrency(Number(product.sellingPrice))}
                            </span>
                            {canSeeCost && (
                              <p className="text-xs text-text-muted">
                                {marginPct.toFixed(0)}% margin
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold tabular-nums">
                            {formatNumber(product.totalStock)}
                            <p className="text-xs font-normal text-text-muted">
                              across {product.shopCount}{" "}
                              {product.shopCount === 1 ? "shop" : "shops"}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            {product.status === "DISCONTINUED" ? (
                              <Badge variant="secondary">Discontinued</Badge>
                            ) : product.totalStock <= 0 ? (
                              <Badge variant="danger">Out of stock</Badge>
                            ) : product.shopsNeedingStock > 0 ? (
                              <Badge variant="warning">Low stock</Badge>
                            ) : (
                              <Badge variant="success">Active</Badge>
                            )}
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
