import { expect, test } from '@playwright/test';
import { expectNoHorizontalScroll, login } from './helpers';

// TC-UI-12 (Sprint 1 screens): no horizontal scroll, bottom nav visible, 44 px targets
test('employee shell fits the screen and keeps tap targets ≥ 44 px', async ({ page }) => {
  await login(page, 'EMPLOYEE');
  await expectNoHorizontalScroll(page);
  const nav = page.getByRole('navigation', { name: 'Main' }).filter({ visible: true }).first();
  await expect(nav).toBeVisible();
  for (const target of await page.locator('a:visible, button:visible').all()) {
    const box = await target.boundingBox();
    expect(box?.height ?? 0, await target.innerText()).toBeGreaterThanOrEqual(44);
  }
  await page.goto('/profile');
  await expect(page.getByRole('button', { name: 'Log out' }).last()).toBeVisible();
  await expectNoHorizontalScroll(page);
});
