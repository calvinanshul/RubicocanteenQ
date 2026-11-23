/**
 * Sprint 05 AC 05-0 — pre-migration safety net.
 *
 * These cover the seven flows found untested on 2026-11-23. They are written against the current
 * Express + Vite app and must keep passing unchanged after the Next.js migration, so they are the
 * contract the migration is checked against. Nothing here asserts new behaviour.
 *
 * Isolation notes (the suite runs files in parallel, `fullyParallel: false`, 2 workers):
 * - The settings script never *saves* the domain list: auth.spec asserts the exact sign-up domain
 *   message, and a saved extra domain would make it flaky. Add / remove / discard only.
 * - The holiday script uses a date 120 days out (no other script goes past today + 3) and removes it.
 * - The catalogue script creates its own dish instead of editing a seeded one.
 */
import { expect, test, type Page } from '@playwright/test';
import { MENU_FIXTURES } from '../fixtures';
import { clockAtDay, login, signupEmployee } from '../helpers';
import { sprintActive } from '../sprintGate';

test.skip(!sprintActive(4), 'Sprint 04 not started');

/** Place an order on tomorrow's menu and return the pass URL and backup code. */
async function orderTomorrow(page: Page, slot: string): Promise<{ url: string; code: string }> {
  await page.goto('/menu');
  await page.getByRole('tab', { name: 'Tomorrow' }).click();
  const dish = page.getByRole('article', { name: MENU_FIXTURES.orderable });
  await expect(dish).toBeVisible();
  await dish.getByRole('button', { name: 'Add' }).click();
  await page
    .getByRole('button', { name: /Checkout|Choose pickup slot/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/menu\/checkout/);
  await page.getByRole('radio', { name: new RegExp(`^${slot}`) }).click();
  await page.getByRole('button', { name: /^Place order/ }).click();
  await expect(page).toHaveURL(/\/orders\/\d+/);
  const code = (await page.getByTestId('pickup-code').innerText()).trim();
  return { url: new URL(page.url()).pathname, code };
}

test('EC-04-UI14 the profile page shows the account details and logs out', async ({ page }) => {
  const email = await signupEmployee(page, 'Profile Check');
  await page.goto('/profile');

  // Scoped to main: the shell header shows the name too
  const main = page.getByRole('main');
  await expect(main.getByRole('heading', { name: 'Profile' })).toBeVisible();
  await expect(main.getByText('Profile Check')).toBeVisible();
  await expect(main.getByText('employee', { exact: true })).toBeVisible();
  // A fresh sign-up has no employee ID or department yet; the admin fills those in (EC-04-UI17)
  const details = page.getByRole('definition');
  await expect(details.filter({ hasText: email })).toBeVisible();
  await expect(details.filter({ hasText: '—' })).toHaveCount(2);

  // The card's own button, not the one in the shell header
  await main.getByRole('button', { name: 'Log out' }).click();
  await expect(page).toHaveURL(/\/login$/);
  // US-02 AC5: the session is gone, so a protected page bounces back to login
  await page.goto('/orders');
  await expect(page).toHaveURL(/\/login\?next=%2Forders$/);
});

test('EC-04-UI15 my orders shows the active pass and the history row', async ({ page }) => {
  await signupEmployee(page, 'History Check');
  const { url, code } = await orderTomorrow(page, '13:30');

  await page.goto('/orders');
  await expect(page.getByRole('heading', { name: 'My orders' })).toBeVisible();

  const active = page.getByRole('region', { name: 'Active order' });
  await expect(active.getByRole('link', { name: `Active order ${code}, open pass` })).toBeVisible();

  await expect(page.getByText('On statement')).toBeVisible();
  await expect(page.getByText(/^Orders in /)).toBeVisible();

  const history = page.getByRole('region', { name: 'Order history' });
  await expect(history.getByRole('heading', { name: 'History' })).toBeVisible();
  // Scoped to the desktop table: the phone card list is `md:hidden` but still in the DOM
  const table = history.getByRole('table');
  await expect(table.getByText(`1 × ${MENU_FIXTURES.orderable}`)).toBeVisible();
  await expect(page.getByText('Showing 1 of 1')).toBeVisible();

  // Reached from history, not from checkout: the pass has no "Order confirmed" tick (that needs ?new=1)
  await table.getByRole('link').first().click();
  await expect(page).toHaveURL(new RegExp(`${url}$`));
  const id = url.split('/').pop();
  await expect(page.getByRole('heading', { name: `Order #${id}` })).toBeVisible();
  await expect(page.getByTestId('success-check')).toHaveCount(0);
  await expect(page.getByTestId('pickup-code')).toHaveText(code);
});

test('EC-04-UI16 an admin disables a user, login is refused, then re-enables them', async ({ page }) => {
  const name = 'Disable Target';
  const email = await signupEmployee(page, name);
  await page.context().clearCookies();

  await login(page, 'ADMIN');
  await page.getByLabel('Search users').fill(email);
  await page.getByRole('switch', { name: `Active: ${name}` }).click();
  const confirm = page.getByRole('dialog');
  await expect(confirm.getByRole('heading', { name: 'Disable account?' })).toBeVisible();
  await expect(confirm).toContainText('will be logged out');
  await confirm.getByRole('button', { name: 'Confirm' }).click();
  await expect(page.getByText(`${name} is disabled and can no longer log in.`)).toBeVisible();

  await page.context().clearCookies();
  await page.goto('/login');
  await page.getByLabel('Work email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('Lunch2026');
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page.getByText('Your account is disabled. Contact the admin.')).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);

  await page.context().clearCookies();
  await login(page, 'ADMIN');
  await page.getByLabel('Search users').fill(email);
  await page.getByRole('switch', { name: `Active: ${name}` }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirm' }).click();
  await expect(page.getByText(`${name} can log in again.`)).toBeVisible();

  await page.context().clearCookies();
  await page.goto('/login');
  await page.getByLabel('Work email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('Lunch2026');
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page).toHaveURL(/\/menu$/);
});

test('EC-04-UI17 an admin edits a user employee ID and department', async ({ page }) => {
  const name = 'Details Target';
  const email = await signupEmployee(page, name);
  await page.context().clearCookies();

  await login(page, 'ADMIN');
  await page.getByLabel('Search users').fill(email);
  const row = page.getByRole('row', { name: new RegExp(email) });
  await expect(row).toContainText('—');

  await page.getByRole('button', { name: `Edit details for ${name}` }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: `Edit ${name}` })).toBeVisible();
  await dialog.getByLabel('Employee ID').fill('EMP-8921');
  await dialog.getByLabel('Department').fill('Platform');
  await dialog.getByRole('button', { name: 'Save' }).click();

  await expect(page.getByText(`Details saved for ${name}`)).toBeVisible();
  await expect(row).toContainText('EMP-8921');
  await expect(row).toContainText('Platform');

  // The employee sees them on their own profile
  await page.context().clearCookies();
  await page.goto('/login');
  await page.getByLabel('Work email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('Lunch2026');
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page).toHaveURL(/\/menu$/); // let the session land before leaving the page
  await page.goto('/profile');
  const main = page.getByRole('main');
  await expect(main.getByText('EMP-8921')).toBeVisible();
  await expect(main.getByText('Platform')).toBeVisible();
});

