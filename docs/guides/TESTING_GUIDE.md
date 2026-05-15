# LytJS 测试指南

> 完整的测试指南，包括单元测试、集成测试和 E2E 测试

---

## 目录

1. [测试概述](#测试概述)
2. [单元测试](#单元测试)
3. [集成测试](#集成测试)
4. [E2E 测试](#e2e-测试)
5. [性能测试](#性能测试)
6. [测试最佳实践](#测试最佳实践)

---

## 测试概述

### 测试栈

LytJS 使用以下测试工具：

| 类型 | 工具 | 说明 |
|-----|------|------|
| 单元测试 | Vitest | 快速的 Vite 原生测试工具 |
| E2E 测试 | Playwright | 现代化端到端测试 |
| 类型检查 | TypeScript | 静态类型检查 |
| Lint 检查 | ESLint | 代码质量检查 |

---

## 单元测试

### 运行所有测试

```bash
# 运行所有单元测试
pnpm test

# 监听模式运行
pnpm test:watch

# 运行并生成覆盖率报告
pnpm test:coverage

# UI 模式
pnpm test:ui
```

### 单包测试

```bash
# 在特定包目录运行
cd packages/reactivity
pnpm test
```

### 测试文件结构

```
packages/
  your-package/
    src/
      *.ts
    tests/
      *.test.ts        # 测试文件
      setup.ts         # 测试设置
    vitest.config.ts
```

---

## E2E 测试

### 运行 E2E 测试

```bash
# 运行所有 E2E 测试
pnpm test:e2e

# 查看测试结果在 Playwright 预览
```

### 项目使用 Playwright 进行 E2E 测试，测试文件位于 `e2e/tests/`。

### 测试文件结构

```
e2e/
  tests/
    *.test.ts
  playwright.config.ts
  README.md
```

### 新增 E2E 测试说明

最新的 E2E 测试包括：

- 组件测试
- 路由测试
- 场景测试
- 管理后台测试

---

## 性能测试

### 运行性能基准测试

```bash
# 运行所有基准测试
pnpm bench
```

性能测试位于 `benchmarks/` 目录。

---

## 测试最佳实践

1. 使用 AAA 模式（Arrange, Act, Assert）
2. 编写小而专注的测试
3. 避免测试过度耦合
4. 测试描述清晰的测试名称
5. 使用 TypeScript 类型安全
6. 优先使用测试工具库

---

## 示例测试文件：管理后台 E2E 测试示例

```typescript
import { test, expect } from '@playwright/test';

test.describe('Admin Dashboard E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin-dashboard');
  });

  test('should render the dashboard properly', async ({ page }) => {
    await expect(page.locator('.dashboard-view')).toBeVisible();
  });

  test('should navigate between tabs', async ({ page }) => {
    await page.getByText('👥 用户管理').click();
    await expect(page.locator('.users-view')).toBeVisible();
  });
});
```

---

## 代码覆盖率目标

| 模块 | 目标覆盖率 |
|------|----------|
| reactivity | ≥ 90% |
| vdom | ≥ 85% |
| compiler | ≥ 80% |
| core | ≥ 80% |

---

## 更多资源

- [Vitest 文档](https://vitest.dev/)
- [Playwright 文档](https://playwright.dev/)
- [项目测试指南](./../tutorial/testing.md)
