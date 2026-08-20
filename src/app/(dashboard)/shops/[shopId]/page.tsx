import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Boxes,
  Banknote,
  PackageX,
  Pencil,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { PERMISSIONS } from "@/lib/constants";
import { startOfBusinessMonth } from "@/lib/dates";
import { formatCurrency, formatNumber } from "@/lib/utils";
import {
  assertShopAccess,
  can,
  getCurrentUser,
} from "@/server/auth-context";
import {
  getStockAlertCounts,
  getRecentSales,
} from "@/server/services/dashboard.service";
import {
  getInventoryValue,
  listInventory,
} from "@/server/services/inventory.queries";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InventoryTable } from "@/components/inventory/inventory-table";
import { RecentSalesTable } from "@/components/dashboard/recent-sales-table";

export const metadata = { title: "Shop · InvSys" };

export default async function ShopDetailPage(props: {
  params: Promise<{ shopId: string }>;
}) {
  const { shopId } = await props.params;
  const user = await getCurrentUser();
  // The route guard only established that this user may view *some* shop.
  // Membership in this particular one is what decides access.
  assertShopAccess(user, shopId);

  const canSeeAllShops = can(user, PERMISSIONS.SHOPS_VIEW_ALL);
  const canSeeCost = can(user, PERMISSIONS.PRODUCTS_VIEW_COST);

  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: {
      id: true,
      name: true,
      location: true,
      address: true,
      phone: true,
      email: true,
      status: true,
      staffAssignments: {
        select: {
          isPrimary: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              isActive: true,
              role: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  if (!shop) notFound();

  const monthStart = startOfBusinessMonth();

  const [monthSales, alerts, inventoryValue, units, lowStock, recentSales] =
    await Promise.all([
      prisma.sale.aggregate({
        where: {
          shopId,
          status: "COMPLETED",
          createdAt: { gte: monthStart },
        },
        _sum: { totalAmount: true },
        _count: true,
      }),
      getStockAlertCounts([shopId]),
        canSeeCost ? getInventoryValue([shopId]) : Promise.resolve(0),
      prisma.shopInventory.aggregate({
        where: { shopId },
        _sum: { quantity: true },
      }),
      listInventory({ shopIds: [shopId], filter: "low", pageSize: 8 }),
      getRecentSales(8, [shopId]),
    ]);

  return (
    <div className="space-y-6">
      {canSeeAllShops && (
        <Link
          href="/shops"
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to shops
        </Link>
      )}

      <PageHeader
        title={shop.name}
        description={
          [shop.location, shop.address].filter(Boolean).join(" · ") ||
          "No location recorded"
        }
      >
        {shop.status === "INACTIVE" && <Badge variant="secondary">Inactive</Badge>}
        {can(user, PERMISSIONS.SHOPS_UPDATE) && (
          <Button asChild variant="outline">
            <Link href={`/shops/${shop.id}/edit`}>
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
          </Button>
        )}
      </PageHeader>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Revenue this month"
          value={formatCurrency(Number(monthSales._sum.totalAmount ?? 0))}
          subtitle={`${formatNumber(monthSales._count)} sales`}
          icon={Banknote}
        />
        <StatCard
          title="Stock on hand"
          value={formatNumber(units._sum.quantity ?? 0)}
          subtitle={
            canSeeCost ? `${formatCurrency(inventoryValue)} at cost` : undefined
          }
          icon={Boxes}
        />
        <StatCard
          title="Running low"
          value={formatNumber(alerts.lowStock)}
          icon={AlertTriangle}
          iconClassName={
            alerts.lowStock > 0
              ? "bg-warning-light text-warning-foreground"
              : undefined
          }
        />
        <StatCard
          title="Out of stock"
          value={formatNumber(alerts.outOfStock)}
          icon={PackageX}
          iconClassName={
            alerts.outOfStock > 0 ? "bg-danger-light text-danger" : undefined
          }
        />
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Recent sales</CardTitle>
            <Link
              href={`/sales?shop=${shop.id}`}
              className="text-sm font-medium text-accent hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <RecentSalesTable sales={recentSales} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Staff</CardTitle>
          </CardHeader>
          <CardContent>
            {shop.staffAssignments.length === 0 ? (
              <p className="py-6 text-center text-sm text-text-muted">
                No staff assigned to this shop.
              </p>
            ) : (
              <ul className="space-y-3">
                {shop.staffAssignments.map((assignment) => (
                  <li
                    key={assignment.user.id}
                    className="flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-text-primary">
                        {assignment.user.firstName} {assignment.user.lastName}
                      </p>
                      <p className="truncate text-xs text-text-muted">
                        {assignment.user.email}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {!assignment.user.isActive && (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                      {assignment.isPrimary && (
                        <Badge variant="outline">Primary</Badge>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Needs restocking</CardTitle>
          <Link
            href={`/inventory?shop=${shop.id}`}
            className="text-sm font-medium text-accent hover:underline"
          >
            View full inventory
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {lowStock.data.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-text-muted">
              Every product at this shop is above its low-stock threshold.
            </p>
          ) : (
            <InventoryTable
              rows={lowStock.data}
              showShop={false}
              showValue={canSeeCost}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
