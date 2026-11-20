import type { Prisma } from "@prisma/client";

const SHOP_PREFIX = "KMA";

// Generate product code
export async function generateProductCode(
  tx: Prisma.TransactionClient,
  categoryCode: string,
  varietyCode: string,
): Promise<string> {
  const result = await tx.$queryRaw<{ lastNumber: number }[]>`
    INSERT INTO "product_code_counters"
      ("shopPrefix", "categoryCode", "varietyCode", "lastNumber")
    VALUES
      (${SHOP_PREFIX}, ${categoryCode}, ${varietyCode}, 1)
    ON CONFLICT ("shopPrefix", "categoryCode", "varietyCode")
    DO UPDATE SET
      "lastNumber" = "product_code_counters"."lastNumber" + 1
    RETURNING "lastNumber"
  `;

  const row = result[0];

  if (!row) {
    throw new Error("Failed to generate product code");
  }

  const sequence = String(row.lastNumber).padStart(4, "0");

  return `${SHOP_PREFIX}-${categoryCode}-${varietyCode}-${sequence}`;
}

// Generate individual piece code
export async function generatePieceCode(
  tx: Prisma.TransactionClient,
  productId: string,
  productCode: string,
): Promise<string> {
  const result = await tx.$queryRaw<{ lastNumber: number }[]>`
    INSERT INTO "piece_code_counters"
      ("productId", "lastNumber")
    VALUES
      (${productId}::uuid, 1)
    ON CONFLICT ("productId")
    DO UPDATE SET
      "lastNumber" = "piece_code_counters"."lastNumber" + 1
    RETURNING "lastNumber"
  `;

  const row = result[0];

  if (!row) {
    throw new Error("Failed to generate piece code");
  }

  const sequence = String(row.lastNumber).padStart(3, "0");

  return `${productCode}-P${sequence}`;
}
