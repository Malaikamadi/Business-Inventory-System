"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { MOVEMENT_TYPE_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";

export function MovementFilters({
  shops,
  selectedShop,
  selectedType,
}: {
  shops: { id: string; name: string }[];
  selectedShop: string;
  selectedType: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function apply(key: string, value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    const query = params.toString();
    router.push(
      query ? `/inventory/movements?${query}` : "/inventory/movements"
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
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
        value={selectedType}
        onChange={(event) => apply("type", event.target.value)}
        aria-label="Filter by movement type"
        className="h-10 rounded-md border border-input bg-surface px-3 text-sm"
      >
        <option value="">All movement types</option>
        {Object.entries(MOVEMENT_TYPE_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      {(selectedShop || selectedType) && (
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push("/inventory/movements")}
        >
          <X className="h-4 w-4" />
          Clear
        </Button>
      )}
    </div>
  );
}
