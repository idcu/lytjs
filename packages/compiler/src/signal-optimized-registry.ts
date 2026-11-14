/**
 * 优化发射器（`optimizeSignal: true`）的注册表。
 *
 * 为什么需要这一层间接：优化发射器是 opt-in 实验路径（ADR 0028），此前从主入口
 * **静态 import**，于是每个 `import { createApp } from '@lytjs/core'` 的首屏静态闭包
 * 都要为它付约 6.4 KB gzip。现在主入口只读注册表，发射器本体在
 * `@lytjs/compiler/signal-optimized` 子入口（ADR 0033）。
 *
 * 未注册时 `compile({ optimizeSignal: true })` **直接抛错**，不回落基础实现：
 * 静默降级会让调用方以为自己拿到的是优化产物（ADR 0030 先例：禁止静默降级）。
 *
 * ⚠️ 注册槽挂在 `globalThis` 的 `Symbol.for` 键上，而不是模块级变量：
 * `tsup` 以 `splitting: false` 逐入口打包，`dist/index.mjs` 与
 * `dist/signal-optimized.mjs` 会各自内联一份本模块 —— 模块级变量无法跨入口共享，
 * 子入口注册后主入口仍然读不到。`Symbol.for` 在**所有副本间**解析到同一个符号。
 */
import type { CodegenResult, CompilerOptions, RootNode } from './types';

export type SignalOptimizedGenerator = (ast: RootNode, options?: CompilerOptions) => CodegenResult;

interface RegistrySlot {
  generate?: SignalOptimizedGenerator;
}

const SLOT = Symbol.for('@lytjs/compiler/signal-optimized-generator');

function slot(): RegistrySlot {
  // 用 Reflect 访问符号键：避免「双重断言」型类型逃逸（门禁只减不增）。
  const existing = Reflect.get(globalThis, SLOT) as RegistrySlot | undefined;
  if (existing) return existing;
  const created: RegistrySlot = {};
  Reflect.set(globalThis, SLOT, created);
  return created;
}

/** 由 `@lytjs/compiler/signal-optimized` 的 `registerSignalOptimizedGenerator()` 调用。 */
export function setSignalOptimizedGenerator(next: SignalOptimizedGenerator | undefined): void {
  slot().generate = next;
}

/** 主入口 `compile()` 读取；未注册时返回 undefined（调用方必须显式报错）。 */
export function getSignalOptimizedGenerator(): SignalOptimizedGenerator | undefined {
  return slot().generate;
}
