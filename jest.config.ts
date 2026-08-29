import type { Config } from "jest";

/**
 * Jest configuration.
 *
 * Two suites:
 *   tests/unit/        — pure logic, no database, fast (`npm run test:unit`)
 *   tests/integration/ — real PostgreSQL via Prisma (`npm run test:integration`)
 *
 * `testEnvironment: "node"` is correct for both: everything under test is
 * server-side logic. The React components are exercised through the browser
 * flows documented in the README rather than through jsdom.
 */
const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  testMatch: ["<rootDir>/tests/**/*.test.ts"],
  // setup.ts is a helper, not a suite.
  testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/.next/"],
  setupFiles: ["<rootDir>/tests/jest.setup.ts"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      { tsconfig: { module: "commonjs", jsx: "react-jsx", esModuleInterop: true } },
    ],
  },
  collectCoverageFrom: [
    "lib/**/*.ts",
    "!lib/**/*.d.ts",
    "!lib/config/env.ts",
  ],
};

export default config;
