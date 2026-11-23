import { expect, test } from '@playwright/test';
import { expectNoHorizontalScroll, uniqueEmail } from './helpers';

// TC-UI-01: sign up and client validation (US-01 AC1/AC2/AC4, US-15 AC1)
test.describe('Sign up (TC-UI-01)', () => {
  test('client errors appear inline with no sign-up request', async ({ page }) => {
    const signupCalls: string[] = [];
    page.on('request', (r) => r.url().endsWith('/api/auth/signup') && signupCalls.push(r.method()));
    await page.goto('/signup');
    await expect(page.getByText('@rubicotech.com, @rubicotech.in').first()).toBeVisible();

    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByText('Name must be 2–80 characters')).toBeVisible();
    await expect(page.getByText('Email is required')).toBeVisible();

    await page.getByLabel('Full name').fill('Priya Sharma');
    await page.getByLabel('Work email').fill('priya@gmail.com');
    await page.getByLabel('Password', { exact: true }).fill('abc');
    await page.getByLabel('Confirm password').fill('abc');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByText('Use your company email (@rubicotech.com or @rubicotech.in)', { exact: true })).toBeVisible();
    await expect(page.getByText('Password must be 8–64 characters with at least one letter and one number')).toBeVisible();
    expect(signupCalls).toEqual([]);
    await expectNoHorizontalScroll(page);
  });

  test('a valid sign-up lands on the menu as an employee', async ({ page }) => {
    await page.goto('/signup');
    await page.getByLabel('Full name').fill('New Starter');
    await page.getByLabel('Work email').fill(uniqueEmail());
    await page.getByLabel('Password', { exact: true }).fill('Lunch2026');
    await page.getByLabel('Confirm password').fill('Lunch2026');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page).toHaveURL(/\/menu$/);
    await expect(page.getByRole('heading', { name: "Today's menu" })).toBeVisible();
  });

  test('a @rubicotech.in address can sign up too', async ({ page }) => {
    await page.goto('/signup');
    await page.getByLabel('Full name').fill('India Office');
    await page.getByLabel('Work email').fill(uniqueEmail().replace('@rubicotech.com', '@rubicotech.in'));
    await page.getByLabel('Password', { exact: true }).fill('Lunch2026');
    await page.getByLabel('Confirm password').fill('Lunch2026');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page).toHaveURL(/\/menu$/);
  });

  test('a duplicate email shows the server error on the field', async ({ page }) => {
    await page.goto('/signup');
    await page.getByLabel('Full name').fill('Priya Again');
    await page.getByLabel('Work email').fill('PRIYA@rubicotech.com');
    await page.getByLabel('Password', { exact: true }).fill('Lunch2026');
    await page.getByLabel('Confirm password').fill('Lunch2026');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByText('An account with this email already exists')).toBeVisible();
  });
});

test.describe('Log in', () => {
  test('wrong password shows a generic message', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Work email').fill('staff@rubicotech.com');
    await page.getByLabel('Password', { exact: true }).fill('NotIt2026');
    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(page.getByRole('main').getByRole('alert')).toContainText('Invalid email or password');
    await expectNoHorizontalScroll(page);
  });
});
