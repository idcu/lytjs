import { test, expect } from '@playwright/test';

test.describe('购物车场景 E2E 测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('button[data-scenario="shopping-cart"]');
  });

  test('添加商品到购物车', async ({ page }) => {
    const addBtn = page.locator('button[data-product-id="1"]');
    const cartList = page.locator('#cart-list');

    await addBtn.click();
    await expect(cartList.locator('.cart-item')).toHaveCount(1);
    await expect(cartList).toContainText('产品 A');
  });

  test('计算购物车总价', async ({ page }) => {
    const addBtn1 = page.locator('button[data-product-id="1"]');
    const addBtn2 = page.locator('button[data-product-id="2"]');
    const total = page.locator('#cart-total');

    await addBtn1.click();
    await addBtn2.click();
    await expect(total).toContainText('¥300');
  });

  test('从购物车删除商品', async ({ page }) => {
    const addBtn = page.locator('button[data-product-id="1"]');
    const cartList = page.locator('#cart-list');

    await addBtn.click();
    await expect(cartList.locator('.cart-item')).toHaveCount(1);

    await cartList.locator('.btn-remove-from-cart').click();
    await expect(cartList.locator('.cart-item')).toHaveCount(0);
  });
});
