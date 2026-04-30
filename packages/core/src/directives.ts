// src/directives.ts
// @lytjs/core - 指令辅助函数

import { cloneVNode } from "@lytjs/vdom";
import type { VNode, DirectiveArguments, Directive } from "./types";

/** 扩展 VNode 类型以支持指令存储 */
interface DirectiveVNode extends VNode {
  _directives?: DirectiveArguments;
}

/**
 * 将指令应用到 VNode 上
 */
export function withDirectives(
  vnode: VNode,
  directives: DirectiveArguments,
): VNode {
  const dirVNode = cloneVNode(vnode) as DirectiveVNode;
  dirVNode._directives = directives.map(
    ([dir, value, arg, modifiers]) => ({
      dir: dir as Directive,
      value,
      arg,
      modifiers: modifiers || {},
    }),
  );
  return dirVNode;
}

/** Memo 缓存条目 */
interface MemoEntry {
  memo: unknown[];
  result: VNode;
}

/**
 * 带缓存的渲染辅助
 */
export function withMemo(
  memo: unknown[],
  render: () => VNode,
  cache: MemoEntry[],
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

function isMemoSame(prev: unknown[], next: unknown[]): boolean {
  if (prev.length !== next.length) return false;
  for (let i = 0; i < prev.length; i++) {
    if (prev[i] !== next[i]) return false;
  }
  return true;
}
