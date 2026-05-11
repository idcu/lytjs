import { test, expect } from '@playwright/test';

test.describe('CRUD 列表场景 E2E 测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('button[data-scenario="crud-list"]');
  });

  test('添加项目', async ({ page }) => {
    const input = page.locator('#item-name');
    const btnAdd = page.locator('#btn-add-item');
    const list = page.locator('#item-list');

    await input.fill('测试项目');
    await btnAdd.click();
    await expect(list.locator('.list-item')).toHaveCount(1);
    await expect(list.locator('.item-name')).toContainText('测试项目');
  });

  test('编辑项目', async ({ page }) => {
    const input = page.locator('#item-name');
    const btnAdd = page.locator('#btn-add-item');
    const list = page.locator('#item-list');

    await input.fill('原始项目');
    await btnAdd.click();
    
    await list.locator('.btn-edit').click();
    await page.locator('#edit-item-name').fill('编辑后的项目');
    await page.locator('#btn-save-edit').click();
    
    await expect(list.locator('.item-name')).toContainText('编辑后的项目');
  });

  test('删除项目', async ({ page }) => {
    const input = page.locator('#item-name');
    const btnAdd = page.locator('#btn-add-item');
    const list = page.locator('#item-list');

    await input.fill('要删除的项目');
    await btnAdd.click();
    await expect(list.locator('.list-item')).toHaveCount(1);
    
    await list.locator('.btn-delete').click();
    await expect(list.locator('.list-item')).toHaveCount(0);
  });
});
