/**
 * Integration tests — college service against real PostgreSQL.
 *
 * These verify the behaviours that only exist in the database: case-insensitive
 * search, range filters on DECIMAL columns, LIMIT/OFFSET paging and stable
 * ordering.
 */

import {
  listColleges,
  getCollegeByIdOrSlug,
  compareColleges,
  getFilterOptions,
  buildPaginationMeta,
} from "@/lib/services/college.service";
import { collegeListSchema } from "@/lib/validation/schemas";
import { AppError } from "@/lib/api/errors";
import {
  createTestCollege,
  cleanupTestData,
  disconnect,
  TEST_PREFIX,
  type SeededCollege,
} from "./setup";

jest.setTimeout(30_000);

/** Parses raw params exactly as the route handler does. */
function listInput(params: Record<string, string> = {}) {
  const parsed = collegeListSchema.safeParse(params);
  if (!parsed.success) throw new Error(`Invalid test input: ${parsed.error.message}`);
  return parsed.data;
}

describe("college service (integration)", () => {
  let cheap: SeededCollege;
  let expensive: SeededCollege;
  let topRated: SeededCollege;

  beforeAll(async () => {
    await cleanupTestData();

    cheap = await createTestCollege({
      name: `${TEST_PREFIX}Affordable Institute of Technology`,
      city: "Kanpur",
      state: "Zzz Test State",
      type: "Public",
      fees: 50_000,
      rating: 3.5,
      averagePlacement: 400_000,
      establishedYear: 1960,
    });

    expensive = await createTestCollege({
      name: `${TEST_PREFIX}Premium Business School`,
      city: "Zzzcity",
      state: "Zzz Test State",
      type: "Private",
      fees: 1_500_000,
      rating: 4.2,
      averagePlacement: 2_500_000,
      establishedYear: 2005,
    });

    topRated = await createTestCollege({
      name: `${TEST_PREFIX}Excellent Research University`,
      city: "Zzzcity",
      state: "Zzz Other State",
      type: "Deemed",
      fees: 300_000,
      rating: 4.9,
      averagePlacement: 1_200_000,
      establishedYear: 1990,
    });
  });

  afterAll(async () => {
    await cleanupTestData();
    await disconnect();
  });

  // ─── Search ────────────────────────────────────────────────────────────────

  describe("search", () => {
    it("finds colleges by a substring of the name", async () => {
      const result = await listColleges(listInput({ q: "Affordable Institute" }));
      expect(result.data.map((c) => c.id)).toContain(cheap.id);
    });

    it("matches case-insensitively", async () => {
      const lower = await listColleges(listInput({ q: "affordable institute" }));
      const upper = await listColleges(listInput({ q: "AFFORDABLE INSTITUTE" }));
      expect(lower.data.map((c) => c.id)).toContain(cheap.id);
      expect(upper.data.map((c) => c.id)).toContain(cheap.id);
    });

    it("searches the city as well as the name", async () => {
      const result = await listColleges(listInput({ q: "Kanpur" }));
      expect(result.data.map((c) => c.id)).toContain(cheap.id);
    });

    it("returns an empty page — not an error — when nothing matches", async () => {
      const result = await listColleges(
        listInput({ q: "qqqzzz-definitely-no-such-college" })
      );
      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.totalPages).toBe(0);
      expect(result.pagination.hasNext).toBe(false);
    });

    it("treats a search term with SQL metacharacters as literal text", async () => {
      // Prisma parameterises the query, so this must simply match nothing.
      const result = await listColleges(listInput({ q: "'; DROP TABLE colleges; --" }));
      expect(result.data).toEqual([]);

      // Prove the table is still there.
      const stillThere = await listColleges(listInput({ q: "Affordable Institute" }));
      expect(stillThere.data.length).toBeGreaterThan(0);
    });
  });

  // ─── Filtering ─────────────────────────────────────────────────────────────

  describe("filtering", () => {
    it("filters by state", async () => {
      const result = await listColleges(
        listInput({ state: "Zzz Other State", limit: "48" })
      );
      const ids = result.data.map((c) => c.id);
      expect(ids).toContain(topRated.id);
      expect(ids).not.toContain(cheap.id);
    });

    it("filters by college type", async () => {
      const result = await listColleges(
        listInput({ type: "Deemed", state: "Zzz Other State", limit: "48" })
      );
      expect(result.data.every((c) => c.type === "Deemed")).toBe(true);
    });

    it("filters by a maximum fee, comparing DECIMAL values correctly", async () => {
      const result = await listColleges(
        listInput({ maxFees: "100000", q: TEST_PREFIX, limit: "48" })
      );
      const ids = result.data.map((c) => c.id);
      expect(ids).toContain(cheap.id);
      expect(ids).not.toContain(expensive.id);
    });

    it("filters by a fee range", async () => {
      const result = await listColleges(
        listInput({ minFees: "200000", maxFees: "500000", q: TEST_PREFIX, limit: "48" })
      );
      const ids = result.data.map((c) => c.id);
      expect(ids).toContain(topRated.id);
      expect(ids).not.toContain(cheap.id);
      expect(ids).not.toContain(expensive.id);
    });

    it("filters by minimum rating", async () => {
      const result = await listColleges(
        listInput({ minRating: "4.5", q: TEST_PREFIX, limit: "48" })
      );
      const ids = result.data.map((c) => c.id);
      expect(ids).toContain(topRated.id);
      expect(ids).not.toContain(cheap.id);
    });

    it("combines filters with AND, not OR", async () => {
      const result = await listColleges(
        listInput({
          state: "Zzz Test State",
          type: "Public",
          maxFees: "100000",
          limit: "48",
        })
      );
      const ids = result.data.map((c) => c.id);
      expect(ids).toContain(cheap.id);
      // expensive is in the same state but is Private and over the fee cap.
      expect(ids).not.toContain(expensive.id);
    });
  });

  // ─── Sorting ───────────────────────────────────────────────────────────────

  describe("sorting", () => {
    it("sorts by fees ascending", async () => {
      const result = await listColleges(
        listInput({ q: TEST_PREFIX, sortBy: "fees", sortOrder: "asc", limit: "48" })
      );
      const fees = result.data.map((c) => Number.parseFloat(c.fees));
      expect([...fees].sort((a, b) => a - b)).toEqual(fees);
    });

    it("sorts by rating descending", async () => {
      const result = await listColleges(
        listInput({ q: TEST_PREFIX, sortBy: "rating", sortOrder: "desc", limit: "48" })
      );
      const ratings = result.data.map((c) => Number.parseFloat(c.rating));
      expect([...ratings].sort((a, b) => b - a)).toEqual(ratings);
      expect(result.data[0].id).toBe(topRated.id);
    });

    it("sorts by name alphabetically", async () => {
      const result = await listColleges(
        listInput({ q: TEST_PREFIX, sortBy: "name", sortOrder: "asc", limit: "48" })
      );
      const names = result.data.map((c) => c.name);
      expect([...names].sort()).toEqual(names);
    });

    it("sorts by average placement package", async () => {
      const result = await listColleges(
        listInput({
          q: TEST_PREFIX,
          sortBy: "averagePlacement",
          sortOrder: "desc",
          limit: "48",
        })
      );
      expect(result.data[0].id).toBe(expensive.id);
    });
  });

  // ─── Pagination ────────────────────────────────────────────────────────────

  describe("pagination", () => {
    it("returns at most `limit` rows per page", async () => {
      const result = await listColleges(listInput({ limit: "2", q: TEST_PREFIX }));
      expect(result.data.length).toBeLessThanOrEqual(2);
      expect(result.pagination.limit).toBe(2);
    });

    it("returns different rows on page 2", async () => {
      const base = { q: TEST_PREFIX, limit: "1", sortBy: "name", sortOrder: "asc" };
      const page1 = await listColleges(listInput({ ...base, page: "1" }));
      const page2 = await listColleges(listInput({ ...base, page: "2" }));

      expect(page1.data).toHaveLength(1);
      expect(page2.data).toHaveLength(1);
      expect(page1.data[0].id).not.toBe(page2.data[0].id);
    });

    it("never repeats a row across pages when the sort key ties", async () => {
      // All three test colleges have distinct ratings, so tie on `type` instead
      // by sorting on a low-cardinality column.
      const base = { q: TEST_PREFIX, limit: "1", sortBy: "totalStudents", sortOrder: "asc" };
      const seen = new Set<string>();

      for (const page of ["1", "2", "3"]) {
        const result = await listColleges(listInput({ ...base, page }));
        result.data.forEach((c) => {
          expect(seen.has(c.id)).toBe(false); // the stable secondary sort on id
          seen.add(c.id);
        });
      }
      expect(seen.size).toBe(3);
    });

    it("returns an empty page beyond the last one rather than erroring", async () => {
      const result = await listColleges(listInput({ q: TEST_PREFIX, page: "999" }));
      expect(result.data).toEqual([]);
      expect(result.pagination.hasNext).toBe(false);
      expect(result.pagination.hasPrev).toBe(true);
    });

    it("reports a total that is independent of the current page", async () => {
      const page1 = await listColleges(listInput({ q: TEST_PREFIX, limit: "1", page: "1" }));
      const page2 = await listColleges(listInput({ q: TEST_PREFIX, limit: "1", page: "2" }));
      expect(page1.pagination.total).toBe(page2.pagination.total);
      expect(page1.pagination.total).toBeGreaterThanOrEqual(3);
    });

    it("agrees with buildPaginationMeta", async () => {
      const result = await listColleges(listInput({ q: TEST_PREFIX, limit: "2" }));
      expect(result.pagination).toEqual(
        buildPaginationMeta(result.pagination.total, 1, 2)
      );
    });
  });

  // ─── Detail ────────────────────────────────────────────────────────────────

  describe("getCollegeByIdOrSlug", () => {
    it("finds a college by id", async () => {
      const college = await getCollegeByIdOrSlug(cheap.id);
      expect(college?.id).toBe(cheap.id);
    });

    it("finds the same college by slug", async () => {
      const college = await getCollegeByIdOrSlug(cheap.slug);
      expect(college?.id).toBe(cheap.id);
    });

    it("includes related courses and placements", async () => {
      const college = await getCollegeByIdOrSlug(cheap.id);
      expect(college?.courses.length).toBeGreaterThan(0);
      expect(college?.placements.length).toBeGreaterThan(0);
      expect(college?.placements[0].year).toBe(2024);
    });

    it("serialises Decimal columns as strings to preserve precision", async () => {
      const college = await getCollegeByIdOrSlug(cheap.id);
      expect(typeof college?.fees).toBe("string");
      expect(typeof college?.rating).toBe("string");
      expect(typeof college?.placements[0].averagePackage).toBe("string");
    });

    it("returns null for an id that does not exist", async () => {
      expect(await getCollegeByIdOrSlug("clnonexistentid000000")).toBeNull();
    });

    it("returns null rather than throwing on an empty identifier", async () => {
      expect(await getCollegeByIdOrSlug("")).toBeNull();
    });
  });

  // ─── Compare ───────────────────────────────────────────────────────────────

  describe("compareColleges", () => {
    it("returns both colleges for a valid pair", async () => {
      const result = await compareColleges([cheap.id, expensive.id]);
      expect(result).toHaveLength(2);
    });

    it("returns all three for a valid triple", async () => {
      const result = await compareColleges([cheap.id, expensive.id, topRated.id]);
      expect(result).toHaveLength(3);
    });

    it("preserves the caller's ordering, not the database's", async () => {
      const result = await compareColleges([topRated.id, cheap.id, expensive.id]);
      expect(result.map((c) => c.id)).toEqual([topRated.id, cheap.id, expensive.id]);
    });

    it("collapses a duplicate id instead of comparing a college with itself", async () => {
      const result = await compareColleges([cheap.id, cheap.id, expensive.id]);
      expect(result).toHaveLength(2);
    });

    it("throws a 404-mapped AppError when an id does not exist", async () => {
      await expect(
        compareColleges([cheap.id, "clnonexistentid000000"])
      ).rejects.toBeInstanceOf(AppError);

      await expect(
        compareColleges([cheap.id, "clnonexistentid000000"])
      ).rejects.toMatchObject({ status: 404 });
    });

    it("includes the latest placement figures for each college", async () => {
      const result = await compareColleges([cheap.id, expensive.id]);
      expect(result[0].latestPlacement).not.toBeNull();
      expect(result[0].latestPlacement?.year).toBe(2024);
    });

    it("includes the course count used by the comparison table", async () => {
      const result = await compareColleges([cheap.id, expensive.id]);
      expect(result[0].courseCount).toBeGreaterThan(0);
    });
  });

  // ─── Filter options ────────────────────────────────────────────────────────

  describe("getFilterOptions", () => {
    it("returns distinct, sorted states", async () => {
      const { states } = await getFilterOptions();
      expect(states).toContain("Zzz Test State");
      expect(new Set(states).size).toBe(states.length);
      expect([...states].sort()).toEqual(states);
    });

    it("returns the distinct college types", async () => {
      const { types } = await getFilterOptions();
      expect(types).toEqual(expect.arrayContaining(["Public", "Private", "Deemed"]));
    });
  });
});
