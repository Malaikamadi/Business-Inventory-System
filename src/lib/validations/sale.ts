import { z } from "zod";

export const saleItemSchema = z.object({
  productId: z.string().uuid("Invalid product"),
  quantity: z.coerce
    .number()
    .int("Quantity must be a whole number")
    .min(1, "Quantity must be at least 1"),
});

export const saleSchema = z.object({
  shopId: z.string().uuid("Shop is required"),
  items: z
    .array(saleItemSchema)
    .min(1, "At least one item is required"),
  notes: z.string().optional().or(z.literal("")),
});

export type SaleSchemaData = z.infer<typeof saleSchema>;
export type SaleItemSchemaData = z.infer<typeof saleItemSchema>;
