# @lytjs/compat 更新日志

## [Unreleased]

### ✨ 补实现 P1-8：生命周期钩子名迁移（2026-10-10）

> 注：以下条目**不改写**下方「独立化核查」的历史记录 —— 那条在写下时是成立的
> （当时源码确实只有 `export {}`），本条是把「占位」推进为「部分实现」。

- **新增真实 API**：`DEPRECATED_LIFECYCLE_HOOKS` / `VUE2_LIFECYCLE_HOOKS` /
  `VUE3_LIFECYCLE_HOOKS` / `isDeprecatedLifecycleHook()` / `normalizeLifecycleHook()` /
  `migrateVue2LifecycleHooks()`（Vue 2 → Vue 3 生命周期钩子名迁移，纯函数、确定性、
  不改入参、二次迁移到不动点）。
- **订正 `package.json` description**：`"LytJS Vue 2/3 compatibility layer for migration support"`
  → `"LytJS Vue 2/3 migration helpers - Vue 2 lifecycle hook name mapping"`。
  此前描述宣称是「兼容层」而包内**零导出**，且已按 6.9.6 发布到 npm ⇒ 使用者装上后
  `import` 到的是空对象。
- **README 重写**：区分「已实现」与「未实现（规划中）」；Vuex 兼容层与响应式 API 桥接
  明确标注为 ❌ 当前不存在；删除对并不存在的 `@lytjs/router` 的引用。
- 测试从 `expect(true).toBe(true)` 占位重写为 16 个行为级用例（含冻结性、原型链
  `hasOwnProperty` 语义、不改入参、冲突策略、不动点）。
- 补 `docs/api/generated/compat.md`（此前因「0 导出」被生成器排除，现已有真实导出）。
- `@status` 由 `Planned - Not yet implemented` 改为 `Partial`。

### 🔧 独立化核查

- 独立化核查：确认 compat 为纯占位包（源码仅 `export {}`），无任何运行时框架依赖
- 移除 3 个未使用的运行时依赖（`@lytjs/reactivity` / `@lytjs/component` / `@lytjs/core`），`dependencies` 置空
- 同步清理 `tsup.config.ts` / `vitest.config.ts` / `tsconfig.json` 中对应的外部依赖与路径映射
- README 重写：移除虚构的未实现 API 文档，如实标注「规划中（尚未实现）」占位状态，并新增「简介·独立声明」与「相关包」章节，记录 v6.12 迁出至独立仓库 `lytjs-compat` 的规划

## [6.9.6] - 2026-06-06

### 🚀 版本升级

- 版本升级至 v6.9.6
- 保持完全向后兼容
- 所有依赖包已更新至 6.9.6



## [6.6.0] - 2026-05-21

### 🚀 版本升级

- 版本升级至 v6.6.0
- 保持完全向后兼容
- 所有依赖包已更新至 6.6.0

## [6.5.0] - 2026-05-19

### 🚀 版本升级

- 版本升级至 v6.5.0
- 保持完全向后兼容
- 所有依赖包已更新至 6.5.0

## [6.4.0] - 2026-05-18

### 🚀 Monorepo 包发布

本版本为 LytJS 6.4.0 Monorepo 统一发布的一部分。

### 📦 依赖更新

- `@lytjs/reactivity` 更新至 `^6.0.0`
- `@lytjs/component` 更新至 `^6.0.0`
- `@lytjs/core` 更新至 `^6.0.0`

### 🔧 内部改进

- 构建工具 `tsup` 升级至 `^8.0.0`
- TypeScript 升级至 `^5.4.0`
- 测试框架 `vitest` 升级至 `^3.0.0`
