/**
 * Unit tests — password hashing.
 * bcrypt is slow by design, so these tests get a longer timeout.
 */

import {
  hashPassword,
  verifyPassword,
  DUMMY_PASSWORD_HASH,
} from "@/lib/auth/password";

jest.setTimeout(20_000);

describe("password hashing", () => {
  it("never stores the plaintext password", async () => {
    const hash = await hashPassword("Secret123");
    expect(hash).not.toContain("Secret123");
    expect(hash).toMatch(/^\$2[aby]\$/);
  });

  it("verifies a correct password", async () => {
    const hash = await hashPassword("Secret123");
    await expect(verifyPassword("Secret123", hash)).resolves.toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("Secret123");
    await expect(verifyPassword("Secret124", hash)).resolves.toBe(false);
    await expect(verifyPassword("", hash)).resolves.toBe(false);
  });

  it("salts each hash, so identical passwords do not produce identical hashes", async () => {
    const [a, b] = await Promise.all([hashPassword("Same123"), hashPassword("Same123")]);
    expect(a).not.toBe(b);
    // Both must still verify — the salt is embedded in the hash.
    await expect(verifyPassword("Same123", a)).resolves.toBe(true);
    await expect(verifyPassword("Same123", b)).resolves.toBe(true);
  });

  it("uses a cost factor of 12", async () => {
    expect(await hashPassword("Secret123")).toContain("$12$");
  });

  /**
   * The whole point of DUMMY_PASSWORD_HASH is to burn the same CPU time on a
   * login for a non-existent account. A malformed hash returns instantly and
   * provides no timing protection at all — which is what the previous
   * placeholder ("$2a$12$fakehashfortimingprotection") did.
   */
  it("uses a well-formed dummy hash that actually costs time to compare", async () => {
    const startedAt = Date.now();
    const result = await verifyPassword("anything", DUMMY_PASSWORD_HASH);
    const elapsed = Date.now() - startedAt;

    expect(result).toBe(false);
    expect(elapsed).toBeGreaterThan(50);
  });
});
