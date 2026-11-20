
import { z } from "zod";

export const createVarietySchema = z.object({
  name: z.string().trim().min(2).max(100),

  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{2,10}$/),

  categoryId: z.string().uuid(),
});

export const updateVarietySchema = z.object({
  name: z.string().trim().min(2).max(100),
});
