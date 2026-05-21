import { test, expect } from '@playwright/test';

test.describe('Components', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should render component with props', async ({ page }) => {
    await page.goto('/component-demo');
    await expect(page.locator('.greeting')).toContainText('Hello, World!');
  });

  test('should handle component events', async ({ page }) => {
    await page.goto('/component-demo');
    await page.click('button.emit-event');
    await expect(page.locator('.event-log')).toContainText('Event received');
  });

  test('should handle slots', async ({ page }) => {
    await page.goto('/component-demo');
    await expect(page.locator('.slot-content')).toContainText('Slot content here');
  });

  test('should handle scoped slots', async ({ page }) => {
    await page.goto('/component-demo');
    const items = page.locator('.list-item');
    await expect(items).toHaveCount(3);
  });
});
