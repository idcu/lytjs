# LytJS E2E 测试

## 前置条件

1. 确保所有核心包已构建：
   ```bash
   pnpm build:core
   ```

2. 安装 Playwright 浏览器（首次需要）：
   ```bash
   pnpm dlx playwright install chromium
   ```

## 运行测试

```bash
# 运行所有 E2E 测试
pnpm test:e2e

# 或者在 e2e 目录下运行
cd e2e
pnpm test
```

## 测试文件

- `component.test.ts` - 基础组件测试
- `router.test.ts` - 路由测试
- `store.test.ts` - 状态管理测试
- `scenarios.test.ts` - 完整场景测试（计数器、待办事项等）

## 调试

```bash
# 带 UI 运行测试
pnpm test:e2e:ui

# 调试模式运行
pnpm test:e2e:debug
```

## 注意事项

- Playwright 测试需要较长时间，建议只在开发环境或 CI 中运行
- 首次运行需要下载浏览器驱动
- 如果测试失败，请确保 playground 能正常运行：`cd playground && pnpm dev`
