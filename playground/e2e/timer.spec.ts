import { test, expect } from '@playwright/test';

test.describe('计时器场景 E2E 测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('button[data-scenario="timer"]');
  });

  test('计时器初始值为 00:00', async ({ page }) => {
    const display = page.locator('#timer-display');
    await expect(display).toHaveText('00:00');
  });

  test('开始和停止计时器', async ({ page }) => {
    const startBtn = page.locator('#btn-start-timer');
    const stopBtn = page.locator('#btn-stop-timer');
    const display = page.locator('#timer-display');
    
    await startBtn.click();
    await page.waitForTimeout(2000);
    await stopBtn.click();
    
    const time = await display.textContent();
    expect(time).not.toBe('00:00');
  });

  test('重置计时器', async ({ page }) => {
    const startBtn = page.locator('#btn-start-timer');
    const stopBtn = page.locator('#btn-stop-timer');
    const resetBtn = page.locator('#btn-reset-timer');
    const display = page.locator('#timer-display');
    
    await startBtn.click();
    await page.waitForTimeout(1500);
    await stopBtn.click();
    await resetBtn.click();
    
    await expect(display).toHaveText('00:00');
  });
});
