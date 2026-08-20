import {
  InventoryPage,
  type InventorySearchParams,
} from "@/components/inventory/inventory-page";

export const metadata = { title: "Low stock · inv." };

export default async function Page(props: {
  searchParams: Promise<InventorySearchParams>;
}) {
  return (
    <InventoryPage
      title="Low stock"
      description="Products at or below their low-stock threshold. Ordered by the fewest units remaining."
      basePath="/inventory/low-stock"
      lockedFilter="low"
      emptyTitle="Nothing is running low"
      emptyDescription="Every product is above its low-stock threshold at the shops you can see."
      searchParams={await props.searchParams}
    />
  );
}
