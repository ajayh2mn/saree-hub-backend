import "dotenv/config";
import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma.js";
import { provisionStaffUser } from "../services/auth.service.js";

async function main() {
  const name = process.env.STAFF_NAME?.trim();
  const email = process.env.STAFF_EMAIL?.trim().toLowerCase();
  const password = process.env.STAFF_PASSWORD;

  if (!name || !email || !password) {
    throw new Error("STAFF_NAME, STAFF_EMAIL, and STAFF_PASSWORD must be set for provisioning");
  }
  if (
    name.length > 150 ||
    email.length > 255 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    password.length < 12 ||
    Buffer.byteLength(password, "utf8") > 72
  ) {
    throw new Error("Staff name, email, or password does not meet provisioning requirements");
  }

  await provisionStaffUser({ name, email, password });
  console.log("STAFF account provisioned successfully.");
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
      ? "Provisioning stopped because the email is already in use."
      : error instanceof Error
        ? error.message
        : "Staff provisioning failed.";
    console.error(message);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
