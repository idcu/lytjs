import { test, expect } from '@playwright/test';

test.describe('Counter Component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should render counter component', async ({ page }) => {
    await page.click('button[data-scenario="counter"]');
    await expect(page.locator('.counter')).toBeVisible();
    await expect(page.locator('.counter h2')).toContainText('计数器场景');
  });

  test('should display initial count as 0', async ({ page }) => {
    await page.click('button[data-scenario="counter"]');
    await expect(page.locator('.count-display')).toHaveText('0');
  });

  test('should increment count', async ({ page }) => {
    await page.click('button[data-scenario="counter"]');
    await page.click('#btn-increment');
    await expect(page.locator('.count-display')).toHaveText('1');
  });

  test('should decrement count', async ({ page }) => {
    await page.click('button[data-scenario="counter"]');
    await page.click('#btn-increment');
    await page.click('#btn-increment');
    await page.click('#btn-decrement');
    await expect(page.locator('.count-display')).toHaveText('1');
  });

  test('should reset count to 0', async ({ page }) => {
    await page.click('button[data-scenario="counter"]');
    await page.click('#btn-increment');
    await page.click('#btn-increment');
    await page.click('#btn-reset');
    await expect(page.locator('.count-display')).toHaveText('0');
  });
});

test.describe('Todo Component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('button[data-scenario="todo"]');
  });

  test('should add a todo item', async ({ page }) => {
    await page.fill('#todo-input', '测试待办项');
    await page.click('#btn-add-todo');
    await expect(page.locator('.todo-item')).toHaveCount(1);
    await expect(page.locator('.todo-item span')).toContainText('测试待办项');
  });

  test('should show correct count', async ({ page }) => {
    await page.fill('#todo-input', '待办 1');
    await page.click('#btn-add-todo');
    await page.fill('#todo-input', '待办 2');
    await page.click('#btn-add-todo');
    await expect(page.locator('#todo-count')).toContainText('共 2 项');
  });

  test('should delete a todo item', async ({ page }) => {
    await page.fill('#todo-input', '待删除项');
    await page.click('#btn-add-todo');
    await page.click('.btn-delete');
    await expect(page.locator('.todo-item')).toHaveCount(0);
  });
});

test.describe('Color Picker Component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('button[data-scenario="color-picker"]');
  });

  test('should display color options', async ({ page }) => {
    const colorOptions = page.locator('.color-option');
    await expect(colorOptions).toHaveCount(8);
  });

  test('should change selected color', async ({ page }) => {
    const greenButton = page.locator('.color-option[data-color="#28a745"]');
    await greenButton.click();
    await expect(page.locator('#color-display')).toHaveCSS('background-color', 'rgb(40, 167, 69)');
  });
});

test.describe('Timer Component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('button[data-scenario="timer"]');
  });

  test('should display initial time as 00:00', async ({ page }) => {
    await expect(page.locator('.timer-display')).toHaveText('00:00');
  });

  test('should have start, stop, reset buttons', async ({ page }) => {
    await expect(page.locator('#btn-start-timer')).toBeVisible();
    await expect(page.locator('#btn-stop-timer')).toBeVisible();
    await expect(page.locator('#btn-reset-timer')).toBeVisible();
  });
});

test.describe('Shopping Cart Component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('button[data-scenario="shopping-cart"]');
  });

  test('should display product list', async ({ page }) => {
    await expect(page.locator('.product-item')).toHaveCount(3);
    await expect(page.locator('.product-name').first()).toContainText('产品 A');
  });

  test('should add product to cart', async ({ page }) => {
    await page.click('.btn-add-to-cart[data-product-id="1"]');
    await expect(page.locator('.cart-item')).toHaveCount(1);
    await expect(page.locator('.cart-item')).toContainText('产品 A');
  });

  test('should calculate total correctly', async ({ page }) => {
    await page.click('.btn-add-to-cart[data-product-id="1"]');
    await page.click('.btn-add-to-cart[data-product-id="2"]');
    await expect(page.locator('#cart-total')).toContainText('总计: ¥300');
  });

  test('should remove item from cart', async ({ page }) => {
    await page.click('.btn-add-to-cart[data-product-id="1"]');
    await page.click('.btn-remove-from-cart[data-item-id="1"]');
    await expect(page.locator('.cart-item')).toHaveCount(0);
  });
});

test.describe('Tic Tac Toe Component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('button[data-scenario="tic-tac-toe"]');
  });

  test('should display 9 squares', async ({ page }) => {
    await expect(page.locator('.square')).toHaveCount(9);
  });

  test('should display game status', async ({ page }) => {
    await expect(page.locator('#game-status')).toContainText('下一位: X');
  });

  test('should make a move', async ({ page }) => {
    await page.click('#square-0');
    await expect(page.locator('#square-0')).toHaveText('X');
    await expect(page.locator('#game-status')).toContainText('下一位: O');
  });

  test('should reset game', async ({ page }) => {
    await page.click('#square-0');
    await page.click('#btn-reset-game');
    await expect(page.locator('#square-0')).toHaveText('');
  });
});

test.describe('Weather Dashboard Component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('button[data-scenario="weather-dashboard"]');
  });

  test('should display 4 city buttons', async ({ page }) => {
    await expect(page.locator('.city-button')).toHaveCount(4);
  });

  test('should show default city weather', async ({ page }) => {
    await expect(page.locator('#city-name')).toContainText('北京');
    await expect(page.locator('#temperature')).toContainText('12°C');
  });

  test('should switch city', async ({ page }) => {
    await page.click('#city-shanghai');
    await expect(page.locator('#city-name')).toContainText('上海');
    await expect(page.locator('#temperature')).toContainText('20°C');
  });
});
