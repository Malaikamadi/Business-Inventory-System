import Link from "next/link";
import {
  AlertTriangle,
  Boxes,
  Banknote,
  Store,
  TrendingUp,
} from "lucide-react";
import { startOfBusinessMonth } from "@/lib/dates";
import { formatCurrency, formatNumber } from "@/lib/utils";
import {
  getOwnerKPIs,
  getRevenueTrend,
  getShopPerformance,
  getTopProducts,
} from "@/server/services/dashboard.service";
import { getInventoryValue } from "@/server/services/inventory.queries";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RevenueChart } from "./revenue-chart";
import { ShopPerformanceChart } from "./shop-performance-chart";
import { StockAlerts } from "./stock-alerts";

export async function OwnerDashboard({ firstName }: { firstName: string }) {
  const monthStart = startOfBusinessMonth();

  const [kpis, trend, shops, topProducts, inventoryValue] = await Promise.all([
    getOwnerKPIs(),
    getRevenueTrend(30),
    getShopPerformance(monthStart),
    getTopProducts(monthStart, 5),
    getInventoryValue(),
  ]);

  const alertCount = kpis.lowStockCount + kpis.outOfStockCount;

  return (
    <div className="space-y-6">
      <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-text-primary after:mt-2 after:block after:h-1.5 after:w-12 after:rounded-full after:bg-accent sm:text-4xl">
          hey {firstName}. here&apos;s the bag.
        </h1>
        <p className="mt-2 max-w-xl text-sm text-text-secondary">
          {kpis.totalShops} shop{kpis.totalShops === 1 ? "" : "s"} in motion.
          staff handle the till — you&apos;re here for the big picture.
        </p>
      </div>

      <section
        aria-label="Today"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <StatCard
          title="today's bag"
          value={formatCurrency(kpis.totalRevenue)}
          subtitle={`${formatNumber(kpis.totalSales)} ${kpis.totalSales === 1 ? "sale" : "sales"} landed`}
          icon={Banknote}
        />
        <StatCard
          title="month so far"
          value={formatCurrency(kpis.monthlyRevenue)}
          subtitle={`${formatNumber(kpis.monthlySales)} sales and counting`}
          icon={TrendingUp}
        />
        <StatCard
          title="on the floor"
          value={formatNumber(kpis.totalInventoryUnits)}
          subtitle={`${formatCurrency(inventoryValue)} sitting at cost`}
          icon={Boxes}
        />
        <StatCard
          title="needs a restock"
          value={formatNumber(alertCount)}
          subtitle={`${kpis.outOfStockCount} out of stock, ${kpis.lowStockCount} running low`}
          icon={alertCount > 0 ? AlertTriangle : Store}
          iconClassName={
            kpis.outOfStockCount > 0
              ? "bg-danger-light text-danger"
              : alertCount > 0
                ? "bg-warning-light text-warning-foreground"
                : undefined
          }
        />
      </section>

      {alertCount > 0 && <StockAlerts />}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>the last 30 days</CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueChart data={trend} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>who&apos;s eating</CardTitle>
          </CardHeader>
          <CardContent>
            {shops.length > 0 ? (
              <ShopPerformanceChart data={shops} />
            ) : (
              <p className="py-8 text-center text-sm text-text-muted">
                quiet month. nobody&apos;s rung anything up yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>what&apos;s popping</CardTitle>
        </CardHeader>
        <CardContent>
          {topProducts.length === 0 ? (
            <p className="py-8 text-center text-sm text-text-muted">
              waiting on the first sale of the month. staff, do your thing.
            </p>
          ) : (
            <ol className="space-y-3">
              {topProducts.map((product, index) => (
                <li
                  key={product.productId}
                  className="flex items-center gap-3"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold text-text-secondary">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text-primary">
                      {product.productName}
                    </p>
                    <p className="text-xs text-text-muted">
                      {formatNumber(product.totalQuantity)} units
                    </p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-text-primary">
                    {formatCurrency(product.totalRevenue)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>shop scoreboard</CardTitle>
          <Link
            href="/shops"
            className="text-sm font-medium text-accent hover:underline"
          >
            run shops
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          <div className="data-table-wrapper">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-text-muted">
                <tr>
                  <th className="px-6 py-3 font-medium">Shop</th>
                  <th className="px-6 py-3 text-right font-medium">Sales</th>
                  <th className="px-6 py-3 text-right font-medium">Revenue</th>
                  <th className="px-6 py-3 text-right font-medium">
                    Avg. sale
                  </th>
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
                    <td className="px-6 py-3 text-right tabular-nums text-text-secondary">
                      {shop.salesCount > 0
                        ? formatCurrency(shop.revenue / shop.salesCount)
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
