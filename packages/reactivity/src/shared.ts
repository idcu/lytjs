// src/shared.ts
// @lytjs/reactivity - reactive.ts 和 ref.ts 共享的辅助函数
// 提取公共函数以消除 reactive <-> ref 的循环依赖

import { ReactiveFlags } from './constants';
import type { RefLike } from '@lytjs/shared-types';

// Re-export RefLike for downstream consumers
export type { RefLike } from '@lytjs/shared-types';

import { hasChanged } from '@lytjs/common-is';
export { hasChanged };

/**
 * toRaw 遍历时的最大深度限制，防止异常的代理链导致无限循环
 */
const MAX_RAW_DEPTH = 100;

/**
 * toRaw 遍历过程中用于检测循环引用的 Set。
 * 提取为模块级常量以避免每次调用 toRaw 时重新分配。
 *
 * FIX: P2-5 注意：此 Set 假设单线程执行。JavaScript 是单线程的，
 * 因此不需要额外的线程同步机制。嵌套调用通过 _rawDepth 计数器管理。
 */
const _rawSeenSet = new Set<object>();

/**
 * toRaw 嵌套调用深度计数器，防止嵌套调用时提前清空 _rawSeenSet。
 */
let _rawDepth = 0;

/**
 * 获取响应式对象的原始值
 */
export function toRaw<T>(observed: T): T {
  _rawDepth++;
  if (_rawDepth === 1) {
    _rawSeenSet.clear();
  }
  try {
    let current: unknown = observed;
    let depth = 0;
    while (current && (current as Record<string, unknown>)[ReactiveFlags.RAW]) {
      if (_rawSeenSet.has(current as object) || depth >= MAX_RAW_DEPTH) return current as T;
      _rawSeenSet.add(current as object);
      current = (current as Record<string, unknown>)[ReactiveFlags.RAW];
      depth++;
    }
    return current as T;
  } finally {
    _rawDepth--;
    if (_rawDepth === 0) {
      _rawSeenSet.clear();
    }
  }
}

/**
 * 判断一个值是否为 ref
 */
export function isRef<T = unknown>(r: unknown): r is RefLike<T> {
  return !!(r && typeof r === 'object' && (r as RefLike).__v_isRef === true);
}
