# @lytjs/core-signal 更新日志

## [Unreleased]

### 🐛 setup 契约与类型诚实（A10，2026-11-05）

- **`setup(props, ctx)` 第二参不再是 `{}`**：现提供真实的 `inject` / `emit` / `expose`。
  - `ctx.inject(key, default?)` 读应用级 `app.provide()` 注册表；
  - `ctx.emit('save-item', payload)` 映射到 props 上的 `onSaveItem` 监听器并调用；
  - `ctx.expose(obj)` 后，`mount()` 返回的公共实例只暴露白名单内的键。
- **`App.inject<T>` 类型诚实化**：缺键且无默认值时返回 `undefined`，返回类型改为
  `T | undefined`（此前实现 `return undefined as T`，类型在撒谎）。
- **生产环境不再静默 no-op**：`app.component()/directive()/mixin()` 改用 `error()`
  （生产构建仍输出），替代仅 `__DEV__` 生效的 `warn()`。
- 新增门禁 `scripts/check-core-signal-contract.mjs`（fast，15 条，运行时行为断言）。
  注入验证：setup 回退 `{}` ⇒ 8 红；注册 API 回退 dev-only warn ⇒ 3 红；inject 伪造值 ⇒ 2 红。
- ⚠️ 类型收紧：`app.inject()` 的结果现在可能为 `undefined`，下游使用处需显式处理。

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

### 📦 依赖更新

- 所有相关依赖包已更新至 6.6.0

## [6.5.0] - 2026-05-19

### 🚀 版本升级

- 版本升级至 v6.5.0
- 保持完全向后兼容
- 所有依赖包已更新至 6.5.0

## [6.4.0] - 2026-05-18

### 🚀 Monorepo 包发布

本版本为 LytJS 6.4.0 Monorepo 统一发布的一部分。

### 📦 依赖更新

- `@lytjs/component` 更新至 `^6.4.0`
- `@lytjs/reactivity` 更新至 `^6.4.0`
- `@lytjs/compiler` 更新至 `^6.4.0`
- `@lytjs/renderer` 更新至 `^6.4.0`
- `@lytjs/dom-runtime` 更新至 `^6.4.0`
- `@lytjs/common-scheduler` 更新至 `^6.4.0`
- `@lytjs/common-error` 更新至 `^6.4.0`
- `@lytjs/shared-types` 更新至 `^6.4.0`

### 🔧 内部改进

- 构建工具 `tsup` 升级至 `^8.0.0`
- TypeScript 升级至 `^5.4.0`
