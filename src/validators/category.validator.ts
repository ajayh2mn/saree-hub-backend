
import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().trim().min(2).max(100),

  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{2,10}$/, {
      message: "Code must contain 2-10 uppercase letters or numbers",
    }),
});

export const updateCategorySchema = z.object({
  name: z.string().trim().min(2).max(100),
});
