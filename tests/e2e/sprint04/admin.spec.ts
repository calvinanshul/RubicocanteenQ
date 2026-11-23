/**
 * Sprint 04 E2E acceptance scripts (S11/S12 catalogue, S14 users, S16 exports, S6 history, S17, visual check).
 * Contract: docs/test-cases/contracts.md §Sprint 04.
 */
import { expect, test } from '@playwright/test';
import { clockAtDay, login, signupEmployee, uniqueEmail } from '../helpers';
import { sprintActive } from '../sprintGate';

test.skip(!sprintActive(4), 'Sprint 04 not started');

test('TC-UI-05 manager adds a dish, puts it on tomorrow, an employee sees it', async ({ page, browser }) => {
  const dish = `E2E Dish ${Date.now()}`;
  await login(page, 'MANAGER');
  await page.goto('/manager/menu-items');
  await page.getByRole('button', { name: 'Add item' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Dish name').fill(dish);
  await dialog.getByLabel('Category').selectOption('LIGHT');
  await dialog.getByLabel('Price (₹)').fill('75');
  await dialog.getByRole('radio', { name: 'Veg', exact: true }).check();
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('cell', { name: dish })).toBeVisible();

  // Own date (today + 3): daily-menu.spec.ts edits tomorrow in parallel, and a save replaces the whole day (cycle 2 flake)
  const menuDate = clockAtDay(3, '00:00').slice(0, 10);
  await page.goto(`/manager/daily-menu?date=${menuDate}`);
  await page.getByRole('switch', { name: `On menu: ${dish}` }).click();
  await page.getByLabel(`Portions for ${dish}`).fill('20');
  await page.getByRole('button', { name: 'Save menu' }).click();
  await expect(page.getByText(/Menu saved/)).toBeVisible();

  // The employee's clock is today + 2, so their "Tomorrow" is the date published above
  const emp = await (await browser.newContext({ extraHTTPHeaders: { 'x-test-now': clockAtDay(2, '09:00') } })).newPage();
  await signupEmployee(emp);
  await emp.getByRole('tab', { name: 'Tomorrow' }).click();
  await expect(emp.getByRole('article', { name: dish })).toBeVisible();
});

test('EC-04-UI1 the item form shows the price range error', async ({ page }) => {
  await login(page, 'MANAGER');
  await page.goto('/manager/menu-items');
  await page.getByRole('button', { name: 'Add item' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Dish name').fill(`Too Dear ${Date.now()}`);
  await dialog.getByLabel('Price (₹)').fill('1001');
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(dialog.getByText(/Price must be between ₹1 and ₹1,000/)).toBeVisible();
});

test('TC-UI-04 admin changes a role with confirmation', async ({ page }) => {
  await page.goto('/signup');
  const email = uniqueEmail();
  await page.getByLabel('Full name').fill('Role Change Target');
  await page.getByLabel('Work email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('Lunch2026');
  await page.getByLabel('Confirm password').fill('Lunch2026');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.context().clearCookies();

  await login(page, 'ADMIN');
  await page.getByLabel('Search users').fill(email);
  await page.getByLabel('Role for Role Change Target').selectOption('STAFF');
  await page.getByRole('dialog').getByRole('button', { name: 'Confirm' }).click();
  await expect(page.getByText(/Role updated/)).toBeVisible();
  await expect(page.getByLabel('Role for Role Change Target')).toHaveValue('STAFF');
});

test('TC-UI-14 CSV export downloads orders_*.csv', async ({ page }) => {
  await login(page, 'MANAGER');
  await page.goto('/manager/exports');
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download CSV' }).first().click()]);
  expect(download.suggestedFilename()).toMatch(/^orders_.*\.csv$/);
});

test('EC-04-UI2 a new employee sees the empty history state', async ({ page }) => {
  await signupEmployee(page);
  await page.goto('/orders');
  await expect(page.getByText('No orders yet')).toBeVisible();
  await page.getByRole('link', { name: /Go to menu/ }).click();
  await expect(page).toHaveURL(/\/menu$/);
});

test('EC-04-UI3 unknown pages show the 404 page', async ({ page }) => {
  await page.goto('/this/does/not/exist');
  await expect(page.getByText("We couldn't find that page")).toBeVisible();
});

test('TC-UI-16 visual check screenshots (compare with docs/design manually)', async ({ page }, info) => {
  await login(page, 'MANAGER');
  await page.goto('/manager/dashboard');
  await page.screenshot({ path: info.outputPath('S10-dashboard.png'), fullPage: true });
  await page.context().clearCookies();
  await signupEmployee(page);
  await page.getByRole('tab', { name: 'Tomorrow' }).click();
  await page.screenshot({ path: info.outputPath('S3-menu.png'), fullPage: true });
});
