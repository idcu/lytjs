// src/next-tick.ts
// @lytjs/core - nextTick 实现

const resolvedPromise = Promise.resolve() as Promise<any>;
const currentFlushPromise: Promise<void> | null = null;

/**
 * 在下一个 DOM 更新周期之后执行回调
 */
export function nextTick(fn?: () => void): Promise<void> {
  const p = currentFlushPromise || resolvedPromise;
  return fn ? p.then(fn) : p;
}
