import { test, expect } from '@playwright/test';

/**
 * 场景切换（SPA 导航语义）—— A13。
 *
 * 原文件访问 `/router-demo`，但 playground 没有 router 依赖、也没有该路由，
 * 4 条断言从未通过。这里改为验证真实存在的「导航」：场景按钮切换视图、
 * 旧视图被卸载、当前项高亮。这正是路由在单页应用里最核心的三件事。
 */
test.describe('场景切换（导航）', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('默认进入首页提示', async ({ page }) => {
    await expect(page.locator('#app')).toContainText('请选择一个测试场景');
  });

  test('点击导航进入对应场景', async ({ page }) => {
    await page.click('button[data-scenario="counter"]');
    await expect(page.locator('.counter')).toBeVisible();
    await expect(page.locator('.counter h2')).toHaveText('计数器场景');
  });

  test('切换场景会卸载上一个视图', async ({ page }) => {
    await page.click('button[data-scenario="counter"]');
    await expect(page.locator('.counter')).toBeVisible();
    await page.click('button[data-scenario="todo"]');
    await expect(page.locator('.todo')).toBeVisible();
    await expect(page.locator('.counter')).toHaveCount(0);
  });

  test('当前场景的导航按钮高亮', async ({ page }) => {
    await page.click('button[data-scenario="color-picker"]');
    await expect(page.locator('button[data-scenario="color-picker"]')).toHaveCSS(
      'background-color',
      'rgb(0, 123, 255)',
    );
    await expect(page.locator('button[data-scenario="counter"]')).toHaveCSS(
      'background-color',
      'rgb(240, 240, 240)',
    );
  });
});
