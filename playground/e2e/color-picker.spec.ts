 
import { test, expect } from '@playwright/test';

test.describe('颜色选择器场景 E2E 测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('button[data-scenario="color-picker"]');
  });

  test('默认颜色显示', async ({ page }) => {
    const display = page.locator('#color-display');
    await expect(display).toContainText('#007bff');
  });

  test('选择颜色', async ({ page }) => {
    const colorButton = page.locator('button[data-color="#28a745"]');
    const display = page.locator('#color-display');

    await colorButton.click();
    await expect(display).toContainText('#28a745');
  });

  test('颜色选项存在', async ({ page }) => {
    const options = page.locator('#color-options .color-option');
    await expect(options).toHaveCount(8);
  });
});
