import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { PERMISSIONS } from "@/lib/constants";
import { getCurrentUser } from "@/server/auth-context";
import { requireCan } from "@/server/page-guards";
import { PageHeader } from "@/components/shared/page-header";
import { ProductForm } from "@/components/products/product-form";

export const metadata = { title: "Add product · InvSys" };

export default async function NewProductPage() {
  const user = await getCurrentUser();
  requireCan(user, PERMISSIONS.PRODUCTS_CREATE, "/products/new");

  const categories = await prisma.category.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

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
        description="Products are shared across all shops. Stock is added separately as a shop-level arrival."
      />

      <ProductForm categories={categories} />
    </div>
  );
}
