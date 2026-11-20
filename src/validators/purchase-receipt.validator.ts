import { z } from "zod";

export const createPurchaseReceiptSchema = z
  .object({
    idempotencyKey: z.string().trim().min(10).max(100),

    purchaseOrderId: z.string().uuid(),

    supplierInvoiceNumber: z.string().trim().max(100).optional(),

    supplierInvoiceDate: z.string().datetime().optional(),

    receivedAt: z.string().datetime().optional(),

    notes: z.string().max(1000).optional(),

    items: z
      .array(
        z.object({
          purchaseOrderItemId: z.string().uuid(),

          receivedQuantity: z.number().int().min(1).max(10000),

          // Required for BULK products.
          // Optional for UNIQUE_PIECE products.
          batchCode: z.string().trim().min(2).max(80).optional(),
        }),
      )
      .min(1),
  })
  .refine(
    (data) => {
      const itemIds = data.items.map((item) => item.purchaseOrderItemId);

      return new Set(itemIds).size === itemIds.length;
    },
    {
      message: "Duplicate purchase order items are not allowed",
      path: ["items"],
    },
  );
