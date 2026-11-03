# @lytjs/common-transition-engine 更新日志

## [未发布] - 2026-11-03

### 🐞 修复（4 个，共同点是「元素状态没收干净」）

- **用户钩子抛错阻断 `done()`**（P0）：`onAfterEnter` / `onAfterLeave` 抛错时，
  后面的 `done()` 不执行、`phase` 停在 `entering`/`leaving` ⇒ 调用方等不到过渡结束，
  **元素永不移除**。现在钩子错误被隔离（留痕但不影响状态机），`done()` 一定执行。
- **取消过渡不清类名**（P1）：`cancelTransition` 只把状态置 idle，元素仍带着
  `v-enter-active` / `v-enter-to` ⇒ 之后任何样式变化都会触发一次「幽灵过渡」。
  现在按 phase 清掉 from / active / to。
- **时长 0 的过渡等满 5 秒超时**（P1）：`hasTransition && duration === 0`
  （`transition: none`、`prefers-reduced-motion`）此前走事件等待，而 0 时长通常
  不派发 `transitionend` ⇒ 卡满 `timeout`（默认 5000ms）。现在直接完成。
- **`dispose()` 只重置状态表**（P1）：挂起的定时器照常到点执行、元素上的
  `transitionend` / `animationend` 监听不摘。现在统一执行清理函数。

### ✨ 改进

- 收敛以 `transitionend` / `animationend` 为准（真正的结束时刻），`duration + 50ms` 作兜底；
  子元素冒泡上来的事件不算（`target` 必须是被过渡的元素）。
- 收敛/取消后释放 `state.props` 引用（此前元素存活期间一直持有整份 props）。
- 清理函数表从**模块级** WeakMap 改为**实例级**：两个引擎操作同一元素时不再互相覆盖。
- `finishEnter` / `finishLeave` 幂等（事件与定时器双触发只收敛一次）。

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

## [6.4.0] - 2026-05-18

### 🚀 Monorepo 包发布

本版本为 LytJS 6.4.0 Monorepo 统一发布的一部分。
