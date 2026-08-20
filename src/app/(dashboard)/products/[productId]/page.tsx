import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { PERMISSIONS } from "@/lib/constants";
import { startOfBusinessMonth } from "@/lib/dates";
import {
  formatCurrency,
  formatDate,
  formatNumber,
  getStockStatus,
} from "@/lib/utils";
import { can, getCurrentUser } from "@/server/auth-context";
import {
  getProductDetail,
  getProductSalesSummary,
} from "@/server/services/product.queries";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Product · InvSys" };

const STATUS_BADGE = {
  OUT_OF_STOCK: { label: "Out of stock", variant: "danger" as const },
  LOW_STOCK: { label: "Low stock", variant: "warning" as const },
  IN_STOCK: { label: "In stock", variant: "success" as const },
};

export default async function ProductDetailPage(props: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await props.params;
  const user = await getCurrentUser();

  const product = await getProductDetail(productId);
  if (!product) notFound();

  const sales = await getProductSalesSummary(productId, startOfBusinessMonth());

  // Staff only see the branches they work at; owners see the whole picture.
  const visibleInventory = can(user, PERMISSIONS.INVENTORY_VIEW_ALL)
    ? product.shopInventory
    : product.shopInventory.filter((row) => user.shopIds.includes(row.shop.id));

  const totalStock = visibleInventory.reduce((sum, row) => sum + row.quantity, 0);
  const margin = Number(product.sellingPrice) - Number(product.costPrice);
  const marginPct =
    Number(product.sellingPrice) > 0
      ? (margin / Number(product.sellingPrice)) * 100
      : 0;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/products"
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to products
        </Link>
      </div>

      <PageHeader title={product.name} description={product.sku}>
        {product.status === "DISCONTINUED" && (
          <Badge variant="secondary">Discontinued</Badge>
        )}
        {can(user, PERMISSIONS.PRODUCTS_UPDATE) && (
          <Button asChild variant="outline">
            <Link href={`/products/${product.id}/edit`}>
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
          </Button>
        )}
      </PageHeader>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Stock by shop</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {visibleInventory.length === 0 ? (
              <p className="px-6 py-10 text-center text-sm text-text-muted">
                This product is not stocked at any shop you can see. Record a
                stock arrival to add it.
              </p>
            ) : (
              <div className="data-table-wrapper">
                <table className="w-full text-sm">
                  <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-text-muted">
                    <tr>
                      <th className="px-6 py-3 font-medium">Shop</th>
                      <th className="px-6 py-3 text-right font-medium">
                        On hand
                      </th>
                      <th className="hidden px-6 py-3 text-right font-medium sm:table-cell">
                        Last change
                      </th>
                      <th className="px-6 py-3 text-right font-medium">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {visibleInventory.map((row) => {
                      const status = getStockStatus(
                        row.quantity,
                        product.lowStockThreshold
                      );
                      const badge = STATUS_BADGE[status];

                      return (
                        <tr key={row.shop.id} className="hover:bg-surface-hover">
                          <td className="px-6 py-3">
                            <Link
                              href={`/shops/${row.shop.id}`}
                              className="font-medium text-text-primary hover:text-accent"
                            >
                              {row.shop.name}
                            </Link>
                          </td>
                          <td className="px-6 py-3 text-right font-semibold tabular-nums">
                            {formatNumber(row.quantity)}
                          </td>
                          <td className="hidden px-6 py-3 text-right text-text-secondary sm:table-cell">
                            {formatDate(row.updatedAt)}
                          </td>
                          <td className="px-6 py-3 text-right">
                            <Badge variant={badge.variant}>{badge.label}</Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="border-t border-border">
                    <tr>
                      <td className="px-6 py-3 font-medium">Total</td>
                      <td className="px-6 py-3 text-right text-base font-semibold tabular-nums">
                        {formatNumber(totalStock)}
                      </td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-text-secondary">Selling price</dt>
                  <dd className="font-semibold tabular-nums">
                    {formatCurrency(Number(product.sellingPrice))}
                  </dd>
                </div>
                {can(user, PERMISSIONS.REPORTS_GLOBAL) && (
                  <>
                    <div className="flex justify-between gap-4">
                      <dt className="text-text-secondary">Cost price</dt>
                      <dd className="tabular-nums">
                        {formatCurrency(Number(product.costPrice))}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4 border-t border-border pt-3">
                      <dt className="text-text-secondary">Margin per unit</dt>
                      <dd className="font-semibold tabular-nums text-success">
                        {formatCurrency(margin)} ({marginPct.toFixed(1)}%)
                      </dd>
                    </div>
                  </>
                )}
                <div className="flex justify-between gap-4 border-t border-border pt-3">
                  <dt className="text-text-secondary">Low-stock threshold</dt>
                  <dd className="tabular-nums">
                    {formatNumber(product.lowStockThreshold)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-text-secondary">Category</dt>
                  <dd>{product.category?.name ?? "Uncategorised"}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>This month</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-text-secondary">Units sold</dt>
                  <dd className="font-semibold tabular-nums">
                    {formatNumber(sales.unitsSold)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-text-secondary">Revenue</dt>
                  <dd className="font-semibold tabular-nums">
                    {formatCurrency(sales.revenue)}
                  </dd>
                </div>
              </dl>
              <Link
                href={`/inventory/movements?product=${product.id}`}
                className="mt-4 inline-block text-sm font-medium text-accent hover:underline"
              >
                View stock movements
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {product.description && (
        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-text-secondary">{product.description}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
