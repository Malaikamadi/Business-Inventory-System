import Link from "next/link";
import { Boxes, Banknote, Store, TrendingUp, TruckIcon } from "lucide-react";
import { startOfBusinessMonth } from "@/lib/dates";
import {
  formatCurrency,
  formatNumber,
  formatRelativeTime,
} from "@/lib/utils";
import {
  getOwnerKPIs,
  getRecentSales,
  getSalespersonPerformance,
  getShopPerformance,
} from "@/server/services/dashboard.service";
import {
  getInventoryValue,
  listMovements,
} from "@/server/services/inventory.queries";
import { StatCard } from "@/components/shared/stat-card";
import { LiveRefresh } from "@/components/shared/live-refresh";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShopPerformanceChart } from "./shop-performance-chart";
import { RecentSalesTable } from "./recent-sales-table";
import { ProductIdentity } from "@/components/products/product-identity";

export async function OwnerDashboard({ firstName }: { firstName: string }) {
  const monthStart = startOfBusinessMonth();

  const [kpis, shops, staff, arrivals, inventoryValue, recentSales] =
    await Promise.all([
      getOwnerKPIs(),
      getShopPerformance(monthStart),
      getSalespersonPerformance(monthStart),
      listMovements({ movementType: ["ARRIVAL", "OPENING"], pageSize: 8 }),
      getInventoryValue(),
      getRecentSales(8),
    ]);

  return (
    <div className="space-y-6">
      <LiveRefresh />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary sm:text-3xl">
          Welcome, {firstName}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-text-secondary">
          Business overview of {kpis.totalShops} shop
          {kpis.totalShops === 1 ? "" : "s"}. The manager adds stock and staff;
          you see shop performance, those arrivals, and sales by each
          salesperson.
        </p>
      </div>

      <section
        aria-label="This period"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <StatCard
          title="Today's revenue"
          value={formatCurrency(kpis.totalRevenue)}
          subtitle={`${formatNumber(kpis.totalSales)} ${kpis.totalSales === 1 ? "sale" : "sales"}`}
          icon={Banknote}
        />
        <StatCard
          title="This month"
          value={formatCurrency(kpis.monthlyRevenue)}
          subtitle={`${formatNumber(kpis.monthlySales)} sales`}
          icon={TrendingUp}
        />
        <StatCard
          title="Stock on hand"
          value={formatNumber(kpis.totalInventoryUnits)}
          subtitle={`${formatCurrency(inventoryValue)} at cost`}
          icon={Boxes}
        />
        <StatCard
          title="Shops"
          value={formatNumber(kpis.totalShops)}
          subtitle="All branches"
          icon={Store}
        />
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Shop performance</CardTitle>
            <Link
              href="/reports"
              className="text-sm font-medium text-accent hover:underline"
            >
              Full reports
            </Link>
          </CardHeader>
          <CardContent>
            {shops.length > 0 ? (
              <ShopPerformanceChart data={shops} />
            ) : (
              <p className="py-8 text-center text-sm text-text-muted">
                No sales recorded this month yet.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>This month by shop</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {shops.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-text-muted">
                No shop sales this month.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-text-muted">
                  <tr>
                    <th className="px-6 py-3 font-medium">Shop</th>
                    <th className="px-6 py-3 text-right font-medium">Sales</th>
                    <th className="px-6 py-3 text-right font-medium">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {shops.map((shop) => (
                    <tr key={shop.shopId} className="hover:bg-surface-hover">
                      <td className="px-6 py-3">
                        <Link
                          href={`/shops/${shop.shopId}`}
                          className="font-medium text-text-primary hover:text-accent"
                        >
                          {shop.shopName}
                        </Link>
                      </td>
                      <td className="px-6 py-3 text-right tabular-nums text-text-secondary">
                        {formatNumber(shop.salesCount)}
                      </td>
                      <td className="px-6 py-3 text-right font-medium tabular-nums">
                        {formatCurrency(shop.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Sales by salesperson</CardTitle>
          <Link
            href="/sales"
            className="text-sm font-medium text-accent hover:underline"
          >
            All sales
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {staff.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-text-muted">
              Salespeople have not recorded sales this month yet.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-text-muted">
                <tr>
                  <th className="px-6 py-3 font-medium">Salesperson</th>
                  <th className="px-6 py-3 text-right font-medium">Sales</th>
                  <th className="px-6 py-3 text-right font-medium">Revenue</th>
                  <th className="hidden px-6 py-3 text-right font-medium sm:table-cell">
                    Avg. sale
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {staff.map((person) => (
                  <tr key={person.userId} className="hover:bg-surface-hover">
                    <td className="px-6 py-3 font-medium">{person.name}</td>
                    <td className="px-6 py-3 text-right tabular-nums text-text-secondary">
                      {formatNumber(person.salesCount)}
                    </td>
                    <td className="px-6 py-3 text-right font-semibold tabular-nums">
                      {formatCurrency(person.revenue)}
                    </td>
                    <td className="hidden px-6 py-3 text-right tabular-nums text-text-secondary sm:table-cell">
                      {person.salesCount > 0
                        ? formatCurrency(person.revenue / person.salesCount)
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2">
            <TruckIcon className="h-4 w-4 text-text-muted" />
            <CardTitle>Stock the manager added</CardTitle>
          </div>
          <Link
            href="/inventory/movements?type=ARRIVAL"
            className="text-sm font-medium text-accent hover:underline"
          >
            All arrivals
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {arrivals.data.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-text-muted">
              When the manager records a stock arrival, it appears here.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-text-muted">
                <tr>
                  <th className="px-6 py-3 font-medium">Product</th>
                  <th className="hidden px-6 py-3 font-medium md:table-cell">
                    Shop
                  </th>
                  <th className="px-6 py-3 text-right font-medium">Qty</th>
                  <th className="hidden px-6 py-3 font-medium sm:table-cell">
                    Added by
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {arrivals.data.map((movement) => (
                  <tr key={movement.id} className="hover:bg-surface-hover">
                    <td className="px-6 py-3">
                      <ProductIdentity
                        href={`/products/${movement.product.id}`}
                        name={movement.product.name}
                        sku={movement.product.sku}
                        imageUrl={movement.product.imageUrl}
                      />
                      <p className="mt-1 text-xs text-text-muted">
                        {formatRelativeTime(movement.createdAt)}
                      </p>
                    </td>
                    <td className="hidden px-6 py-3 text-text-secondary md:table-cell">
                      {movement.shop.name}
                    </td>
                    <td className="px-6 py-3 text-right font-semibold tabular-nums text-success">
                      +{formatNumber(movement.quantityChange)}
                    </td>
                    <td className="hidden px-6 py-3 text-text-secondary sm:table-cell">
                      {movement.user.firstName} {movement.user.lastName}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Latest sales</CardTitle>
          <Link
            href="/sales"
            className="text-sm font-medium text-accent hover:underline"
          >
            View all
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {recentSales.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-text-muted">
              Sales recorded by shop staff appear here.
            </p>
          ) : (
            <RecentSalesTable sales={recentSales} showShop />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
