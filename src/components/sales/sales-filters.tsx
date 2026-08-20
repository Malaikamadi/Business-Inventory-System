"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface SalesFiltersProps {
  shops: { id: string; name: string }[];
  selectedShop: string;
  selectedStatus: string;
  search: string;
}

export function SalesFilters({
  shops,
  selectedShop,
  selectedStatus,
  search,
}: SalesFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [term, setTerm] = useState(search);

  /** Any filter change resets pagination, otherwise page 4 of a new filter is empty. */
  function apply(key: string, value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    const query = params.toString();
    router.push(query ? `/sales?${query}` : "/sales");
  }

  const hasFilters = Boolean(selectedShop || selectedStatus || search);

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
          placeholder="Search sale number or product"
          className="pl-9"
          aria-label="Search sales"
        />
      </form>

      {shops.length > 0 && (
        <select
          value={selectedShop}
          onChange={(event) => apply("shop", event.target.value)}
          aria-label="Filter by shop"
          className="field-select"
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
        value={selectedStatus}
        onChange={(event) => apply("status", event.target.value)}
        aria-label="Filter by status"
        className="field-select"
      >
        <option value="">All statuses</option>
        <option value="COMPLETED">Completed</option>
        <option value="VOIDED">Voided</option>
      </select>

      {hasFilters && (
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setTerm("");
            router.push("/sales");
          }}
        >
          <X className="h-4 w-4" />
          Clear
        </Button>
      )}
    </div>
  );
}
