import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Unit tests sit next to the code; tests/e2e is Playwright's.
    include: ['src/**/*.test.ts'],
    // The JSON report names every test and its result, for the factory's AC-to-test map.
    // Not under test-results/, which Playwright clears when `npm test` runs it next.
    reporters: ['default', 'json'],
    outputFile: { json: 'reports/vitest.json' },
  },
});
