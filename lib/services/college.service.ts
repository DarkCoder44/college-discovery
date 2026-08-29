/**
 * College Service
 * ---------------
 * All college read logic lives here — never in route handlers or components.
 *
 * Layering rule for this codebase:
 *   Route Handler  →  Zod validation  →  Service  →  Prisma  →  PostgreSQL
 *
 * Route handlers only parse/validate the request and shape the response.
 * Query construction, pagination maths and Decimal serialization live here so
 * they can be unit-tested without spinning up an HTTP server, and reused by
 * Server Components (which call the service directly, skipping the HTTP hop).
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { notFoundError, validationError } from "@/lib/api/errors";
import type { CollegeListInput } from "@/lib/validation/schemas";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationMeta;
}

/** The projection used for list/grid views — only what a card renders. */
const COLLEGE_CARD_SELECT = {
  id: true,
  name: true,
  slug: true,
  location: true,
  city: true,
  state: true,
  type: true,
  fees: true,
  rating: true,
  averagePlacement: true,
  highestPlacement: true,
  totalStudents: true,
  accreditation: true,
  imageUrl: true,
  establishedYear: true,
  _count: { select: { reviews: true } },
} satisfies Prisma.CollegeSelect;

export interface CollegeCardData {
  id: string;
  name: string;
  slug: string;
  location: string;
  city: string;
  state: string;
  type: string;
  /** Decimals are serialized to strings to avoid float precision loss over JSON. */
  fees: string;
  rating: string;
  averagePlacement: string;
  highestPlacement: string;
  totalStudents: number;
  accreditation: string | null;
  imageUrl: string | null;
  establishedYear: number;
  reviewCount: number;
}

type RawCollegeCard = Prisma.CollegeGetPayload<{ select: typeof COLLEGE_CARD_SELECT }>;

function toCollegeCard(c: RawCollegeCard): CollegeCardData {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    location: c.location,
    city: c.city,
    state: c.state,
    type: c.type,
    fees: c.fees.toString(),
    rating: c.rating.toString(),
    averagePlacement: c.averagePlacement.toString(),
    highestPlacement: c.highestPlacement.toString(),
    totalStudents: c.totalStudents,
    accreditation: c.accreditation,
    imageUrl: c.imageUrl,
    establishedYear: c.establishedYear,
    reviewCount: c._count.reviews,
  };
}

// ─── Listing: search + filter + sort + paginate ───────────────────────────────

/**
 * Builds the Prisma WHERE clause from validated filter input.
 *
 * Every filter is applied by PostgreSQL, never in JavaScript — the browser must
 * never receive rows it is going to throw away. `sortBy` is constrained to an
 * allow-list by the Zod schema, so no user-controlled string ever reaches the
 * ORDER BY clause.
 */
export function buildCollegeWhere(
  input: Pick<
    CollegeListInput,
    "q" | "state" | "type" | "minFees" | "maxFees" | "minRating" | "maxRating"
  >
): Prisma.CollegeWhereInput {
  const conditions: Prisma.CollegeWhereInput[] = [];

  if (input.q) {
    // Case-insensitive substring match across the fields a user would search by.
    conditions.push({
      OR: [
        { name: { contains: input.q, mode: "insensitive" } },
        { city: { contains: input.q, mode: "insensitive" } },
        { state: { contains: input.q, mode: "insensitive" } },
        { description: { contains: input.q, mode: "insensitive" } },
      ],
    });
  }

  if (input.state) conditions.push({ state: input.state });
  if (input.type) conditions.push({ type: input.type });

  // Fees / rating ranges collapse into a single condition per field so Postgres
  // can use the btree index on that column.
  if (input.minFees !== undefined || input.maxFees !== undefined) {
    conditions.push({
      fees: {
        ...(input.minFees !== undefined ? { gte: input.minFees } : {}),
        ...(input.maxFees !== undefined ? { lte: input.maxFees } : {}),
      },
    });
  }

  if (input.minRating !== undefined || input.maxRating !== undefined) {
    conditions.push({
      rating: {
        ...(input.minRating !== undefined ? { gte: input.minRating } : {}),
        ...(input.maxRating !== undefined ? { lte: input.maxRating } : {}),
      },
    });
  }

  return conditions.length > 0 ? { AND: conditions } : {};
}

