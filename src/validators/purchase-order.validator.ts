
import { z } from "zod";

// Create Purchase Order validation
export const createPurchaseOrderSchema = z.object({
  supplierId: z.string().uuid(),

  expectedDate: z.string().datetime().optional(),

  notes: z.string().max(1000).optional(),

  items: z
    .array(
      z.object({
        productId: z.string().uuid(),

        orderedQuantity: z.number().int().min(1),

        unitCost: z
          .string()
          .regex(/^\d+(\.\d{1,2})?$/)
          .refine((value) => Number(value) > 0),
      })
    )
    .min(1),
}).refine(
  (data) => {
    const productIds = data.items.map((item) => item.productId);
    return new Set(productIds).size === productIds.length;
  },
  {
    message: "Duplicate products are not allowed in the same purchase order",
    path: ["items"],
  }
);

// Update Purchase Order status validation
export const updatePurchaseOrderStatusSchema = z.object({
  status: z.enum([
    "ORDERED",
    "CANCELLED",
  ]),
});
