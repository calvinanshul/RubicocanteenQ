/** Sprint 02 mobile E2E (TC-UI-07, TC-UI-12). Runs in both projects; the layout checks matter on the phone. */
import { expect, test } from '@playwright/test';
import { MENU_FIXTURES } from '../fixtures';
import { expectNoHorizontalScroll, signupEmployee } from '../helpers';
import { sprintActive } from '../sprintGate';

test.skip(!sprintActive(2), 'Sprint 02 not started');

test('TC-UI-07 sold out, scarcity and the stepper limit', async ({ page }) => {
  await signupEmployee(page);
  await page.goto('/menu');
  await page.getByRole('tab', { name: 'Tomorrow' }).click();

  const soldOut = page.getByRole('article', { name: MENU_FIXTURES.soldOut });
  await expect(soldOut.getByText('Sold out')).toBeVisible();
  await expect(soldOut.getByRole('button', { name: 'Unavailable' })).toBeDisabled();

  await expect(page.getByRole('article', { name: MENU_FIXTURES.scarce.name }).getByText(`Only ${MENU_FIXTURES.scarce.left} left`)).toBeVisible();

  const card = page.getByRole('article', { name: MENU_FIXTURES.orderable });
  await card.getByRole('button', { name: 'Add' }).click();
  const plus = card.getByRole('button', { name: `Increase ${MENU_FIXTURES.orderable}` });
  for (let i = 0; i < 4; i++) await plus.click();
  await expect(card.getByLabel(`Quantity of ${MENU_FIXTURES.orderable}`)).toHaveText('5');
  await expect(plus).toBeDisabled();
});

test('EC-02-UI3 the stepper never exceeds what is left', async ({ page }) => {
  await signupEmployee(page);
  await page.goto('/menu');
  await page.getByRole('tab', { name: 'Tomorrow' }).click();
  const card = page.getByRole('article', { name: MENU_FIXTURES.scarce.name });
  await card.getByRole('button', { name: 'Add' }).click();
  const plus = card.getByRole('button', { name: `Increase ${MENU_FIXTURES.scarce.name}` });
  for (let i = 0; i < 2; i++) await plus.click();
  await expect(card.getByLabel(`Quantity of ${MENU_FIXTURES.scarce.name}`)).toHaveText('3');
  await expect(plus).toBeDisabled();
});

test('TC-UI-12 menu and checkout fit a phone with 44 px targets', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await signupEmployee(page);
  await page.goto('/menu');
  await page.getByRole('tab', { name: 'Tomorrow' }).click();
  await expectNoHorizontalScroll(page);
  await page.getByRole('article', { name: MENU_FIXTURES.orderable }).getByRole('button', { name: 'Add' }).click();
  await page.getByRole('button', { name: /Checkout|Choose pickup slot/ }).first().click();
  await expect(page).toHaveURL(/\/menu\/checkout/);
  await expect(page.getByRole('button', { name: /Place order/ })).toBeVisible();
  await expectNoHorizontalScroll(page);
  for (const b of await page.locator('button:visible').all()) {
    expect((await b.boundingBox())?.height ?? 0, await b.innerText()).toBeGreaterThanOrEqual(44);
  }
});
