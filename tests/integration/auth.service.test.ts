/**
 * Integration tests — registration and authentication.
 *
 * Covers the security-relevant behaviour: passwords are never stored in
 * plaintext, duplicate emails are rejected by the database, and a failed login
 * never reveals whether the account exists.
 */

import { registerUser, authenticateUser } from "@/lib/services/auth.service";
import { verifyPassword } from "@/lib/auth/password";
import { AppError } from "@/lib/api/errors";
import { signupSchema, loginSchema } from "@/lib/validation/schemas";
import { prisma, cleanupTestData, disconnect, TEST_PREFIX, uniqueSuffix } from "./setup";

jest.setTimeout(30_000);

function signupInput(overrides: Partial<{ name: string; email: string; password: string }> = {}) {
  const parsed = signupSchema.safeParse({
    name: `${TEST_PREFIX}Person`,
    email: `${TEST_PREFIX}${uniqueSuffix()}@example.test`,
    password: "Secret123",
    ...overrides,
  });
  if (!parsed.success) throw new Error(`Invalid test input: ${parsed.error.message}`);
  return parsed.data;
}

describe("auth service (integration)", () => {
  afterAll(async () => {
    await cleanupTestData();
    await disconnect();
  });

  describe("registerUser", () => {
    it("creates a user and returns only safe fields", async () => {
      const user = await registerUser(signupInput());

      expect(user).toEqual({
        id: expect.any(String),
        name: expect.any(String),
        email: expect.any(String),
      });
      // The projection must not carry the hash out of the service.
      expect(user).not.toHaveProperty("passwordHash");
    });

    it("stores a bcrypt hash, never the plaintext password", async () => {
      const input = signupInput({ password: "Secret123" });
      const user = await registerUser(input);

      const stored = await prisma.user.findUnique({
        where: { id: user.id },
        select: { passwordHash: true },
      });

      expect(stored?.passwordHash).toBeDefined();
      expect(stored?.passwordHash).not.toBe("Secret123");
      expect(stored?.passwordHash).toMatch(/^\$2[aby]\$12\$/);
      await expect(verifyPassword("Secret123", stored!.passwordHash)).resolves.toBe(true);
    });

    it("rejects a duplicate email with a 409", async () => {
      const email = `${TEST_PREFIX}${uniqueSuffix()}@example.test`;
      await registerUser(signupInput({ email }));

      await expect(registerUser(signupInput({ email }))).rejects.toMatchObject({
        status: 409,
        code: "CONFLICT",
      });
    });

    it("treats differently-cased emails as the same account", async () => {
      const local = `${TEST_PREFIX}${uniqueSuffix()}`;
      await registerUser(signupInput({ email: `${local}@example.test` }));

      // The schema lower-cases before the unique index sees it.
      await expect(
        registerUser(signupInput({ email: `${local.toUpperCase()}@EXAMPLE.TEST` }))
      ).rejects.toBeInstanceOf(AppError);
    });

    it("does not leave a partial row behind after a duplicate is rejected", async () => {
      const email = `${TEST_PREFIX}${uniqueSuffix()}@example.test`;
      await registerUser(signupInput({ email, name: `${TEST_PREFIX}First` }));

      await expect(
        registerUser(signupInput({ email, name: `${TEST_PREFIX}Second` }))
      ).rejects.toBeInstanceOf(AppError);

      const rows = await prisma.user.findMany({ where: { email } });
      expect(rows).toHaveLength(1);
      expect(rows[0].name).toBe(`${TEST_PREFIX}First`);
    });
  });

  describe("authenticateUser", () => {
    it("authenticates with correct credentials", async () => {
      const input = signupInput({ password: "Secret123" });
      const created = await registerUser(input);

      const parsed = loginSchema.parse({ email: input.email, password: "Secret123" });
      const user = await authenticateUser(parsed);

      expect(user.id).toBe(created.id);
      expect(user).not.toHaveProperty("passwordHash");
    });

    it("rejects a wrong password", async () => {
      const input = signupInput({ password: "Secret123" });
      await registerUser(input);

      const parsed = loginSchema.parse({ email: input.email, password: "WrongPass1" });
      await expect(authenticateUser(parsed)).rejects.toBeInstanceOf(AppError);
    });

    it("rejects an unknown email", async () => {
      const parsed = loginSchema.parse({
        email: `${TEST_PREFIX}nobody-${uniqueSuffix()}@example.test`,
        password: "Secret123",
      });
      await expect(authenticateUser(parsed)).rejects.toBeInstanceOf(AppError);
    });

    it("gives the same message for a wrong password and an unknown email", async () => {
      // Different messages would let an attacker enumerate registered accounts.
      const input = signupInput({ password: "Secret123" });
      await registerUser(input);

      const wrongPassword = await authenticateUser(
        loginSchema.parse({ email: input.email, password: "WrongPass1" })
      ).catch((e: AppError) => e);

      const unknownEmail = await authenticateUser(
        loginSchema.parse({
          email: `${TEST_PREFIX}ghost-${uniqueSuffix()}@example.test`,
          password: "Secret123",
        })
      ).catch((e: AppError) => e);

      expect((wrongPassword as AppError).message).toBe(
        (unknownEmail as AppError).message
      );
      expect((wrongPassword as AppError).status).toBe((unknownEmail as AppError).status);
    });

    it("signs in with a differently-cased email", async () => {
      const input = signupInput({ password: "Secret123" });
      const created = await registerUser(input);

      const parsed = loginSchema.parse({
        email: input.email.toUpperCase(),
        password: "Secret123",
      });
      const user = await authenticateUser(parsed);
      expect(user.id).toBe(created.id);
    });
  });
});
