import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { PERMISSIONS } from "@/lib/constants";
import { getCurrentUser } from "@/server/auth-context";
import { requireCan } from "@/server/page-guards";
import { getProductDetail } from "@/server/services/product.queries";
import { PageHeader } from "@/components/shared/page-header";
import { ProductForm } from "@/components/products/product-form";

export const metadata = { title: "Edit product · inv." };

export default async function EditProductPage(props: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await props.params;
  const user = await getCurrentUser();
  requireCan(user, PERMISSIONS.PRODUCTS_UPDATE, `/products/${productId}/edit`);

  const [product, categories] = await Promise.all([
    getProductDetail(productId),
    prisma.category.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!product) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href={`/products/${product.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {product.name}
        </Link>
      </div>

      <PageHeader
        title="Edit product"
        description="Price changes apply to future sales only. Past sales keep the price they were recorded at."
      />

      <ProductForm
        categories={categories}
        initialValues={{
          id: product.id,
          name: product.name,
          sku: product.sku,
          categoryId: product.categoryId ?? "",
          description: product.description ?? "",
          costPrice: product.costPrice.toString(),
          sellingPrice: product.sellingPrice.toString(),
          lowStockThreshold: String(product.lowStockThreshold),
          imageUrl: product.imageUrl ?? "",
        }}
      />
    </div>
  );
}
