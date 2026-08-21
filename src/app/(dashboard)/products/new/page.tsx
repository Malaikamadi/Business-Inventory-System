import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { PERMISSIONS } from "@/lib/constants";
import { getCurrentUser, resolveShopScope } from "@/server/auth-context";
import { requireCan } from "@/server/page-guards";
import { PageHeader } from "@/components/shared/page-header";
import { ProductForm } from "@/components/products/product-form";

export const metadata = { title: "Add product · InvSys" };

export default async function NewProductPage() {
  const user = await getCurrentUser();
  requireCan(user, PERMISSIONS.PRODUCTS_CREATE, "/products/new");

  const shopIds = resolveShopScope(user);

  const [shops, categories] = await Promise.all([
    prisma.shop.findMany({
      where: {
        status: "ACTIVE",
        ...(shopIds ? { id: { in: shopIds } } : {}),
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.category.findMany({
      where: {
        isActive: true,
        ...(shopIds ? { shopId: { in: shopIds } } : {}),
      },
      select: { id: true, name: true, shopId: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/products"
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to products
        </Link>
      </div>

      <PageHeader
        title="Add product"
        description="Products belong to one shop. Stock is then added as an arrival at that shop."
      />

      <ProductForm shops={shops} categories={categories} />
    </div>
  );
}
