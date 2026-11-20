
import prisma from "../lib/prisma.js";

interface CreateCategoryInput {
  name: string;
  code: string;
}

export async function createCategory(input: CreateCategoryInput) {
  return prisma.category.create({
    data: {
      name: input.name,
      code: input.code,
    },
  });
}

export async function getAllCategories() {
  return prisma.category.findMany({
    orderBy: {
      name: "asc",
    },
    include: {
      _count: {
        select: {
          varieties: true,
          products: true,
        },
      },
    },
  });
}

export async function updateCategoryName(
  id: string,
  name: string
) {
  return prisma.category.update({
    where: { id },
    data: { name },
  });
}

export async function updateCategoryStatus(
  id: string,
  isActive: boolean
) {
  return prisma.category.update({
    where: { id },
    data: { isActive },
  });
}
