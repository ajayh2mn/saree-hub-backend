
import { Router } from "express";

import {
  createPurchaseReceipt,
} from "../services/purchase-receipt.service.js";

import {
  createPurchaseReceiptSchema,
} from "../validators/purchase-receipt.validator.js";

const router = Router();

// POST /api/purchase-receipts
router.post("/", async (req, res, next) => {
  try {
    const validation = createPurchaseReceiptSchema.safeParse(
      req.body,
    );

    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.issues,
      });
      return;
    }

    const result = await createPurchaseReceipt(validation.data);

    res.status(result.isDuplicate ? 200 : 201).json({
      success: true,
      message: result.isDuplicate
        ? "Purchase receipt already processed"
        : "Purchase receipt created successfully",
      data: result.receipt,
    });
  } catch (error) {
    if (error instanceof Error) {
      // Idempotency conflict.
      if (
        error.message ===
        "Idempotency key already used with a different request"
      ) {
        res.status(409).json({
          success: false,
          message: error.message,
        });
        return;
      }

      // Purchase order not found.
      if (error.message === "Purchase order not found") {
        res.status(404).json({
          success: false,
          message: error.message,
        });
        return;
      }

      // Business validation conflicts.
      const clientErrors = [
        "Purchase order item does not belong to this purchase order",
        "Received quantity changed. Please refresh and try again.",
      ];

      if (
        clientErrors.includes(error.message) ||
        error.message.startsWith("Cannot receive") ||
        error.message.startsWith("Batch code is required") ||
        error.message.startsWith("Batch code should not")
      ) {
        res.status(409).json({
          success: false,
          message: error.message,
        });
        return;
      }
    }

    next(error);
  }
});

export default router;
