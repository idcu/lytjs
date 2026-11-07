// src/directives.ts
// @lytjs/core-vnode - 指令辅助函数（唯一权威实现）
//
// 2026-11-07（S07 / ADR 0016）：`@lytjs/core` 只转发本文件的实现，不得保留副本。
//
// 指令生命周期钩子：
//   - created / beforeMount / mounted / beforeUpdate / updated / beforeUnmount / unmounted

import { cloneVNode } from '@lytjs/vdom';
import type { VNode, DirectiveArguments, Directive } from './types';

/** 扩展 VNode 类型以支持指令存储 */
interface DirectiveVNode extends VNode {
  _directives?: DirectiveArguments;
}

interface DirectiveEntry {
  dir: Directive & { deep?: boolean };
  value: unknown;
  arg: unknown;
  modifiers: Record<string, boolean>;
}

/**
 * 将指令应用到 VNode 上。
 * 当指令带有 deep: true 选项时，递归遍历子 VNode 并应用指令。
 */
export function withDirectives(vnode: VNode, directives: DirectiveArguments): VNode {
  const dirVNode = cloneVNode(vnode) as DirectiveVNode;
  const normalizedDirectives: DirectiveArguments = directives.map(
    ([dir, value, arg, modifiers]): DirectiveArguments[0] => [
      dir,
      value,
      arg as string | undefined,
      (modifiers as Record<string, boolean>) || {},
    ],
  );
  dirVNode._directives = normalizedDirectives.map(
    ([dir, value, arg, modifiers]): DirectiveEntry => ({
      dir: dir as Directive & { deep?: boolean },
      value,
      arg,
      modifiers: modifiers ?? {},
    }),
  ) as unknown as DirectiveArguments;

  // 处理 deep 选项：递归将指令应用到子 VNode
  for (const dirEntry of dirVNode._directives) {
    const dirObj = dirEntry as unknown as DirectiveEntry;
    // 防御：`resolveDirective()` 可能返回 undefined（未注册 / 渲染期无实例）
    if (dirObj.dir && dirObj.dir.deep) {
      applyDirectiveDeep(dirVNode, [
        dirObj.dir,
        dirObj.value,
        dirObj.arg as string | undefined,
        dirObj.modifiers,
      ]);
    }
  }

  return dirVNode;
}

/**
 * 递归地将指令应用到子 VNode。
 * 使用 visited Set 防止循环引用导致无限递归。
 */
function applyDirectiveDeep(vnode: DirectiveVNode, directive: DirectiveArguments[0]): void {
  const children = vnode.children;
  if (!children) return;

  const visited = new Set<DirectiveVNode>();
  visited.add(vnode);

  const childArray: unknown[] = Array.isArray(children) ? children : [children];

  for (const child of childArray) {
    if (!child || typeof child !== 'object') continue;

    const childVNode = child as DirectiveVNode;

    if (visited.has(childVNode)) continue;
    visited.add(childVNode);

    if (!childVNode._directives) {
      childVNode._directives = [];
    }
    childVNode._directives.push(directive);

    applyDirectiveDeep(childVNode, directive);
  }
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
  if (index < 0 || index >= cache.length) {
    const result = render();
    cache[index] = { memo, result };
    return result;
  }
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
