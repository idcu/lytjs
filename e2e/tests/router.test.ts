/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-console, @typescript-eslint/no-require-imports */
import { test, expect } from '@playwright/test';

test.describe('Router', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should navigate to home page', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Home');
  });

  test('should navigate to about page', async ({ page }) => {
    await page.click('a[href="/about"]');
    await expect(page).toHaveURL(/.*about/);
    await expect(page.locator('h1')).toContainText('About');
  });

  test('should handle browser back/forward', async ({ page }) => {
    await page.click('a[href="/about"]');
    await expect(page).toHaveURL(/.*about/);

    await page.goBack();
    await expect(page).toHaveURL('/');

    await page.goForward();
    await expect(page).toHaveURL(/.*about/);
  });

  test('should handle nested routes', async ({ page }) => {
    await page.click('a[href="/users"]');
    await expect(page).toHaveURL(/.*users/);

    await page.click('a[href="/users/1"]');
    await expect(page).toHaveURL(/.*users\/1/);
    await expect(page.locator('.user-detail')).toBeVisible();
  });
});
