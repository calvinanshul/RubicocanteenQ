/**
 * Sprint 02 E2E acceptance scripts (S3 menu, S4 checkout, S5 pass). Selector contract:
 * docs/test-cases/contracts.md §Sprint 02.
 */
import { expect, test, type Page } from '@playwright/test';
import { MENU_FIXTURES } from '../fixtures';
import { clockAt, signupEmployee } from '../helpers';
import { sprintActive } from '../sprintGate';

test.skip(!sprintActive(2), 'Sprint 02 not started');

async function openTomorrow(page: Page) {
  await page.goto('/menu');
  await page.getByRole('tab', { name: 'Tomorrow' }).click();
  await expect(page.getByRole('article', { name: MENU_FIXTURES.orderable })).toBeVisible();
}

async function orderTomorrow(page: Page, slot = '13:00') {
  await openTomorrow(page);
  await page.getByRole('article', { name: MENU_FIXTURES.orderable }).getByRole('button', { name: 'Add' }).click();
  await page.getByRole('button', { name: /Checkout|Choose pickup slot/ }).first().click();
  await expect(page).toHaveURL(/\/menu\/checkout/);
  await page.getByRole('radio', { name: new RegExp(`^${slot}`) }).click();
  await page.getByRole('button', { name: /^Place order/ }).click();
  await expect(page).toHaveURL(/\/orders\/\d+/);
}

test.describe('Sprint 02 · order lunch', () => {
  test('TC-UI-06 (employee part) order → pass with a real QR and the backup code', async ({ page }) => {
    await signupEmployee(page);
    await orderTomorrow(page);
    await expect(page.getByRole('heading', { name: 'Order confirmed' })).toBeVisible();
    await expect(page.getByTestId('pickup-code')).toHaveText(/^[A-HJ-NP-Z2-9]{6}$/);
    const qr = page.getByRole('img', { name: 'Pickup QR code' });
    await expect(qr).toBeVisible();
    // Wait for the PNG to finish loading before measuring it (the element is visible before the image decodes)
    await expect.poll(() => qr.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThanOrEqual(180);
    await expect(page.getByText('Added to your monthly canteen statement').or(page.getByText(/monthly statement/i)).first()).toBeVisible();
    await expect(page.getByText(MENU_FIXTURES.orderable).first()).toBeVisible();
  });

  test('TC-UI-09 cancel before the cut-off returns the order to Cancelled', async ({ page }) => {
    await signupEmployee(page);
    await orderTomorrow(page, '13:15');
    await page.getByRole('button', { name: 'Cancel order' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('The items go back on the menu');
    await dialog.getByRole('button', { name: 'Yes, cancel order' }).click();
    await expect(page.getByText('Cancelled').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel order' })).toHaveCount(0);
  });

  test('TC-UI-11 HTML in a dish name is shown as text and never runs', async ({ page }) => {
    let dialogs = 0;
    page.on('dialog', async (d) => {
      dialogs += 1;
      await d.dismiss();
    });
    await signupEmployee(page);
    await openTomorrow(page);
    await expect(page.getByText(MENU_FIXTURES.htmlName, { exact: true })).toBeVisible();
    expect(dialogs).toBe(0);
  });

  test('EC-02-UI1 the place-order button stays disabled until a slot is chosen', async ({ page }) => {
    await signupEmployee(page);
    await openTomorrow(page);
    await page.getByRole('article', { name: MENU_FIXTURES.orderable }).getByRole('button', { name: 'Add' }).click();
    await page.getByRole('button', { name: /Checkout|Choose pickup slot/ }).first().click();
    await expect(page.getByRole('button', { name: /^Place order/ })).toBeDisabled();
  });

  test('EC-02-UI2 a second order the same day shows "You already have an order"', async ({ page }) => {
    await signupEmployee(page);
    await orderTomorrow(page);
    await openTomorrow(page);
    await expect(page.getByText(/You already have an order/)).toBeVisible();
  });
});

test.describe('Sprint 02 · after the cut-off (test clock)', () => {
  test.use({ extraHTTPHeaders: { 'x-test-now': clockAt('11:05') } });

  test('TC-UI-08 today shows the closed banner and offers Tomorrow; Cancel is hidden', async ({ page }) => {
    await signupEmployee(page);
    await page.goto('/menu');
    await expect(page.getByText('Ordering for today closed at 11:00')).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Tomorrow' })).toBeVisible();
  });
});
