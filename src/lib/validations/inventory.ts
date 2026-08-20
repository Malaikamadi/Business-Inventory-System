import { z } from "zod";

export const stockArrivalSchema = z.object({
  shopId: z.string().uuid("Shop is required"),
  productId: z.string().uuid("Product is required"),
  quantity: z.coerce
    .number()
    .int("Quantity must be a whole number")
    .min(1, "Quantity must be at least 1"),
  notes: z.string().optional().or(z.literal("")),
});

export type StockArrivalFormData = z.infer<typeof stockArrivalSchema>;

export const stockAdjustmentSchema = z.object({
  shopId: z.string().uuid("Shop is required"),
  productId: z.string().uuid("Product is required"),
  quantityChange: z.coerce
    .number()
    .int("Quantity must be a whole number")
    .refine((val) => val !== 0, "Quantity change cannot be zero"),
  reason: z.string().min(1, "Reason is required for adjustments"),
});

export type StockAdjustmentFormData = z.infer<typeof stockAdjustmentSchema>;
