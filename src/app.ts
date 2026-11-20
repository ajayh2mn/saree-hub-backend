import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import categoryRoutes from "./routes/category.routes.js";

import productRoutes from "./routes/product.routes.js";
import varietyRoutes from "./routes/variety.routes.js";
import inventoryRoutes from "./routes/inventory.routes.js";
import supplierRoutes from "./routes/supplier.routes.js";
import purchaseOrderRoutes from "./routes/purchase-order.routes.js";
import purchaseReceiptRoutes from "./routes/purchase-receipt.routes.js";

const app = express();

// Security middleware
app.use(helmet());

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
  }),
);

// Parse JSON requests
app.use(express.json({ limit: "1mb" }));

// API rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

app.use("/api", apiLimiter);

// Health check
app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Kamachi Silks API is running",
  });
});

// Product routes
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/varieties", varietyRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/purchase-orders", purchaseOrderRoutes);

// Global error handler
app.use(
  (
    error: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  },
);

app.use("/api/suppliers", supplierRoutes);

app.use("/api/purchase-receipts", purchaseReceiptRoutes);

export default app;
