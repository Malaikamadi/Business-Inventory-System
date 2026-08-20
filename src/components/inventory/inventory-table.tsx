import Link from "next/link";
import { formatCurrency, formatNumber, getStockStatus } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ProductIdentity } from "@/components/products/product-identity";
import type { InventoryRow } from "@/server/services/inventory.queries";

const STATUS_BADGE = {
  OUT_OF_STOCK: { label: "Out of stock", variant: "danger" as const },
  LOW_STOCK: { label: "Low stock", variant: "warning" as const },
  IN_STOCK: { label: "In stock", variant: "success" as const },
};

export function InventoryTable({
  rows,
  showShop = true,
  showValue = true,
}: {
  rows: InventoryRow[];
  showShop?: boolean;
  /** Stock value is derived from cost price, so it is hidden from staff who
   *  may not see what the business pays. */
  showValue?: boolean;
}) {
  return (
    <div className="data-table-wrapper">
      <table className="w-full text-sm">
        <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-text-muted">
          <tr>
            <th className="px-4 py-3 font-medium">Product</th>
            {showShop && <th className="px-4 py-3 font-medium">Shop</th>}
            <th className="hidden px-4 py-3 font-medium lg:table-cell">
              Category
            </th>
            <th className="px-4 py-3 text-right font-medium">On hand</th>
            <th className="hidden px-4 py-3 text-right font-medium sm:table-cell">
              Price
            </th>
            <th className="hidden px-4 py-3 text-right font-medium sm:table-cell">
              Threshold
            </th>
            {showValue && (
              <th className="hidden px-4 py-3 text-right font-medium xl:table-cell">
                Stock value
              </th>
            )}
            <th className="px-4 py-3 text-right font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => {
            const status = getStockStatus(row.quantity, row.lowStockThreshold);
            const badge = STATUS_BADGE[status];

            return (
              <tr
                key={`${row.shopId}-${row.productId}`}
                className="hover:bg-surface-hover"
              >
                <td className="px-4 py-3">
                  <ProductIdentity
                    href={`/products/${row.productId}`}
                    name={row.productName}
                    sku={row.sku}
                    imageUrl={row.imageUrl}
                  />
                </td>
                {showShop && (
                  <td className="px-4 py-3 text-text-secondary">
                    <Link
                      href={`/shops/${row.shopId}`}
                      className="hover:text-accent"
                    >
                      {row.shopName}
                    </Link>
                  </td>
                )}
                <td className="hidden px-4 py-3 text-text-secondary lg:table-cell">
                  {row.categoryName ?? "—"}
                </td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums">
                  {formatNumber(row.quantity)}
                </td>
                <td className="hidden px-4 py-3 text-right tabular-nums text-text-secondary sm:table-cell">
                  {formatCurrency(row.sellingPrice)}
                </td>
                <td className="hidden px-4 py-3 text-right tabular-nums text-text-muted sm:table-cell">
                  {formatNumber(row.lowStockThreshold)}
                </td>
                {showValue && (
                  <td className="hidden px-4 py-3 text-right tabular-nums text-text-secondary xl:table-cell">
                    {formatCurrency(row.stockValue)}
                  </td>
                )}
                <td className="px-4 py-3 text-right">
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
