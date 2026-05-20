/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-console, @typescript-eslint/no-require-imports */
import { test, expect } from '@playwright/test';

test.describe('表单验证场景 E2E 测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('button[data-scenario="form-validation"]');
  });

  test('空表单验证', async ({ page }) => {
    await page.locator('#btn-submit-form').click();
    await expect(page.locator('#email-error')).toContainText('邮箱不能为空');
    await expect(page.locator('#password-error')).toContainText('密码不能为空');
  });

  test('无效邮箱格式', async ({ page }) => {
    await page.locator('#email').fill('invalid-email');
    await page.locator('#password').fill('password');
    await page.locator('#confirm-password').fill('password');
    await page.locator('#btn-submit-form').click();
    await expect(page.locator('#email-error')).toContainText('邮箱格式不正确');
  });

  test('密码长度不足', async ({ page }) => {
    await page.locator('#email').fill('test@example.com');
    await page.locator('#password').fill('123');
    await page.locator('#confirm-password').fill('123');
    await page.locator('#btn-submit-form').click();
    await expect(page.locator('#password-error')).toContainText('密码至少6个字符');
  });

  test('密码不匹配', async ({ page }) => {
    await page.locator('#email').fill('test@example.com');
    await page.locator('#password').fill('password123');
    await page.locator('#confirm-password').fill('password456');
    await page.locator('#btn-submit-form').click();
    await expect(page.locator('#confirm-password-error')).toContainText('两次密码不一致');
  });

  test('有效表单提交', async ({ page }) => {
    page.on('dialog', (dialog) => {
      expect(dialog.message()).toBe('表单提交成功！');
      dialog.accept();
    });

    await page.locator('#email').fill('test@example.com');
    await page.locator('#password').fill('password123');
    await page.locator('#confirm-password').fill('password123');
    await page.locator('#btn-submit-form').click();
  });
});
