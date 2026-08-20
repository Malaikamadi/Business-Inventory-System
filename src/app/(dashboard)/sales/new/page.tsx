import { prisma } from "@/lib/db";
import { PERMISSIONS } from "@/lib/constants";
import { assertCan, can, getCurrentUser } from "@/server/auth-context";
import { listSellableProducts } from "@/server/services/inventory.queries";
import { SaleForm } from "@/components/sales/sale-form";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";

export const metadata = { title: "Record sale · InvSys" };

export default async function NewSalePage(props: {
  searchParams: Promise<{ shop?: string }>;
}) {
  const user = await getCurrentUser();
  assertCan(user, PERMISSIONS.SALES_CREATE);

  const { shop: requestedShop } = await props.searchParams;
  const isOwner = can(user, PERMISSIONS.SHOPS_VIEW_ALL);

  // Owners may sell on behalf of any shop but must choose one explicitly;
  // staff are pinned to the shop they are assigned to.
  const selectableShops = isOwner
    ? await prisma.shop.findMany({
        where: { status: "ACTIVE" },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      })
    : await prisma.shop.findMany({
        where: { id: { in: user.shopIds }, status: "ACTIVE" },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      });

  const activeShopId =
    (requestedShop && selectableShops.some((s) => s.id === requestedShop)
      ? requestedShop
      : null) ??
    (user.primaryShopId &&
    selectableShops.some((s) => s.id === user.primaryShopId)
      ? user.primaryShopId
      : null) ??
    selectableShops[0]?.id ??
    null;

  if (!activeShopId) {
    return (
      <EmptyState
        title="No shop available"
        description="You are not assigned to an active shop, so sales cannot be recorded. Ask the business owner to assign you to one."
      />
    );
  }

  const products = await listSellableProducts(activeShopId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Record sale"
        description="Add products, confirm the quantities, and the stock is updated automatically."
      />
      <SaleForm
        shops={selectableShops}
        activeShopId={activeShopId}
        canChooseShop={selectableShops.length > 1}
        products={products}
      />
    </div>
  );
}
