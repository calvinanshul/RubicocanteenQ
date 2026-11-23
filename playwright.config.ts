import os from 'node:os';
import { defineConfig, devices } from '@playwright/test';

/** E2E runs against its own database so it never touches dev or API-test data. */
export const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? `postgresql://${os.userInfo().username}@localhost:5432/canteenq_e2e`;
const PORT = 3100;
const WEB_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: process.env.CI ? 1 : 2,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['list']] : [['list'], ['html', { open: 'never' }]],
  globalSetup: './tests/e2e/global-setup.ts',
  use: { baseURL: WEB_URL, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
    { name: 'mobile', use: { ...devices['Pixel 5'] }, testMatch: /(auth|layout|\.mobile)\.spec\.ts/ },
  ],
  webServer: {
    // One Next.js server: pages and /api on the same origin (production build)
    command: `npm run build && npx next start -p ${PORT}`,
    url: `${WEB_URL}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    env: {
      DATABASE_URL: E2E_DATABASE_URL,
      DIRECT_URL: E2E_DATABASE_URL,
      SESSION_SECRET: 'e2e-only-session-secret-0123456789abcdef',
      ENABLE_TEST_CLOCK: 'true',
      APP_ENV: 'test',
      WEB_ORIGIN: WEB_URL,
      MAIL_TRANSPORT: 'none',
    },
  },
});
