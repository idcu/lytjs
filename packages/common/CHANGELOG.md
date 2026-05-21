# @lytjs/common-monorepo 更新日志

## [6.6.0] - 2026-05-21

### 🚀 核心功能增强

#### @lytjs/common-query
- 新增 `parseQueryStringWithArrays` 函数，支持数组查询参数解析
- 增强 `stringifyQueryString` 函数，支持数组、布尔值、数字等多种类型
- 保持完全向后兼容

#### @lytjs/common-http
- 新增便捷方法：`get`, `post`, `put`, `patch`, `del`
- 新增直接返回数据的 JSON 方法：`getJson`, `postJson`, `putJson`, `patchJson`, `deleteJson`, `requestJson`
- 集成 `@lytjs/common-query`，支持数组查询参数
- 新增完整的测试用例

### 📦 包复用优化

#### @lytjs/http-server（在 ecosystem/web-framework 中）
- 移除了重复的 `parseQuery` 实现
- 直接使用 `@lytjs/common-query` 中的 `parseQueryStringWithArrays`
- 保持完全的功能完整性

### 📝 文档完善

- 为 `@lytjs/common-http` 添加完整的 README 文档
- 为 `@lytjs/api` 添加完整的 README 文档

### 🔧 版本统一

- 所有子包版本统一升级至 v6.6.0
- 保持完全向后兼容

## [6.5.0] - 2026-05-19

### 🚀 版本升级

- 所有子包版本统一升级至 v6.5.0
- 保持完全向后兼容

## [6.4.0] - 2026-05-18

### 🚀 Monorepo 包发布

本版本为 LytJS 6.4.0 Monorepo 统一发布的一部分。

### 📦 子包依赖更新

- `@lytjs/common-async-scheduler` 更新至 `^6.4.0`
- `@lytjs/common-constants` 更新至 `^6.4.0`
- `@lytjs/common-event-normalizer` 更新至 `^6.4.0`
- `@lytjs/common-node-cache` 更新至 `^6.4.0`
- `@lytjs/common-performance` 更新至 `^6.4.0`
- `@lytjs/common-render-queue` 更新至 `^6.4.0`
- `@lytjs/common-transition-engine` 更新至 `^6.4.0`

### 🔧 内部改进

- 包管理器 `pnpm` 升级至 `9.15.4`
- Node.js 版本要求提升至 `>=18.0.0`
- 类型定义 `@types/node` 升级至 `^22.13.10`
- 测试覆盖率工具 `@vitest/coverage-v8` 升级至 `^3.0.7`
- 代码检查工具 `eslint` 升级至 `^9.22.0`
- 代码格式化工具 `prettier` 升级至 `^3.5.3`
- 构建工具 `tsup` 升级至 `^8.4.0`
- TypeScript 升级至 `^5.8.2`
- 测试框架 `vitest` 升级至 `^3.0.7`
