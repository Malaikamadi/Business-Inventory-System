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
      description="sold out. can't ring these up until more arrives."
      basePath="/inventory/out-of-stock"
      lockedFilter="out"
      emptyTitle="nothing's sold out"
      emptyDescription="every product still has units. keep it that way."
      searchParams={await props.searchParams}
    />
  );
}
