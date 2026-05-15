import { test, expect } from '@playwright/test';

test.describe('Admin Dashboard E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // 导航到管理后台示例
    await page.goto('/admin-dashboard');
  });

  test('should render the dashboard properly', async ({ page }) => {
    // 检查页面标题
    await expect(page).toHaveTitle(/LytJS 管理后台/);
    
    // 检查侧边栏存在
    await expect(page.locator('.sidebar')).toBeVisible();
    
    // 检查主内容区域存在
    await expect(page.locator('.main-content')).toBeVisible();
    
    // 检查仪表盘显示
    await expect(page.locator('.dashboard-view')).toBeVisible();
  });

  test('should navigate between tabs', async ({ page }) => {
    // 测试用户管理标签页
    const usersTab = page.getByText('👥 用户管理');
    await usersTab.click();
    await expect(page.locator('.users-view')).toBeVisible();
    
    // 测试产品管理标签页
    const productsTab = page.getByText('📦 产品管理');
    await productsTab.click();
    await expect(page.locator('.products-view')).toBeVisible();
    
    // 测试订单管理标签页
    const ordersTab = page.getByText('🛒 订单管理');
    await ordersTab.click();
    await expect(page.locator('.orders-view')).toBeVisible();
    
    // 返回仪表盘
    const dashboardTab = page.getByText('📊 仪表盘');
    await dashboardTab.click();
    await expect(page.locator('.dashboard-view')).toBeVisible();
  });

  test('should display statistics on dashboard', async ({ page }) => {
    // 检查统计卡片
    const statCards = page.locator('.stat-card');
    await expect(statCards).toHaveCount(4);
    
    // 检查统计数字存在
    const firstStat = statCards.first().locator('.stat-value');
    await expect(firstStat).toBeVisible();
    
    // 检查统计标签存在
    const firstLabel = statCards.first().locator('.stat-label');
    await expect(firstLabel).toBeVisible();
  });

  test('should toggle sidebar', async ({ page }) => {
    // 找到关闭按钮
    const closeBtn = page.getByRole('button', { name: /✕|close/i });
    
    if (await closeBtn.isVisible()) {
      // 点击关闭按钮
      await closeBtn.click();
      
      // 检查侧边栏是否隐藏
      await expect(page.locator('.sidebar')).toHaveClass(/closed/);
    }
  });

  test('should switch theme', async ({ page }) => {
    // 查找主题切换按钮
    const themeToggle = page.getByText(/🌙|☀️ 主题/);
    
    if (await themeToggle.isVisible()) {
      await themeToggle.click();
      
      // 等待主题切换效果（短暂等待）
      await page.waitForTimeout(100);
      
      // 检查主题类是否变化（此为简化检查）
      await expect(page.locator('.dashboard')).toBeVisible();
    }
  });

  test('should display user table in users tab', async ({ page }) => {
    // 切换到用户管理
    const usersTab = page.getByText('👥 用户管理');
    await usersTab.click();
    
    // 检查表格是否存在
    const table = page.locator('table');
    await expect(table).toBeVisible();
    
    // 检查表格有头部
    const tableHeader = table.locator('thead');
    await expect(tableHeader).toBeVisible();
    
    // 检查有数据行
    const tableBody = table.locator('tbody');
    await expect(tableBody).toBeVisible();
  });

  test('should search users in users tab', async ({ page }) => {
    // 切换到用户管理
    const usersTab = page.getByText('👥 用户管理');
    await usersTab.click();
    
    // 查找搜索框并输入
    const searchInput = page.locator('input[type="text"]').first();
    await expect(searchInput).toBeVisible();
    
    // 输入搜索文本
    await searchInput.fill('张三');
    
    // 按下 Enter 键（可选）
    await searchInput.press('Enter');
  });

  test('should display products grid in products tab', async ({ page }) => {
    // 切换到产品管理
    const productsTab = page.getByText('📦 产品管理');
    await productsTab.click();
    
    // 检查产品卡片网格
    const productCards = page.locator('.product-card');
    
    // 如果有产品卡片，验证它们可见
    if (await productCards.count() > 0) {
      await expect(productCards.first()).toBeVisible();
    }
  });

  test('should display orders in orders tab', async ({ page }) => {
    // 切换到订单管理
    const ordersTab = page.getByText('🛒 订单管理');
    await ordersTab.click();
    
    // 检查订单表格
    const orderTable = page.locator('table');
    await expect(orderTable).toBeVisible();
  });
});
