/**
 * Iron-Session Configuration
 * --------------------------
 * iron-session stores session data in an encrypted, signed cookie.
 * No server-side session store is needed — the browser holds the cookie and the
 * server verifies/decrypts it on every request.
 *
 * Why stateless cookies over a session table? This app deploys to Vercel's
 * serverless runtime where there is no shared in-process memory, and adding
 * Redis for session storage would be premature for this scope. A signed,
 * encrypted cookie gives us stateless auth that scales horizontally for free.
 *
 * Trade-off (documented in the README): sessions cannot be revoked server-side
 * before they expire. Acceptable for this feature set.
 *
 * Security properties:
 * - httpOnly:   JavaScript in the browser cannot read it (XSS mitigation)
 * - secure:     only sent over HTTPS in production
 * - sameSite:   "lax" — blocks cross-site POSTs (CSRF) while keeping normal
 *               top-level navigation into the app logged in
 * - encrypted:  payload is confidential and tamper-evident (AEAD)
 */

import { getIronSession, type IronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { env, isProduction } from "@/lib/config/env";

export interface SessionData {
  userId?: string;
  name?: string;
  email?: string;
}

/** The authenticated principal, as the rest of the app consumes it. */
export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
}

export const SESSION_COOKIE_NAME = "college_discovery_session";

const sessionOptions: SessionOptions = {
  password: env.SESSION_SECRET,
  cookieName: SESSION_COOKIE_NAME,
  cookieOptions: {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  },
};

/**
 * Read the session from the request cookies.
 * Use in any Route Handler or Server Component that needs auth.
 */
export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

/**
 * Returns the authenticated user, or null when not logged in.
 * Never throws — callers decide how to handle anonymous access.
 */
export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const session = await getSession();
  if (!session.userId || !session.name || !session.email) return null;
  return {
    id: session.userId,
    name: session.name,
    email: session.email,
  };
}

/** Persist a freshly authenticated user onto the session cookie. */
export async function createUserSession(user: AuthenticatedUser): Promise<void> {
  const session = await getSession();
  session.userId = user.id;
  session.name = user.name;
  session.email = user.email;
  await session.save();
}

/** Clear the session cookie. */
export async function destroyUserSession(): Promise<void> {
  const session = await getSession();
  session.destroy();
}
