/**
 * `@lytjs/renderer/signal` —— **同步** Signal 渲染器子路径入口
 *
 * ## 为什么需要这个子路径（2026-11-02 新增）
 *
 * 包根 `@lytjs/renderer` 的 `createSignalRenderer` 是**异步**的：
 *
 * ```ts
 * export async function createSignalRenderer(template = '', context = {}) {
 *   const { createSignalRenderer: _create } = await import('./signal/signal-renderer');
 *   return _create(template, context);
 * }
 * ```
 *
 * 这是刻意的懒加载（把 signal 渲染器从主入口的静态依赖里摘出去），
 * 但它带来一个**可达性缺口**：需要「同步拿到 renderer 实例」的调用方
 * （例如 `examples/slots-demo/app.ts`，以及直接驱动渲染器的集成测试）
 * 只能写 `await createSignalRenderer()`，或者——此前实际发生的情况——
 * **相对路径穿透到 `packages/renderer/src/signal/signal-renderer`**，
 * 绕过发布产物，用户复制过去必然跑不起来。
 *
 * 本入口把同步版正式暴露为包 API：`import { createSignalRenderer } from '@lytjs/renderer/signal'`。
 * 包根的异步版保持不变（不影响任何既有调用方的行为与体积）。
 */
export { createSignalRenderer } from './signal-renderer';
export type { SignalRenderer } from './signal-renderer';
