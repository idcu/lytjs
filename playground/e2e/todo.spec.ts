/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-console, @typescript-eslint/no-require-imports */
import { test, expect } from '@playwright/test';

test.describe('待办事项列表场景 E2E 测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('button[data-scenario="todo"]');
  });

  test('待办列表初始为空', async ({ page }) => {
    const todoList = page.locator('#todo-list');
    const todoCount = page.locator('#todo-count');
    await expect(todoList).toBeEmpty();
    await expect(todoCount).toHaveText('共 0 项');
  });

  test('添加单个待办事项', async ({ page }) => {
    const input = page.locator('#todo-input');
    const btnAdd = page.locator('#btn-add-todo');
    const todoList = page.locator('#todo-list');
    const todoCount = page.locator('#todo-count');

    await input.fill('学习 Lyt.js');
    await btnAdd.click();

    await expect(todoList.locator('.todo-item')).toHaveCount(1);
    await expect(todoList.locator('.todo-item')).toContainText('学习 Lyt.js');
    await expect(todoCount).toHaveText('共 1 项');
  });

  test('添加多个待办事项', async ({ page }) => {
    const input = page.locator('#todo-input');
    const btnAdd = page.locator('#btn-add-todo');
    const todoList = page.locator('#todo-list');

    const todos = ['待办 1', '待办 2', '待办 3'];

    for (const todo of todos) {
      await input.fill(todo);
      await btnAdd.click();
    }

    await expect(todoList.locator('.todo-item')).toHaveCount(3);
    const countElement = page.locator('#todo-count');
    await expect(countElement).toContainText('共 3 项');
  });

  test('按 Enter 键添加待办事项', async ({ page }) => {
    const input = page.locator('#todo-input');
    const todoList = page.locator('#todo-list');

    await input.fill('按 Enter 添加');
    await input.press('Enter');

    await expect(todoList.locator('.todo-item')).toHaveCount(1);
  });

  test('删除待办事项', async ({ page }) => {
    const input = page.locator('#todo-input');
    const btnAdd = page.locator('#btn-add-todo');
    const todoList = page.locator('#todo-list');
    const todoCount = page.locator('#todo-count');

    await input.fill('要删除的项目');
    await btnAdd.click();
    await expect(todoList.locator('.todo-item')).toHaveCount(1);

    await todoList.locator('.todo-item').first().locator('.btn-delete').click();
    await expect(todoList.locator('.todo-item')).toHaveCount(0);
    await expect(todoCount).toHaveText('共 0 项');
  });

  test('添加空白内容不创建待办', async ({ page }) => {
    const input = page.locator('#todo-input');
    const btnAdd = page.locator('#btn-add-todo');
    const todoList = page.locator('#todo-list');

    await input.fill('   ');
    await btnAdd.click();

    await expect(todoList.locator('.todo-item')).toHaveCount(0);
  });

  test('删除中间项后索引正确', async ({ page }) => {
    const input = page.locator('#todo-input');
    const btnAdd = page.locator('#btn-add-todo');
    const todoList = page.locator('#todo-list');

    await input.fill('项目 1');
    await btnAdd.click();
    await input.fill('项目 2');
    await btnAdd.click();
    await input.fill('项目 3');
    await btnAdd.click();

    await expect(todoList.locator('.todo-item')).toHaveCount(3);

    const secondItem = todoList.locator('.todo-item').nth(1);
    await secondItem.locator('.btn-delete').click();

    await expect(todoList.locator('.todo-item')).toHaveCount(2);
    await expect(todoList.locator('.todo-item').first()).toContainText('项目 1');
    await expect(todoList.locator('.todo-item').last()).toContainText('项目 3');
  });
});

function todoCount(count: number): boolean {
  return count === 3;
}
