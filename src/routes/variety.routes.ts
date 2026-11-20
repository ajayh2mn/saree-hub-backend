
import { Router } from "express";
import { z } from "zod";

import {
  createVariety,
  getVarietiesByCategory,
  updateVarietyName,
  updateVarietyStatus,
} from "../services/variety.service.js";

import {
  createVarietySchema,
  updateVarietySchema,
} from "../validators/variety.validator.js";

const router = Router();

const idSchema = z.string().uuid();

// Create variety
router.post("/", async (req, res, next) => {
  try {
    const validation = createVarietySchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        errors: validation.error.flatten().fieldErrors,
      });
      return;
    }

    const variety = await createVariety(validation.data);

    res.status(201).json({
      success: true,
      message: "Variety created successfully",
      data: variety,
    });
  } catch (error) {
    next(error);
  }
});

// Get varieties by category
router.get("/", async (req, res, next) => {
  try {
    const validation = idSchema.safeParse(req.query.categoryId);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Valid categoryId is required",
      });
      return;
    }

    const varieties = await getVarietiesByCategory(validation.data);

    res.status(200).json({
      success: true,
      data: varieties,
    });
  } catch (error) {
    next(error);
  }
});

// Rename variety
router.patch("/:id", async (req, res, next) => {
  try {
    const idValidation = idSchema.safeParse(req.params.id);
    const bodyValidation = updateVarietySchema.safeParse(req.body);

    if (!idValidation.success || !bodyValidation.success) {
      res.status(400).json({
        success: false,
        message: "Invalid variety ID or name",
      });
      return;
    }

    const variety = await updateVarietyName(
      idValidation.data,
      bodyValidation.data.name
    );

    res.status(200).json({
      success: true,
      message: "Variety renamed successfully",
      data: variety,
    });
  } catch (error) {
    next(error);
  }
});

// Activate / deactivate variety
router.patch("/:id/status", async (req, res, next) => {
  try {
    const idValidation = idSchema.safeParse(req.params.id);

    const bodyValidation = z.object({
      isActive: z.boolean(),
    }).safeParse(req.body);

    if (!idValidation.success || !bodyValidation.success) {
      res.status(400).json({
        success: false,
        message: "Invalid variety ID or status",
      });
      return;
    }

    const variety = await updateVarietyStatus(
      idValidation.data,
      bodyValidation.data.isActive
    );

    res.status(200).json({
      success: true,
      message: "Variety status updated successfully",
      data: variety,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
