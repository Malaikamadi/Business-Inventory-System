"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function ProductFilters({
  categories,
  selectedCategory,
  selectedStatus,
  search,
}: {
  categories: { id: string; name: string }[];
  selectedCategory: string;
  selectedStatus: string;
  search: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [term, setTerm] = useState(search);

  function apply(key: string, value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    const query = params.toString();
    router.push(query ? `/products?${query}` : "/products");
  }

  const hasFilters = Boolean(selectedCategory || selectedStatus || search);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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
          placeholder="Search by name or SKU"
          className="pl-9"
          aria-label="Search products"
        />
      </form>

      <select
        value={selectedCategory}
        onChange={(event) => apply("category", event.target.value)}
        aria-label="Filter by category"
        className="field-select"
      >
        <option value="">All categories</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>

      <select
        value={selectedStatus}
        onChange={(event) => apply("status", event.target.value)}
        aria-label="Filter by status"
        className="field-select"
      >
        <option value="">Active</option>
        <option value="DISCONTINUED">Discontinued</option>
      </select>

      {hasFilters && (
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setTerm("");
            router.push("/products");
          }}
        >
          <X className="h-4 w-4" />
          Clear
        </Button>
      )}
    </div>
  );
}
