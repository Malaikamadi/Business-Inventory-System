import { Tags } from "lucide-react";
import { PERMISSIONS } from "@/lib/constants";
import { formatNumber } from "@/lib/utils";
import { getCurrentUser } from "@/server/auth-context";
import { requireCan } from "@/server/page-guards";
import { listCategories } from "@/server/services/product.queries";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { CategoryForm } from "@/components/products/category-form";

export const metadata = { title: "Categories · InvSys" };

export default async function CategoriesPage() {
  const user = await getCurrentUser();
  requireCan(user, PERMISSIONS.CATEGORIES_MANAGE, "/products/categories");

  const categories = await listCategories();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categories"
        description="Group products for reporting and easier searching."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-0">
              {categories.length === 0 ? (
                <EmptyState
                  icon={Tags}
                  title="No categories yet"
                  description="Create your first category to start organising the product catalog."
                />
              ) : (
                <div className="data-table-wrapper">
                  <table className="w-full text-sm">
                    <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-text-muted">
                      <tr>
                        <th className="px-6 py-3 font-medium">Category</th>
                        <th className="px-6 py-3 text-right font-medium">
                          Products
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {categories.map((category) => (
                        <tr key={category.id} className="hover:bg-surface-hover">
                          <td className="px-6 py-3">
                            <p className="font-medium text-text-primary">
                              {category.name}
                            </p>
                            {category.description && (
                              <p className="text-xs text-text-muted">
                                {category.description}
                              </p>
                            )}
                          </td>
                          <td className="px-6 py-3 text-right tabular-nums text-text-secondary">
                            {formatNumber(category.productCount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <CategoryForm />
      </div>
    </div>
  );
}
