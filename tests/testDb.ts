import os from 'node:os';

/** Test database URL. Override with TEST_DATABASE_URL (CI). Never the dev database. */
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? `postgresql://${os.userInfo().username}@localhost:5432/canteenq_test`;

export const TEST_ENV = {
  DATABASE_URL: TEST_DATABASE_URL,
  DIRECT_URL: TEST_DATABASE_URL,
  SESSION_SECRET: 'test-only-session-secret-0123456789abcdef',
  ENABLE_TEST_CLOCK: 'true',
  APP_ENV: 'test',
  WEB_ORIGIN: 'http://localhost:3100',
  CRON_SECRET: 'test-only-cron-secret',
};
