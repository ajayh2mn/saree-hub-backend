
import { z } from "zod";

export const addInventoryUnitsSchema = z.object({
  productId: z.string().uuid(),

  quantity: z
    .number()
    .int()
    .min(1)
    .max(1000),
});
