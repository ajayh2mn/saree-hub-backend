import "dotenv/config";
import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma.js";
import { provisionInitialAdmin } from "../services/auth.service.js";

async function main() {
  const name = process.env.ADMIN_NAME?.trim();
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!name || !email || !password) {
    throw new Error("ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD must be set for provisioning");
  }
  if (
    name.length > 150 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    password.length < 12 ||
    Buffer.byteLength(password, "utf8") > 72
  ) {
    throw new Error("Admin name, email, or password does not meet provisioning requirements");
  }
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must be configured with at least 32 characters");
  }

  await provisionInitialAdmin({ name, email, password });
  console.log("Initial ADMIN account provisioned successfully.");
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
      ? "Provisioning stopped because the email is already in use."
      : error instanceof Error
        ? error.message
        : "Admin provisioning failed.";
    console.error(message);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
