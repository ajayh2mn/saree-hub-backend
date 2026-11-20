
import { Prisma } from "@prisma/client";
import type { InventoryTracking } from "@prisma/client";
import { createHash } from "node:crypto";

import prisma from "../lib/prisma.js";
import { generatePieceCode } from "./code-generator.service.js";

interface CreatePurchaseReceiptInput {
  idempotencyKey: string;
  purchaseOrderId: string;
  supplierInvoiceNumber?: string | undefined;
  supplierInvoiceDate?: string | undefined;
  receivedAt?: string | undefined;
  notes?: string | undefined;
  items: {
    purchaseOrderItemId: string;
    receivedQuantity: number;
    batchCode?: string | undefined;
  }[];
}

const receiptInclude = {
  purchaseOrder: true,
  items: {
    include: {
      product: true,
      inventoryUnits: true,
    },
  },
} satisfies Prisma.PurchaseReceiptInclude;

// Generate receipt number safely using PostgreSQL atomic counter.
async function generateReceiptNumber(
  tx: Prisma.TransactionClient,
): Promise<string> {
  const result = await tx.$queryRaw<{ lastNumber: number }[]>`
    INSERT INTO "purchase_receipt_counters"
      ("shopPrefix", "lastNumber")
    VALUES ('KMA', 1)
    ON CONFLICT ("shopPrefix")
    DO UPDATE SET
      "lastNumber" = "purchase_receipt_counters"."lastNumber" + 1
    RETURNING "lastNumber"
  `;

  const row = result[0];

  if (!row) {
    throw new Error("Failed to generate receipt number");
  }

  return `KMA-REC-${String(row.lastNumber).padStart(4, "0")}`;
}

// Generate a SHA-256 fingerprint for the request.
function generateRequestHash(
  input: CreatePurchaseReceiptInput,
): string {
  const normalizedInput = {
    ...input,
    items: [...input.items].sort((a, b) =>
      a.purchaseOrderItemId.localeCompare(b.purchaseOrderItemId),
    ),
  };

  return createHash("sha256")
    .update(JSON.stringify(normalizedInput))
    .digest("hex");
}

// Return an existing receipt for a previously used key.
async function findReceiptByIdempotencyKey(
  idempotencyKey: string,
) {
  return prisma.purchaseReceipt.findUnique({
    where: { idempotencyKey },
    include: receiptInclude,
  });
}

