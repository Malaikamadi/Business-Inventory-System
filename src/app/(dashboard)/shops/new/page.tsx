import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PERMISSIONS } from "@/lib/constants";
import { assertCan, getCurrentUser } from "@/server/auth-context";
import { PageHeader } from "@/components/shared/page-header";
import { ShopForm } from "@/components/shops/shop-form";

export const metadata = { title: "Add shop · InvSys" };

export default async function NewShopPage() {
  const user = await getCurrentUser();
  assertCan(user, PERMISSIONS.SHOPS_CREATE);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/shops"
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to shops
      </Link>

      <PageHeader
        title="Add shop"
        description="A new shop starts with no stock. Record arrivals or transfer stock in once it is created."
      />

      <ShopForm />
    </div>
  );
}
