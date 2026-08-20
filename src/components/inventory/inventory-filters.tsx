"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface InventoryFiltersProps {
  shops: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  selectedShop: string;
  selectedCategory: string;
  search: string;
  /** Hidden on the dedicated low-stock and out-of-stock pages. */
  showStatusFilter?: boolean;
  selectedStatus?: string;
}

export function InventoryFilters({
  shops,
  categories,
  selectedShop,
  selectedCategory,
  search,
  showStatusFilter = true,
  selectedStatus = "",
}: InventoryFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [term, setTerm] = useState(search);

  function apply(key: string, value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  const hasFilters = Boolean(
    selectedShop || selectedCategory || search || selectedStatus
  );

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <form
        className="relative flex-1"
        onSubmit={(event) => {
          event.preventDefault();
          apply("q", term.trim());
        }}
      >
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <Input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Search by product name or SKU"
          className="pl-9"
          aria-label="Search inventory"
        />
      </form>

      {shops.length > 0 && (
        <select
          value={selectedShop}
          onChange={(event) => apply("shop", event.target.value)}
          aria-label="Filter by shop"
          className="h-10 rounded-md border border-input bg-surface px-3 text-sm"
        >
          <option value="">All shops</option>
          {shops.map((shop) => (
            <option key={shop.id} value={shop.id}>
              {shop.name}
            </option>
          ))}
        </select>
      )}

      <select
        value={selectedCategory}
        onChange={(event) => apply("category", event.target.value)}
        aria-label="Filter by category"
        className="h-10 rounded-md border border-input bg-surface px-3 text-sm"
      >
        <option value="">All categories</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>

      {showStatusFilter && (
        <select
          value={selectedStatus}
          onChange={(event) => apply("status", event.target.value)}
          aria-label="Filter by stock status"
          className="h-10 rounded-md border border-input bg-surface px-3 text-sm"
        >
          <option value="">All stock levels</option>
          <option value="in">In stock</option>
          <option value="low">Low stock</option>
          <option value="out">Out of stock</option>
        </select>
      )}

      {hasFilters && (
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setTerm("");
            router.push(pathname);
          }}
        >
          <X className="h-4 w-4" />
          Clear
        </Button>
      )}
    </div>
  );
}