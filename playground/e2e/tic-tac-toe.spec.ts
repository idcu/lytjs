/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-console, @typescript-eslint/no-require-imports */
import { test, expect } from '@playwright/test';

test.describe('井字棋场景 E2E 测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('button[data-scenario="tic-tac-toe"]');
  });

  test('初始状态显示', async ({ page }) => {
    const status = page.locator('#game-status');
    await expect(status).toContainText('下一位: X');
  });

  test('落子功能', async ({ page }) => {
    const square0 = page.locator('#square-0');
    await square0.click();
    await expect(square0).toHaveText('X');
  });

  test('游戏重置', async ({ page }) => {
    await page.locator('#square-0').click();
    await page.locator('#btn-reset-game').click();
    await expect(page.locator('#square-0')).toBeEmpty();
  });
});
