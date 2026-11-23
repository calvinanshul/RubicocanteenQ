import { expect, type Page } from '@playwright/test';
import { ACCOUNTS } from './fixtures';

export async function login(page: Page, role: keyof typeof ACCOUNTS): Promise<void> {
  const acct = ACCOUNTS[role];
  await page.goto('/login');
  await page.getByLabel('Work email').fill(acct.email);
  await page.getByLabel('Password', { exact: true }).fill(acct.password);
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page).toHaveURL(new RegExp(`${acct.home}$`));
}

export function uniqueEmail(): string {
  return `e2e.${Date.now().toString(36)}.${Math.random().toString(36).slice(2, 7)}@rubicotech.com`;
}

/** No horizontal page scroll (NFR6 / TC-UI-12). */
export async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
}

/** Today's IST date (YYYY-MM-DD). */
export function todayIST(): string {
  return new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
}

/** x-test-now value for today at an IST time, e.g. clockAt('10:00'). The same-origin /api routes read it. */
export function clockAt(time: string): string {
  return `${todayIST()}T${time}:00+05:30`;
}

/** Same as clockAt, but `days` after today, so a script can run its story on a date no other script uses. */
export function clockAtDay(days: number, time: string): string {
  const d = new Date(`${todayIST()}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return `${d.toISOString().slice(0, 10)}T${time}:00+05:30`;
}

/** Sign up a brand-new employee (each order test needs its own "one order per day"). */
export async function signupEmployee(page: Page, name = 'E2E Employee'): Promise<string> {
  const email = uniqueEmail();
  await page.goto('/signup');
  await page.getByLabel('Full name').fill(name);
  await page.getByLabel('Work email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('Lunch2026');
  await page.getByLabel('Confirm password').fill('Lunch2026');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/menu$/);
  return email;
}
