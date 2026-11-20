
import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().trim().min(2).max(200),

  description: z.string().max(2000).optional(),

  categoryId: z.string().uuid(),

  varietyId: z.string().uuid(),

  defaultSellingPrice: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/)
    .refine((value) => Number(value) > 0),

  costPrice: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/)
    .optional(),

  gstRate: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/)
    .optional(),

  hsnCode: z.string().max(20).optional(),

  inventoryTracking: z
    .enum(["UNIQUE_PIECE", "BULK"])
    .optional(),
});

const nonNegativeDecimal = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, "Must be a non-negative number with up to 2 decimal places");

export const updateProductSchema = z.object({
  name: z.string().trim().min(2).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  categoryId: z.string().uuid().optional(),
  varietyId: z.string().uuid().optional(),
  defaultSellingPrice: nonNegativeDecimal
    .refine((value) => Number(value) <= 9999999999.99, "Price exceeds the supported maximum")
    .optional(),
  gstRate: nonNegativeDecimal
    .refine((value) => Number(value) <= 999.99, "GST rate exceeds the supported maximum")
    .optional(),
  hsnCode: z.string().max(20).nullable().optional(),
  inventoryTracking: z.enum(["UNIQUE_PIECE", "BULK"]).optional(),
  isActive: z.boolean().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, {
  message: "At least one product field must be provided",
});

export type UpdateProductInput = z.infer<typeof updateProductSchema>;
