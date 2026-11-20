
import { Router } from "express";
import { z } from "zod";

import {
  createCategory,
  getAllCategories,
  updateCategoryName,
  updateCategoryStatus,
} from "../services/category.service.js";

import {
  createCategorySchema,
  updateCategorySchema,
} from "../validators/category.validator.js";

const router = Router();

const idSchema = z.string().uuid();

// Create category
router.post("/", async (req, res, next) => {
  try {
    const validation = createCategorySchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        errors: validation.error.flatten().fieldErrors,
      });
      return;
    }

    const category = await createCategory(validation.data);

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: category,
    });
  } catch (error) {
    next(error);
  }
});

// Get all categories
router.get("/", async (_req, res, next) => {
  try {
    const categories = await getAllCategories();

    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
});

// Rename category
router.patch("/:id", async (req, res, next) => {
  try {
    const idValidation = idSchema.safeParse(req.params.id);
    const bodyValidation = updateCategorySchema.safeParse(req.body);

    if (!idValidation.success || !bodyValidation.success) {
      res.status(400).json({
        success: false,
        message: "Invalid category ID or name",
      });
      return;
    }

    const category = await updateCategoryName(
      idValidation.data,
      bodyValidation.data.name
    );

    res.status(200).json({
      success: true,
      message: "Category renamed successfully",
      data: category,
    });
  } catch (error) {
    next(error);
  }
});

// Activate / deactivate category
router.patch("/:id/status", async (req, res, next) => {
  try {
    const idValidation = idSchema.safeParse(req.params.id);
    const bodyValidation = z.object({
      isActive: z.boolean(),
    }).safeParse(req.body);

    if (!idValidation.success || !bodyValidation.success) {
      res.status(400).json({
        success: false,
        message: "Invalid category ID or status",
      });
      return;
    }

    const category = await updateCategoryStatus(
      idValidation.data,
      bodyValidation.data.isActive
    );

    res.status(200).json({
      success: true,
      message: "Category status updated successfully",
      data: category,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
