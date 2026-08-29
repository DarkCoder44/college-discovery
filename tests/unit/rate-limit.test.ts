/**
 * Unit tests — the auth rate limiter.
 * This is what makes online password guessing impractical, so its window
 * behaviour needs to be exact.
 */

import { checkRateLimit, resetRateLimits, getClientIdentifier } from "@/lib/auth/rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => resetRateLimits());

  it("allows requests up to the limit", () => {
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit("user-a", 5, 60_000).allowed).toBe(true);
    }
  });

  it("blocks the request after the limit is exceeded", () => {
    for (let i = 0; i < 5; i++) checkRateLimit("user-a", 5, 60_000);
    const blocked = checkRateLimit("user-a", 5, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("counts each key independently, so one client cannot lock out another", () => {
    for (let i = 0; i < 5; i++) checkRateLimit("user-a", 5, 60_000);
    expect(checkRateLimit("user-a", 5, 60_000).allowed).toBe(false);
    expect(checkRateLimit("user-b", 5, 60_000).allowed).toBe(true);
  });

  it("reports the remaining allowance", () => {
    expect(checkRateLimit("user-c", 3, 60_000).remaining).toBe(2);
    expect(checkRateLimit("user-c", 3, 60_000).remaining).toBe(1);
    expect(checkRateLimit("user-c", 3, 60_000).remaining).toBe(0);
  });

  it("starts a fresh window once the old one expires", async () => {
    expect(checkRateLimit("user-d", 1, 50).allowed).toBe(true);
    expect(checkRateLimit("user-d", 1, 50).allowed).toBe(false);

    await new Promise((resolve) => setTimeout(resolve, 70));

    expect(checkRateLimit("user-d", 1, 50).allowed).toBe(true);
  });
});

describe("getClientIdentifier", () => {
  it("takes the first hop from x-forwarded-for", () => {
    const request = new Request("http://localhost", {
      headers: { "x-forwarded-for": "203.0.113.5, 70.41.3.18" },
    });
    expect(getClientIdentifier(request)).toBe("203.0.113.5");
  });

  it("falls back to x-real-ip", () => {
    const request = new Request("http://localhost", {
      headers: { "x-real-ip": "198.51.100.7" },
    });
    expect(getClientIdentifier(request)).toBe("198.51.100.7");
  });

  it("returns a stable placeholder when no proxy header is present", () => {
    expect(getClientIdentifier(new Request("http://localhost"))).toBe("unknown");
  });
});
