"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, Search, ShoppingCart, Trash2, X } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { ProductThumbnail } from "@/components/products/product-thumbnail";
import { createSaleAction } from "@/server/actions/sales.actions";

export interface SellableProduct {
  productId: string;
  name: string;
  sku: string;
  categoryName: string | null;
  sellingPrice: string;
  quantity: number;
  lowStockThreshold: number;
  imageUrl: string | null;
}

interface CartLine {
  productId: string;
  quantity: number;
}

interface SaleFormProps {
  shops: { id: string; name: string }[];
  activeShopId: string;
  canChooseShop: boolean;
  products: SellableProduct[];
}

export function SaleForm({
  shops,
  activeShopId,
  canChooseShop,
  products,
}: SaleFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [notes, setNotes] = useState("");
  const [cartOpen, setCartOpen] = useState(false);

  const byId = useMemo(
    () => new Map(products.map((product) => [product.productId, product])),
    [products]
  );

  const visibleProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(term) ||
        product.sku.toLowerCase().includes(term)
    );
  }, [products, search]);

  const quantityInCart = (productId: string) =>
    cart.find((line) => line.productId === productId)?.quantity ?? 0;

  /**
   * Stock shown here is a snapshot from page load. It stops obvious mistakes
   * early, but the authoritative check happens under lock on the server, so a
   * sale can still be rejected if another till got there first.
   */
  function changeQuantity(productId: string, delta: number) {
    const product = byId.get(productId);
    if (!product) return;

    setCart((current) => {
      const existing = current.find((line) => line.productId === productId);
      const next = (existing?.quantity ?? 0) + delta;

      if (next <= 0) {
        return current.filter((line) => line.productId !== productId);
      }
      if (next > product.quantity) {
        toast({
          variant: "error",
          title: "Not enough stock",
          description: `Only ${product.quantity} of ${product.name} available.`,
        });
        return current;
      }
      if (existing) {
        return current.map((line) =>
          line.productId === productId ? { ...line, quantity: next } : line
        );
      }
      return [...current, { productId, quantity: next }];
    });
  }

  function removeLine(productId: string) {
    setCart((current) => current.filter((line) => line.productId !== productId));
  }

  const total = cart.reduce((sum, line) => {
    const product = byId.get(line.productId);
    return sum + (product ? Number(product.sellingPrice) * line.quantity : 0);
  }, 0);

  const itemCount = cart.reduce((sum, line) => sum + line.quantity, 0);

  function submit() {
    if (cart.length === 0) return;

    startTransition(async () => {
      const result = await createSaleAction({
        shopId: activeShopId,
        items: cart,
        notes: notes.trim(),
      });

      if (!result.success) {
        toast({
          variant: "error",
          title: "Sale not recorded",
          description: result.error,
        });
        return;
      }

      toast({
        variant: "success",
        title: `Sale ${result.data!.saleNumber} recorded`,
        description: `${formatCurrency(result.data!.totalAmount)} · stock updated.`,
      });
      setCart([]);
      setNotes("");
      setCartOpen(false);
      router.push(`/sales/${result.data!.saleId}`);
    });
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        {canChooseShop && (
          <div>
            <label
              htmlFor="shop"
              className="mb-1.5 block text-sm font-medium text-text-primary"
            >
              Shop
            </label>
            <select
              id="shop"
              value={activeShopId}
              onChange={(event) => {
                router.push(`/sales/new?shop=${event.target.value}`);
              }}
              className="h-10 w-full rounded-md border border-input bg-surface px-3 text-sm sm:max-w-xs"
            >
              {shops.map((shop) => (
                <option key={shop.id} value={shop.id}>
                  {shop.name}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-text-muted">
              Stock is deducted from the selected shop.
            </p>
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by product name or SKU"
            className="pl-9"
            aria-label="Search products"
          />
        </div>

        {visibleProducts.length === 0 ? (
          <p className="py-12 text-center text-sm text-text-muted">
            No products match “{search}”.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {visibleProducts.map((product) => {
              const inCart = quantityInCart(product.productId);
              const soldOut = product.quantity <= 0;

              return (
                <li key={product.productId}>
                  <Card
                    className={cn(
                      "h-full transition-colors",
                      inCart > 0 && "border-accent ring-1 ring-accent/30",
                      soldOut && "opacity-60"
                    )}
                  >
                    <CardContent className="flex h-full flex-col gap-3 p-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <ProductThumbnail
                          src={product.imageUrl}
                          alt={product.name}
                          size="md"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-text-primary">
                            {product.name}
                          </p>
                          <p className="mt-0.5 text-xs text-text-muted">
                            {product.sku}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <span className="text-base font-semibold tabular-nums">
                          {formatCurrency(product.sellingPrice)}
                        </span>
                        {soldOut ? (
                          <Badge variant="danger">Out of stock</Badge>
                        ) : product.quantity <= product.lowStockThreshold ? (
                          <Badge variant="warning">
                            {product.quantity} left
                          </Badge>
                        ) : (
                          <span className="text-xs text-text-muted">
                            {product.quantity} in stock
                          </span>
                        )}
                      </div>

                      {inCart > 0 ? (
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => changeQuantity(product.productId, -1)}
                            aria-label={`Remove one ${product.name}`}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="flex-1 text-center text-sm font-semibold tabular-nums">
                            {inCart}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            disabled={inCart >= product.quantity}
                            onClick={() => changeQuantity(product.productId, 1)}
                            aria-label={`Add one ${product.name}`}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          disabled={soldOut}
                          onClick={() => changeQuantity(product.productId, 1)}
                        >
                          <Plus className="h-4 w-4" />
                          Add
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Desktop cart */}
      <div className="hidden lg:block">
        <div className="sticky top-24">
          <CartPanel
            cart={cart}
            byId={byId}
            total={total}
            notes={notes}
            onNotesChange={setNotes}
            onChangeQuantity={changeQuantity}
            onRemove={removeLine}
            onSubmit={submit}
            isPending={isPending}
          />
        </div>
      </div>

      {/* Mobile cart bar and sheet */}
      {cart.length > 0 && (
        <div className="fixed inset-x-0 bottom-[56px] z-30 border-t border-border bg-surface p-3 lg:hidden">
          <Button
            type="button"
            size="lg"
            className="w-full justify-between"
            onClick={() => setCartOpen(true)}
          >
            <span className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </span>
            <span className="tabular-nums">{formatCurrency(total)}</span>
          </Button>
        </div>
      )}

      {cartOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setCartOpen(false)}
            aria-hidden
          />
          <div
            className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-xl bg-background p-4"
            role="dialog"
            aria-modal
            aria-label="Review sale"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">Review sale</h2>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setCartOpen(false)}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <CartPanel
              cart={cart}
              byId={byId}
              total={total}
              notes={notes}
              onNotesChange={setNotes}
              onChangeQuantity={changeQuantity}
              onRemove={removeLine}
              onSubmit={submit}
              isPending={isPending}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function CartPanel({
  cart,
  byId,
  total,
  notes,
  onNotesChange,
  onChangeQuantity,
  onRemove,
  onSubmit,
  isPending,
}: {
  cart: CartLine[];
  byId: Map<string, SellableProduct>;
  total: number;
  notes: string;
  onNotesChange: (value: string) => void;
  onChangeQuantity: (productId: string, delta: number) => void;
  onRemove: (productId: string) => void;
  onSubmit: () => void;
  isPending: boolean;
}) {
  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <h2 className="text-sm font-semibold text-text-primary">Current sale</h2>

        {cart.length === 0 ? (
          <p className="py-6 text-center text-sm text-text-muted">
            No items yet. Add products to start a sale.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {cart.map((line) => {
              const product = byId.get(line.productId);
              if (!product) return null;
              const lineTotal = Number(product.sellingPrice) * line.quantity;

              return (
                <li key={line.productId} className="flex gap-3 py-3">
                  <ProductThumbnail src={product.imageUrl} alt={product.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text-primary">
                      {product.name}
                    </p>
                    <p className="text-xs text-text-muted">
                      {formatCurrency(product.sellingPrice)} each
                    </p>
                    <div className="mt-2 flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        onClick={() => onChangeQuantity(line.productId, -1)}
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center text-sm font-medium tabular-nums">
                        {line.quantity}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        disabled={line.quantity >= product.quantity}
                        onClick={() => onChangeQuantity(line.productId, 1)}
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="ml-1 text-text-muted hover:text-danger"
                        onClick={() => onRemove(line.productId)}
                        aria-label={`Remove ${product.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {formatCurrency(lineTotal)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        <div>
          <label
            htmlFor="notes"
            className="mb-1.5 block text-sm font-medium text-text-primary"
          >
            Notes <span className="font-normal text-text-muted">(optional)</span>
          </label>
          <Input
            id="notes"
            value={notes}
            onChange={(event) => onNotesChange(event.target.value)}
            placeholder="Reference or customer detail"
          />
        </div>

        <div className="flex items-center justify-between border-t border-border pt-4">
          <span className="text-sm font-medium text-text-secondary">Total</span>
          <span className="text-xl font-semibold tabular-nums">
            {formatCurrency(total)}
          </span>
        </div>

        <Button
          type="button"
          size="lg"
          className="w-full"
          disabled={cart.length === 0 || isPending}
          onClick={onSubmit}
        >
          {isPending ? "Recording…" : "Confirm sale"}
        </Button>
      </CardContent>
    </Card>
  );
}
