// src/shared.ts
// @lytjs/reactivity - reactive.ts 和 ref.ts 共享的辅助函数
// 提取公共函数以消除 reactive <-> ref 的循环依赖

import { ReactiveFlags } from "./constants";
import type { RefLike } from "@lytjs/shared-types";

// Re-export RefLike for downstream consumers
export type { RefLike } from "@lytjs/shared-types";

import { hasChanged } from "@lytjs/common-is";
export { hasChanged };

/**
 * toRaw 遍历时的最大深度限制，防止异常的代理链导致无限循环
 */
const MAX_RAW_DEPTH = 100;

/**
 * 获取响应式对象的原始值
 */
export function toRaw<T>(observed: T): T {
  const seen = new Set<object>();
  let current: unknown = observed;
  let depth = 0;
  while (current && (current as Record<string, unknown>)[ReactiveFlags.RAW]) {
    if (seen.has(current as object) || depth >= MAX_RAW_DEPTH)
      return current as T;
    seen.add(current as object);
    current = (current as Record<string, unknown>)[ReactiveFlags.RAW];
    depth++;
  }
  return current as T;
}

/**
 * 判断一个值是否为 ref
 */
export function isRef<T = unknown>(r: unknown): r is RefLike<T> {
  return !!(r && typeof r === "object" && (r as RefLike).__v_isRef === true);
}
