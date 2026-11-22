import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type { UserRole } from "@prisma/client";

import prisma from "../lib/prisma.js";
import type { LoginInput } from "../validators/auth.validator.js";

const ACCESS_TOKEN_LIFETIME = "1h";
const BCRYPT_ROUNDS = 12;

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be configured with at least 32 characters");
  }
  return secret;
}

export async function authenticateUser(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user || !user.isActive) return null;
  const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);
  if (!passwordMatches) return null;

  const authenticatedUser: AuthenticatedUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  const accessToken = jwt.sign({}, getJwtSecret(), {
    subject: user.id,
    expiresIn: ACCESS_TOKEN_LIFETIME,
    issuer: "sareehub-api",
    audience: "sareehub-admin",
  });

  return { accessToken, user: authenticatedUser };
}

export async function getActiveUserById(id: string): Promise<AuthenticatedUser | null> {
  return prisma.user.findFirst({
    where: { id, isActive: true },
    select: { id: true, name: true, email: true, role: true },
  });
}

export async function provisionInitialAdmin(input: {
  name: string;
  email: string;
  password: string;
}): Promise<void> {
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  await prisma.$transaction(async (tx) => {
    const existingAdmin = await tx.user.findFirst({ where: { role: "ADMIN" } });
    if (existingAdmin) throw new Error("An ADMIN account already exists; provisioning stopped");

    const existingEmail = await tx.user.findUnique({ where: { email: input.email } });
    if (existingEmail) throw new Error("The configured email already belongs to an account");

    await tx.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        role: "ADMIN",
        isActive: true,
      },
    });
  }, { isolationLevel: "Serializable" });
}

export async function provisionStaffUser(input: {
  name: string;
  email: string;
  password: string;
}): Promise<void> {
  const existingUser = await prisma.user.findUnique({ where: { email: input.email } });
  if (existingUser) throw new Error("The configured email already belongs to an account");

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      role: "STAFF",
      isActive: true,
    },
  });
}

export function verifyAccessToken(token: string): string {
  const payload = jwt.verify(token, getJwtSecret(), {
    issuer: "sareehub-api",
    audience: "sareehub-admin",
  });
  if (typeof payload === "string" || typeof payload.sub !== "string") {
    throw new Error("Invalid access token subject");
  }
  return payload.sub;
}
