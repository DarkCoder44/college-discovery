/**
 * Environment Configuration
 * -------------------------
 * Validates required environment variables ONCE at module load, rather than
 * letting the app fail deep inside a request with a cryptic error.
 *
 * Why this matters: `iron-session` throws "password must be at least 32
 * characters" only when a session is first read. That surfaces as a 500 on a
 * random route instead of a clear boot-time failure. Failing fast here means a
 * misconfigured deployment breaks the build/boot, not a user's request.
 *
 * This module must only be imported from server-side code.
 */

import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .refine(
      (val) => val.startsWith("postgres://") || val.startsWith("postgresql://"),
      "DATABASE_URL must be a PostgreSQL connection string"
    ),
  // iron-session encrypts the cookie with this key; 32 chars is its hard minimum.
  SESSION_SECRET: z
    .string()
    .min(32, "SESSION_SECRET must be at least 32 characters long"),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Invalid environment configuration:\n${issues}\n\n` +
        `Copy .env.example to .env and fill in the values.`
    );
  }

  return parsed.data;
}

export const env = loadEnv();

export const isProduction = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";
