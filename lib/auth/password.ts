/**
 * Password Utilities
 * ------------------
 * Thin wrappers around bcryptjs so the rest of the app never touches hashing
 * details directly.
 *
 * Why bcrypt? It is deliberately slow and salted per-password, which makes
 * offline brute-forcing of a leaked `passwordHash` column expensive. Cost
 * factor 12 is the common modern default (~250-400ms per hash).
 */

import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

/**
 * A real bcrypt hash of a value nobody knows, used to burn the same CPU time
 * when a login is attempted for an email that does not exist.
 *
 * This matters: without it, "unknown email" returns in ~1ms while "known email,
 * wrong password" takes ~300ms, and that timing difference lets an attacker
 * enumerate which emails have accounts. The hash must be *valid* for
 * `bcrypt.compare` to actually do the work — comparing against a malformed
 * string returns immediately and provides no protection at all.
 */
export const DUMMY_PASSWORD_HASH =
  "$2a$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
