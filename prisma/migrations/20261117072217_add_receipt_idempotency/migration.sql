/*
  Warnings:

  - A unique constraint covering the columns `[idempotencyKey]` on the table `purchase_receipts` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "purchase_receipts" ADD COLUMN     "idempotencyKey" VARCHAR(100);

-- CreateIndex
CREATE UNIQUE INDEX "purchase_receipts_idempotencyKey_key" ON "purchase_receipts"("idempotencyKey");
