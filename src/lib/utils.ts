import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

import { CURRENCY_CODE, CURRENCY_LOCALE } from "@/lib/currency";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format an amount in the business currency, e.g. `Le 1,234.50`.
 *
 * Accepts a string so `Prisma.Decimal` values can be passed through with
 * `.toString()` without a lossy float conversion on the way.
 */
export function formatCurrency(
  amount: number | string,
  currency = CURRENCY_CODE,
  locale = CURRENCY_LOCALE
): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(num) ? num : 0);
}

/**
 * Shortened form for chart axes, where full precision does not fit.
 */
export function formatCompactCurrency(
  amount: number,
  currency = CURRENCY_CODE,
  locale = CURRENCY_LOCALE
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    notation: "compact",
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(Number.isFinite(amount) ? amount : 0);
}

/**
 * Format a number with thousands separators.
 */
export function formatNumber(num: number | string, locale = "en-US"): string {
  const n = typeof num === "string" ? parseFloat(num) : num;
  return new Intl.NumberFormat(locale).format(Number.isFinite(n) ? n : 0);
}

/**
 * Format a date for display.
 */
export function formatDate(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  },
  locale = "en-US"
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, options).format(d);
}

/**
 * Format a date with time.
 */
export function formatDateTime(date: Date | string, locale = "en-US"): string {
  return formatDate(
    date,
    {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
    locale
  );
}

/** Short label for live lists so a sale just recorded stands out from older rows. */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diffMs = Date.now() - d.getTime();
  if (diffMs < 45_000) return "Just now";
  if (diffMs < 60_000) return "1 min ago";
  if (diffMs < 60 * 60_000) {
    return `${Math.floor(diffMs / 60_000)} min ago`;
  }
  if (diffMs < 24 * 60 * 60_000) {
    const hours = Math.floor(diffMs / (60 * 60_000));
    return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  }
  return formatDateTime(d);
}

export function isFreshTimestamp(date: Date | string, withinMs = 2 * 60_000) {
  const d = typeof date === "string" ? new Date(date) : date;
  return Date.now() - d.getTime() < withinMs;
}

/**
 * Calculate stock status based on quantity and threshold.
 */
export type StockStatus = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";

export function getStockStatus(
  quantity: number,
  threshold: number
): StockStatus {
  if (quantity <= 0) return "OUT_OF_STOCK";
  if (quantity <= threshold) return "LOW_STOCK";
  return "IN_STOCK";
}

/**
 * Get readable label for stock status.
 */
export function getStockStatusLabel(status: StockStatus): string {
  switch (status) {
    case "IN_STOCK":
      return "In Stock";
    case "LOW_STOCK":
      return "Low Stock";
    case "OUT_OF_STOCK":
      return "Out of Stock";
  }
}

/**
 * Get initials from a name.
 */
export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

/**
 * Truncate text with ellipsis.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "…";
}
