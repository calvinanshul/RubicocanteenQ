import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { TEST_ENV } from './tests/testDb';

/**
 * API tests: the Next.js route handlers, called in-process through Supertest (tests/api/nextApp.ts), against
 * the canteenq_test database. Files run one at a time because they share that database.
 */
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    include: ['tests/api/**/*.test.ts'],
    globalSetup: ['tests/api/globalSetup.ts'],
    env: TEST_ENV,
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
});
