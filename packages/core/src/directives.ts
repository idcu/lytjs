// src/directives.ts
// @lytjs/core - 指令辅助函数

import type { VNode, DirectiveArguments } from "./types";

/**
 * 将指令应用到 VNode 上
 */
export function withDirectives(
  vnode: VNode,
  directives: DirectiveArguments,
): VNode {
  // 将指令信息存储在 VNode 的自定义属性中
  (vnode as any)._directives = directives.map(
    ([dir, value, arg, modifiers]) => ({
      dir,
      value,
      arg,
      modifiers: modifiers || {},
    }),
  );
  return vnode;
}

/**
 * 带缓存的渲染辅助
 */
export function withMemo(
  memo: any[],
  render: () => VNode,
  cache: any[],
  index: number,
): VNode {
  const cached = cache[index];
  if (cached && isMemoSame(cached.memo, memo)) {
    return cached.result;
  }
  const result = render();
  cache[index] = { memo, result };
  return result;
}

function isMemoSame(prev: any[], next: any[]): boolean {
  if (prev.length !== next.length) return false;
  for (let i = 0; i < prev.length; i++) {
    if (prev[i] !== next[i]) return false;
  }
  return true;
}
