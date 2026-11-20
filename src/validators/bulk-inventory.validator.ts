import { z } from "zod";

export const addBulkInventorySchema = z.object({
  productId: z.string().uuid(),
  batchCode: z.string().trim().min(2).max(80),
  quantity: z.number().int().min(1).max(10000),
});