/** Pure pagination maths, extracted so it is directly unit-testable. */
export function buildPaginationMeta(
  total: number,
  page: number,
  limit: number
): PaginationMeta {
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1 && total > 0,
  };
}

export async function listColleges(
  input: CollegeListInput
): Promise<PaginatedResult<CollegeCardData>> {
  const { page, limit, sortBy, sortOrder } = input;
  const where = buildCollegeWhere(input);

  // Secondary sort on `id` keeps pagination stable when the primary sort key
  // ties (e.g. several colleges sharing a 4.5 rating) — without it, rows can
  // repeat or vanish across pages.
  const orderBy: Prisma.CollegeOrderByWithRelationInput[] = [
    { [sortBy]: sortOrder },
    { id: "asc" },
  ];

  const [total, colleges] = await Promise.all([
    prisma.college.count({ where }),
    prisma.college.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      select: COLLEGE_CARD_SELECT,
    }),
  ]);

  return {
    data: colleges.map(toCollegeCard),
    pagination: buildPaginationMeta(total, page, limit),
  };
}

// ─── Detail ───────────────────────────────────────────────────────────────────

const COLLEGE_DETAIL_INCLUDE = {
  courses: { orderBy: [{ degree: "asc" }, { name: "asc" }] },
  placements: { orderBy: { year: "desc" }, take: 5 },
  reviews: {
    orderBy: { createdAt: "desc" },
    take: 10,
    // Only id + name of the reviewer — never email or passwordHash.
    include: { user: { select: { id: true, name: true } } },
  },
  _count: { select: { reviews: true, savedBy: true } },
} satisfies Prisma.CollegeInclude;

type RawCollegeDetail = Prisma.CollegeGetPayload<{
  include: typeof COLLEGE_DETAIL_INCLUDE;
}>;

export type CollegeDetail = ReturnType<typeof toCollegeDetail>;

function toCollegeDetail(college: RawCollegeDetail) {
  return {
    id: college.id,
    name: college.name,
    slug: college.slug,
    location: college.location,
    city: college.city,
    state: college.state,
    description: college.description,
    type: college.type,
    establishedYear: college.establishedYear,
    totalStudents: college.totalStudents,
    accreditation: college.accreditation,
    imageUrl: college.imageUrl,
    website: college.website,
    fees: college.fees.toString(),
    rating: college.rating.toString(),
    averagePlacement: college.averagePlacement.toString(),
    highestPlacement: college.highestPlacement.toString(),
    courses: college.courses.map((c) => ({
      id: c.id,
      name: c.name,
      degree: c.degree,
      duration: c.duration,
      seats: c.seats,
      fees: c.fees.toString(),
    })),
    placements: college.placements.map((p) => ({
      id: p.id,
      year: p.year,
      totalPlaced: p.totalPlaced,
      topRecruiter: p.topRecruiter,
      averagePackage: p.averagePackage.toString(),
      highestPackage: p.highestPackage.toString(),
      placementRate: p.placementRate.toString(),
    })),
    reviews: college.reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      title: r.title,
      body: r.body,
      createdAt: r.createdAt.toISOString(),
      author: r.user?.name ?? null,
    })),
    reviewCount: college._count.reviews,
    savedCount: college._count.savedBy,
  };
}

/**
 * Look a college up by either its cuid or its slug in ONE query.
 *
 * The previous implementation issued `findUnique({ id })`, and on a miss a
 * second `findUnique({ slug })` — doubling round-trips for every slug URL,
 * which is the common case since all internal links use slugs.
 */
export async function getCollegeByIdOrSlug(
  identifier: string
): Promise<CollegeDetail | null> {
  if (!identifier) return null;

  const college = await prisma.college.findFirst({
    where: { OR: [{ id: identifier }, { slug: identifier }] },
    include: COLLEGE_DETAIL_INCLUDE,
  });

  return college ? toCollegeDetail(college) : null;
}

/** Same lookup, but throws a 404-mapped AppError instead of returning null. */
export async function requireCollege(identifier: string): Promise<CollegeDetail> {
  const college = await getCollegeByIdOrSlug(identifier);
  if (!college) throw notFoundError("College not found");
  return college;
}

// ─── Compare ─────────────────────────────────────────────────────────────────

