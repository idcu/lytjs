// src/shared.ts
// @lytjs/reactivity - reactive.ts 和 ref.ts 共享的辅助函数
// 提取公共函数以消除 reactive <-> ref 的循环依赖

import { ReactiveFlags } from "./constants";
import type { RefLike } from "@lytjs/shared-types";

// Re-export RefLike for downstream consumers
export type { RefLike } from "@lytjs/shared-types";

/**
 * 判断一个值是否发生了变化
 *
 * 使用 `Object.is` 进行严格相等比较，与 `===` 不同的是：
 * - `Object.is(NaN, NaN)` 为 `true`（`===` 为 `false`）
 * - `Object.is(+0, -0)` 为 `false`（`===` 为 `true`）
 *
 * 边界情况：
 * - 如果两个值都为 `undefined`，返回 `false`（未变化）
 * - 如果两个值都为 `null`，返回 `false`（未变化）
 * - 如果 `value` 或 `oldValue` 为 `NaN`，只有两者都为 `NaN` 时才返回 `false`
 * - 对象引用比较：只有同一个引用才认为未变化，内容相同的不同对象视为已变化
 *
 * @param value - 新值
 * @param oldValue - 旧值
 * @returns 如果值发生了变化返回 `true`，否则返回 `false`
 */
export const hasChanged = (value: unknown, oldValue: unknown): boolean =>
  !Object.is(value, oldValue);

/**
 * toRaw 遍历时的最大深度限制，防止异常的代理链导致无限循环
 */
const MAX_RAW_DEPTH = 100;

/**
 * 获取响应式对象的原始值
 */
export function toRaw<T>(observed: T): T {
  const seen = new Set<object>();
  let current: any = observed;
  let depth = 0;
  while (current && (current as any)[ReactiveFlags.RAW]) {
    if (seen.has(current) || depth >= MAX_RAW_DEPTH) return current;
    seen.add(current);
    current = (current as any)[ReactiveFlags.RAW];
    depth++;
  }
  return current;
}

/**
 * 判断一个值是否为 ref
 */
export function isRef<T = unknown>(r: unknown): r is RefLike<T> {
  return !!(r && typeof r === "object" && (r as RefLike).__v_isRef === true);
}
