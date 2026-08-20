import {
  InventoryPage,
  type InventorySearchParams,
} from "@/components/inventory/inventory-page";

export const metadata = { title: "Out of stock · inv." };

export default async function Page(props: {
  searchParams: Promise<InventorySearchParams>;
}) {
  return (
    <InventoryPage
      title="Out of stock"
      description="Products with no units left. These cannot be sold until stock arrives."
      basePath="/inventory/out-of-stock"
      lockedFilter="out"
      emptyTitle="Nothing is out of stock"
      emptyDescription="Every product still has units available at the shops you can see."
      searchParams={await props.searchParams}
    />
  );
}
