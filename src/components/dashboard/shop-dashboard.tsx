import Link from "next/link";
import {
  AlertTriangle,
  Banknote,
  PackageX,
  Plus,
  Receipt,
  ShoppingBag,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { formatCurrency, formatNumber } from "@/lib/utils";
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
        <Button asChild size="lg" className="w-full sm:w-auto">
          <Link href="/sales/new">
            <Plus className="h-4 w-4" />
            Record sale
          </Link>
        </Button>
      </div>

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
                actionLabel="Record your first sale"
                actionHref="/sales/new"
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
