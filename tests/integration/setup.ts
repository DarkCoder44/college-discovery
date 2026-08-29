/**
 * Integration test setup.
 *
 * These tests run against a REAL PostgreSQL database — the same engine as
 * production. Mocking Prisma here would only test the mock: unique constraints,
 * foreign keys, case-insensitive matching and Decimal handling are exactly the
 * behaviours worth verifying, and they only exist in the database.
 *
 * Requires `npm run db:up && npm run db:migrate` first.
 *
 * Every test creates its own data with a unique prefix and removes it
 * afterwards, so the suite is safe to run against a seeded dev database and
 * repeatable without a reset.
 */

import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

/** Prefix that marks every row this suite creates, for reliable cleanup. */
export const TEST_PREFIX = "zz-test-";

let counter = 0;
export function uniqueSuffix(): string {
  counter += 1;
  return `${process.pid}-${counter}`;
}

export interface SeededCollege {
  id: string;
  slug: string;
  name: string;
}

/** Creates a college with courses, a placement and a review. */
export async function createTestCollege(overrides: {
  name?: string;
  state?: string;
  city?: string;
  type?: string;
  fees?: number;
  rating?: number;
  averagePlacement?: number;
  establishedYear?: number;
} = {}): Promise<SeededCollege> {
  const suffix = uniqueSuffix();
  const name = overrides.name ?? `${TEST_PREFIX}College ${suffix}`;

  const college = await prisma.college.create({
    data: {
      name,
      slug: `${TEST_PREFIX}${suffix}`,
      location: `${overrides.city ?? "Testville"}, ${overrides.state ?? "Teststate"}`,
      city: overrides.city ?? "Testville",
      state: overrides.state ?? "Teststate",
      description: `${TEST_PREFIX}A college created for automated tests.`,
      type: overrides.type ?? "Private",
      establishedYear: overrides.establishedYear ?? 2000,
      fees: overrides.fees ?? 200_000,
      rating: overrides.rating ?? 4,
      averagePlacement: overrides.averagePlacement ?? 800_000,
      highestPlacement: 2_000_000,
      totalStudents: 5_000,
      accreditation: "NAAC A",
      courses: {
        create: [
          {
            name: "Test Course",
            degree: "B.Tech",
            duration: "4 years",
            fees: overrides.fees ?? 200_000,
            seats: 60,
          },
        ],
      },
      placements: {
        create: [
          {
            year: 2024,
            averagePackage: overrides.averagePlacement ?? 800_000,
            highestPackage: 2_000_000,
            placementRate: 90,
            totalPlaced: 400,
            topRecruiter: "TestCorp",
          },
        ],
      },
    },
    select: { id: true, slug: true, name: true },
  });

  return college;
}

export async function createTestUser(passwordHash = "$2a$12$placeholderhashvalue000000000000000000000000000000000") {
  const suffix = uniqueSuffix();
  return prisma.user.create({
    data: {
      name: `${TEST_PREFIX}User ${suffix}`,
      email: `${TEST_PREFIX}${suffix}@example.test`,
      passwordHash,
    },
    select: { id: true, name: true, email: true },
  });
}

/**
 * Removes every row this suite created. Cascading deletes take care of
 * courses, placements, reviews and saved-college rows.
 */
export async function cleanupTestData() {
  await prisma.savedCollege.deleteMany({
    where: {
      OR: [
        { college: { slug: { startsWith: TEST_PREFIX } } },
        { user: { email: { startsWith: TEST_PREFIX } } },
      ],
    },
  });
  await prisma.review.deleteMany({
    where: { college: { slug: { startsWith: TEST_PREFIX } } },
  });
  await prisma.college.deleteMany({ where: { slug: { startsWith: TEST_PREFIX } } });
  await prisma.user.deleteMany({ where: { email: { startsWith: TEST_PREFIX } } });
}

export async function disconnect() {
  await prisma.$disconnect();
}
