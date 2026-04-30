// src/shared.ts
// @lytjs/reactivity - reactive.ts 和 ref.ts 共享的辅助函数
// 提取公共函数以消除 reactive <-> ref 的循环依赖

import { ReactiveFlags } from "./constants";

// 最小 Ref 接口，仅用于类型保护（避免从 ref.ts 导入产生循环依赖）
interface RefLike {
  __v_isRef: true;
  value: any;
}

/**
 * 获取响应式对象的原始值
 */
export function toRaw<T>(observed: T): T {
  const seen = new Set<object>();
  let current: any = observed;
  while (current && (current as any)[ReactiveFlags.RAW]) {
    if (seen.has(current)) return current;
    seen.add(current);
    current = (current as any)[ReactiveFlags.RAW];
  }
  return current;
}

/**
 * 判断一个值是否为 ref
 */
export function isRef(r: unknown): r is RefLike {
  return !!(r && typeof r === "object" && (r as RefLike).__v_isRef === true);
}
