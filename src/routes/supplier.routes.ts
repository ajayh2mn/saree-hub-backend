import { Router } from "express";
import { createSupplierSchema } from "../validators/supplier.validator.js";
import {
  createSupplier,
  getAllSuppliers,
  updateSupplier,
} from "../services/supplier.service.js";

import { updateSupplierSchema } from "../validators/supplier.validator.js";
import { updateSupplierStatus } from "../services/supplier.service.js";
import { requireRole } from "../middleware/role.middleware.js";
import { z } from "zod";

const router = Router();

// Register supplier
router.post("/", requireRole("ADMIN"), async (req, res, next) => {
  try {
    const validation = createSupplierSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Invalid supplier data",
        errors: validation.error.flatten(),
      });
      return;
    }

    const result = await createSupplier(validation.data);

    res.status(201).json({
      success: true,
      message: "Supplier created successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

// Get all suppliers
router.get("/", async (_req, res, next) => {
  try {
    const result = await getAllSuppliers();

    res.status(200).json({
      success: true,
      message: "Suppliers fetched successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", requireRole("ADMIN"), async (req, res, next) => {
  try {
    const idValidation = z.string().uuid().safeParse(req.params.id);
    const validation = updateSupplierSchema.safeParse(req.body);

    if (!idValidation.success || !validation.success) {
      res.status(400).json({
        success: false,
        message: "Invalid supplier ID or data",
        errors: validation.success ? undefined : validation.error.flatten(),
      });
      return;
    }

    const result = await updateSupplier(idValidation.data, validation.data);

    res.status(200).json({
      success: true,
      message: "Supplier updated successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id/status", requireRole("ADMIN"), async (req, res, next) => {
  try {
    const idValidation = z.string().uuid().safeParse(req.params.id);
    const { isActive } = req.body;

    if (!idValidation.success || typeof isActive !== "boolean") {
      res.status(400).json({
        success: false,
        message: "Invalid supplier ID or isActive must be true or false",
      });
      return;
    }

    const result = await updateSupplierStatus(idValidation.data, isActive);

    res.status(200).json({
      success: true,
      message: `Supplier ${isActive ? "activated" : "deactivated"} successfully`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
