/**
 * AC X-1 (mobile): the golden path with the employee on a phone (Pixel 5), staff on a tablet (1024 px).
 * Runs in the `mobile` project only; the desktop golden path is in counter.spec.ts. This story runs on TOMORROW's
 * date (via the test clock) so its hand-over doesn't change today's dashboard count, which counter.spec.ts checks.
 */
import { devices, expect, test, type Browser, type Page } from '@playwright/test';
import { MENU_FIXTURES } from '../fixtures';
import { clockAtDay, expectNoHorizontalScroll, login, signupEmployee } from '../helpers';
import { sprintActive } from '../sprintGate';

test.skip(!sprintActive(3), 'Sprint 03 not started');

async function page(browser: Browser, time: string, kind: 'phone' | 'tablet'): Promise<Page> {
  const opts = kind === 'phone' ? devices['Pixel 5'] : { viewport: { width: 1024, height: 900 } };
  return (await browser.newContext({ ...opts, extraHTTPHeaders: { 'x-test-now': clockAtDay(1, time) } })).newPage();
}

test('TC-UI-06 (mobile) phone order → tablet start/ready/scan/hand over → phone shows Collected', async ({ browser }, info) => {
  test.skip(info.project.name !== 'mobile', 'mobile project only');

  const phone = await page(browser, '10:05', 'phone');
  await signupEmployee(phone, 'Phone Golden');
  await phone.getByRole('tab', { name: 'Today' }).click();
  await phone.getByRole('article', { name: MENU_FIXTURES.orderable }).getByRole('button', { name: 'Add' }).click();
  await phone.getByRole('button', { name: /Checkout/ }).click();
  await phone.getByRole('radio', { name: /^13:15/ }).click();
  await expectNoHorizontalScroll(phone);
  await phone.getByRole('button', { name: /^Place order/ }).click();
  const code = (await phone.getByTestId('pickup-code').innerText()).trim();
  await expect(phone.getByRole('img', { name: 'Pickup QR code' })).toBeVisible();

  const tablet = await page(browser, '13:10', 'tablet');
  await login(tablet, 'STAFF');
  const ticket = tablet.getByRole('article', { name: `Order ${code}` });
  await ticket.getByRole('button', { name: 'Start preparing' }).click();
  await ticket.getByRole('button', { name: 'Mark ready' }).click();
  await expect(ticket.getByText('Ready')).toBeVisible();

  await phone.reload();
  await expect(phone.getByText('Your lunch is ready!')).toBeVisible();

  await tablet.goto('/staff/scan');
  await tablet.getByLabel('Pickup code').fill(code);
  await tablet.getByRole('button', { name: 'Find' }).click();
  await tablet.getByRole('button', { name: /hand over/i }).click();
  await expect(tablet.getByText('Handed over')).toBeVisible();

  await phone.reload();
  await expect(phone.getByText('Collected').first()).toBeVisible();
  await expect(phone.getByRole('img', { name: 'Pickup QR code' })).toHaveCount(0);
});

test('EC-03-UI1b staff scan page fits a phone and shows the camera fallback', async ({ browser }, info) => {
  test.skip(info.project.name !== 'mobile', 'mobile project only');
  const phone = await page(browser, '13:00', 'phone');
  await login(phone, 'STAFF');
  await phone.goto('/staff/scan');
  await expect(phone.getByLabel('Pickup code')).toBeVisible();
  await expectNoHorizontalScroll(phone);
  for (const b of await phone.locator('button:visible').all()) {
    expect((await b.boundingBox())?.height ?? 0, await b.innerText()).toBeGreaterThanOrEqual(44);
  }
});
