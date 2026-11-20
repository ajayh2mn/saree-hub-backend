import prisma from "../lib/prisma.js";
import { generatePieceCode } from "./code-generator.service.js";

// ==========================================
// 1. UNIQUE PIECE INVENTORY
// ==========================================

interface AddInventoryInput {
  productId: string;
  quantity: number;
}

export async function addInventoryUnits(input: AddInventoryInput) {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: { id: input.productId },
    });

    if (!product || !product.isActive) {
      throw new Error("Product not found or inactive");
    }

    if (product.inventoryTracking !== "UNIQUE_PIECE") {
      throw new Error("This product uses bulk inventory tracking");
    }

    const createdUnits = [];

    for (let i = 0; i < input.quantity; i++) {
      const pieceCode = await generatePieceCode(
        tx,
        product.id,
        product.productCode,
      );

      const unit = await tx.inventoryUnit.create({
        data: {
          productId: product.id,
          pieceCode,
          status: "AVAILABLE",
        },
      });

      await tx.stockMovement.create({
        data: {
          productId: product.id,
          inventoryUnitId: unit.id,
          movementType: "OPENING",
          quantity: 1,
          reference: "INITIAL_STOCK",
          notes: "Initial inventory added",
        },
      });

      createdUnits.push(unit);
    }

    return {
      productCode: product.productCode,
      quantityAdded: createdUnits.length,
      units: createdUnits,
    };
  });
}

// ==========================================
// 2. GET UNIQUE PIECE INVENTORY
// ==========================================

export async function getProductInventory(productId: string) {
  return prisma.inventoryUnit.findMany({
    where: {
      productId,
    },
    orderBy: {
      pieceCode: "asc",
    },
    select: {
      id: true,
      pieceCode: true,
      barcode: true,
      status: true,
      createdAt: true,
    },
  });
}

// ==========================================
// 3. BULK INVENTORY
// ==========================================

interface AddBulkInventoryInput {
  productId: string;
  batchCode: string;
  quantity: number;
}

export async function addBulkInventory(input: AddBulkInventoryInput) {
  return prisma.$transaction(async (tx) => {
    // Verify product
    const product = await tx.product.findUnique({
      where: {
        id: input.productId,
      },
    });

    if (!product || !product.isActive) {
      throw new Error("Product not found or inactive");
    }

    // Verify inventory tracking type
    if (product.inventoryTracking !== "BULK") {
      throw new Error("This product uses individual piece tracking");
    }

    // Add or update batch quantity
    const batch = await tx.stockBatch.upsert({
      where: {
        productId_batchCode: {
          productId: input.productId,
          batchCode: input.batchCode,
        },
      },
      create: {
        productId: input.productId,
        batchCode: input.batchCode,
        quantity: input.quantity,
      },
      update: {
        quantity: {
          increment: input.quantity,
        },
      },
    });

    // Record stock movement
    await tx.stockMovement.create({
      data: {
        productId: input.productId,
        movementType: "PURCHASE",
        quantity: input.quantity,
        reference: input.batchCode,
        notes: "Bulk inventory added",
      },
    });

    return {
      productCode: product.productCode,
      batchCode: batch.batchCode,
      totalBatchQuantity: batch.quantity,
      quantityAdded: input.quantity,
    };
  });
}

export async function getBulkInventory(productId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product || !product.isActive) {
    throw new Error("Product not found or inactive");
  }

  if (product.inventoryTracking !== "BULK") {
    throw new Error("This product does not use bulk inventory");
  }

  const batches = await prisma.stockBatch.findMany({
    where: { productId },
    orderBy: { createdAt: "asc" },
  });

  const totalStock = batches.reduce(
    (total, batch) => total + batch.quantity,
    0,
  );

  return {
    productCode: product.productCode,
    totalStock,
    batches,
  };
}

interface DeductBulkStockInput {
  productId: string;
  batchCode: string;
  quantity: number;
}

export async function deductBulkStock(input: DeductBulkStockInput) {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: { id: input.productId },
    });

    if (!product || !product.isActive) {
      throw new Error("Product not found or inactive");
    }

    if (product.inventoryTracking !== "BULK") {
      throw new Error("This product does not use bulk inventory");
    }

    // Atomically deduct only when sufficient stock exists.
    const result = await tx.stockBatch.updateMany({
      where: {
        productId: input.productId,
        batchCode: input.batchCode,
        quantity: {
          gte: input.quantity,
        },
      },
      data: {
        quantity: {
          decrement: input.quantity,
        },
      },
    });

    if (result.count === 0) {
      throw new Error("Batch not found or insufficient stock");
    }

    const batch = await tx.stockBatch.findUniqueOrThrow({
      where: {
        productId_batchCode: {
          productId: input.productId,
          batchCode: input.batchCode,
        },
      },
    });

    await tx.stockMovement.create({
      data: {
        productId: input.productId,
        movementType: "SALE",
        quantity: input.quantity,
        reference: input.batchCode,
        notes: "Bulk stock deducted for sale",
      },
    });

    return {
      productCode: product.productCode,
      batchCode: batch.batchCode,
      quantityDeducted: input.quantity,
      remainingStock: batch.quantity,
    };
  });
}
