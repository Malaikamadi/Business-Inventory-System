import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { PERMISSIONS } from "@/lib/constants";
import { assertCan, getCurrentUser } from "@/server/auth-context";
import { PageHeader } from "@/components/shared/page-header";
import { ShopForm } from "@/components/shops/shop-form";

export const metadata = { title: "Edit shop · InvSys" };

export default async function EditShopPage(props: {
  params: Promise<{ shopId: string }>;
}) {
  const { shopId } = await props.params;
  const user = await getCurrentUser();
  assertCan(user, PERMISSIONS.SHOPS_UPDATE);

  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: {
      id: true,
      name: true,
      location: true,
      address: true,
      phone: true,
      email: true,
      status: true,
    },
  });

  if (!shop) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href={`/shops/${shop.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to {shop.name}
      </Link>

      <PageHeader title="Edit shop" description="Update this branch's details." />

      <ShopForm
        initialValues={{
          id: shop.id,
          name: shop.name,
          location: shop.location ?? "",
          address: shop.address ?? "",
          phone: shop.phone ?? "",
          email: shop.email ?? "",
          status: shop.status,
        }}
      />
    </div>
  );
}
