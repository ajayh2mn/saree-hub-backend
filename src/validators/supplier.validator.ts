import { z } from "zod";

export const createSupplierSchema = z.object({
  name: z.string().trim().min(2).max(150),
  phone: z.string().trim().min(10).max(15),
  email: z.string().email().optional(),
  address: z.string().max(500).optional(),
  gstNumber: z.string().trim().max(15).optional(),
});

export const updateSupplierSchema = z
  .object({
    name: z.string().trim().min(2).max(150).optional(),
    phone: z.string().trim().min(10).max(15).optional(),
    email: z.string().email().optional(),
    address: z.string().max(500).optional(),
    gstNumber: z.string().trim().max(15).optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "At least one field must be provided",
  });