const COMPARE_SELECT = {
  id: true,
  name: true,
  slug: true,
  location: true,
  city: true,
  state: true,
  type: true,
  fees: true,
  rating: true,
  averagePlacement: true,
  highestPlacement: true,
  totalStudents: true,
  accreditation: true,
  establishedYear: true,
  website: true,
  placements: {
    orderBy: { year: "desc" },
    take: 1,
    select: {
      year: true,
      averagePackage: true,
      highestPackage: true,
      placementRate: true,
      topRecruiter: true,
    },
  },
  _count: { select: { reviews: true, courses: true } },
} satisfies Prisma.CollegeSelect;

export type CompareCollege = ReturnType<typeof toCompareCollege>;

type RawCompareCollege = Prisma.CollegeGetPayload<{ select: typeof COMPARE_SELECT }>;

function toCompareCollege(c: RawCompareCollege) {
  const latest = c.placements[0] ?? null;
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    location: c.location,
    city: c.city,
    state: c.state,
    type: c.type,
    fees: c.fees.toString(),
    rating: c.rating.toString(),
    averagePlacement: c.averagePlacement.toString(),
    highestPlacement: c.highestPlacement.toString(),
    totalStudents: c.totalStudents,
    accreditation: c.accreditation,
    establishedYear: c.establishedYear,
    website: c.website,
    courseCount: c._count.courses,
    reviewCount: c._count.reviews,
    latestPlacement: latest
      ? {
          year: latest.year,
          averagePackage: latest.averagePackage.toString(),
          highestPackage: latest.highestPackage.toString(),
          placementRate: latest.placementRate.toString(),
          topRecruiter: latest.topRecruiter,
        }
      : null,
  };
}

/**
 * Fetch 2-3 colleges for side-by-side comparison in a single `IN (...)` query.
 *
 * The result is re-ordered to match the caller's id order — Postgres returns
 * rows in whatever order it likes, and the comparison columns must stay in the
 * order the user picked them.
 */
export async function compareColleges(ids: string[]): Promise<CompareCollege[]> {
  const uniqueIds = [...new Set(ids)];

  const colleges = await prisma.college.findMany({
    where: { id: { in: uniqueIds } },
    select: COMPARE_SELECT,
  });

  if (colleges.length !== uniqueIds.length) {
    const found = new Set(colleges.map((c) => c.id));
    const missing = uniqueIds.filter((id) => !found.has(id));
    throw notFoundError(
      missing.length === 1
        ? "One of the selected colleges no longer exists."
        : `${missing.length} of the selected colleges no longer exist.`
    );
  }

  const byId = new Map(colleges.map((c) => [c.id, toCompareCollege(c)]));
  return uniqueIds.map((id) => {
    const college = byId.get(id);
    // Unreachable given the length check above; narrows the type for TS.
    if (!college) throw validationError("Invalid college selection");
    return college;
  });
}

// ─── Filter options ──────────────────────────────────────────────────────────

/**
 * Distinct values used to populate the filter dropdowns.
 * `distinct` + `select` keeps this to two index-only scans rather than pulling
 * every college row into memory.
 */
export async function getFilterOptions() {
  const [states, types] = await Promise.all([
    prisma.college.findMany({
      select: { state: true },
      distinct: ["state"],
      orderBy: { state: "asc" },
    }),
    prisma.college.findMany({
      select: { type: true },
      distinct: ["type"],
      orderBy: { type: "asc" },
    }),
  ]);

  return {
    states: states.map((s) => s.state),
    types: types.map((t) => t.type),
  };
}

// ─── Homepage data ───────────────────────────────────────────────────────────

export async function getFeaturedColleges(take = 6): Promise<CollegeCardData[]> {
  const colleges = await prisma.college.findMany({
    orderBy: [{ rating: "desc" }, { averagePlacement: "desc" }],
    take,
    select: COLLEGE_CARD_SELECT,
  });
  return colleges.map(toCollegeCard);
}

export async function getPlatformStats() {
  const [totalColleges, totalReviews, totalCourses, states] = await Promise.all([
    prisma.college.count(),
    prisma.review.count(),
    prisma.course.count(),
    prisma.college.findMany({ select: { state: true }, distinct: ["state"] }),
  ]);

  return {
    totalColleges,
    totalReviews,
    totalCourses,
    totalStates: states.length,
  };
}
