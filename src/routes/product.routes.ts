
import { Router } from "express";
import type { RequestHandler } from "express";

import {
  createProduct,
  getProducts as fetchProducts,
  ProductUpdateError,
  updateProduct as updateProductRecord,
} from "../services/product.service.js";
import { createProductSchema, updateProductSchema } from "../validators/product.validator.js";
import { z } from "zod";

const router = Router();

const createProductHandler: RequestHandler = async (
  req,
  res,
  next
) => {
  // Validate request body
  const validation = createProductSchema.safeParse(req.body);

  if (!validation.success) {
    res.status(400).json({
      success: false,
      message: "Invalid product details",
      errors: validation.error.flatten().fieldErrors,
    });
    return;
  }

  try {
    const product = await createProduct(validation.data);

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

const getProducts: RequestHandler = async (_req, res, next) => {
  try {
    const products = await fetchProducts();

    res.status(200).json({
      success: true,
      data: products,
    });
  } catch (error) {
    next(error);
  }
};

router.get("/", getProducts);
router.post("/", createProductHandler);

router.patch("/:id", async (req, res, next) => {
  const idValidation = z.string().uuid().safeParse(req.params.id);
  if (!idValidation.success) {
    res.status(400).json({ success: false, message: "Invalid product ID" });
    return;
  }

  const validation = updateProductSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({
      success: false,
      message: "Invalid product details",
      errors: validation.error.flatten().fieldErrors,
    });
    return;
  }

  try {
    const product = await updateProductRecord(idValidation.data, validation.data);
    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: product,
    });
  } catch (error) {
    if (error instanceof ProductUpdateError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
});

export default router;
