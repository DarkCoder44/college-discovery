/**
 * Integration tests — saved colleges, with authorization as the focus.
 *
 * The single most important property under test: one user must never be able
 * to read, add to or delete from another user's shortlist.
 */

import {
  getSavedColleges,
  getSavedCollegeIds,
  saveCollege,
  unsaveCollege,
  isCollegeSaved,
} from "@/lib/services/saved.service";
import { AppError } from "@/lib/api/errors";
import {
  prisma,
  createTestCollege,
  createTestUser,
  cleanupTestData,
  disconnect,
  type SeededCollege,
} from "./setup";

jest.setTimeout(30_000);

describe("saved colleges service (integration)", () => {
  let alice: { id: string; name: string; email: string };
  let bob: { id: string; name: string; email: string };
  let collegeA: SeededCollege;
  let collegeB: SeededCollege;

  beforeAll(async () => {
    await cleanupTestData();
    alice = await createTestUser();
    bob = await createTestUser();
    collegeA = await createTestCollege();
    collegeB = await createTestCollege();
  });

  afterEach(async () => {
    // Reset shortlists between tests without touching users or colleges.
    await prisma.savedCollege.deleteMany({
      where: { userId: { in: [alice.id, bob.id] } },
    });
  });

  afterAll(async () => {
    await cleanupTestData();
    await disconnect();
  });

  describe("saving", () => {
    it("saves a college for a user", async () => {
      await saveCollege(alice.id, collegeA.id);
      await expect(isCollegeSaved(alice.id, collegeA.id)).resolves.toBe(true);
    });

    it("rejects a duplicate save with a 409, enforced by the unique constraint", async () => {
      await saveCollege(alice.id, collegeA.id);

      await expect(saveCollege(alice.id, collegeA.id)).rejects.toMatchObject({
        status: 409,
        code: "CONFLICT",
      });

      // Exactly one row — the constraint, not the application, guarantees this.
      const count = await prisma.savedCollege.count({
        where: { userId: alice.id, collegeId: collegeA.id },
      });
      expect(count).toBe(1);
    });

    it("rejects saving a college that does not exist, via the foreign key", async () => {
      await expect(
        saveCollege(alice.id, "clnonexistentcollege0")
      ).rejects.toMatchObject({ status: 404 });
    });

    it("lets two different users save the same college", async () => {
      await saveCollege(alice.id, collegeA.id);
      await saveCollege(bob.id, collegeA.id);

      await expect(isCollegeSaved(alice.id, collegeA.id)).resolves.toBe(true);
      await expect(isCollegeSaved(bob.id, collegeA.id)).resolves.toBe(true);
    });
  });

  describe("listing", () => {
    it("returns only the requesting user's saved colleges", async () => {
      await saveCollege(alice.id, collegeA.id);
      await saveCollege(bob.id, collegeB.id);

      const aliceSaved = await getSavedColleges(alice.id);
      const bobSaved = await getSavedColleges(bob.id);

      expect(aliceSaved.map((s) => s.college.id)).toEqual([collegeA.id]);
      expect(bobSaved.map((s) => s.college.id)).toEqual([collegeB.id]);
    });

    it("never leaks another user's shortlist", async () => {
      await saveCollege(bob.id, collegeA.id);
      await saveCollege(bob.id, collegeB.id);

      const aliceSaved = await getSavedColleges(alice.id);
      expect(aliceSaved).toEqual([]);
    });

    it("returns an empty array for a user with nothing saved", async () => {
      expect(await getSavedColleges(alice.id)).toEqual([]);
      expect(await getSavedCollegeIds(alice.id)).toEqual([]);
    });

    it("returns the most recently saved college first", async () => {
      await saveCollege(alice.id, collegeA.id);
      // Ensure a distinct createdAt — timestamps have millisecond resolution.
      await new Promise((resolve) => setTimeout(resolve, 10));
      await saveCollege(alice.id, collegeB.id);

      const saved = await getSavedColleges(alice.id);
      expect(saved.map((s) => s.college.id)).toEqual([collegeB.id, collegeA.id]);
    });

    it("serialises Decimal fields as strings", async () => {
      await saveCollege(alice.id, collegeA.id);
      const [entry] = await getSavedColleges(alice.id);
      expect(typeof entry.college.fees).toBe("string");
      expect(typeof entry.college.rating).toBe("string");
    });

    it("does not expose any user fields on the saved entries", async () => {
      await saveCollege(alice.id, collegeA.id);
      const [entry] = await getSavedColleges(alice.id);
      expect(JSON.stringify(entry)).not.toContain("passwordHash");
      expect(entry).not.toHaveProperty("user");
    });
  });

  describe("removing", () => {
    it("removes a saved college", async () => {
      await saveCollege(alice.id, collegeA.id);
      await unsaveCollege(alice.id, collegeA.id);
      await expect(isCollegeSaved(alice.id, collegeA.id)).resolves.toBe(false);
    });

    it("returns 404 when the college is not on the user's list", async () => {
      await expect(unsaveCollege(alice.id, collegeA.id)).rejects.toMatchObject({
        status: 404,
      });
    });

    it("CANNOT delete another user's saved college", async () => {
      // The authorization test that matters most.
      await saveCollege(bob.id, collegeA.id);

      await expect(unsaveCollege(alice.id, collegeA.id)).rejects.toBeInstanceOf(AppError);

      // Bob's row is untouched.
      await expect(isCollegeSaved(bob.id, collegeA.id)).resolves.toBe(true);
      expect(
        await prisma.savedCollege.count({
          where: { userId: bob.id, collegeId: collegeA.id },
        })
      ).toBe(1);
    });

    it("removes only the requesting user's row when both users saved the same college", async () => {
      await saveCollege(alice.id, collegeA.id);
      await saveCollege(bob.id, collegeA.id);

      await unsaveCollege(alice.id, collegeA.id);

      await expect(isCollegeSaved(alice.id, collegeA.id)).resolves.toBe(false);
      await expect(isCollegeSaved(bob.id, collegeA.id)).resolves.toBe(true);
    });
  });

  describe("cascade behaviour", () => {
    it("removes saved rows when the college is deleted", async () => {
      const temporary = await createTestCollege();
      await saveCollege(alice.id, temporary.id);

      await prisma.college.delete({ where: { id: temporary.id } });

      // onDelete: Cascade on the FK — no orphaned shortlist rows.
      const orphans = await prisma.savedCollege.count({
        where: { collegeId: temporary.id },
      });
      expect(orphans).toBe(0);
    });

    it("removes saved rows when the user is deleted", async () => {
      const temporaryUser = await createTestUser();
      await saveCollege(temporaryUser.id, collegeA.id);

      await prisma.user.delete({ where: { id: temporaryUser.id } });

      const orphans = await prisma.savedCollege.count({
        where: { userId: temporaryUser.id },
      });
      expect(orphans).toBe(0);
    });
  });
});
