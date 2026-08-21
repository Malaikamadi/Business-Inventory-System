import { z } from "zod";

import { isStoredImagePath } from "@/lib/images";

export const productSchema = z.object({
  name: z.string().min(1, "Product name is required").max(200),
  sku: z.string().min(1, "SKU is required").max(100),
  shopId: z.string().uuid("Shop is required"),
  categoryId: z.string().uuid().optional().or(z.literal("")),
  description: z.string().optional().or(z.literal("")),
  costPrice: z.coerce
    .number()
    .min(0, "Cost price must be non-negative")
    .multipleOf(0.01, "Cost price can have at most 2 decimal places"),
  sellingPrice: z.coerce
    .number()
    .min(0, "Selling price must be non-negative")
    .multipleOf(0.01, "Selling price can have at most 2 decimal places"),
  lowStockThreshold: z.coerce
    .number()
    .int("Threshold must be a whole number")
    .min(0, "Threshold must be non-negative")
    .default(10),
  // Restricted to paths produced by our own uploader. Accepting arbitrary URLs
  // here would let anyone who can edit a product point the catalogue at a
  // third-party host, which leaks page views and breaks when that host does.
  imageUrl: z
    .string()
    .refine(isStoredImagePath, "That image is not a valid upload.")
    .optional()
    .or(z.literal("")),
});

export type ProductFormData = z.infer<typeof productSchema>;

export const categorySchema = z.object({
  name: z.string().min(1, "Category name is required").max(100),
  description: z.string().optional().or(z.literal("")),
  shopId: z.string().uuid("Shop is required"),
  parentId: z.string().uuid().optional().or(z.literal("")),
});

export type CategoryFormData = z.infer<typeof categorySchema>;
