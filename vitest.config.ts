import { defineConfig } from "vitest/config";

/**
 * Root Vitest config for compliance-core monorepo.
 *
 * Coverage thresholds match spec §10 testing strategy:
 * - Domain layer: ≥95% statements/functions/lines, ≥90% branches (pure logic).
 * - Application layer: ≥85% statements/functions/lines, ≥80% branches.
 * - Adapters and transports are covered by integration tests (testcontainers)
 *   and do not have aggressive unit thresholds here.
 */
export default defineConfig({
  test: {
    globals: false,
    include: ["packages/**/*.{test,spec}.ts"],
    exclude: ["**/node_modules/**", "**/dist/**", "**/generated/**", "**/coverage/**"],
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      exclude: [
        "**/generated/**",
        "**/*.test.ts",
        "**/*.spec.ts",
        "**/dto.ts",
        "**/index.ts",
        "**/__contract__/**",
        "**/__fixtures__/**",
      ],
      thresholds: {
        "packages/core/src/domain/**": {
          lines: 95,
          functions: 95,
          statements: 95,
          branches: 90,
        },
        "packages/core/src/app/**": {
          lines: 85,
          functions: 85,
          statements: 85,
          branches: 80,
        },
      },
    },
  },
});
