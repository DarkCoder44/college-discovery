/**
 * Unit tests — validation schemas.
 *
 * These are the app's outermost defence: everything that reaches a service has
 * passed through one of these schemas. No database or HTTP server required.
 */

import {
  collegeListSchema,
  compareQuerySchema,
  signupSchema,
  loginSchema,
  saveCollegeSchema,
  collegeIdSchema,
  collegeIdentifierSchema,
  MAX_PAGE_SIZE,
  DEFAULT_PAGE_SIZE,
} from "@/lib/validation/schemas";

describe("collegeListSchema", () => {
  it("applies sensible defaults when no parameters are supplied", () => {
    const result = collegeListSchema.safeParse({});
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.page).toBe(1);
    expect(result.data.limit).toBe(DEFAULT_PAGE_SIZE);
    expect(result.data.sortBy).toBe("rating");
    expect(result.data.sortOrder).toBe("desc");
  });

  it("coerces numeric query strings, since URLs only carry strings", () => {
    const result = collegeListSchema.safeParse({
      page: "3",
      limit: "24",
      minFees: "100000",
      minRating: "4.5",
    });
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.page).toBe(3);
    expect(result.data.limit).toBe(24);
    expect(result.data.minFees).toBe(100_000);
    expect(result.data.minRating).toBe(4.5);
  });

  it("treats empty strings (an untouched <select>) as absent", () => {
    const result = collegeListSchema.safeParse({
      q: "",
      state: "",
      type: "",
      minFees: "",
      minRating: "",
    });
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.q).toBeUndefined();
    expect(result.data.state).toBeUndefined();
    expect(result.data.type).toBeUndefined();
    expect(result.data.minFees).toBeUndefined();
  });

  it.each([
    ["page below 1", { page: "0" }],
    ["negative page", { page: "-2" }],
    ["fractional page", { page: "1.5" }],
    ["limit above the maximum", { limit: String(MAX_PAGE_SIZE + 1) }],
    ["limit of zero", { limit: "0" }],
    ["rating above 5", { minRating: "6" }],
    ["negative fees", { minFees: "-100" }],
    ["unknown college type", { type: "Bogus" }],
    ["unknown sort order", { sortOrder: "sideways" }],
  ])("rejects %s", (_label, input) => {
    expect(collegeListSchema.safeParse(input).success).toBe(false);
  });

  it("rejects sort fields outside the allow-list", () => {
    // This is the guard that stops a caller ordering by a sensitive column.
    expect(collegeListSchema.safeParse({ sortBy: "passwordHash" }).success).toBe(false);
    expect(collegeListSchema.safeParse({ sortBy: "id" }).success).toBe(false);
    expect(collegeListSchema.safeParse({ sortBy: "'; DROP TABLE" }).success).toBe(false);
  });

  it("accepts every allow-listed sort field", () => {
    for (const field of [
      "name",
      "fees",
      "rating",
      "averagePlacement",
      "highestPlacement",
      "establishedYear",
      "totalStudents",
      "createdAt",
    ]) {
      expect(collegeListSchema.safeParse({ sortBy: field }).success).toBe(true);
    }
  });

  it("rejects an inverted fees range instead of silently returning nothing", () => {
    const result = collegeListSchema.safeParse({ minFees: "500000", maxFees: "100000" });
    expect(result.success).toBe(false);
  });

  it("rejects an inverted rating range", () => {
    expect(collegeListSchema.safeParse({ minRating: "5", maxRating: "2" }).success).toBe(false);
  });

  it("accepts a valid range", () => {
    expect(collegeListSchema.safeParse({ minFees: "100000", maxFees: "500000" }).success).toBe(true);
  });

  it("rejects an over-long search term", () => {
    expect(collegeListSchema.safeParse({ q: "x".repeat(101) }).success).toBe(false);
  });
});

