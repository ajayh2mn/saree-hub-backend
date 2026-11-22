import type { RequestHandler } from "express";
import type { UserRole } from "@prisma/client";

export function requireRole(...allowedRoles: UserRole[]): RequestHandler {
  return (req, res, next) => {
    const user = req.authenticatedUser;
    if (!user) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      res.status(403).json({ success: false, message: "You do not have permission to perform this action" });
      return;
    }

    next();
  };
}
