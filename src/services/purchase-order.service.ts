import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma.js";
import type { PurchaseOrderStatus } from "@prisma/client";

interface CreatePurchaseOrderInput {
  supplierId: string;
  expectedDate?: string | undefined;
  notes?: string | undefined;
  items: {
    productId: string;
    orderedQuantity: number;
    unitCost: string;
  }[];
}

async function generatePurchaseOrderNumber(
  tx: Prisma.TransactionClient,
): Promise<string> {
  const result = await tx.$queryRaw<{ lastNumber: number }[]>`
    INSERT INTO "purchase_order_counters"
      ("shopPrefix", "lastNumber")
    VALUES ('KMA', 1)
    ON CONFLICT ("shopPrefix")
    DO UPDATE SET
      "lastNumber" = "purchase_order_counters"."lastNumber" + 1
    RETURNING "lastNumber"
  `;

  const row = result[0];

  if (!row) {
    throw new Error("Failed to generate purchase order number");
  }

  return `KMA-PO-${String(row.lastNumber).padStart(4, "0")}`;
}

export async function createPurchaseOrder(input: CreatePurchaseOrderInput) {
  return prisma.$transaction(async (tx) => {
    // 1. Verify supplier
    const supplier = await tx.supplier.findUnique({
      where: { id: input.supplierId },
    });

    if (!supplier || !supplier.isActive) {
      throw new Error("Supplier not found or inactive");
    }

    // 2. Verify products
    const productIds = input.items.map((item) => item.productId);

    const products = await tx.product.findMany({
      where: {
        id: { in: productIds },
        isActive: true,
      },
    });

    if (products.length !== productIds.length) {
      throw new Error("One or more products not found or inactive");
    }

    // 3. Generate purchase order number
    const orderNumber = await generatePurchaseOrderNumber(tx);

    // 4. Create purchase order and items
    const purchaseOrder = await tx.purchaseOrder.create({
      data: {
        orderNumber,
        supplierId: input.supplierId,
        expectedDate: input.expectedDate ? new Date(input.expectedDate) : null,
        notes: input.notes ?? null,
        items: {
          create: input.items.map((item) => ({
            productId: item.productId,
            orderedQuantity: item.orderedQuantity,
            unitCost: new Prisma.Decimal(item.unitCost),
          })),
        },
      },
      include: {
        supplier: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    return purchaseOrder;
  });
}

export async function getAllPurchaseOrders() {
  return prisma.purchaseOrder.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      supplier: true,
      items: {
        include: {
          product: true,
        },
      },
    },
  });
}

export async function getPurchaseOrderById(id: string) {
  return prisma.purchaseOrder.findUnique({
    where: {
      id,
    },
    include: {
      supplier: true,
      items: {
        include: {
          product: true,
        },
      },
    },
  });
}

export async function updatePurchaseOrderStatus(
  id: string,
  newStatus: "ORDERED" | "CANCELLED",
) {
  return prisma.$transaction(async (tx) => {
    const purchaseOrder = await tx.purchaseOrder.findUnique({
      where: { id },
    });

    if (!purchaseOrder) {
      throw new Error("Purchase order not found");
    }

    // Only DRAFT orders can be updated at this stage
    if (purchaseOrder.status !== "DRAFT") {
      throw new Error(`Cannot change status from ${purchaseOrder.status}`);
    }

    const updatedOrder = await tx.purchaseOrder.update({
      where: { id },
      data: {
        status: newStatus as PurchaseOrderStatus,
      },
      include: {
        supplier: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    return updatedOrder;
  });
}
