import { Router } from "express";
import type { RequestHandler } from "express";
import { authenticateUser } from "../services/auth.service.js";
import { requireAuthentication } from "../middleware/auth.middleware.js";
import { loginSchema } from "../validators/auth.validator.js";

const router = Router();

const login: RequestHandler = async (req, res, next) => {
  const validation = loginSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({
      success: false,
      message: "Invalid login details",
      errors: validation.error.flatten().fieldErrors,
    });
    return;
  }

  try {
    const result = await authenticateUser(validation.data);
    if (!result) {
      res.status(401).json({ success: false, message: "Invalid email or password" });
      return;
    }
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const me: RequestHandler = (req, res) => {
  res.status(200).json({ success: true, data: req.authenticatedUser });
};

router.post("/login", login);
router.post("/me", requireAuthentication, me);

export default router;
