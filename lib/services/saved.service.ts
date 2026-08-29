/**
 * Saved Colleges Service
 * ----------------------
 * Every function here takes `userId` as its first argument and scopes every
 * query by it. That is the authorization boundary: it is impossible to express
 * "read/delete someone else's saved college" through this API, because the
 * user id is always part of the WHERE clause rather than something the caller
 * can omit.
 *
 * `userId` always comes from the encrypted session cookie on the server — never
 * from a request body or query parameter.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { conflictError, notFoundError } from "@/lib/api/errors";

const SAVED_COLLEGE_SELECT = {
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
  establishedYear: true,
  accreditation: true,
  imageUrl: true,
  _count: { select: { reviews: true } },
} satisfies Prisma.CollegeSelect;

export interface SavedCollegeEntry {
  savedAt: string;
  college: {
    id: string;
    name: string;
    slug: string;
    location: string;
    city: string;
    state: string;
    type: string;
    fees: string;
    rating: string;
    averagePlacement: string;
    highestPlacement: string;
    totalStudents: number;
    establishedYear: number;
    accreditation: string | null;
    imageUrl: string | null;
    reviewCount: number;
  };
}

export async function getSavedColleges(userId: string): Promise<SavedCollegeEntry[]> {
  const saved = await prisma.savedCollege.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { college: { select: SAVED_COLLEGE_SELECT } },
  });

  return saved.map((s) => ({
    savedAt: s.createdAt.toISOString(),
    college: {
      id: s.college.id,
      name: s.college.name,
      slug: s.college.slug,
      location: s.college.location,
      city: s.college.city,
      state: s.college.state,
      type: s.college.type,
      fees: s.college.fees.toString(),
      rating: s.college.rating.toString(),
      averagePlacement: s.college.averagePlacement.toString(),
      highestPlacement: s.college.highestPlacement.toString(),
      totalStudents: s.college.totalStudents,
      establishedYear: s.college.establishedYear,
      accreditation: s.college.accreditation,
      imageUrl: s.college.imageUrl,
      reviewCount: s.college._count.reviews,
    },
  }));
}

/** Just the ids — used to render the save toggle state on list pages cheaply. */
export async function getSavedCollegeIds(userId: string): Promise<string[]> {
  const rows = await prisma.savedCollege.findMany({
    where: { userId },
    select: { collegeId: true },
  });
  return rows.map((r) => r.collegeId);
}

export async function saveCollege(userId: string, collegeId: string): Promise<void> {
  try {
    await prisma.savedCollege.create({ data: { userId, collegeId } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // P2002: the @@unique([userId, collegeId]) constraint fired — the college
      // is already on this user's list. The constraint (not an application-level
      // check) is what actually guarantees no duplicates under concurrency.
      if (error.code === "P2002") {
        throw conflictError("This college is already in your saved list");
      }
      // P2003: foreign key violation — collegeId does not exist. Letting the FK
      // report this avoids a redundant existence SELECT on the happy path.
      if (error.code === "P2003") {
        throw notFoundError("College not found");
      }
    }
    throw error;
  }
}

export async function unsaveCollege(userId: string, collegeId: string): Promise<void> {
  // deleteMany scoped by userId: one round-trip, and a request for another
  // user's row simply matches zero records instead of deleting anything.
  const result = await prisma.savedCollege.deleteMany({
    where: { userId, collegeId },
  });

  if (result.count === 0) {
    throw notFoundError("This college is not in your saved list");
  }
}

export async function isCollegeSaved(
  userId: string,
  collegeId: string
): Promise<boolean> {
  const record = await prisma.savedCollege.findUnique({
    where: { userId_collegeId: { userId, collegeId } },
    select: { id: true },
  });
  return record !== null;
}
