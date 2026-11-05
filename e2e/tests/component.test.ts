import { test, expect } from '@playwright/test';

/**
 * 组件契约（在真实场景上验证）—— A13。
 *
 * 原文件访问 `/component-demo`，但 playground 从来没有这个路由（它也没有 router 依赖），
 * 4 条断言从未通过。这里改为在真实场景上验证同样的四件事：
 * 组件挂载、事件绑定、列表子节点渲染、列表更新。
 */
test.describe('组件契约', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('场景组件能被挂载并渲染自身结构', async ({ page }) => {
    await page.click('button[data-scenario="counter"]');
    await expect(page.locator('.counter')).toBeVisible();
    await expect(page.locator('.counter h2')).toHaveText('计数器场景');
  });

  test('组件事件绑定生效', async ({ page }) => {
    await page.click('button[data-scenario="counter"]');
    await page.click('#btn-increment');
    await expect(page.locator('.count-display')).toHaveText('1');
  });

  test('列表子节点按数据渲染', async ({ page }) => {
    await page.click('button[data-scenario="todo"]');
    await page.fill('#todo-input', '第一项');
    await page.click('#btn-add-todo');
    await page.fill('#todo-input', '第二项');
    await page.click('#btn-add-todo');
    await expect(page.locator('.todo-item')).toHaveCount(2);
    await expect(page.locator('.todo-item').first()).toContainText('第一项');
  });

  test('列表更新（删除）后只保留剩余项', async ({ page }) => {
    await page.click('button[data-scenario="todo"]');
    await page.fill('#todo-input', '保留');
    await page.click('#btn-add-todo');
    await page.fill('#todo-input', '删除');
    await page.click('#btn-add-todo');
    await page.locator('.todo-item').nth(1).locator('.btn-delete').click();
    await expect(page.locator('.todo-item')).toHaveCount(1);
    await expect(page.locator('.todo-item')).toContainText('保留');
  });
});