test('EC-04-UI18 settings domains: add, remove, validation and discard (never saved)', async ({ page }) => {
  await login(page, 'ADMIN');
  await page.goto('/admin/settings');
  const domains = page.getByRole('list', { name: 'Allowed domains' });
  await expect(domains.getByText('@rubicotech.com')).toBeVisible();
  await expect(page.getByText('No unsaved changes')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Discard' })).toBeDisabled();

  // Validation: not a domain
  await page.getByLabel('Add a domain').fill('nope');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByText('Enter a valid domain, like rubicotech.com')).toBeVisible();
  await expect(page.getByText('No unsaved changes')).toBeVisible();

  // Add a valid one, then take it off again
  const added = `e2e-${Date.now().toString(36)}.example`;
  await page.getByLabel('Add a domain').fill(added);
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(domains.getByText(`@${added}`)).toBeVisible();
  await expect(page.getByText('1 unsaved change')).toBeVisible();
  await page.getByRole('button', { name: `Remove ${added}` }).click();
  await expect(domains.getByText(`@${added}`)).toHaveCount(0);
  await expect(page.getByText('No unsaved changes')).toBeVisible();

  // Discard puts a removed domain back
  await page.getByRole('button', { name: 'Remove rubicotech.com' }).click();
  await expect(domains.getByText('@rubicotech.com')).toHaveCount(0);
  await expect(page.getByText('1 unsaved change')).toBeVisible();
  await page.getByRole('button', { name: 'Discard' }).click();
  await expect(domains.getByText('@rubicotech.com')).toBeVisible();
  await expect(page.getByText('No unsaved changes')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save settings' })).toBeDisabled();
});

test('EC-04-UI19 settings holidays: add one and remove it', async ({ page }) => {
  const date = clockAtDay(120, '00:00').slice(0, 10);
  const reason = `E2E Holiday ${Date.now().toString(36)}`;

  await login(page, 'ADMIN');
  await page.goto('/admin/settings');
  await page.getByLabel('Holiday date').fill(date);
  await page.getByLabel('Reason').fill(reason);
  await page.getByRole('button', { name: 'Add holiday' }).click();

  await expect(page.getByText(/is now a holiday/)).toBeVisible();
  const entry = page.locator('li').filter({ hasText: reason });
  await expect(entry).toBeVisible();

  // Saved straight away, so it survives a reload
  await page.reload();
  await expect(page.locator('li').filter({ hasText: reason })).toBeVisible();

  await page.locator('li').filter({ hasText: reason }).getByRole('button').click();
  await expect(page.getByText('Holiday removed')).toBeVisible();
  await expect(page.locator('li').filter({ hasText: reason })).toHaveCount(0);
});

test('EC-04-UI20 the catalogue edits, archives and restores a dish', async ({ page }) => {
  const dish = `E2E Cover ${Date.now().toString(36)}`;
  await login(page, 'MANAGER');
  await page.goto('/manager/menu-items');

  await page.getByRole('button', { name: 'Add item' }).click();
  const add = page.getByRole('dialog');
  await add.getByLabel('Dish name').fill(dish);
  await add.getByLabel('Category').selectOption('LIGHT');
  await add.getByLabel('Price (₹)').fill('60');
  await add.getByRole('radio', { name: 'Veg', exact: true }).check();
  await add.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText(`${dish} added to the catalogue`)).toBeVisible();

  await page.getByLabel('Search dishes').fill(dish);
  const row = page.getByRole('row', { name: new RegExp(dish) });
  await expect(row).toContainText('Active');

  // Edit: change the price
  await row.getByRole('button', { name: 'Edit' }).click();
  const edit = page.getByRole('dialog');
  await expect(edit.getByRole('heading', { name: 'Edit menu item' })).toBeVisible();
  await expect(edit.getByLabel('Price (₹)')).toHaveValue('60');
  await edit.getByLabel('Price (₹)').fill('65');
  await edit.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText(`${dish} saved`)).toBeVisible();
  await row.getByRole('button', { name: 'Edit' }).click();
  await expect(page.getByRole('dialog').getByLabel('Price (₹)')).toHaveValue('65');
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();

  // Archive: the dish drops off the active list
  await row.getByRole('button', { name: 'Edit' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Archive item' }).click();
  await expect(page.getByText(`${dish} archived`)).toBeVisible();
  await expect(page.getByRole('row', { name: new RegExp(dish) })).toHaveCount(0);

  // Restore: visible again under "Show archived", then active
  await page.getByLabel('Show archived').check();
  await expect(row).toContainText('Archived');
  await row.getByRole('button', { name: 'Edit' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Restore item' }).click();
  await expect(page.getByText(`${dish} restored`)).toBeVisible();
  await expect(row).toContainText('Active');
});

/**
 * DEFECT PINNED HERE (BUG-05-001, reported with this sprint, fix deliberately not in this safety net):
 * `RequireRole` puts the wanted path on the login URL as `?next=`, and `LoginPage` has code to follow
 * it, but `/login` sits inside `PublicOnly`, which redirects to the role home the moment the session
 * lands — so `navigate(next)` never wins and `?next=` is never honoured, for any role or path.
 *
 * This script asserts what the app does today (next is carried, then ignored), so the Next.js
 * migration cannot quietly change it in either direction. When BUG-05-001 is fixed, the two
 * "lands on the role home" assertions below become the role's own deep link instead.
 */
test('EC-04-UI21 a logged-out deep link carries ?next= into login (then lands on the role home)', async ({
  page,
}) => {
  // Same area as the role home (/admin/users → /admin/settings): still not followed
  await page.goto('/admin/settings');
  await expect(page).toHaveURL(/\/login\?next=%2Fadmin%2Fsettings$/);
  await page.getByLabel('Work email').fill('admin@rubicotech.com');
  await page.getByLabel('Password', { exact: true }).fill('Admin@2026');
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page).toHaveURL(/\/admin\/users$/);
  await expect(page.getByRole('heading', { name: 'Users & roles' })).toBeVisible();

  // Outside the role home's area (/menu → /orders): also not followed
  await page.context().clearCookies();
  const email = await signupEmployee(page, 'Deep Link');
  await page.context().clearCookies();

  await page.goto('/orders');
  await expect(page).toHaveURL(/\/login\?next=%2Forders$/);
  await page.getByLabel('Work email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('Lunch2026');
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page).toHaveURL(/\/menu$/);
});
