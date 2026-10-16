// src/define-component.ts
// @lytjs/core - 组件定义（**转发层**，不保留实现）
//
// ★ 2026-10-17（ADR 0011）：本文件曾有一份 `defineAsyncComponent` 的**独立实现**（205 行），
//   与 `@lytjs/component`、`@lytjs/core-vnode` 的两份并行存在，导致「修复只落一份」——
//   实测两次：① `delay` 语义只落在 component 版；② `showLoading` 非响应式（loading 永不出现）
//   修在 core 版后**未同步**到 core-vnode 版（`diff` 实测其至今仍是 `let showLoading`）。
//
//   ⇒ 现改为**只转发**权威实现（`@lytjs/component`），**副本一律不得重建**。
//   守卫：`packages/core/tests/e2e-async-component-convergence.test.ts` 断言**函数同一性**
//   （`core.defineAsyncComponent === component.defineAsyncComponent`），副本重现即变红。

import { defineComponent as _defineComponent } from '@lytjs/component';
import type { ComponentOptions } from './types';

/**
 * 定义组件（转发自 `@lytjs/component`）
 *
 * 权威实现在 `@lytjs/component` 中，此处统一返回类型为 ComponentOptions。
 * 由于 Component = ComponentOptions | (() => any)，返回 ComponentOptions 是 Component 的子集，完全兼容。
 */
export const defineComponent: (options: ComponentOptions) => ComponentOptions = _defineComponent;

/**
 * 定义异步组件（**转发**自 `@lytjs/component`，见 ADR 0011）
 *
 * `loader` / `loadingComponent` / `errorComponent` / `delay` / `timeout` /
 * `onError(error, retry, fail, attempts)` 的语义**以权威实现为准**；本包不再维护副本。
 * `onError` 的 retry 契约（原 core 版独有）已下沉到权威实现。
 */
export { defineAsyncComponent } from '@lytjs/component';

/**
 * 异步组件预加载工具（**转发**）
 *
 * ★ 2026-10-17 补：此前 `@lytjs/core` **漏转**这四个导出 —— 主入口有 `defineAsyncComponent`，
 * 却没有配套的 preload 能力（用户只能绕道 `@lytjs/component`）。
 */
export {
  preloadComponent,
  preloadComponents,
  isComponentPreloaded,
  clearPreloadCache,
} from '@lytjs/component';
