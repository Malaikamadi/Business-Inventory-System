import Link from "next/link";
import { Plus, Store } from "lucide-react";
import { prisma } from "@/lib/db";
import { PERMISSIONS } from "@/lib/constants";
import { startOfBusinessMonth } from "@/lib/dates";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { can, getCurrentUser } from "@/server/auth-context";
import { requireCanAny } from "@/server/page-guards";
import { getShopPerformance } from "@/server/services/dashboard.service";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Shops · InvSys" };

export default async function ShopsPage() {
  const user = await getCurrentUser();
  requireCanAny(
    user,
    [PERMISSIONS.SHOPS_VIEW_ALL, PERMISSIONS.SHOPS_VIEW_ASSIGNED],
    "/shops"
  );

  const canSeeAll = can(user, PERMISSIONS.SHOPS_VIEW_ALL);
  const canCreate = can(user, PERMISSIONS.SHOPS_CREATE);
  const shopIds = canSeeAll ? undefined : user.shopIds;

  const [shops, performance, inventory] = await Promise.all([
    prisma.shop.findMany({
      where: shopIds ? { id: { in: shopIds } } : undefined,
      orderBy: [{ status: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        location: true,
        phone: true,
        status: true,
        _count: { select: { staffAssignments: true } },
      },
    }),
    getShopPerformance(startOfBusinessMonth(), shopIds),
    prisma.shopInventory.groupBy({
      by: ["shopId"],
      where: shopIds ? { shopId: { in: shopIds } } : undefined,
      _sum: { quantity: true },
    }),
  ]);

  const revenueByShop = new Map(performance.map((p) => [p.shopId, p]));
  const unitsByShop = new Map(
    inventory.map((row) => [row.shopId, row._sum.quantity ?? 0])
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={canSeeAll ? "Shops" : shops.length === 1 ? shops[0].name : "Your shops"}
        description={
          canSeeAll
            ? "Every branch, its staff, and how it is performing this month."
            : "The branch you are assigned to. You can view its stock and sales, but not add or edit shops."
        }
      >
        {canCreate && (
          <Button asChild>
            <Link href="/shops/new">
              <Plus className="h-4 w-4" />
              Add shop
            </Link>
          </Button>
        )}
      </PageHeader>

      {shops.length === 0 ? (
        <EmptyState
          icon={Store}
          title={canSeeAll ? "No shops yet" : "No shop assigned"}
          description={
            canSeeAll
              ? "Add your first shop to start tracking inventory and sales."
              : "Ask the owner to assign you to a shop before you can record sales."
          }
          actionLabel={canCreate ? "Add shop" : undefined}
          actionHref={canCreate ? "/shops/new" : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shops.map((shop) => {
            const stats = revenueByShop.get(shop.id);

            return (
              <Card key={shop.id} className="kpi-card">
                <CardContent className="space-y-4 p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/shops/${shop.id}`}
                        className="text-base font-semibold text-text-primary hover:text-accent"
                      >
                        {shop.name}
                      </Link>
                      {shop.location && (
                        <p className="mt-0.5 truncate text-sm text-text-muted">
                          {shop.location}
                        </p>
                      )}
                    </div>
                    {shop.status === "INACTIVE" && (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </div>

                  <dl className="grid grid-cols-2 gap-4 border-t border-border pt-4 text-sm">
                    <div>
                      <dt className="text-xs text-text-muted">
                        Revenue this month
                      </dt>
                      <dd className="mt-0.5 font-semibold tabular-nums">
                        {formatCurrency(stats?.revenue ?? 0)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-text-muted">Sales</dt>
                      <dd className="mt-0.5 font-semibold tabular-nums">
                        {formatNumber(stats?.salesCount ?? 0)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-text-muted">Units in stock</dt>
                      <dd className="mt-0.5 font-semibold tabular-nums">
                        {formatNumber(unitsByShop.get(shop.id) ?? 0)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-text-muted">Staff</dt>
                      <dd className="mt-0.5 font-semibold tabular-nums">
                        {formatNumber(shop._count.staffAssignments)}
                      </dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
