import { expect, test } from '@playwright/test';

/** Live-site smoke test (project .env): the admin can log in, reach the admin console and log out. */
const LOGIN_URL = process.env.SITE_LOGIN_URL ?? '';
const EMAIL = process.env.ADMIN_EMAIL ?? '';
const PASSWORD = process.env.ADMIN_PASSWORD ?? '';
const configured = Boolean(LOGIN_URL && EMAIL && PASSWORD) && !LOGIN_URL.includes('your-site');

test.skip(!configured, 'Set SITE_LOGIN_URL, ADMIN_EMAIL and ADMIN_PASSWORD in the project .env');

test('SMOKE-01 the site is up: health check answers on /api', async ({ request }) => {
  const health = await request.get(new URL('/api/health', LOGIN_URL).toString(), { timeout: 90_000 });
  expect(health.status()).toBe(200);
  expect(await health.json()).toMatchObject({ status: 'ok', db: 'ok' });
});

test('SMOKE-02 the admin logs in, lands on the admin console and logs out', async ({ page }) => {
  await page.goto(LOGIN_URL);
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await page.getByLabel('Work email').fill(EMAIL);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Log in' }).click();

  await expect(page).toHaveURL(/\/admin\/users$/);
  const nav = page.getByRole('navigation', { name: 'Console' });
  for (const label of ['Dashboard', 'Users & Roles', 'Settings & Rules', 'Exports']) {
    await expect(nav.getByRole('link', { name: label })).toBeVisible();
  }

  // The session cookie must be first-party (same origin) (SET-14): /me works from the page
  const me = await page.evaluate(async () => (await fetch('/api/auth/me', { credentials: 'same-origin' })).json());
  expect(me).toMatchObject({ email: EMAIL.trim().toLowerCase(), role: 'ADMIN' });

  await page.getByRole('button', { name: 'Log out' }).first().click();
  await expect(page).toHaveURL(/\/login$/);
});
