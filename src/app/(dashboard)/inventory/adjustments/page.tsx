import { prisma } from "@/lib/db";
import { PERMISSIONS } from "@/lib/constants";
import { cn, formatDateTime, formatNumber } from "@/lib/utils";
import { getCurrentUser, resolveShopScope } from "@/server/auth-context";
import { requireCan } from "@/server/page-guards";
import { listMovements } from "@/server/services/inventory.queries";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StockEntryForm } from "@/components/inventory/stock-entry-form";

export const metadata = { title: "Stock adjustments · inv." };

export default async function AdjustmentsPage() {
  const user = await getCurrentUser();
  requireCan(user, PERMISSIONS.STOCK_ADJUSTMENTS_CREATE, "/inventory/adjustments");

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
      where: { status: "ACTIVE" },
      select: { id: true, name: true, sku: true },
      orderBy: { name: "asc" },
    }),
    prisma.shopInventory.findMany({
      where: shopIds ? { shopId: { in: shopIds } } : undefined,
      select: { shopId: true, productId: true, quantity: true },
    }),
    listMovements({ shopIds, movementType: "ADJUSTMENT", pageSize: 10 }),
  ]);

  const balanceMap = Object.fromEntries(
    balances.map((row) => [`${row.shopId}:${row.productId}`, row.quantity])
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock adjustments"
        description="fix a count that didn't come from a sale or a delivery. always leave a reason."
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <StockEntryForm
          mode="adjustment"
          shops={shops}
          products={products}
          balances={balanceMap}
          defaultShopId={user.primaryShopId ?? shops[0]?.id ?? ""}
        />

        <Card>
          <CardHeader>
            <CardTitle>Recent adjustments</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recent.data.length === 0 ? (
              <p className="px-6 py-10 text-center text-sm text-text-muted">
                No adjustments recorded yet.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {recent.data.map((movement) => {
                  const increase = movement.quantityChange > 0;
                  return (
                    <li key={movement.id} className="flex gap-4 px-6 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-text-primary">
                          {movement.product.name}
                        </p>
                        <p className="text-xs text-text-muted">
                          {movement.shop.name} ·{" "}
                          {formatDateTime(movement.createdAt)} ·{" "}
                          {movement.user.firstName} {movement.user.lastName}
                        </p>
                        {movement.reason && (
                          <p className="mt-0.5 truncate text-xs text-text-secondary">
                            {movement.reason}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <p
                          className={cn(
                            "text-sm font-semibold tabular-nums",
                            increase ? "text-success" : "text-danger"
                          )}
                        >
                          {increase ? "+" : ""}
                          {formatNumber(movement.quantityChange)}
                        </p>
                        <p className="text-xs text-text-muted">
                          to {formatNumber(movement.quantityAfter)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
