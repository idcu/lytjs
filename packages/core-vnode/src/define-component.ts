// src/define-component.ts
// @lytjs/core-vnode - 组件定义（**转发层**，不保留实现）
//
// ★ 2026-10-17（ADR 0011）：本文件曾有一份 `defineAsyncComponent` 的**独立实现**（194 行），
//   实为 `@lytjs/core` 那份的**陈旧 fork** —— `diff` 实测：core 版后来的修复
//   （`showLoading` 改响应式 ⇒ 修「loading 永不出现」、loader 返回值校验、
//   `Promise.resolve(loader())`、retry 耗尽的 `Promise.reject`）**全都没有同步到这里**。
//
//   ⇒ 现改为**只转发**权威实现（`@lytjs/component`），**副本一律不得重建**。
//   守卫：`packages/core/tests/e2e-async-component-convergence.test.ts` 断言**函数同一性**。

import { defineComponent as _defineComponent } from '@lytjs/component';
import type { ComponentOptions } from './types';

/**
 * 定义组件（转发自 `@lytjs/component`）
 *
 * 权威实现在 `@lytjs/component` 中，此处统一返回类型为 ComponentOptions。
 * 由于 Component = ComponentOptions | (() => any)，
 * 返回 ComponentOptions 是 Component 的子集，完全兼容。
 */
export const defineComponent: (options: ComponentOptions) => ComponentOptions = _defineComponent;

/**
 * 定义异步组件（**转发**自 `@lytjs/component`，见 ADR 0011）
 */
export { defineAsyncComponent } from '@lytjs/component';

/**
 * 异步组件预加载工具（**转发**）—— 与 `@lytjs/core` 保持同一套 surface。
 */
export {
  preloadComponent,
  preloadComponents,
  isComponentPreloaded,
  clearPreloadCache,
} from '@lytjs/component';
