
import { Prisma } from "@prisma/client";
import type { InventoryTracking } from "@prisma/client";

import prisma from "../lib/prisma.js";
import { generateProductCode } from "./code-generator.service.js";
import type { UpdateProductInput } from "../validators/product.validator.js";

export class ProductUpdateError extends Error {
  constructor(
    message: string,
    public readonly statusCode: 400 | 404 | 409,
  ) {
    super(message);
    this.name = "ProductUpdateError";
  }
}

interface CreateProductInput {
  name: string;
  description?: string | undefined;
  categoryId: string;
  varietyId: string;
  defaultSellingPrice: string;
  costPrice?: string | undefined;
  gstRate?: string | undefined;
  hsnCode?: string | undefined;
  inventoryTracking?: InventoryTracking | undefined;
}

export async function createProduct(input: CreateProductInput, includeCostPrice: boolean) {
  return prisma.$transaction(async (tx) => {
    // 1. Verify category
    const category = await tx.category.findUnique({
      where: { id: input.categoryId },
    });

    if (!category || !category.isActive) {
      throw new Error("Category not found or inactive");
    }

    // 2. Verify variety belongs to selected category
    const variety = await tx.variety.findFirst({
      where: {
        id: input.varietyId,
        categoryId: input.categoryId,
        isActive: true,
      },
    });

    if (!variety) {
      throw new Error(
        "Variety not found or does not belong to this category"
      );
    }

    // 3. Generate unique product code
    const productCode = await generateProductCode(
      tx,
      category.code,
      variety.code
    );

    // 4. Save product
    const product = await tx.product.create({
      data: {
        productCode,
        name: input.name,
        description: input.description ?? null,
        defaultSellingPrice: new Prisma.Decimal(
          input.defaultSellingPrice
        ),
        costPrice: input.costPrice
          ? new Prisma.Decimal(input.costPrice)
          : null,
        gstRate: new Prisma.Decimal(input.gstRate ?? "0"),
        hsnCode: input.hsnCode ?? null,
        inventoryTracking:
          input.inventoryTracking ?? "UNIQUE_PIECE",
        category: {
          connect: { id: category.id },
        },
        variety: {
          connect: { id: variety.id },
        },
      },
      select: {
        id: true,
        productCode: true,
        name: true,
        description: true,
        categoryId: true,
        varietyId: true,
        defaultSellingPrice: true,
        ...(includeCostPrice ? { costPrice: true } : {}),
        gstRate: true,
        hsnCode: true,
        inventoryTracking: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        category: { select: { id: true, code: true, name: true } },
        variety: { select: { id: true, code: true, name: true } },
      },
    });

    return product;
  });
}

export async function getProducts(includeCostPrice: boolean) {
  return prisma.product.findMany({
    orderBy: {
      name: "asc",
    },
    select: {
      id: true,
      productCode: true,
      name: true,
      description: true,
      categoryId: true,
      varietyId: true,
      defaultSellingPrice: true,
      ...(includeCostPrice ? { costPrice: true } : {}),
      gstRate: true,
      hsnCode: true,
      inventoryTracking: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      category: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
      variety: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
    },
  });
}

export async function updateProduct(id: string, input: UpdateProductInput) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.product.findUnique({ where: { id } });
    if (!existing) {
      throw new ProductUpdateError("Product not found", 404);
    }

    const referencesChanged = input.categoryId !== undefined || input.varietyId !== undefined;
    const categoryId = input.categoryId ?? existing.categoryId;
    const varietyId = input.varietyId ?? existing.varietyId;

    if (referencesChanged) {
      const category = await tx.category.findUnique({ where: { id: categoryId } });
      if (!category || !category.isActive) {
        throw new ProductUpdateError("Category not found or inactive", 400);
      }

      const variety = await tx.variety.findFirst({
        where: { id: varietyId, categoryId, isActive: true },
      });
      if (!variety) {
        throw new ProductUpdateError("Variety not found or does not belong to this category", 400);
      }
    }

    if (
      input.inventoryTracking !== undefined &&
      input.inventoryTracking !== existing.inventoryTracking
    ) {
      const [trackedUnits, stockedBatches] = await Promise.all([
        tx.inventoryUnit.count({
          where: {
            productId: id,
            status: { in: ["AVAILABLE", "RESERVED", "RETURNED"] },
          },
        }),
        tx.stockBatch.count({ where: { productId: id, quantity: { gt: 0 } } }),
      ]);

      if (trackedUnits > 0 || stockedBatches > 0) {
        throw new ProductUpdateError(
          "Inventory tracking cannot be changed while the product has stock",
          409,
        );
      }
    }

    const updated = await tx.product.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.hsnCode !== undefined ? { hsnCode: input.hsnCode } : {}),
        ...(input.defaultSellingPrice !== undefined
          ? { defaultSellingPrice: new Prisma.Decimal(input.defaultSellingPrice) }
          : {}),
        ...(input.gstRate !== undefined ? { gstRate: new Prisma.Decimal(input.gstRate) } : {}),
        ...(input.inventoryTracking !== undefined
          ? { inventoryTracking: input.inventoryTracking }
          : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(input.categoryId !== undefined ? { category: { connect: { id: categoryId } } } : {}),
        ...(input.varietyId !== undefined ? { variety: { connect: { id: varietyId } } } : {}),
      },
      select: {
        id: true,
        productCode: true,
        name: true,
        description: true,
        categoryId: true,
        varietyId: true,
        defaultSellingPrice: true,
        gstRate: true,
        hsnCode: true,
        inventoryTracking: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        category: { select: { id: true, code: true, name: true } },
        variety: { select: { id: true, code: true, name: true } },
      },
    });

    return updated;
  });
}
