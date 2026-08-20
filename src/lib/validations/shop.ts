import { z } from "zod";

export const shopSchema = z.object({
  name: z.string().min(1, "Shop name is required").max(150),
  location: z.string().max(200).optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  phone: z.string().max(20).optional().or(z.literal("")),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
});

export type ShopFormData = z.infer<typeof shopSchema>;