describe("compareQuerySchema", () => {
  it("accepts two ids", () => {
    const result = compareQuerySchema.safeParse({ ids: "abc123,def456" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.ids).toEqual(["abc123", "def456"]);
  });

  it("accepts three ids", () => {
    const result = compareQuerySchema.safeParse({ ids: "a1,b2,c3" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.ids).toHaveLength(3);
  });

  it("rejects fewer than two colleges", () => {
    const result = compareQuerySchema.safeParse({ ids: "onlyone" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/at least 2/i);
    }
  });

  it("rejects an empty selection", () => {
    expect(compareQuerySchema.safeParse({ ids: "" }).success).toBe(false);
  });

  it("rejects more than three colleges", () => {
    const result = compareQuerySchema.safeParse({ ids: "a,b,c,d" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/at most 3/i);
    }
  });

  it("de-duplicates repeated ids, so ?ids=x,x is not a valid comparison", () => {
    const result = compareQuerySchema.safeParse({ ids: "abc,abc" });
    expect(result.success).toBe(false);
  });

  it("de-duplicates while keeping a genuine pair valid", () => {
    const result = compareQuerySchema.safeParse({ ids: "abc,def,abc" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.ids).toEqual(["abc", "def"]);
  });

  it("tolerates whitespace and trailing commas", () => {
    const result = compareQuerySchema.safeParse({ ids: " abc , def ," });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.ids).toEqual(["abc", "def"]);
  });

  it("rejects ids containing unexpected characters", () => {
    expect(compareQuerySchema.safeParse({ ids: "abc,../../etc/passwd" }).success).toBe(false);
    expect(compareQuerySchema.safeParse({ ids: "abc,de f" }).success).toBe(false);
  });
});

describe("signupSchema", () => {
  const valid = { name: "Demo Student", email: "Demo@Example.COM ", password: "Secret123" };

  it("accepts a valid signup and normalises the email", () => {
    const result = signupSchema.safeParse(valid);
    expect(result.success).toBe(true);
    // Lower-casing at the schema means the UNIQUE index actually prevents
    // "a@b.com" and "A@B.com" being two accounts.
    if (result.success) expect(result.data.email).toBe("demo@example.com");
  });

  it("trims the name", () => {
    const result = signupSchema.safeParse({ ...valid, name: "  Demo Student  " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBe("Demo Student");
  });

  it.each([
    ["a name that is too short", { name: "D" }],
    ["a malformed email", { email: "not-an-email" }],
    ["an email with no domain", { email: "user@" }],
    ["a password under 8 characters", { password: "Ab1" }],
    ["a password with no uppercase", { password: "secret123" }],
    ["a password with no lowercase", { password: "SECRET123" }],
    ["a password with no digit", { password: "SecretPass" }],
  ])("rejects %s", (_label, patch) => {
    expect(signupSchema.safeParse({ ...valid, ...patch }).success).toBe(false);
  });

  it("rejects a password over bcrypt's 72-byte limit rather than truncating it", () => {
    const result = signupSchema.safeParse({ ...valid, password: `Aa1${"x".repeat(80)}` });
    expect(result.success).toBe(false);
  });

  it("reports every invalid field at once, not just the first", () => {
    const result = signupSchema.safeParse({ name: "", email: "bad", password: "short" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.error.flatten().fieldErrors;
      expect(fields.name).toBeDefined();
      expect(fields.email).toBeDefined();
      expect(fields.password).toBeDefined();
    }
  });
});

describe("loginSchema", () => {
  it("accepts any non-empty password, so old passwords still work after a rule change", () => {
    const result = loginSchema.safeParse({ email: "a@b.com", password: "old" });
    expect(result.success).toBe(true);
  });

  it("rejects an empty password", () => {
    expect(loginSchema.safeParse({ email: "a@b.com", password: "" }).success).toBe(false);
  });

  it("rejects a malformed email", () => {
    expect(loginSchema.safeParse({ email: "nope", password: "x" }).success).toBe(false);
  });
});

describe("id schemas", () => {
  it("accepts a cuid-shaped id", () => {
    expect(collegeIdSchema.safeParse("clx1a2b3c4d5e6f7g8h9").success).toBe(true);
  });

  it.each(["", "   ", "../etc/passwd", "id with space", "id;DROP", "a".repeat(65)])(
    "rejects %p as a college id",
    (value) => {
      expect(collegeIdSchema.safeParse(value).success).toBe(false);
    }
  );

  it("allows hyphens for slugs but not for raw ids", () => {
    expect(collegeIdentifierSchema.safeParse("iit-bombay").success).toBe(true);
    expect(collegeIdSchema.safeParse("iit-bombay").success).toBe(false);
  });

  it("rejects a path-traversal attempt in an identifier", () => {
    expect(collegeIdentifierSchema.safeParse("../../secret").success).toBe(false);
  });
});

describe("saveCollegeSchema", () => {
  it("requires a collegeId", () => {
    expect(saveCollegeSchema.safeParse({}).success).toBe(false);
  });

  it("accepts a valid body", () => {
    expect(saveCollegeSchema.safeParse({ collegeId: "clx123abc" }).success).toBe(true);
  });
});
