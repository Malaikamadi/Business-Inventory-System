"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CURRENCY_SYMBOL } from "@/lib/currency";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { ProductImageInput } from "@/components/products/product-image-input";
import {
  createProductAction,
  updateProductAction,
} from "@/server/actions/product.actions";

export interface ProductFormValues {
  id?: string;
  shopId: string;
  name: string;
  sku: string;
  categoryId: string;
  description: string;
  costPrice: string;
  sellingPrice: string;
  lowStockThreshold: string;
  imageUrl: string;
}

const EMPTY: ProductFormValues = {
  shopId: "",
  name: "",
  sku: "",
  categoryId: "",
  description: "",
  costPrice: "",
  sellingPrice: "",
  lowStockThreshold: "10",
  imageUrl: "",
};

export function ProductForm({
  shops,
  categories,
  initialValues,
}: {
  shops: { id: string; name: string }[];
  categories: { id: string; name: string; shopId: string }[];
  initialValues?: ProductFormValues;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [values, setValues] = useState<ProductFormValues>(
    initialValues ?? { ...EMPTY, shopId: shops[0]?.id ?? "" }
  );

  const isEdit = Boolean(initialValues?.id);
  const shopCategories = categories.filter(
    (category) => category.shopId === values.shopId
  );
  const canChooseShop = shops.length > 1 && !isEdit;

  function set<K extends keyof ProductFormValues>(
    key: K,
    value: ProductFormValues[K]
  ) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  const cost = Number(values.costPrice);
  const price = Number(values.sellingPrice);
  const marginKnown = values.costPrice !== "" && values.sellingPrice !== "";
  const margin = price - cost;
  const marginPct = price > 0 ? (margin / price) * 100 : 0;

  function submit(event: React.FormEvent) {
    event.preventDefault();

    startTransition(async () => {
      const payload = {
        ...(isEdit ? { id: initialValues!.id } : {}),
        shopId: values.shopId,
        name: values.name,
        sku: values.sku,
        categoryId: values.categoryId,
        description: values.description,
        costPrice: values.costPrice,
        sellingPrice: values.sellingPrice,
        lowStockThreshold: values.lowStockThreshold,
        imageUrl: values.imageUrl,
      };

      const result = isEdit
        ? await updateProductAction(payload)
        : await createProductAction(payload);

      if (!result.success) {
        toast({
          variant: "error",
          title: isEdit ? "Could not save product" : "Could not add product",
          description: result.error,
        });
        return;
      }

      toast({
        variant: "success",
        title: isEdit ? "Product saved" : "Product added",
        description: `${values.name} is ${isEdit ? "updated" : "now in the catalog"}.`,
      });
      router.push(`/products/${result.data!.productId}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <Card>
        <CardContent className="space-y-5 p-6">
          <h2 className="text-sm font-semibold text-text-primary">Details</h2>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {canChooseShop ? (
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="shop">Shop</Label>
                <select
                  id="shop"
                  value={values.shopId}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      shopId: event.target.value,
                      categoryId: "",
                    }))
                  }
                  className="field-select w-full"
                  required
                >
                  {shops.map((shop) => (
                    <option key={shop.id} value={shop.id}>
                      {shop.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="name">Product name</Label>
              <Input
                id="name"
                value={values.name}
                onChange={(event) => set("name", event.target.value)}
                placeholder="e.g. USB-C Cable 1m"
                required
                maxLength={200}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                value={values.sku}
                onChange={(event) => set("sku", event.target.value)}
                placeholder="e.g. ELC-UC-1M"
                required
                maxLength={100}
              />
              <p className="text-xs text-text-muted">
                Must be unique across the business. Stored in upper case.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                value={values.categoryId}
                onChange={(event) => set("categoryId", event.target.value)}
                className="field-select w-full"
              >
                <option value="">Uncategorised</option>
                {shopCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={values.description}
                onChange={(event) => set("description", event.target.value)}
                placeholder="Optional"
              />
            </div>

            <div className="sm:col-span-2">
              <ProductImageInput
                value={values.imageUrl}
                onChange={(imageUrl) => set("imageUrl", imageUrl)}
                productName={values.name}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-5 p-6">
          <h2 className="text-sm font-semibold text-text-primary">
            Pricing and stock control
          </h2>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="costPrice">Cost price ({CURRENCY_SYMBOL})</Label>
              <Input
                id="costPrice"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={values.costPrice}
                onChange={(event) => set("costPrice", event.target.value)}
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sellingPrice">
                Selling price ({CURRENCY_SYMBOL})
              </Label>
              <Input
                id="sellingPrice"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={values.sellingPrice}
                onChange={(event) => set("sellingPrice", event.target.value)}
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="threshold">Low-stock threshold</Label>
              <Input
                id="threshold"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={values.lowStockThreshold}
                onChange={(event) =>
                  set("lowStockThreshold", event.target.value)
                }
                required
              />
            </div>
          </div>

          {marginKnown && (
            <div
              className={
                margin < 0
                  ? "rounded-md border border-danger/30 bg-danger-light/40 p-3 text-sm"
                  : "rounded-md border border-border bg-muted/50 p-3 text-sm"
              }
            >
              {margin < 0 ? (
                <p className="font-medium text-danger-foreground">
                  The selling price is below cost. Every sale would lose{" "}
                  {formatCurrency(Math.abs(margin))} per unit.
                </p>
              ) : (
                <p className="text-text-secondary">
                  Margin: <strong>{formatCurrency(margin)}</strong> per unit (
                  {marginPct.toFixed(1)}%)
                </p>
              )}
            </div>
          )}

          <p className="text-xs text-text-muted">
            Below the threshold a product is flagged as low stock at that shop.
            The threshold applies to every shop.
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : isEdit ? "Save changes" : "Add product"}
        </Button>
      </div>
    </form>
  );
}
