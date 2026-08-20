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
      description="the almost-gone list. ordered by who needs a restock first."
      basePath="/inventory/low-stock"
      lockedFilter="low"
      emptyTitle="you're good"
      emptyDescription="nothing's running low at the shops you can see. enjoy it while it lasts."
      searchParams={await props.searchParams}
    />
  );
}
