"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

export function PeriodTabs({
  periods,
  active,
}: {
  periods: { key: string; label: string }[];
  active: string;
}) {
  return (
    <div
      className="inline-flex rounded-md border border-border bg-surface p-1"
      role="tablist"
      aria-label="Reporting period"
    >
      {periods.map((period) => (
        <Link
          key={period.key}
          href={`/reports?period=${period.key}`}
          role="tab"
          aria-selected={active === period.key}
          className={cn(
            "rounded px-3 py-1.5 text-sm font-medium transition-colors",
            active === period.key
              ? "bg-accent text-accent-foreground"
              : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
          )}
        >
          {period.label}
        </Link>
      ))}
    </div>
  );
}
