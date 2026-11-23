import { expect, test } from '@playwright/test';
import { ACCOUNTS } from './fixtures';
import { login } from './helpers';

// TC-UI-02: role landing and logout (US-02 AC1/AC5)
test.describe('Role landing (TC-UI-02)', () => {
  for (const role of Object.keys(ACCOUNTS) as (keyof typeof ACCOUNTS)[]) {
    test(`${role} lands on ${ACCOUNTS[role].home}, logs out, and Back shows login`, async ({ page }) => {
      await login(page, role);
      // A second in-app history entry, so Back after logout returns to a protected page
      await page.goto(ACCOUNTS[role].second);
      await page.getByRole('button', { name: 'Log out' }).first().click();
      await expect(page).toHaveURL(/\/login$/);
      await page.goBack();
      await expect(page).toHaveURL(/\/login/);
      await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    });
  }
});

// TC-UI-03: navigation by role (US-03 AC1/AC2)
test.describe('Navigation by role (TC-UI-03)', () => {
  test('an employee sees only Menu, My orders and Profile, and is refused manager pages', async ({ page }) => {
    await login(page, 'EMPLOYEE');
    // Desktop: Menu and My orders in the top bar, Profile on the avatar (UI spec §4)
    await expect(page.getByRole('link', { name: 'Menu', exact: true }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'My orders' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Profile' }).first()).toBeVisible();
    const hrefs = await page.locator('a[href]').evaluateAll((as) => as.map((a) => a.getAttribute('href') ?? ''));
    expect(hrefs.filter((h) => /^\/(manager|staff|admin)/.test(h))).toEqual([]);

    await page.goto('/manager/dashboard');
    await expect(page.getByRole('heading', { name: 'Not authorised' })).toBeVisible();
    await page.getByRole('link', { name: /Go to my menu/ }).click();
    await expect(page).toHaveURL(/\/menu$/);
  });

  test('a manager sees the manager console navigation, without settings', async ({ page }) => {
    await login(page, 'MANAGER');
    const nav = page.getByRole('navigation', { name: 'Console' });
    for (const label of ['Dashboard', 'Daily Menu Editor', 'Menu Catalogue', 'Exports']) {
      await expect(nav.getByRole('link', { name: label })).toBeVisible();
    }
    await expect(nav.getByRole('link', { name: 'Settings & Rules' })).toHaveCount(0);
    // The orders queue & prep section is staff-only
    await expect(nav.getByRole('link', { name: 'Orders Queue & Prep' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /View prep list/ })).toHaveCount(0);
    await page.goto('/admin/settings');
    await expect(page.getByRole('heading', { name: 'Not authorised' })).toBeVisible();
    for (const path of ['/staff/queue', '/staff/prep', '/staff/scan']) {
      await page.goto(path);
      await expect(page.getByRole('heading', { name: 'Not authorised' })).toBeVisible();
    }
  });

  test('an admin sees users and settings, and can open the dashboard', async ({ page }) => {
    await login(page, 'ADMIN');
    const nav = page.getByRole('navigation', { name: 'Console' });
    for (const label of ['Dashboard', 'Users & Roles', 'Settings & Rules', 'Exports']) {
      await expect(nav.getByRole('link', { name: label })).toBeVisible();
    }
    await nav.getByRole('link', { name: 'Dashboard' }).click();
    await expect(page).toHaveURL(/\/manager\/dashboard$/);
  });

  test('staff land on the counter queue with Queue / Scan / Prep list tabs', async ({ page }) => {
    await login(page, 'STAFF');
    const tabs = page.getByRole('navigation', { name: 'Counter' });
    for (const label of ['Queue', 'Scan', 'Prep list']) await expect(tabs.getByRole('link', { name: label })).toBeVisible();
  });

  test('a logged-out visitor is sent to login', async ({ page }) => {
    await page.goto('/manager/daily-menu');
    await expect(page).toHaveURL(/\/login/);
  });
});
