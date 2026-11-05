import { test, expect } from '@playwright/test';

/**
 * 状态生命周期（跨场景）—— A13。
 *
 * 原文件访问 `/store-demo`，但 playground 没有 store 依赖，5 条断言从未通过。
 * 这里改为验证真实存在的状态行为，其中**第一条刻意断言「切换场景会重置状态」**——
 * 这是当前实现的真实语义（每次切换都会重建 setup），必须被测试钉住，
 * 而不是靠口头约定。将来若实现状态保留，这条会红，届时再改断言。
 */
test.describe('状态生命周期', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('切换场景会重建组件状态（计数归零）', async ({ page }) => {
    await page.click('button[data-scenario="counter"]');
    await page.click('#btn-increment');
    await page.click('#btn-increment');
    await expect(page.locator('.count-display')).toHaveText('2');

    await page.click('button[data-scenario="todo"]');
    await page.click('button[data-scenario="counter"]');
    await expect(page.locator('.count-display')).toHaveText('0');
  });

  test('待办计数文本随列表变化', async ({ page }) => {
    await page.click('button[data-scenario="todo"]');
    await expect(page.locator('#todo-count')).toContainText('共 0 项');
    await page.fill('#todo-input', 'A');
    await page.click('#btn-add-todo');
    await expect(page.locator('#todo-count')).toContainText('共 1 项');
  });

  test('新增项在列表中保留自己的文本', async ({ page }) => {
    await page.click('button[data-scenario="crud-list"]');
    await page.fill('#item-name', '持久项');
    await page.click('#btn-add-item');
    await expect(page.locator('#item-list .item-name')).toHaveText('持久项');
  });

  test('编辑后列表显示新值', async ({ page }) => {
    await page.click('button[data-scenario="crud-list"]');
    await page.fill('#item-name', '旧值');
    await page.click('#btn-add-item');
    await page.locator('#item-list .btn-edit').click();
    await page.fill('#edit-item-name', '新值');
    await page.click('#btn-save-edit');
    await expect(page.locator('#item-list .item-name')).toHaveText('新值');
  });

  test('购物车总价随添加变化', async ({ page }) => {
    await page.click('button[data-scenario="shopping-cart"]');
    await page.click('button[data-product-id="1"]');
    await page.click('button[data-product-id="2"]');
    await expect(page.locator('#cart-total')).toContainText('¥300');
  });
});
