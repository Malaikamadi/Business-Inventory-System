import Link from "next/link";
import { AlertTriangle, PackageX } from "lucide-react";
import { listInventory } from "@/server/services/inventory.queries";
import { formatNumber } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductIdentity } from "@/components/products/product-identity";

/**
 * The restocking worklist. Out-of-stock lines are shown before low-stock ones
 * because a shop that cannot sell a product is losing revenue right now.
 */
export async function StockAlerts({ shopIds }: { shopIds?: string[] } = {}) {
  const [outOfStock, lowStock] = await Promise.all([
    listInventory({ shopIds, filter: "out", pageSize: 5 }),
    listInventory({ shopIds, filter: "low", pageSize: 5 }),
  ]);

  if (outOfStock.total === 0 && lowStock.total === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {outOfStock.total > 0 && (
        <Card className="border-danger/30">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-danger">
              <PackageX className="h-4 w-4" />
              Out of stock ({formatNumber(outOfStock.total)})
            </CardTitle>
            <Link
              href="/inventory/out-of-stock"
              className="text-sm font-medium text-accent hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {outOfStock.data.map((row) => (
                <li
                  key={`${row.shopId}-${row.productId}`}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <ProductIdentity
                    href={`/products/${row.productId}`}
                    name={row.productName}
                    sku={row.sku}
                    imageUrl={row.imageUrl}
                  />
                  <span className="shrink-0 text-xs text-text-muted">
                    {row.shopName}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {lowStock.total > 0 && (
        <Card className="border-warning/30">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-warning-foreground">
              <AlertTriangle className="h-4 w-4" />
              Running low ({formatNumber(lowStock.total)})
            </CardTitle>
            <Link
              href="/inventory/low-stock"
              className="text-sm font-medium text-accent hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {lowStock.data.map((row) => (
                <li
                  key={`${row.shopId}-${row.productId}`}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <ProductIdentity
                    href={`/products/${row.productId}`}
                    name={row.productName}
                    sku={row.sku}
                    imageUrl={row.imageUrl}
                  />
                  <span className="shrink-0 text-xs text-text-muted">
                    {row.quantity} left · {row.shopName}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
