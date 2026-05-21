import { test, expect } from '@playwright/test';

test.describe('Store', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/store-demo');
  });

  test('should display initial store state', async ({ page }) => {
    await expect(page.locator('.count')).toHaveText('0');
  });

  test('should increment count', async ({ page }) => {
    await page.click('button.increment');
    await expect(page.locator('.count')).toHaveText('1');

    await page.click('button.increment');
    await expect(page.locator('.count')).toHaveText('2');
  });

  test('should decrement count', async ({ page }) => {
    await page.click('button.increment');
    await page.click('button.increment');
    await page.click('button.decrement');
    await expect(page.locator('.count')).toHaveText('1');
  });

  test('should reset count', async ({ page }) => {
    await page.click('button.increment');
    await page.click('button.reset');
    await expect(page.locator('.count')).toHaveText('0');
  });

  test('should display computed value', async ({ page }) => {
    await page.click('button.increment');
    await page.click('button.increment');
    await expect(page.locator('.double-count')).toHaveText('4');
  });
});
