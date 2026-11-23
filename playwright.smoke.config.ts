import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

/**
 * Smoke test against a deployed site (npm run test:smoke). Reads SITE_LOGIN_URL, ADMIN_EMAIL and
 * ADMIN_PASSWORD from the project-level .env. Starts no servers and changes no data.
 */
const rootEnv = fileURLToPath(new URL('./.env', import.meta.url));
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

export default defineConfig({
  testDir: 'tests/smoke',
  workers: 1,
  retries: 1,
  // The free API host sleeps when idle; the first request can take up to a minute (NFR7)
  timeout: 180_000,
  expect: { timeout: 60_000 },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report-smoke' }]],
  use: { trace: 'retain-on-failure', screenshot: 'only-on-failure', navigationTimeout: 90_000 },
  projects: [{ name: 'chromium-desktop', use: { ...devices['Desktop Chrome'] } }],
});
