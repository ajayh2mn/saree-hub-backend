-- AlterTable
ALTER TABLE "inventory_units" ADD COLUMN     "purchaseReceiptItemId" UUID;

-- CreateTable
CREATE TABLE "purchase_receipts" (
    "id" UUID NOT NULL,
    "receiptNumber" VARCHAR(50) NOT NULL,
    "purchaseOrderId" UUID NOT NULL,
    "supplierInvoiceNumber" VARCHAR(100),
    "supplierInvoiceDate" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_receipt_items" (
    "id" UUID NOT NULL,
    "purchaseReceiptId" UUID NOT NULL,
    "purchaseOrderItemId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "receivedQuantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_receipt_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_receipt_counters" (
    "shopPrefix" VARCHAR(10) NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "purchase_receipt_counters_pkey" PRIMARY KEY ("shopPrefix")
);

-- CreateIndex
CREATE UNIQUE INDEX "purchase_receipts_receiptNumber_key" ON "purchase_receipts"("receiptNumber");

-- CreateIndex
CREATE INDEX "purchase_receipts_purchaseOrderId_idx" ON "purchase_receipts"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "purchase_receipts_receivedAt_idx" ON "purchase_receipts"("receivedAt");

-- CreateIndex
CREATE INDEX "purchase_receipt_items_purchaseReceiptId_idx" ON "purchase_receipt_items"("purchaseReceiptId");

-- CreateIndex
CREATE INDEX "purchase_receipt_items_purchaseOrderItemId_idx" ON "purchase_receipt_items"("purchaseOrderItemId");

-- CreateIndex
CREATE INDEX "purchase_receipt_items_productId_idx" ON "purchase_receipt_items"("productId");

-- CreateIndex
CREATE INDEX "inventory_units_purchaseReceiptItemId_idx" ON "inventory_units"("purchaseReceiptItemId");

-- AddForeignKey
ALTER TABLE "inventory_units" ADD CONSTRAINT "inventory_units_purchaseReceiptItemId_fkey" FOREIGN KEY ("purchaseReceiptItemId") REFERENCES "purchase_receipt_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_receipts" ADD CONSTRAINT "purchase_receipts_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_receipt_items" ADD CONSTRAINT "purchase_receipt_items_purchaseReceiptId_fkey" FOREIGN KEY ("purchaseReceiptId") REFERENCES "purchase_receipts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_receipt_items" ADD CONSTRAINT "purchase_receipt_items_purchaseOrderItemId_fkey" FOREIGN KEY ("purchaseOrderItemId") REFERENCES "purchase_order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_receipt_items" ADD CONSTRAINT "purchase_receipt_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
