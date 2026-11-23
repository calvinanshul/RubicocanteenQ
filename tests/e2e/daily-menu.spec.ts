import { expect, test } from '@playwright/test';
import { E2E_FIXTURES } from './fixtures';
import { login } from './helpers';

// TC-UI-05 (daily-menu part) · US-07 AC1/AC2
test.describe('Daily menu editor', () => {
  test('manager publishes tomorrow; a quantity below already-ordered is refused', async ({ page }) => {
    const { name, ordered } = E2E_FIXTURES.orderedDish;
    await login(page, 'MANAGER');
    await page.getByRole('navigation', { name: 'Console' }).getByRole('link', { name: 'Daily Menu Editor' }).click();
    await expect(page.getByText('Tomorrow', { exact: true })).toBeVisible();

    const curry = page.getByLabel(`Portions for ${name}`);
    await expect(curry).toHaveValue('30');
    await curry.fill('20');
    await page.getByRole('button', { name: 'Save menu' }).click();
    await expect(page.getByText(`Can't be lower than already ordered (${ordered})`)).toBeVisible();
    await expect(page.getByText('1 problem to fix before saving')).toBeVisible();

    await curry.fill('35');
    const chaas = page.getByLabel('Portions for Masala Chaas');
    await chaas.fill('120');
    await page.getByRole('button', { name: 'Save menu' }).click();
    await expect(page.getByText(/Menu saved for/)).toBeVisible();

    await page.reload();
    await expect(page.getByLabel(`Portions for ${name}`)).toHaveValue('35');
    await expect(page.getByLabel('Portions for Masala Chaas')).toHaveValue('120');
  });

  test('past dates are read-only', async ({ page }) => {
    await login(page, 'MANAGER');
    await page.goto('/manager/daily-menu?date=2020-01-06');
    await expect(page.getByText('This date is in the past.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save menu' })).toBeDisabled();
  });
});
