import { test, expect } from '@playwright/test';

/**
 * 管理面板主路径（以 CRUD 列表场景为载体）—— A13。
 *
 * 原文件访问 `/admin-dashboard`，该路由从未存在，9 条断言全部无法执行。
 * 这里用真实存在的 CRUD 场景覆盖同一组「管理面板」主路径：
 * 空态、必填校验、新增、计数、编辑入口、保存、删除、清空、输入框复位。
 */
test.describe('管理面板主路径（CRUD）', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('button[data-scenario="crud-list"]');
  });

  test('初始为空列表', async ({ page }) => {
    await expect(page.locator('#item-list .list-item')).toHaveCount(0);
  });

  test('空名称不会新增', async ({ page }) => {
    await page.click('#btn-add-item');
    await expect(page.locator('#item-list .list-item')).toHaveCount(0);
  });

  test('新增一项', async ({ page }) => {
    await page.fill('#item-name', '甲');
    await page.click('#btn-add-item');
    await expect(page.locator('#item-list .list-item')).toHaveCount(1);
  });

  test('连续新增三项', async ({ page }) => {
    for (const name of ['甲', '乙', '丙']) {
      await page.fill('#item-name', name);
      await page.click('#btn-add-item');
    }
    await expect(page.locator('#item-list .list-item')).toHaveCount(3);
  });

  test('点击编辑打开编辑框', async ({ page }) => {
    await page.fill('#item-name', '甲');
    await page.click('#btn-add-item');
    await page.locator('#item-list .btn-edit').click();
    await expect(page.locator('#edit-item-name')).toBeVisible();
  });

  test('保存编辑后显示新名称', async ({ page }) => {
    await page.fill('#item-name', '甲');
    await page.click('#btn-add-item');
    await page.locator('#item-list .btn-edit').click();
    await page.fill('#edit-item-name', '甲改');
    await page.click('#btn-save-edit');
    await expect(page.locator('#item-list .item-name')).toHaveText('甲改');
  });

  test('删除单项', async ({ page }) => {
    await page.fill('#item-name', '甲');
    await page.click('#btn-add-item');
    await page.locator('#item-list .btn-delete').click();
    await expect(page.locator('#item-list .list-item')).toHaveCount(0);
  });

  test('清空全部', async ({ page }) => {
    for (const name of ['甲', '乙']) {
      await page.fill('#item-name', name);
      await page.click('#btn-add-item');
    }
    while ((await page.locator('#item-list .btn-delete').count()) > 0) {
      await page.locator('#item-list .btn-delete').first().click();
    }
    await expect(page.locator('#item-list .list-item')).toHaveCount(0);
  });

  test('新增后输入框复位', async ({ page }) => {
    await page.fill('#item-name', '甲');
    await page.click('#btn-add-item');
    await expect(page.locator('#item-name')).toHaveValue('');
  });
});
