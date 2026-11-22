import type { RequestHandler } from "express";
import { getActiveUserById, verifyAccessToken } from "../services/auth.service.js";

declare global {
  namespace Express {
    interface Request {
      authenticatedUser?: import("../services/auth.service.js").AuthenticatedUser;
    }
  }
}

export const requireAuthentication: RequestHandler = async (req, res, next) => {
  const authorization = req.header("authorization");
  const match = authorization?.match(/^Bearer\s+([^\s]+)$/i);
  if (!match) {
    res.status(401).json({ success: false, message: "Authentication required" });
    return;
  }

  try {
    const userId = verifyAccessToken(match[1]!);
    const user = await getActiveUserById(userId);
    if (!user) {
      res.status(401).json({ success: false, message: "Invalid or inactive account" });
      return;
    }
    req.authenticatedUser = user;
    next();
  } catch {
    res.status(401).json({ success: false, message: "Invalid or expired access token" });
  }
};
