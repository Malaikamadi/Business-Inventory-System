import {
  InventoryPage,
  type InventorySearchParams,
} from "@/components/inventory/inventory-page";

export const metadata = { title: "Inventory · inv." };

export default async function Page(props: {
  searchParams: Promise<InventorySearchParams>;
}) {
  return (
    <InventoryPage
      title="Inventory"
      description="what's actually on the floor. numbers come from the ledger — no editing by vibes."
      basePath="/inventory"
      emptyTitle="nothing on the floor"
      emptyDescription="no stock matches those filters. clear them, or log an arrival."
      searchParams={await props.searchParams}
    />
  );
}
