/**
 * Validation Schemas (Zod)
 * -------------------------
 * Every piece of external input — query strings, request bodies, route params —
 * is parsed here before it reaches a service. Nothing downstream trusts the
 * client.
 *
 * Zod gives runtime validation and the TypeScript type from one definition, so
 * the type and the check can never drift apart.
 */

import { z } from "zod";

// ─── Shared primitives ───────────────────────────────────────────────────────

/**
 * Prisma generates `cuid()` ids. Constraining the shape here means a malformed
 * id is rejected with a 400 before it ever reaches the database.
 */
export const collegeIdSchema = z
  .string()
  .trim()
  .min(1, "College id is required")
  .max(64, "Invalid college id")
  .regex(/^[a-z0-9]+$/i, "Invalid college id");

/**
 * Route params can be an id OR a slug (slugs contain hyphens).
 * Bounded and character-restricted so nothing unexpected reaches Prisma.
 */
export const collegeIdentifierSchema = z
  .string()
  .trim()
  .min(1, "College identifier is required")
  .max(128, "Invalid college identifier")
  .regex(/^[a-z0-9-]+$/i, "Invalid college identifier");

export const MAX_COMPARE_COLLEGES = 3;
export const MIN_COMPARE_COLLEGES = 2;

// ─── College list / search ───────────────────────────────────────────────────

/**
 * Sort fields are an explicit allow-list. `sortBy` is interpolated into a
 * Prisma `orderBy` key, so accepting an arbitrary string would let a caller
 * order by — and therefore probe — any column, including `passwordHash` on a
 * joined model. The enum makes that structurally impossible.
 */
export const ALLOWED_SORT_FIELDS = [
  "name",
  "fees",
  "rating",
  "averagePlacement",
  "highestPlacement",
  "establishedYear",
  "totalStudents",
  "createdAt",
] as const;

export const COLLEGE_TYPES = ["Public", "Private", "Deemed"] as const;

export const DEFAULT_PAGE_SIZE = 12;
export const MAX_PAGE_SIZE = 48;

/** Treat "" (an untouched <select>) the same as an absent parameter. */
const emptyToUndefined = z
  .string()
  .transform((v) => (v.trim() === "" ? undefined : v.trim()));

export const collegeListSchema = z
  .object({
    q: emptyToUndefined.pipe(z.string().max(100, "Search term is too long").optional()).optional(),
    state: emptyToUndefined.pipe(z.string().max(100).optional()).optional(),
    type: emptyToUndefined
      .pipe(z.enum(COLLEGE_TYPES, { errorMap: () => ({ message: "Unknown college type" }) }).optional())
      .optional(),
    minFees: emptyToUndefined.pipe(z.coerce.number().min(0, "Fees cannot be negative").optional()).optional(),
    maxFees: emptyToUndefined.pipe(z.coerce.number().min(0, "Fees cannot be negative").optional()).optional(),
    minRating: emptyToUndefined.pipe(z.coerce.number().min(0).max(5, "Rating must be between 0 and 5").optional()).optional(),
    maxRating: emptyToUndefined.pipe(z.coerce.number().min(0).max(5, "Rating must be between 0 and 5").optional()).optional(),
    page: z.coerce.number().int("Page must be a whole number").min(1, "Page must be at least 1").default(1),
    limit: z.coerce
      .number()
      .int("Limit must be a whole number")
      .min(1)
      .max(MAX_PAGE_SIZE, `Limit cannot exceed ${MAX_PAGE_SIZE}`)
      .default(DEFAULT_PAGE_SIZE),
    sortBy: z.enum(ALLOWED_SORT_FIELDS).default("rating"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  })
  // Catch nonsensical ranges here rather than silently returning zero rows.
  .refine(
    (v) => v.minFees === undefined || v.maxFees === undefined || v.minFees <= v.maxFees,
    { message: "Minimum fees cannot be greater than maximum fees", path: ["minFees"] }
  )
  .refine(
    (v) => v.minRating === undefined || v.maxRating === undefined || v.minRating <= v.maxRating,
    { message: "Minimum rating cannot be greater than maximum rating", path: ["minRating"] }
  );

export type CollegeListInput = z.infer<typeof collegeListSchema>;

// ─── Compare ─────────────────────────────────────────────────────────────────

export const compareQuerySchema = z.object({
  ids: z
    .string({ required_error: "Select colleges to compare" })
    .transform((val) => {
      const parts = val.split(",").map((id) => id.trim()).filter(Boolean);
      // De-duplicate: the same college twice is not a comparison, and silently
      // collapsing is friendlier than a hard error if a stale URL is shared.
      return [...new Set(parts)];
    })
    .pipe(
      z
        .array(collegeIdSchema)
        .min(MIN_COMPARE_COLLEGES, `Select at least ${MIN_COMPARE_COLLEGES} colleges to compare`)
        .max(MAX_COMPARE_COLLEGES, `You can compare at most ${MAX_COMPARE_COLLEGES} colleges at a time`)
    ),
});

export type CompareQueryInput = z.infer<typeof compareQuerySchema>;

// ─── Auth ────────────────────────────────────────────────────────────────────

const emailSchema = z
  .string({ required_error: "Email is required" })
  .trim()
  .min(1, "Email is required")
  .max(254, "Email is too long") // RFC 5321 practical maximum
  .email("Enter a valid email address")
  .transform((val) => val.toLowerCase());

export const signupSchema = z.object({
  name: z
    .string({ required_error: "Name is required" })
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be under 100 characters"),
  email: emailSchema,
  password: z
    .string({ required_error: "Password is required" })
    // bcrypt silently truncates input beyond 72 bytes, so cap it explicitly
    // rather than letting two different long passwords become equivalent.
    .max(72, "Password must be 72 characters or fewer")
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  // No complexity rules on login — the rules can change over time and we must
  // still accept an existing valid password. Only presence is required.
  password: z
    .string({ required_error: "Password is required" })
    .min(1, "Password is required")
    .max(72),
});

export type LoginInput = z.infer<typeof loginSchema>;

// ─── Saved colleges ──────────────────────────────────────────────────────────

export const saveCollegeSchema = z.object({
  collegeId: collegeIdSchema,
});

export type SaveCollegeInput = z.infer<typeof saveCollegeSchema>;
