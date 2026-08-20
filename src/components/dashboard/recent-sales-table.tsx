import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDateTime } from "@/lib/utils";

interface RecentSale {
  id: string;
  saleNumber: string;
  totalAmount: Prisma.Decimal;
  itemsCount: number;
  status: string;
  createdAt: Date;
  shop: { id: string; name: string };
  salesperson: { firstName: string; lastName: string };
}

export function RecentSalesTable({
  sales,
  showShop = false,
}: {
  sales: RecentSale[];
  showShop?: boolean;
}) {
  if (sales.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-text-muted">
        crickets. nothing rung up yet.
      </p>
    );
  }

  return (
    <div className="data-table-wrapper">
      <table className="w-full text-sm">
        <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-text-muted">
          <tr>
            <th className="px-6 py-3 font-medium">Sale</th>
            {showShop && <th className="px-6 py-3 font-medium">Shop</th>}
            <th className="hidden px-6 py-3 font-medium sm:table-cell">
              Recorded by
            </th>
            <th className="px-6 py-3 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sales.map((sale) => (
            <tr key={sale.id} className="hover:bg-surface-hover">
              <td className="px-6 py-3">
                <Link
                  href={`/sales/${sale.id}`}
                  className="font-medium text-text-primary hover:text-accent"
                >
                  {sale.saleNumber}
                </Link>
                <p className="text-xs text-text-muted">
                  {formatDateTime(sale.createdAt)} · {sale.itemsCount}{" "}
                  {sale.itemsCount === 1 ? "item" : "items"}
                </p>
              </td>
              {showShop && (
                <td className="px-6 py-3 text-text-secondary">
                  {sale.shop.name}
                </td>
              )}
              <td className="hidden px-6 py-3 text-text-secondary sm:table-cell">
                {sale.salesperson.firstName} {sale.salesperson.lastName}
              </td>
              <td className="px-6 py-3 text-right">
                {sale.status === "VOIDED" ? (
                  <div className="flex items-center justify-end gap-2">
                    <Badge variant="danger">Voided</Badge>
                    <span className="tabular-nums text-text-muted line-through">
                      {formatCurrency(Number(sale.totalAmount))}
                    </span>
                  </div>
                ) : (
                  <span className="font-medium tabular-nums">
                    {formatCurrency(Number(sale.totalAmount))}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
