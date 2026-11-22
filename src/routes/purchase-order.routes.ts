
import { Router } from "express";

import {
  createPurchaseOrder,
  getAllPurchaseOrders,
  getPurchaseOrderById,
  updatePurchaseOrderStatus,
} from "../services/purchase-order.service.js";

import {
  createPurchaseOrderSchema,
  updatePurchaseOrderStatusSchema,
} from "../validators/purchase-order.validator.js";
import { requireRole } from "../middleware/role.middleware.js";
import { z } from "zod";

const router = Router();

// POST /api/purchase-orders
// Create Purchase Order
router.post("/", requireRole("ADMIN"), async (req, res, next) => {
  try {
    const validation = createPurchaseOrderSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.issues,
      });
      return;
    }

    const purchaseOrder = await createPurchaseOrder(validation.data, true);

    res.status(201).json({
      success: true,
      message: "Purchase order created successfully",
      data: purchaseOrder,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message === "Supplier not found or inactive" ||
        error.message === "One or more products not found or inactive"
      ) {
        res.status(400).json({
          success: false,
          message: error.message,
        });
        return;
      }
    }

    next(error);
  }
});

// GET /api/purchase-orders
// Get All Purchase Orders
router.get("/", async (req, res, next) => {
  try {
    const purchaseOrders = await getAllPurchaseOrders(req.authenticatedUser?.role === "ADMIN");

    res.status(200).json({
      success: true,
      count: purchaseOrders.length,
      data: purchaseOrders,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/purchase-orders/:id
// Get Purchase Order By ID
router.get("/:id", async (req, res, next) => {
  try {
    const purchaseOrder = await getPurchaseOrderById(req.params.id, req.authenticatedUser?.role === "ADMIN");

    if (!purchaseOrder) {
      res.status(404).json({
        success: false,
        message: "Purchase order not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: purchaseOrder,
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/purchase-orders/:id/status
// Update Purchase Order Status
router.patch("/:id/status", requireRole("ADMIN"), async (req, res, next) => {
  const idValidation = z.string().uuid().safeParse(req.params.id);
  if (!idValidation.success) {
    res.status(400).json({ success: false, message: "Invalid purchase order ID" });
    return;
  }

  try {
    const validation = updatePurchaseOrderStatusSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.issues,
      });
      return;
    }

    const updatedOrder = await updatePurchaseOrderStatus(
      idValidation.data,
      validation.data.status,
      true,
    );

    res.status(200).json({
      success: true,
      message: "Purchase order status updated successfully",
      data: updatedOrder,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Purchase order not found") {
        res.status(404).json({
          success: false,
          message: error.message,
        });
        return;
      }

      if (error.message.startsWith("Cannot change status")) {
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
