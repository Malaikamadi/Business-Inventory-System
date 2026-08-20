import Link from "next/link";
import { PERMISSIONS } from "@/lib/constants";
import {
  startOfBusinessDaysAgo,
  startOfBusinessDay,
  startOfBusinessMonth,
} from "@/lib/dates";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { can, getCurrentUser, resolveShopScope } from "@/server/auth-context";
import { requireCanAny } from "@/server/page-guards";
import {
  getRevenueTrend,
  getSalespersonPerformance,
  getShopPerformance,
  getTopProducts,
} from "@/server/services/dashboard.service";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { PeriodTabs } from "@/components/reports/period-tabs";

export const metadata = { title: "Reports · inv." };

const PERIODS = {
  today: { label: "Today", days: 1 },
  week: { label: "Last 7 days", days: 7 },
  month: { label: "This month", days: 30 },
  quarter: { label: "Last 90 days", days: 90 },
} as const;

type PeriodKey = keyof typeof PERIODS;

function periodStart(period: PeriodKey): Date {
  switch (period) {
    case "today":
      return startOfBusinessDay();
    case "week":
      return startOfBusinessDaysAgo(6);
    case "month":
      return startOfBusinessMonth();
    case "quarter":
      return startOfBusinessDaysAgo(89);
  }
}

export default async function ReportsPage(props: {
  searchParams: Promise<{ period?: string }>;
}) {
  const user = await getCurrentUser();
  requireCanAny(
    user,
    [PERMISSIONS.REPORTS_GLOBAL, PERMISSIONS.REPORTS_SHOP],
    "/reports"
  );

  // Everyone sees the same report, over the shops they are entitled to. For a
  // salesperson that is the branch they work at, which makes the by-shop and
  // by-salesperson breakdowns a view of their own trade rather than a league
  // table of the whole business.
  const isGlobal = can(user, PERMISSIONS.REPORTS_GLOBAL);
  const canSeeStaff = can(user, PERMISSIONS.USERS_VIEW);

  const params = await props.searchParams;
  const period = (
    params.period && params.period in PERIODS ? params.period : "month"
  ) as PeriodKey;

  const since = periodStart(period);
  const shopIds = resolveShopScope(user);

  const [trend, shops, products, staff] = await Promise.all([
    getRevenueTrend(PERIODS[period].days === 1 ? 7 : PERIODS[period].days, shopIds),
    getShopPerformance(since, shopIds),
    getTopProducts(since, 10, shopIds),
    getSalespersonPerformance(since, shopIds),
  ]);

  const totalRevenue = shops.reduce((sum, shop) => sum + shop.revenue, 0);
  const totalSales = shops.reduce((sum, shop) => sum + shop.salesCount, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description={
          isGlobal
            ? "who sold what, where. voided sales don't count — they were never the bag."
            : "how your shop did. voided sales don't count — they were never the bag."
        }
      />

      <PeriodTabs
        periods={Object.entries(PERIODS).map(([key, value]) => ({
          key,
          label: value.label,
        }))}
        active={period}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-text-secondary">
              Revenue, {PERIODS[period].label.toLowerCase()}
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {formatCurrency(totalRevenue)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-text-secondary">Sales</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {formatNumber(totalSales)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-text-secondary">
              Average sale
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {totalSales > 0
                ? formatCurrency(totalRevenue / totalSales)
                : formatCurrency(0)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenue trend</CardTitle>
        </CardHeader>
        <CardContent>
          <RevenueChart data={trend} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* A single-shop breakdown would just restate the totals above it. */}
        {shops.length > 1 && (
          <ReportTable
            title="By shop"
            columns={["Shop", "Sales", "Revenue"]}
            rows={shops.map((shop) => ({
              key: shop.shopId,
              href: `/shops/${shop.shopId}`,
              label: shop.shopName,
              values: [
                formatNumber(shop.salesCount),
                formatCurrency(shop.revenue),
              ],
            }))}
            emptyMessage="quiet stretch. no sales in this window."
          />
        )}

        <ReportTable
          title="By salesperson"
          columns={["Salesperson", "Sales", "Revenue"]}
          rows={staff.map((person) => ({
            key: person.userId,
            // Staff records are owner-only, so the name is plain text for
            // everyone else rather than a link into a page they cannot open.
            href: canSeeStaff ? `/users/${person.userId}` : undefined,
            label: person.name,
            values: [
              formatNumber(person.salesCount),
              formatCurrency(person.revenue),
            ],
          }))}
          emptyMessage="quiet stretch. no sales in this window."
        />
      </div>

      <ReportTable
        title="Best-selling products"
        columns={["Product", "Units sold", "Revenue"]}
        rows={products.map((product) => ({
          key: product.productId,
          href: `/products/${product.productId}`,
          label: product.productName,
          values: [
            formatNumber(product.totalQuantity),
            formatCurrency(product.totalRevenue),
          ],
        }))}
        emptyMessage="nothing sold in this window. yet."
      />
    </div>
  );
}

function ReportTable({
  title,
  columns,
  rows,
  emptyMessage,
}: {
  title: string;
  columns: string[];
  rows: {
    key: string;
    href?: string;
    label: string;
    values: string[];
  }[];
  emptyMessage: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-text-muted">
            {emptyMessage}
          </p>
        ) : (
          <div className="data-table-wrapper">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-text-muted">
                <tr>
                  {columns.map((column, index) => (
                    <th
                      key={column}
                      className={
                        index === 0
                          ? "px-6 py-3 font-medium"
                          : "px-6 py-3 text-right font-medium"
                      }
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => (
                  <tr key={row.key} className="hover:bg-surface-hover">
                    <td className="px-6 py-3">
                      {row.href ? (
                        <Link
                          href={row.href}
                          className="font-medium text-text-primary hover:text-accent"
                        >
                          {row.label}
                        </Link>
                      ) : (
                        <span className="font-medium text-text-primary">
                          {row.label}
                        </span>
                      )}
                    </td>
                    {row.values.map((value, index) => (
                      <td
                        key={index}
                        className="px-6 py-3 text-right tabular-nums"
                      >
                        {value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
