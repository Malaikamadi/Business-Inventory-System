import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PERMISSIONS } from "@/lib/constants";
import type { ReceiptData } from "@/lib/receipt";
import { isQuickVoid } from "@/lib/review-rules";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { can, canViewSalesHistory, getCurrentUser } from "@/server/auth-context";
import { requireCanViewSale } from "@/server/page-guards";
import { getSaleDetail } from "@/server/services/sales.queries";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VoidSaleDialog } from "@/components/sales/void-sale-dialog";
import { SaleReceipt } from "@/components/sales/sale-receipt";
import { ReceiptActions } from "@/components/sales/receipt-actions";
import { ProductIdentity } from "@/components/products/product-identity";
import { ReviewBadge } from "@/components/review/review-badge";

export const metadata = { title: "Sale · InvSys" };

export default async function SaleDetailPage(props: {
  params: Promise<{ saleId: string }>;
}) {
  const { saleId } = await props.params;
  const user = await getCurrentUser();

  const sale = await getSaleDetail(saleId);
  if (!sale) notFound();

  requireCanViewSale(user, sale, `/sales/${saleId}`);
  const canSeeHistory = canViewSalesHistory(user);

  const margin = Number(sale.totalAmount) - Number(sale.totalCost);
  const canVoid = can(user, PERMISSIONS.SALES_VOID) && sale.status !== "VOIDED";
  const canReview = can(user, PERMISSIONS.AUDIT_VIEW);
  const flagged =
    canReview &&
    sale.status === "VOIDED" &&
    sale.voidedAt &&
    isQuickVoid(sale.createdAt, sale.voidedAt);

  const receipt: ReceiptData = {
    saleId: sale.id,
    saleNumber: sale.saleNumber,
    status: sale.status,
    createdAt: sale.createdAt,
    notes: sale.notes,
    totalAmount: Number(sale.totalAmount),
    itemsCount: sale.itemsCount,
    shop: sale.shop,
    salesperson: sale.salesperson,
    items: sale.items.map((item) => ({
      name: item.productName,
      sku: item.product?.sku ?? null,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      lineTotal: Number(item.lineTotal),
    })),
  };

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        {canSeeHistory && (
          <Link
            href="/sales"
            className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sales
          </Link>
        )}

        <div className={`${canSeeHistory ? "mt-3 " : ""}flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between`}>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-text-primary">
                {sale.saleNumber}
              </h1>
              {sale.status === "VOIDED" ? (
                <Badge variant="danger">Voided</Badge>
              ) : (
                <Badge variant="success">Completed</Badge>
              )}
              {flagged && <ReviewBadge />}
            </div>
            <p className="mt-1 text-sm text-text-secondary">
              {formatDateTime(sale.createdAt)} · {sale.shop.name}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ReceiptActions receipt={receipt} />
            {canVoid && (
              <VoidSaleDialog saleId={sale.id} saleNumber={sale.saleNumber} />
            )}
          </div>
        </div>
      </div>

      {sale.status === "VOIDED" && (
        <Card className="border-danger/30 bg-danger-light/40 print:hidden">
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 print:block">
        <Card className="lg:col-span-2 print:hidden">
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
                        <ProductIdentity
                          href={`/products/${item.productId}`}
                          name={item.productName}
                          sku={item.product?.sku}
                          imageUrl={item.product?.imageUrl}
                        />
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

        <div className="space-y-6">
          <Card className="print:hidden">
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

          <div className="hidden lg:block print:block">
            <SaleReceipt receipt={receipt} />
          </div>
        </div>
      </div>

      <div className="lg:hidden print:hidden">
        <SaleReceipt receipt={receipt} />
      </div>
    </div>
  );
}
