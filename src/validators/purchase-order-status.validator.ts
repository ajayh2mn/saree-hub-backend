
import { z } from "zod";

export const updatePurchaseOrderStatusSchema = z.object({
  status: z.enum([
    "ORDERED",
    "CANCELLED",
  ]),
});
