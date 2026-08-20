import Link from "next/link";
import {
  AlertTriangle,
  Banknote,
  BarChart3,
  Boxes,
  Package,
  PackageX,
  Plus,
  Receipt,
  ShoppingBag,
  Store,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { PERMISSIONS } from "@/lib/constants";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { can, canAny } from "@/server/auth-context";
import {
  getRecentSales,
  getShopKPIs,
} from "@/server/services/dashboard.service";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { RecentSalesTable } from "./recent-sales-table";
import { StockAlerts } from "./stock-alerts";
import type { SessionUser } from "@/types";

/**
 * Shop-scoped view for staff. Optimised for recording a sale quickly rather
 * than for analysis, so the primary action stays above the fold on a phone.
 */
export async function ShopDashboard({ user }: { user: SessionUser }) {
  const shopId = user.primaryShopId ?? user.shopIds[0];

  if (!shopId) {
    return (
      <EmptyState
        title="No shop assigned"
        description="Your account is not assigned to a shop yet. Ask the business owner to assign you before recording sales."
      />
    );
  }

  const [shop, kpis, recentSales] = await Promise.all([
    prisma.shop.findUnique({
      where: { id: shopId },
      select: { name: true, location: true },
    }),
    getShopKPIs(shopId),
    getRecentSales(8, [shopId]),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            {shop?.name ?? "Your shop"}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Today&apos;s activity for {user.firstName}.
          </p>
        </div>
        {can(user, PERMISSIONS.SALES_CREATE) && (
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/sales/new">
              <Plus className="h-4 w-4" />
              Record sale
            </Link>
          </Button>
        )}
      </div>

      <RoleShortcuts user={user} shopId={shopId} />

      <section
        aria-label="Today"
        className="grid grid-cols-2 gap-4 lg:grid-cols-4"
      >
        <StatCard
          title="Revenue today"
          value={formatCurrency(kpis.todayRevenue)}
          icon={Banknote}
        />
        <StatCard
          title="Sales today"
          value={formatNumber(kpis.todaySales)}
          subtitle={`${formatNumber(kpis.todayItemsSold)} items sold`}
          icon={Receipt}
        />
        <StatCard
          title="Running low"
          value={formatNumber(kpis.lowStockCount)}
          icon={AlertTriangle}
          iconClassName={
            kpis.lowStockCount > 0
              ? "bg-warning-light text-warning-foreground"
              : undefined
          }
        />
        <StatCard
          title="Out of stock"
          value={formatNumber(kpis.outOfStockCount)}
          icon={PackageX}
          iconClassName={
            kpis.outOfStockCount > 0 ? "bg-danger-light text-danger" : undefined
          }
        />
      </section>

      <StockAlerts shopIds={[shopId]} />

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Recent sales</CardTitle>
          <Link
            href="/sales"
            className="text-sm font-medium text-accent hover:underline"
          >
            View all
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {recentSales.length === 0 ? (
            <div className="px-6">
              <EmptyState
                icon={ShoppingBag}
                title="No sales yet"
                description="Sales you record at this shop will appear here."
                actionLabel={
                  can(user, PERMISSIONS.SALES_CREATE)
                    ? "Record your first sale"
                    : undefined
                }
                actionHref={
                  can(user, PERMISSIONS.SALES_CREATE) ? "/sales/new" : undefined
                }
              />
            </div>
          ) : (
            <RecentSalesTable sales={recentSales} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RoleShortcuts({ user, shopId }: { user: SessionUser; shopId: string }) {
  const items = [
    canAny(user, [
      PERMISSIONS.INVENTORY_VIEW_ALL,
      PERMISSIONS.INVENTORY_VIEW_ASSIGNED,
    ]) && {
      href: "/inventory",
      label: "Inventory",
      icon: Boxes,
    },
    can(user, PERMISSIONS.PRODUCTS_VIEW) && {
      href: "/products",
      label: "Products",
      icon: Package,
    },
    canAny(user, [PERMISSIONS.SALES_VIEW_ALL, PERMISSIONS.SALES_VIEW_ASSIGNED]) && {
      href: "/sales",
      label: "Sales",
      icon: Receipt,
    },
    canAny(user, [PERMISSIONS.REPORTS_GLOBAL, PERMISSIONS.REPORTS_SHOP]) && {
      href: "/reports",
      label: "Reports",
      icon: BarChart3,
    },
    canAny(user, [
      PERMISSIONS.SHOPS_VIEW_ALL,
      PERMISSIONS.SHOPS_VIEW_ASSIGNED,
    ]) && {
      href: `/shops/${shopId}`,
      label: "This shop",
      icon: Store,
    },
  ].filter(
    (item): item is { href: string; label: string; icon: typeof Boxes } =>
      Boolean(item)
  );

  if (items.length === 0) return null;

  return (
    <nav aria-label="Your sections" className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="flex items-center gap-2.5 rounded-lg border border-border bg-surface px-3 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:border-accent hover:text-text-primary"
        >
          <item.icon className="h-4 w-4 shrink-0" />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
