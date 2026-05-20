 
import { test, expect } from '@playwright/test';

test.describe('Markdown 编辑器场景 E2E 测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('button[data-scenario="markdown-editor"]');
  });

  test('初始内容显示', async ({ page }) => {
    const input = page.locator('#markdown-input');
    await expect(input).toContainText('Hello Lyt.js');
  });

  test('编辑 Markdown 内容', async ({ page }) => {
    const input = page.locator('#markdown-input');
    await input.fill('# 新标题\n\n这是新内容。');
    await expect(input).toContainText('新标题');
  });
});
