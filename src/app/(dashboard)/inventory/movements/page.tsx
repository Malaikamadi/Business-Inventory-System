import Link from "next/link";
import { ArrowRightLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { MOVEMENT_TYPE_LABELS, PERMISSIONS } from "@/lib/constants";
import { cn, formatDateTime, formatNumber } from "@/lib/utils";
import { can, getCurrentUser, resolveShopScope } from "@/server/auth-context";
import { requireCanAny } from "@/server/page-guards";
import { listMovements } from "@/server/services/inventory.queries";
import { movementReviewLabel } from "@/server/services/review.service";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { Card, CardContent } from "@/components/ui/card";
import { MovementFilters } from "@/components/inventory/movement-filters";
import { ProductIdentity } from "@/components/products/product-identity";
import { ReviewBadge } from "@/components/review/review-badge";

export const metadata = { title: "Stock movements · InvSys" };

/** Links a movement back to the document that caused it, where one exists. */
function referenceHref(referenceType: string | null, referenceId: string | null) {
  if (!referenceId) return null;
  if (referenceType === "sale" || referenceType === "sale_void") {
    return `/sales/${referenceId}`;
  }
  return null;
}

export default async function MovementsPage(props: {
  searchParams: Promise<{
    shop?: string;
    type?: string;
    page?: string;
    product?: string;
  }>;
}) {
  const user = await getCurrentUser();
  requireCanAny(
    user,
    [
      PERMISSIONS.STOCK_MOVEMENTS_VIEW_ALL,
      PERMISSIONS.STOCK_MOVEMENTS_VIEW_ASSIGNED,
    ],
    "/inventory/movements"
  );
  const params = await props.searchParams;

  const shopIds = resolveShopScope(user, params.shop);
  const canSeeAllShops = can(user, PERMISSIONS.STOCK_MOVEMENTS_VIEW_ALL);

  const [result, shops, product] = await Promise.all([
    listMovements({
      shopIds,
      productId: params.product,
      movementType: params.type,
      page: Number(params.page) || 1,
    }),
    canSeeAllShops
      ? prisma.shop.findMany({
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    params.product
      ? prisma.product.findUnique({
          where: { id: params.product },
          select: { id: true, name: true },
        })
      : Promise.resolve(null),
  ]);

  const query = new URLSearchParams();
  if (params.shop) query.set("shop", params.shop);
  if (params.type) query.set("type", params.type);
  if (params.product) query.set("product", params.product);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock movements"
        description={
          product
            ? `Every change to ${product.name}, in order.`
            : "Every change to stock, in order. This ledger is append-only and is what current quantities are derived from."
        }
      />

      {product && (
        <div className="flex items-center gap-3 rounded-md border border-border bg-muted/50 px-4 py-2.5 text-sm">
          <span className="text-text-secondary">
            Filtered to <strong className="text-text-primary">{product.name}</strong>
          </span>
          <Link
            href="/inventory/movements"
            className="font-medium text-accent hover:underline"
          >
            Show all products
          </Link>
        </div>
      )}

      <MovementFilters
        shops={shops}
        selectedShop={params.shop ?? ""}
        selectedType={params.type ?? ""}
      />

      <Card>
        <CardContent className="p-0">
          {result.data.length === 0 ? (
            <EmptyState
              icon={ArrowRightLeft}
              title="No movements found"
              description="Stock arrivals, sales, adjustments and transfers will all appear here."
            />
          ) : (
            <>
              <div className="data-table-wrapper">
                <table className="w-full text-sm">
                  <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-text-muted">
                    <tr>
                      <th className="px-4 py-3 font-medium">When</th>
                      <th className="px-4 py-3 font-medium">Product</th>
                      {canSeeAllShops && (
                        <th className="hidden px-4 py-3 font-medium md:table-cell">
                          Shop
                        </th>
                      )}
                      <th className="px-4 py-3 font-medium">Type</th>
                      <th className="px-4 py-3 text-right font-medium">
                        Change
                      </th>
                      <th className="hidden px-4 py-3 text-right font-medium sm:table-cell">
                        Balance after
                      </th>
                      <th className="hidden px-4 py-3 font-medium lg:table-cell">
                        By
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {result.data.map((movement) => {
                      const href = referenceHref(
                        movement.referenceType,
                        movement.referenceId
                      );
                      const increase = movement.quantityChange > 0;
                      const reviewLabel = can(user, PERMISSIONS.AUDIT_VIEW)
                        ? movementReviewLabel(movement)
                        : null;

                      return (
                        <tr key={movement.id} className="hover:bg-surface-hover">
                          <td className="whitespace-nowrap px-4 py-3 text-text-secondary">
                            {formatDateTime(movement.createdAt)}
                          </td>
                          <td className="px-4 py-3">
                            <ProductIdentity
                              href={`/products/${movement.product.id}`}
                              name={movement.product.name}
                              sku={movement.product.sku}
                              imageUrl={movement.product.imageUrl}
                            />
                          </td>
                          {canSeeAllShops && (
                            <td className="hidden px-4 py-3 text-text-secondary md:table-cell">
                              {movement.shop.name}
                            </td>
                          )}
                          <td className="px-4 py-3">
                            {href ? (
                              <Link
                                href={href}
                                className="text-text-secondary hover:text-accent"
                              >
                                {MOVEMENT_TYPE_LABELS[movement.movementType] ??
                                  movement.movementType}
                              </Link>
                            ) : (
                              <span className="text-text-secondary">
                                {MOVEMENT_TYPE_LABELS[movement.movementType] ??
                                  movement.movementType}
                              </span>
                            )}
                            {movement.reason && (
                              <p className="max-w-[220px] truncate text-xs text-text-muted">
                                {movement.reason}
                              </p>
                            )}
                            {reviewLabel && (
                              <div className="mt-1">
                                <ReviewBadge label={reviewLabel} />
                              </div>
                            )}
                          </td>
                          <td
                            className={cn(
                              "px-4 py-3 text-right font-semibold tabular-nums",
                              increase ? "text-success" : "text-danger"
                            )}
                          >
                            {increase ? "+" : ""}
                            {formatNumber(movement.quantityChange)}
                          </td>
                          <td className="hidden px-4 py-3 text-right tabular-nums text-text-secondary sm:table-cell">
                            {formatNumber(movement.quantityAfter)}
                          </td>
                          <td className="hidden px-4 py-3 text-text-secondary lg:table-cell">
                            {movement.user.firstName} {movement.user.lastName}
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
                basePath="/inventory/movements"
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
