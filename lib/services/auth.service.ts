/**
 * Auth Service
 * ------------
 * Registration and credential verification.
 *
 * The only thing that ever leaves this module is a safe user projection —
 * `passwordHash` is never selected into a return value.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  hashPassword,
  verifyPassword,
  DUMMY_PASSWORD_HASH,
} from "@/lib/auth/password";
import { conflictError, validationError } from "@/lib/api/errors";
import type { AuthenticatedUser } from "@/lib/auth/session";
import type { SignupInput, LoginInput } from "@/lib/validation/schemas";

export async function registerUser(input: SignupInput): Promise<AuthenticatedUser> {
  const passwordHash = await hashPassword(input.password);

  try {
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email, // already lowercased + trimmed by the Zod schema
        passwordHash,
      },
      select: { id: true, name: true, email: true },
    });
    return user;
  } catch (error) {
    // Rely on the UNIQUE constraint rather than a pre-flight SELECT: a
    // check-then-insert has a race window where two concurrent signups with the
    // same email both pass the check. The database is the only place that can
    // decide this atomically. P2002 = unique constraint violation.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw conflictError("An account with this email already exists");
    }
    throw error;
  }
}

export async function authenticateUser(input: LoginInput): Promise<AuthenticatedUser> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true, name: true, email: true, passwordHash: true },
  });

  // Compare against a real hash even when the account does not exist, so the
  // response time does not reveal which emails are registered.
  const passwordMatches = await verifyPassword(
    input.password,
    user?.passwordHash ?? DUMMY_PASSWORD_HASH
  );

  if (!user || !passwordMatches) {
    // One generic message for both cases — never "no such user".
    throw validationError("Invalid email or password");
  }

  return { id: user.id, name: user.name, email: user.email };
}
