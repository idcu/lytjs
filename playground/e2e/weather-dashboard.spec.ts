 
import { test, expect } from '@playwright/test';

test.describe('天气仪表盘场景 E2E 测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('button[data-scenario="weather-dashboard"]');
  });

  test('默认显示北京天气', async ({ page }) => {
    const cityName = page.locator('#city-name');
    await expect(cityName).toContainText('北京');
  });

  test('切换城市', async ({ page }) => {
    const shanghaiBtn = page.locator('#city-shanghai');
    const cityName = page.locator('#city-name');

    await shanghaiBtn.click();
    await expect(cityName).toContainText('上海');
  });

  test('所有城市按钮存在', async ({ page }) => {
    const cityButtons = page.locator('#city-selector .city-button');
    await expect(cityButtons).toHaveCount(4);
  });
});
