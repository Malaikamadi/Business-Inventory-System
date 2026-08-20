import {
  InventoryPage,
  type InventorySearchParams,
} from "@/components/inventory/inventory-page";

export const metadata = { title: "Inventory · InvSys" };

export default async function Page(props: {
  searchParams: Promise<InventorySearchParams>;
}) {
  return (
    <InventoryPage
      title="Inventory"
      description="Stock on hand per shop. Quantities come from the movement ledger and cannot be edited directly."
      basePath="/inventory"
      emptyTitle="No inventory found"
      emptyDescription="No stock lines match the current filters. Try clearing them or record a stock arrival."
      searchParams={await props.searchParams}
    />
  );
}
