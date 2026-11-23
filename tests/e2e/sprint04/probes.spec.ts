/**
 * Sprint 04 cycle-1 E2E probes.
 */
import { expect, test } from '@playwright/test';
import { login } from '../helpers';
import { sprintActive } from '../sprintGate';

test.skip(!sprintActive(4), 'Sprint 04 not started');

test('EC-04-UI9 admin downloads the monthly statement as statement_YYYY-MM.csv', async ({ page }) => {
  await login(page, 'ADMIN');
  await page.goto('/manager/exports');
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download CSV' }).nth(1).click()]);
  expect(download.suggestedFilename()).toMatch(/^statement_\d{4}-\d{2}\.csv$/);
  const path = await download.path();
  const { readFileSync } = await import('node:fs');
  expect(readFileSync(path, 'utf8').split(/\r?\n/)[0]).toBe('employee,employee_code,department,email,orders,total_inr');
});

test('TC-UI-03 (S04) new console pages show "Not authorised" to the wrong role', async ({ page }) => {
  await login(page, 'EMPLOYEE');
  const nav = page.getByRole('navigation', { name: 'Main' }).first();
  await expect(nav.getByRole('link', { name: 'Menu' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'My orders' })).toBeVisible();
  for (const path of ['/manager/menu-items', '/manager/exports', '/admin/users', '/admin/settings']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { name: 'Not authorised' }), path).toBeVisible();
  }
  await page.context().clearCookies();
  await login(page, 'MANAGER');
  for (const path of ['/admin/users', '/admin/settings']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { name: 'Not authorised' }), path).toBeVisible();
  }
});
