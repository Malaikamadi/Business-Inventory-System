"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatNumber } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import {
  recordAdjustmentAction,
  recordArrivalAction,
} from "@/server/actions/inventory.actions";

export interface StockFormProduct {
  id: string;
  name: string;
  sku: string;
  shopId: string;
}

interface StockEntryFormProps {
  mode: "arrival" | "adjustment";
  shops: { id: string; name: string }[];
  products: StockFormProduct[];
  /** Current quantity keyed as `shopId:productId`, to preview the result. */
  balances: Record<string, number>;
  defaultShopId: string;
}

export function StockEntryForm({
  mode,
  shops,
  products,
  balances,
  defaultShopId,
}: StockEntryFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [shopId, setShopId] = useState(defaultShopId);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [direction, setDirection] = useState<"increase" | "decrease">("decrease");
  const [reason, setReason] = useState("");

  const shopProducts = useMemo(
    () => products.filter((product) => product.shopId === shopId),
    [products, shopId]
  );

  const currentQuantity = useMemo(() => {
    if (!shopId || !productId) return null;
    return balances[`${shopId}:${productId}`] ?? 0;
  }, [balances, shopId, productId]);

  const parsedQuantity = Number(quantity);
  const validQuantity = Number.isInteger(parsedQuantity) && parsedQuantity > 0;

  const delta = isArrival
    ? parsedQuantity
    : direction === "increase"
      ? parsedQuantity
      : -parsedQuantity;

  const projected =
    currentQuantity !== null && validQuantity ? currentQuantity + delta : null;

  const wouldGoNegative = projected !== null && projected < 0;

  const canSubmit =
    Boolean(shopId) &&
    Boolean(productId) &&
    validQuantity &&
    !wouldGoNegative &&
    (isArrival || reason.trim().length >= 3);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    startTransition(async () => {
      const result = isArrival
        ? await recordArrivalAction({
            shopId,
            productId,
            quantity: parsedQuantity,
            notes: reason.trim(),
          })
        : await recordAdjustmentAction({
            shopId,
            productId,
            quantityChange: delta,
            reason: reason.trim(),
          });

      if (!result.success) {
        toast({
          variant: "error",
          title: isArrival
            ? "Arrival not recorded"
            : "Adjustment not recorded",
          description: result.error,
        });
        return;
      }

      toast({
        variant: "success",
        title: isArrival ? "Stock arrival recorded" : "Adjustment recorded",
        description: `New quantity on hand: ${formatNumber(result.data!.quantityAfter)}.`,
      });

      setProductId("");
      setQuantity("");
      setReason("");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardContent className="p-6">
        <form onSubmit={submit} className="space-y-5">
          {shops.length > 1 && (
            <div className="space-y-1.5">
              <Label htmlFor="shop">Shop</Label>
              <select
                id="shop"
                value={shopId}
                onChange={(event) => {
                  setShopId(event.target.value);
                  setProductId("");
                }}
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
          )}

          <div className="space-y-1.5">
            <Label htmlFor="product">Product</Label>
            <select
              id="product"
              value={productId}
              onChange={(event) => setProductId(event.target.value)}
              className="field-select w-full"
              required
            >
              <option value="">Select a product</option>
              {shopProducts.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.sku})
                </option>
              ))}
            </select>
            {currentQuantity !== null && (
              <p className="text-xs text-text-muted">
                Currently on hand: {formatNumber(currentQuantity)}
              </p>
            )}
          </div>

          {!isArrival && (
            <fieldset className="space-y-1.5">
              <legend className="mb-1.5 text-sm font-medium text-text-primary">
                Direction
              </legend>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={direction === "decrease" ? "default" : "outline"}
                  onClick={() => setDirection("decrease")}
                >
                  Remove stock
                </Button>
                <Button
                  type="button"
                  variant={direction === "increase" ? "default" : "outline"}
                  onClick={() => setDirection("increase")}
                >
                  Add stock
                </Button>
              </div>
              <p className="text-xs text-text-muted">
                Use this for damage, theft, expiry or a stock-count correction —
                not for deliveries or sales.
              </p>
            </fieldset>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              placeholder="0"
              required
            />
            {wouldGoNegative && (
              <p className="text-xs font-medium text-danger">
                This would take stock below zero. Reduce the quantity.
              </p>
            )}
            {projected !== null && !wouldGoNegative && (
              <p className="text-xs text-text-muted">
                Stock after this entry: {formatNumber(projected)}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reason">
              {isArrival ? "Reference or notes" : "Reason"}
              {!isArrival && <span className="text-danger"> *</span>}
            </Label>
            <Input
              id="reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={
                isArrival
                  ? "e.g. Supplier delivery, invoice #4821"
                  : "e.g. 3 units damaged in transit"
              }
              required={!isArrival}
            />
            <p className="text-xs text-text-muted">
              {isArrival
                ? "Optional, but a supplier reference makes the ledger far easier to audit."
                : "Required. Adjustments change stock without a sale or delivery, so the reason is the only explanation on record."}
            </p>
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full sm:w-auto"
            disabled={!canSubmit || isPending}
          >
            {isPending
              ? "Recording…"
              : isArrival
                ? "Record arrival"
                : "Record adjustment"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
