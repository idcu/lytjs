// src/app-lifecycle.ts
// @lytjs/core - 生命周期工具函数

const resolvedPromise = Promise.resolve() as Promise<any>;
let currentFlushPromise: Promise<void> | null = null;

/**
 * 在下一个 DOM 更新周期之后执行回调
 */
export function nextTick(fn?: () => void): Promise<void> {
  const p = currentFlushPromise || resolvedPromise;
  return fn ? p.then(fn) : p;
}
