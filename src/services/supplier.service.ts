import prisma from "../lib/prisma.js";

interface CreateSupplierInput {
  name: string;
  phone: string;
  email?: string | undefined;
  address?: string | undefined;
  gstNumber?: string | undefined;
}

export async function createSupplier(input: CreateSupplierInput) {
  return prisma.supplier.create({
    data: {
      name: input.name,
      phone: input.phone,
      ...(input.email !== undefined && { email: input.email }),
      ...(input.address !== undefined && { address: input.address }),
      ...(input.gstNumber !== undefined && {
        gstNumber: input.gstNumber,
      }),
    },
  });
}

export async function getAllSuppliers() {
  return prisma.supplier.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function updateSupplier(
  id: string,
  input: {
    name?: string | undefined;
    phone?: string | undefined;
    email?: string | undefined;
    address?: string | undefined;
    gstNumber?: string | undefined;
  },
) {
  return prisma.supplier.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(input.email !== undefined && { email: input.email }),
      ...(input.address !== undefined && { address: input.address }),
      ...(input.gstNumber !== undefined && {
        gstNumber: input.gstNumber,
      }),
    },
  });
}

export async function updateSupplierStatus(id: string, isActive: boolean) {
  return prisma.supplier.update({
    where: { id },
    data: { isActive },
  });
}
