"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import {
  createProductAction,
  updateProductAction,
} from "@/server/actions/product.actions";

export interface ProductFormValues {
  id?: string;
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
  categories,
  initialValues,
}: {
  categories: { id: string; name: string }[];
  initialValues?: ProductFormValues;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [values, setValues] = useState<ProductFormValues>(
    initialValues ?? EMPTY
  );

  const isEdit = Boolean(initialValues?.id);

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
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="name">Product name</Label>
              <Input
                id="name"
                value={values.name}
                onChange={(event) => set("name", event.target.value)}
                placeholder="e.g. Coca-Cola 500ml"
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
                placeholder="e.g. BEV-CC-500"
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
                className="h-10 w-full rounded-md border border-input bg-surface px-3 text-sm"
              >
                <option value="">Uncategorised</option>
                {categories.map((category) => (
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
              <Label htmlFor="costPrice">Cost price</Label>
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
              <Label htmlFor="sellingPrice">Selling price</Label>
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