export async function createPurchaseReceipt(
  input: CreatePurchaseReceiptInput,
) {
  const requestHash = generateRequestHash(input);

  // Retry serializable transaction conflicts.
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          // 1. Check whether this request was already processed.
          const existingReceipt =
            await tx.purchaseReceipt.findUnique({
              where: {
                idempotencyKey: input.idempotencyKey,
              },
              include: receiptInclude,
            });

          if (existingReceipt) {
            // Same key but different request data.
            if (existingReceipt.requestHash !== requestHash) {
              throw new Error(
                "Idempotency key already used with a different request",
              );
            }

            return {
              receipt: existingReceipt,
              isDuplicate: true,
            };
          }

          // 2. Find purchase order and its items.
          const purchaseOrder =
            await tx.purchaseOrder.findUnique({
              where: { id: input.purchaseOrderId },
              include: {
                items: {
                  include: {
                    product: true,
                  },
                },
              },
            });

          if (!purchaseOrder) {
            throw new Error("Purchase order not found");
          }

          // 3. Check purchase order status.
          if (
            purchaseOrder.status !== "ORDERED" &&
            purchaseOrder.status !== "PARTIALLY_RECEIVED"
          ) {
            throw new Error(
              `Cannot receive items for purchase order with status ${purchaseOrder.status}`,
            );
          }

          // 4. Validate receipt items against purchase order items.
          const validatedItems = input.items.map(
            (receivedItem) => {
              const orderItem = purchaseOrder.items.find(
                (item) =>
                  item.id === receivedItem.purchaseOrderItemId,
              );

              if (!orderItem) {
                throw new Error(
                  "Purchase order item does not belong to this purchase order",
                );
              }

              const remainingQuantity =
                orderItem.orderedQuantity -
                orderItem.receivedQuantity;

              if (
                receivedItem.receivedQuantity >
                remainingQuantity
              ) {
                throw new Error(
                  `Cannot receive ${receivedItem.receivedQuantity} units. Only ${remainingQuantity} units remain for ${orderItem.product.name}`,
                );
              }

              const tracking =
                orderItem.product.inventoryTracking as InventoryTracking;

              if (
                tracking === "BULK" &&
                !receivedItem.batchCode
              ) {
                throw new Error(
                  `Batch code is required for bulk product ${orderItem.product.name}`,
                );
              }

              if (
                tracking === "UNIQUE_PIECE" &&
                receivedItem.batchCode
              ) {
                throw new Error(
                  `Batch code should not be provided for unique-piece product ${orderItem.product.name}`,
                );
              }

              return {
                receivedItem,
                orderItem,
                tracking,
              };
            },
          );

          // 5. Generate receipt number.
          const receiptNumber =
            await generateReceiptNumber(tx);

          // 6. Create receipt header and save idempotency data.
          const receipt = await tx.purchaseReceipt.create({
            data: {
              receiptNumber,
              idempotencyKey: input.idempotencyKey,
              requestHash,
              purchaseOrderId: purchaseOrder.id,

              ...(input.supplierInvoiceNumber !== undefined && {
                supplierInvoiceNumber: input.supplierInvoiceNumber,
              }),

              ...(input.supplierInvoiceDate !== undefined && {
                supplierInvoiceDate: new Date(
                  input.supplierInvoiceDate,
                ),
              }),

              ...(input.receivedAt !== undefined && {
                receivedAt: new Date(input.receivedAt),
              }),

              ...(input.notes !== undefined && {
                notes: input.notes,
              }),
            },
          });

          // Track received quantities to calculate final PO status.
          const receivedTotals = new Map<string, number>();

          for (const item of validatedItems) {
            const { receivedItem, orderItem, tracking } = item;

            // 7. Atomically update received quantity.
            const updatedCount =
              await tx.purchaseOrderItem.updateMany({
                where: {
                  id: orderItem.id,
                  receivedQuantity: {
                    lte:
                      orderItem.orderedQuantity -
                      receivedItem.receivedQuantity,
                  },
                },
                data: {
                  receivedQuantity: {
                    increment: receivedItem.receivedQuantity,
                  },
                },
              });

            if (updatedCount.count !== 1) {
              throw new Error(
                "Received quantity changed. Please refresh and try again.",
              );
            }

            // 8. Create receipt item.
            const receiptItem =
              await tx.purchaseReceiptItem.create({
                data: {
                  purchaseReceiptId: receipt.id,
                  purchaseOrderItemId: orderItem.id,
                  productId: orderItem.productId,
                  receivedQuantity: receivedItem.receivedQuantity,
                },
              });

            // 9. Handle UNIQUE PIECE inventory.
            if (tracking === "UNIQUE_PIECE") {
              for (
                let i = 0;
                i < receivedItem.receivedQuantity;
                i++
              ) {
                const pieceCode = await generatePieceCode(
                  tx,
                  orderItem.product.id,
                  orderItem.product.productCode,
                );

                const inventoryUnit =
                  await tx.inventoryUnit.create({
                    data: {
                      productId: orderItem.productId,
                      purchaseReceiptItemId: receiptItem.id,
                      pieceCode,
                      status: "AVAILABLE",
                    },
                  });

                await tx.stockMovement.create({
                  data: {
                    productId: orderItem.productId,
                    inventoryUnitId: inventoryUnit.id,
                    movementType: "PURCHASE",
                    quantity: 1,
                    reference: receiptNumber,
                    notes: `Received piece ${pieceCode}`,
                  },
                });
              }
            }

            // 10. Handle BULK inventory.
            if (tracking === "BULK") {
              const batchCode = receivedItem.batchCode!;

              await tx.stockBatch.upsert({
                where: {
                  productId_batchCode: {
                    productId: orderItem.productId,
                    batchCode,
                  },
                },
                create: {
                  productId: orderItem.productId,
                  batchCode,
                  quantity: receivedItem.receivedQuantity,
                },
                update: {
                  quantity: {
                    increment: receivedItem.receivedQuantity,
                  },
                },
              });

              await tx.stockMovement.create({
                data: {
                  productId: orderItem.productId,
                  movementType: "PURCHASE",
                  quantity: receivedItem.receivedQuantity,
                  reference: receiptNumber,
                  notes: `Bulk stock received in batch ${batchCode}`,
                },
              });
            }

            receivedTotals.set(
              orderItem.id,
              orderItem.receivedQuantity +
                receivedItem.receivedQuantity,
            );
          }

          // 11. Calculate whether the purchase order is fully received.
          const allItemsReceived = purchaseOrder.items.every(
            (orderItem) => {
              const newReceivedQuantity =
                receivedTotals.get(orderItem.id) ??
                orderItem.receivedQuantity;

              return (
                newReceivedQuantity >= orderItem.orderedQuantity
              );
            },
          );

          const newStatus = allItemsReceived
            ? "RECEIVED"
            : "PARTIALLY_RECEIVED";

          // 12. Update purchase order status.
          await tx.purchaseOrder.update({
            where: { id: purchaseOrder.id },
            data: {
              status: newStatus,
            },
          });

          // 13. Return complete receipt details.
          const completeReceipt =
            await tx.purchaseReceipt.findUniqueOrThrow({
              where: { id: receipt.id },
              include: receiptInclude,
            });

          return {
            receipt: completeReceipt,
            isDuplicate: false,
          };
        },
        {
          isolationLevel:
            Prisma.TransactionIsolationLevel.Serializable,
        },
      );
    } catch (error) {
      // 14. Handle duplicate idempotency keys.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const existingReceipt =
          await findReceiptByIdempotencyKey(
            input.idempotencyKey,
          );

        if (existingReceipt) {
          if (existingReceipt.requestHash !== requestHash) {
            throw new Error(
              "Idempotency key already used with a different request",
            );
          }

          return {
            receipt: existingReceipt,
            isDuplicate: true,
          };
        }

        // Another unique constraint failed.
        throw error;
      }

      // 15. Retry serialization conflicts.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034" &&
        attempt < maxAttempts
      ) {
        continue;
      }

      throw error;
    }
  }

  throw new Error(
    "Purchase receipt transaction failed after retries",
  );
}
