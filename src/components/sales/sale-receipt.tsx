import { BUSINESS_NAME, BUSINESS_PHONE } from "@/lib/business";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { ReceiptData } from "@/lib/receipt";

export function SaleReceipt({ receipt }: { receipt: ReceiptData }) {
  const phone = receipt.shop.phone || BUSINESS_PHONE;

  return (
    <div
      id="sale-receipt"
      className="mx-auto max-w-[420px] rounded-xl border border-border bg-white p-6 text-text-primary shadow-sm print:max-w-none print:border-0 print:shadow-none"
    >
      <div className="text-center">
        <p className="text-lg font-semibold tracking-tight">{BUSINESS_NAME}</p>
        <p className="mt-1 text-sm text-text-secondary">{receipt.shop.name}</p>
        {(receipt.shop.address || receipt.shop.location) && (
          <p className="text-xs text-text-muted">
            {receipt.shop.address || receipt.shop.location}
          </p>
        )}
        {phone && <p className="text-xs text-text-muted">{phone}</p>}
      </div>

      <div className="my-4 border-t border-dashed border-border" />

      <div className="flex items-start justify-between gap-3 text-sm">
        <div>
          <p className="font-semibold">{receipt.saleNumber}</p>
          <p className="text-xs text-text-muted">
            {formatDateTime(receipt.createdAt)}
          </p>
        </div>
        {receipt.status === "VOIDED" ? (
          <span className="rounded-full bg-danger-light px-2 py-0.5 text-xs font-medium text-danger-foreground">
            Voided
          </span>
        ) : (
          <span className="rounded-full bg-success-light px-2 py-0.5 text-xs font-medium text-success-foreground">
            Paid
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-text-muted">
        Served by {receipt.salesperson.firstName} {receipt.salesperson.lastName}
      </p>

      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-text-muted">
            <th className="py-1.5 font-medium">Item</th>
            <th className="py-1.5 text-right font-medium">Qty</th>
            <th className="py-1.5 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {receipt.items.map((item, index) => (
            <tr key={`${item.name}-${index}`} className="border-b border-border/60">
              <td className="py-2">
                <p className="font-medium">{item.name}</p>
                {item.sku && (
                  <p className="text-[11px] text-text-muted">{item.sku}</p>
                )}
                <p className="text-[11px] text-text-muted">
                  {formatCurrency(item.unitPrice)} each
                </p>
              </td>
              <td className="py-2 text-right tabular-nums">{item.quantity}</td>
              <td className="py-2 text-right font-medium tabular-nums">
                {formatCurrency(item.lineTotal)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-3 flex items-center justify-between text-base font-semibold">
        <span>Total</span>
        <span className="tabular-nums">
          {formatCurrency(receipt.totalAmount)}
        </span>
      </div>

      {receipt.notes && (
        <p className="mt-3 text-xs text-text-secondary">
          Note: {receipt.notes}
        </p>
      )}

      <p className="mt-6 text-center text-xs text-text-muted">
        Thank you for your custom.
      </p>
    </div>
  );
}
