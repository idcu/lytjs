// src/directives.ts
// @lytjs/core - 指令辅助函数

import { cloneVNode } from '@lytjs/vdom';
import { isArray } from '@lytjs/common-is';
import type { VNode, DirectiveArguments, Directive } from './types';

/** 扩展 VNode 类型以支持指令存储 */
interface DirectiveVNode extends VNode {
  _directives?: DirectiveArguments;
}

/**
 * 将指令应用到 VNode 上。
 * 当指令带有 deep: true 选项时，递归遍历子 VNode 并应用指令。
 */
export function withDirectives(vnode: VNode, directives: DirectiveArguments): VNode {
  const dirVNode = cloneVNode(vnode) as DirectiveVNode;
  dirVNode._directives = directives.map(([dir, value, arg, modifiers]) => ({
    dir: dir as Directive & { deep?: boolean },
    value,
    arg,
    modifiers: modifiers || {},
  })) as unknown as DirectiveArguments;

  // 处理 deep 选项：递归将指令应用到子 VNode
  for (const dirEntry of dirVNode._directives) {
    // _directives 已被 map 转为对象数组 { dir, value, arg, modifiers }
    const dirObj = dirEntry as unknown as { dir: Directive & { deep?: boolean }; value: unknown; arg: unknown; modifiers: Record<string, boolean> };
    if (dirObj.dir.deep) {
      applyDirectiveDeep(dirVNode, [dirObj.dir, dirObj.value, dirObj.arg as string | undefined, dirObj.modifiers]);
    }
  }

  return dirVNode;
}

/**
 * 递归地将指令应用到子 VNode。
 * 遍历 VNode 的 children（数组或单个子节点），为每个子 VNode
 * 附加相同的指令引用。
 */
function applyDirectiveDeep(vnode: DirectiveVNode, directive: DirectiveArguments[0]): void {
  const children = vnode.children;
  if (!children) return;

  const childArray = isArray(children) ? children : [children];

  for (const child of childArray) {
    if (!child || typeof child !== 'object') continue;

    const childVNode = child as DirectiveVNode;

    // 为子 VNode 附加指令
    if (!childVNode._directives) {
      childVNode._directives = [];
    }
    childVNode._directives.push(directive);

    // 递归处理子 VNode 的子节点
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
    // Index out of bounds - render and write to cache
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
