import { REVIEW } from "@/lib/constants";
import { isOutsideBusinessHours } from "@/lib/dates";

export type ReviewKind =
  | "repeat_voids"
  | "quick_void"
  | "unusual_adjustment"
  | "after_hours"
  | "low_sales";

export function isUnusualAdjustment(
  quantityChange: number,
  quantityBefore: number
): boolean {
  const abs = Math.abs(quantityChange);
  if (abs >= REVIEW.LARGE_ADJUSTMENT_UNITS) return true;
  if (
    quantityBefore > 0 &&
    abs / quantityBefore >= REVIEW.LARGE_ADJUSTMENT_SHARE &&
    abs >= 10
  ) {
    return true;
  }
  return false;
}

export function isLargeAfterHoursChange(
  quantityChange: number,
  at: Date
): boolean {
  return (
    isOutsideBusinessHours(at) &&
    Math.abs(quantityChange) >= REVIEW.LARGE_AFTER_HOURS_UNITS
  );
}

export function isQuickVoid(soldAt: Date, voidedAt: Date): boolean {
  return (
    voidedAt.getTime() - soldAt.getTime() <=
    REVIEW.QUICK_VOID_MINUTES * 60 * 1000
  );
}
