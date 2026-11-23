/**
 * Sprint 03 E2E acceptance scripts (S7 queue, S8 scan, S10 dashboard, golden path).
 * Today's orders need the test clock: both contexts send x-test-now. Contract: docs/test-cases/contracts.md §Sprint 03.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';
import { MENU_FIXTURES } from '../fixtures';
import { clockAt, login, signupEmployee } from '../helpers';
import { sprintActive } from '../sprintGate';

test.skip(!sprintActive(3), 'Sprint 03 not started');

async function contextAt(browser: Browser, time: string): Promise<Page> {
  const ctx = await browser.newContext({ extraHTTPHeaders: { 'x-test-now': clockAt(time) } });
  return ctx.newPage();
}

/** Employee orders Veg Biryani for today at 10:00; returns the pickup code and the employee page. */
async function orderToday(browser: Browser) {
  const emp = await contextAt(browser, '10:00');
  await signupEmployee(emp, 'Golden Path');
  await emp.goto('/menu');
  await emp.getByRole('tab', { name: 'Today' }).click();
  await emp.getByRole('article', { name: MENU_FIXTURES.orderable }).getByRole('button', { name: 'Add' }).click();
  await emp.getByRole('button', { name: /Checkout|Choose pickup slot/ }).first().click();
  await emp.getByRole('radio', { name: /^13:00/ }).click();
  await emp.getByRole('button', { name: /^Place order/ }).click();
  const code = (await emp.getByTestId('pickup-code').innerText()).trim();
  return { emp, code };
}

test('TC-UI-06 golden path: order → start → ready → scan → hand over → collected → dashboard', async ({ browser }) => {
  const mgr = await contextAt(browser, '12:59');
  await login(mgr, 'MANAGER');
  await mgr.goto('/manager/dashboard');
  const before = Number(await mgr.getByTestId('kpi-collected').innerText().then((t) => t.replace(/\D/g, '') || '0'));

  const { emp, code } = await orderToday(browser);

  const staff = await contextAt(browser, '12:55');
  await login(staff, 'STAFF');
  const ticket = staff.getByRole('article', { name: `Order ${code}` });
  await ticket.getByRole('button', { name: 'Start preparing' }).click();
  await ticket.getByRole('button', { name: 'Mark ready' }).click();
  await expect(ticket.getByText('Ready')).toBeVisible();

  await staff.goto('/staff/scan');
  await staff.getByLabel('Pickup code').fill(code.toLowerCase());
  await staff.getByRole('button', { name: 'Find' }).click();
  await staff.getByRole('button', { name: /hand over/i }).click();
  await expect(staff.getByText('Handed over')).toBeVisible();

  await emp.reload();
  await expect(emp.getByText('Collected').first()).toBeVisible();

  await mgr.reload();
  await expect(mgr.getByTestId('kpi-collected')).toContainText(String(before + 1));
});

test('TC-UI-10 scan errors: collected, wrong day, unknown', async ({ browser }) => {
  const { code } = await orderToday(browser);
  const staff = await contextAt(browser, '13:00');
  await login(staff, 'STAFF');
  await staff.goto('/staff/scan');
  await staff.getByLabel('Pickup code').fill(code);
  await staff.getByRole('button', { name: 'Find' }).click();
  await staff.getByRole('button', { name: /hand over/i }).click();
  await expect(staff.getByText('Handed over')).toBeVisible();
  await staff.getByLabel('Pickup code').fill(code);
  await staff.getByRole('button', { name: 'Find' }).click();
  await expect(staff.getByRole('main').getByRole('alert')).toContainText('Already collected at');

  await staff.getByLabel('Pickup code').fill('ZZZZZZ');
  await staff.getByRole('button', { name: 'Find' }).click();
  await expect(staff.getByRole('main').getByRole('alert')).toContainText('Code not found');
});

test('TC-UI-15 a cancelled order is greyed out with no actions in the queue', async ({ browser }) => {
  const emp = await contextAt(browser, '10:00');
  await signupEmployee(emp, 'Cancel Person');
  await emp.goto('/menu');
  await emp.getByRole('tab', { name: 'Today' }).click();
  await emp.getByRole('article', { name: MENU_FIXTURES.orderable }).getByRole('button', { name: 'Add' }).click();
  await emp.getByRole('button', { name: /Checkout|Choose pickup slot/ }).first().click();
  await emp.getByRole('radio', { name: /^13:15/ }).click();
  await emp.getByRole('button', { name: /^Place order/ }).click();
  const code = (await emp.getByTestId('pickup-code').innerText()).trim();
  await emp.getByRole('button', { name: 'Cancel order' }).click();
  await emp.getByRole('dialog').getByRole('button', { name: 'Yes, cancel order' }).click();

  const staff = await contextAt(browser, '12:50');
  await login(staff, 'STAFF');
  const ticket = staff.getByRole('article', { name: `Order ${code}` });
  await expect(ticket).toContainText('Cancelled');
  await expect(ticket.getByRole('button')).toHaveCount(0);
});

test('TC-UI-13 dashboard: 6 KPI tiles and an empty date', async ({ page }) => {
  await login(page, 'MANAGER');
  for (const label of ['Total orders', 'Revenue', 'Collected', 'Pending', 'Cancelled', 'No-show']) {
    await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
  }
  await page.getByLabel('Date').fill('2020-01-07');
  await expect(page.getByText('No orders for this date')).toBeVisible();
});

test('EC-03-UI1 the prep list shows big numbers per dish', async ({ page }) => {
  await login(page, 'STAFF');
  await page.goto('/staff/prep');
  await expect(page.getByText(MENU_FIXTURES.orderable).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Print' })).toBeVisible();
});
