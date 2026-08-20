import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PERMISSIONS } from "@/lib/constants";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { can, getCurrentUser } from "@/server/auth-context";
import { requireShopAccess } from "@/server/page-guards";
import { getSaleDetail } from "@/server/services/sales.queries";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VoidSaleDialog } from "@/components/sales/void-sale-dialog";

export const metadata = { title: "Sale · inv." };

export default async function SaleDetailPage(props: {
  params: Promise<{ saleId: string }>;
}) {
  const { saleId } = await props.params;
  const user = await getCurrentUser();

  const sale = await getSaleDetail(saleId);
  if (!sale) notFound();

  // A sale belongs to a shop, so shop access is what governs visibility.
  requireShopAccess(user, sale.shopId, `/sales/${saleId}`);

  const margin = Number(sale.totalAmount) - Number(sale.totalCost);
  const canVoid = can(user, PERMISSIONS.SALES_VOID) && sale.status !== "VOIDED";

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/sales"
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sales
        </Link>

        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-text-primary">
                {sale.saleNumber}
              </h1>
              {sale.status === "VOIDED" ? (
                <Badge variant="danger">Voided</Badge>
              ) : (
                <Badge variant="success">Completed</Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-text-secondary">
              {formatDateTime(sale.createdAt)} · {sale.shop.name}
            </p>
          </div>

          {canVoid && (
            <VoidSaleDialog saleId={sale.id} saleNumber={sale.saleNumber} />
          )}
        </div>
      </div>

      {sale.status === "VOIDED" && (
        <Card className="border-danger/30 bg-danger-light/40">
          <CardContent className="p-4 text-sm">
            <p className="font-medium text-danger-foreground">
              This sale was voided
              {sale.voidedByUser
                ? ` by ${sale.voidedByUser.firstName} ${sale.voidedByUser.lastName}`
                : ""}
              {sale.voidedAt ? ` on ${formatDateTime(sale.voidedAt)}` : ""}.
            </p>
            {sale.voidReason && (
              <p className="mt-1 text-danger-foreground/80">
                Reason: {sale.voidReason}
              </p>
            )}
            <p className="mt-2 text-danger-foreground/80">
              The stock was returned to {sale.shop.name} and this sale is
              excluded from revenue reporting.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Items</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="data-table-wrapper">
              <table className="w-full text-sm">
                <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-text-muted">
                  <tr>
                    <th className="px-6 py-3 font-medium">Product</th>
                    <th className="px-6 py-3 text-right font-medium">Qty</th>
                    <th className="px-6 py-3 text-right font-medium">
                      Unit price
                    </th>
                    <th className="px-6 py-3 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sale.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-3">
                        <Link
                          href={`/products/${item.productId}`}
                          className="font-medium text-text-primary hover:text-accent"
                        >
                          {item.productName}
                        </Link>
                      </td>
                      <td className="px-6 py-3 text-right tabular-nums">
                        {item.quantity}
                      </td>
                      <td className="px-6 py-3 text-right tabular-nums text-text-secondary">
                        {formatCurrency(Number(item.unitPrice))}
                      </td>
                      <td className="px-6 py-3 text-right font-medium tabular-nums">
                        {formatCurrency(Number(item.lineTotal))}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-border">
                  <tr>
                    <td colSpan={3} className="px-6 py-3 text-right font-medium">
                      Total
                    </td>
                    <td className="px-6 py-3 text-right text-base font-semibold tabular-nums">
                      {formatCurrency(Number(sale.totalAmount))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-text-secondary">Shop</dt>
                <dd className="text-right font-medium">{sale.shop.name}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-text-secondary">Recorded by</dt>
                <dd className="text-right font-medium">
                  {sale.salesperson.firstName} {sale.salesperson.lastName}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-text-secondary">Date</dt>
                <dd className="text-right font-medium">
                  {formatDateTime(sale.createdAt)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-text-secondary">Items</dt>
                <dd className="text-right font-medium tabular-nums">
                  {sale.itemsCount}
                </dd>
              </div>

              {can(user, PERMISSIONS.PRODUCTS_VIEW_COST) && (
                <>
                  <div className="flex justify-between gap-4 border-t border-border pt-3">
                    <dt className="text-text-secondary">Cost of goods</dt>
                    <dd className="text-right font-medium tabular-nums">
                      {formatCurrency(Number(sale.totalCost))}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-text-secondary">Gross margin</dt>
                    <dd className="text-right font-semibold tabular-nums text-success">
                      {formatCurrency(margin)}
                    </dd>
                  </div>
                </>
              )}

              {sale.notes && (
                <div className="border-t border-border pt-3">
                  <dt className="mb-1 text-text-secondary">Notes</dt>
                  <dd className="text-text-primary">{sale.notes}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
