import { test, expect } from '@playwright/test';

test.describe('计数器场景 E2E 测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('button[data-scenario="counter"]');
  });

  test('计数器初始值为 0', async ({ page }) => {
    const countDisplay = page.locator('.count-display');
    await expect(countDisplay).toHaveText('0');
  });

  test('点击 + 按钮增加计数', async ({ page }) => {
    const countDisplay = page.locator('.count-display');
    const btnIncrement = page.locator('#btn-increment');

    await btnIncrement.click();
    await expect(countDisplay).toHaveText('1');

    await btnIncrement.click();
    await expect(countDisplay).toHaveText('2');
  });

  test('点击 - 按钮减少计数', async ({ page }) => {
    const countDisplay = page.locator('.count-display');
    const btnIncrement = page.locator('#btn-increment');
    const btnDecrement = page.locator('#btn-decrement');

    await btnIncrement.click();
    await btnIncrement.click();
    await btnIncrement.click();
    await expect(countDisplay).toHaveText('3');

    await btnDecrement.click();
    await expect(countDisplay).toHaveText('2');
  });

  test('点击重置按钮归零', async ({ page }) => {
    const countDisplay = page.locator('.count-display');
    const btnIncrement = page.locator('#btn-increment');
    const btnReset = page.locator('#btn-reset');

    await btnIncrement.click();
    await btnIncrement.click();
    await btnIncrement.click();
    await expect(countDisplay).toHaveText('3');

    await btnReset.click();
    await expect(countDisplay).toHaveText('0');
  });

  test('计数器可以处理负数', async ({ page }) => {
    const countDisplay = page.locator('.count-display');
    const btnDecrement = page.locator('#btn-decrement');

    await btnDecrement.click();
    await expect(countDisplay).toHaveText('-1');

    await btnDecrement.click();
    await expect(countDisplay).toHaveText('-2');
  });

  test('计数器可以处理快速点击', async ({ page }) => {
    const countDisplay = page.locator('.count-display');
    const btnIncrement = page.locator('#btn-increment');

    for (let i = 0; i < 10; i++) {
      await btnIncrement.click();
    }
    await expect(countDisplay).toHaveText('10');
  });

  test('所有按钮元素存在且可点击', async ({ page }) => {
    const btnDecrement = page.locator('#btn-decrement');
    const btnReset = page.locator('#btn-reset');
    const btnIncrement = page.locator('#btn-increment');

    await expect(btnDecrement).toBeVisible();
    await expect(btnReset).toBeVisible();
    await expect(btnIncrement).toBeVisible();

    await expect(btnDecrement).toBeEnabled();
    await expect(btnReset).toBeEnabled();
    await expect(btnIncrement).toBeEnabled();
  });
});
