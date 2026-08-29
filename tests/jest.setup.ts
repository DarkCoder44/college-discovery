/**
 * Loads .env before any module that validates environment variables.
 *
 * Next.js loads .env automatically at runtime; Jest does not, so without this
 * `lib/config/env.ts` would throw "DATABASE_URL is required" the moment a test
 * imported anything that touches Prisma.
 */

import { config } from "dotenv";

// .env.test wins when present, so integration tests can point at a separate
// database without editing .env.
config({ path: ".env.test" });
config({ path: ".env" });
