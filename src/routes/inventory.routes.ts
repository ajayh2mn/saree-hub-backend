
import { Router } from "express";

import {
  addInventoryUnitsSchema,
} from "../validators/inventory.validator.js";

import {
  addBulkInventorySchema,
} from "../validators/bulk-inventory.validator.js";

import {
  deductBulkStockSchema,
} from "../validators/stock-deduction.validator.js";

import {
  addInventoryUnits,
  getProductInventory,
  addBulkInventory,
  getBulkInventory,
  deductBulkStock,
} from "../services/inventory.service.js";

const router = Router();

// ==========================================
// 1. ADD UNIQUE PIECE INVENTORY
// ==========================================

router.post("/units", async (req, res, next) => {
  try {
    const validation = addInventoryUnitsSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Invalid inventory data",
        errors: validation.error.flatten(),
      });
      return;
    }

    const result = await addInventoryUnits(validation.data);

    res.status(201).json({
      success: true,
      message: "Inventory units added successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// 2. GET UNIQUE PIECE INVENTORY
// ==========================================

router.get("/products/:productId/units", async (req, res, next) => {
  try {
    const productId = req.params.productId;

    if (!productId) {
      res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
      return;
    }

    const result = await getProductInventory(productId);

    res.status(200).json({
      success: true,
      message: "Inventory fetched successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// 3. ADD BULK INVENTORY
// ==========================================

router.post("/bulk", async (req, res, next) => {
  try {
    const validation = addBulkInventorySchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Invalid bulk inventory data",
        errors: validation.error.flatten(),
      });
      return;
    }

    const result = await addBulkInventory(validation.data);

    res.status(201).json({
      success: true,
      message: "Bulk inventory added successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// 4. GET BULK INVENTORY
// ==========================================

router.get("/bulk/:productId", async (req, res, next) => {
  try {
    const productId = req.params.productId;

    if (!productId) {
      res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
      return;
    }

    const result = await getBulkInventory(productId);

    res.status(200).json({
      success: true,
      message: "Bulk inventory fetched successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// 5. DEDUCT BULK STOCK
// ==========================================

router.post("/bulk/deduct", async (req, res, next) => {
  try {
    const validation = deductBulkStockSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Invalid stock deduction data",
        errors: validation.error.flatten(),
      });
      return;
    }

    const result = await deductBulkStock(validation.data);

    res.status(200).json({
      success: true,
      message: "Stock deducted successfully",
      data: result,
    });
  } catch (error) {
    console.error("Bulk deduction error:", error);

    if (
      error instanceof Error &&
      error.message === "Batch not found or insufficient stock"
    ) {
      res.status(409).json({
        success: false,
        message: error.message,
      });
      return;
    }

    next(error);
  }
});

export default router;
