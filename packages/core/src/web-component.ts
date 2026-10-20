// src/web-component.ts
// @lytjs/core - Web Component 支持（**转发** `@lytjs/core-vnode`）
//
// ⚠️ 2026-10-21：本文件原是一份与 `core-vnode/src/web-component.ts` **平行**的实现。
// ADR 0011 已明令「同名公开 API 只允许一份权威实现，其余入口只转发」——
// 而这份平行实现正是「修复只落一份」的第二个实例（第一个是 `defineAsyncComponent`）：
// `core-vnode` 那份修好了 WeakMap 上下文 / patch 新 vnode 副本，本文件仍是模块级变量 +
// 原地改 props 的旧版；更关键的是**两份都渲染为空**（都没给渲染器注入
// `setupChildComponent`，`mountComponent` 只会 warn 后 return）。
//
// 权威实现现在统一在 `@lytjs/core-vnode`（它更底层，`core` 依赖它不构成环）。
// 本文件只保留转发，**不得**再出现实现副本 —— 判据见
// `tests/e2e-async-component-convergence.test.ts` 的函数同一性断言。

export {
  defineCustomElement,
  useShadowRoot,
  useHost,
  useWebComponentSlots,
  injectChildStyles,
} from '@lytjs/core-vnode';
export type { DefineCustomElementOptions } from '@lytjs/core-vnode';
