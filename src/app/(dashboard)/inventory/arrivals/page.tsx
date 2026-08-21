import { prisma } from "@/lib/db";
import { PERMISSIONS } from "@/lib/constants";
import { formatDateTime, formatNumber } from "@/lib/utils";
import { getCurrentUser, resolveShopScope } from "@/server/auth-context";
import { requireCan } from "@/server/page-guards";
import { listMovements } from "@/server/services/inventory.queries";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StockEntryForm } from "@/components/inventory/stock-entry-form";

export const metadata = { title: "Stock arrivals · InvSys" };

export default async function ArrivalsPage() {
  const user = await getCurrentUser();
  requireCan(user, PERMISSIONS.STOCK_ARRIVALS_CREATE, "/inventory/arrivals");

  const shopIds = resolveShopScope(user);

  const [shops, products, balances, recent] = await Promise.all([
    prisma.shop.findMany({
      where: {
        status: "ACTIVE",
        ...(shopIds ? { id: { in: shopIds } } : {}),
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.product.findMany({
      where: {
        status: "ACTIVE",
        ...(shopIds ? { shopId: { in: shopIds } } : {}),
      },
      select: { id: true, name: true, sku: true, shopId: true },
      orderBy: { name: "asc" },
    }),
    prisma.shopInventory.findMany({
      where: shopIds ? { shopId: { in: shopIds } } : undefined,
      select: { shopId: true, productId: true, quantity: true },
    }),
    listMovements({ shopIds, movementType: "ARRIVAL", pageSize: 10 }),
  ]);

  const balanceMap = Object.fromEntries(
    balances.map((row) => [`${row.shopId}:${row.productId}`, row.quantity])
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock arrivals"
        description="Record incoming deliveries. Each arrival is written to the ledger and increases the shop's stock."
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <StockEntryForm
          mode="arrival"
          shops={shops}
          products={products}
          balances={balanceMap}
          defaultShopId={user.primaryShopId ?? shops[0]?.id ?? ""}
        />

        <Card>
          <CardHeader>
            <CardTitle>Recent arrivals</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recent.data.length === 0 ? (
              <p className="px-6 py-10 text-center text-sm text-text-muted">
                No arrivals recorded yet.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {recent.data.map((movement) => (
                  <li key={movement.id} className="flex gap-4 px-6 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-text-primary">
                        {movement.product.name}
                      </p>
                      <p className="text-xs text-text-muted">
                        {movement.shop.name} ·{" "}
                        {formatDateTime(movement.createdAt)}
                      </p>
                      {movement.reason && (
                        <p className="mt-0.5 truncate text-xs text-text-secondary">
                          {movement.reason}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold tabular-nums text-success">
                        +{formatNumber(movement.quantityChange)}
                      </p>
                      <p className="text-xs text-text-muted">
                        to {formatNumber(movement.quantityAfter)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
