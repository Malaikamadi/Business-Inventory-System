import Link from "next/link";
import { formatCurrency, formatNumber, getStockStatus } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ProductThumbnail } from "@/components/products/product-thumbnail";
import type { InventoryRow } from "@/server/services/inventory.queries";

const STATUS_BADGE = {
  OUT_OF_STOCK: { label: "Out of stock", variant: "danger" as const },
  LOW_STOCK: { label: "Low stock", variant: "warning" as const },
  IN_STOCK: { label: "In stock", variant: "success" as const },
};

export function InventoryTable({
  rows,
  showShop = true,
}: {
  rows: InventoryRow[];
  showShop?: boolean;
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
              Threshold
            </th>
            <th className="hidden px-4 py-3 text-right font-medium xl:table-cell">
              Stock value
            </th>
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
                  <div className="flex items-center gap-3">
                    <ProductThumbnail
                      src={row.imageUrl}
                      alt={row.productName}
                    />
                    <div className="min-w-0">
                      <Link
                        href={`/products/${row.productId}`}
                        className="font-medium text-text-primary hover:text-accent"
                      >
                        {row.productName}
                      </Link>
                      <p className="text-xs text-text-muted">{row.sku}</p>
                    </div>
                  </div>
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
                <td className="hidden px-4 py-3 text-right tabular-nums text-text-muted sm:table-cell">
                  {formatNumber(row.lowStockThreshold)}
                </td>
                <td className="hidden px-4 py-3 text-right tabular-nums text-text-secondary xl:table-cell">
                  {formatCurrency(row.stockValue)}
                </td>
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
