import { Router } from "express";
import { createSupplierSchema } from "../validators/supplier.validator.js";
import {
  createSupplier,
  getAllSuppliers,
  updateSupplier,
} from "../services/supplier.service.js";

import { updateSupplierSchema } from "../validators/supplier.validator.js";
import { updateSupplierStatus } from "../services/supplier.service.js";

const router = Router();

// Register supplier
router.post("/", async (req, res, next) => {
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

router.patch("/:id", async (req, res, next) => {
  try {
    const validation = updateSupplierSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Invalid supplier data",
        errors: validation.error.flatten(),
      });
      return;
    }

    const result = await updateSupplier(req.params.id, validation.data);

    res.status(200).json({
      success: true,
      message: "Supplier updated successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id/status", async (req, res, next) => {
  try {
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      res.status(400).json({
        success: false,
        message: "isActive must be true or false",
      });
      return;
    }

    const result = await updateSupplierStatus(req.params.id, isActive);

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
