
import prisma from "../lib/prisma.js";

interface CreateVarietyInput {
  name: string;
  code: string;
  categoryId: string;
}

export async function createVariety(input: CreateVarietyInput) {
  const category = await prisma.category.findUnique({
    where: { id: input.categoryId },
  });

  if (!category || !category.isActive) {
    throw new Error("Category not found or inactive");
  }

  return prisma.variety.create({
    data: {
      name: input.name,
      code: input.code,
      categoryId: input.categoryId,
    },
    include: {
      category: true,
    },
  });
}

export async function getVarietiesByCategory(categoryId: string) {
  return prisma.variety.findMany({
    where: { categoryId },
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          products: true,
        },
      },
    },
  });
}

export async function updateVarietyName(id: string, name: string) {
  return prisma.variety.update({
    where: { id },
    data: { name },
  });
}

export async function updateVarietyStatus(
  id: string,
  isActive: boolean
) {
  return prisma.variety.update({
    where: { id },
    data: { isActive },
  });
}
