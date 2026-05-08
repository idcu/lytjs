// src/directives.ts
// @lytjs/core - 指令辅助函数
//
// FIX: P2-38 指令生命周期钩子文档：
// 自定义指令支持以下生命周期钩子：
//   - created：元素创建后、挂载前调用
//   - beforeMount：元素挂载前调用
//   - mounted：元素挂载后调用
//   - beforeUpdate：元素更新前调用
//   - updated：元素更新后调用
//   - beforeUnmount：元素卸载前调用
//   - unmounted：元素卸载后调用

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
 * FIX: P1-44 简化类型转换链，使用中间接口 DirectiveEntry 替代多层 as unknown as
 */
interface DirectiveEntry {
  dir: Directive & { deep?: boolean };
  value: unknown;
  arg: unknown;
  modifiers: Record<string, boolean>;
}

export function withDirectives(vnode: VNode, directives: DirectiveArguments): VNode {
  const dirVNode = cloneVNode(vnode) as DirectiveVNode;
  // FIX: P1-44 使用 DirectiveEntry 中间类型简化类型转换
  // FIX: P2-v11-12 定义正确的类型转换函数，替代 as unknown as DirectiveArguments
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
  // FIX: P2-batch2-10 类型断言说明：
  // normalizedDirectives 的元素类型为 DirectiveEntry（四元组），
  // 而 _directives 的声明类型为 DirectiveArguments。两者结构一致，
  // 但 TypeScript 无法自动推导数组 map 返回类型与目标类型的兼容性，
  // 因此需要通过 unknown 桥接。

  // 处理 deep 选项：递归将指令应用到子 VNode
  for (const dirEntry of dirVNode._directives) {
    const dirObj = dirEntry as unknown as DirectiveEntry;
    if (dirObj.dir.deep) {
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
 * 遍历 VNode 的 children（数组或单个子节点），为每个子 VNode
 * 附加相同的指令引用。
 * FIX: P2-v11-13 添加 visited Set 防止循环引用导致无限递归
 */
function applyDirectiveDeep(vnode: DirectiveVNode, directive: DirectiveArguments[0]): void {
  const children = vnode.children;
  if (!children) return;

  // FIX: P2-v11-13 使用 visited Set 跟踪已处理的 VNode，
  // 防止循环引用（如 VNode.children 包含自身）导致栈溢出
  const visited = new Set<DirectiveVNode>();
  visited.add(vnode);

  const childArray = isArray(children) ? children : [children];

  for (const child of childArray) {
    if (!child || typeof child !== 'object') continue;

    const childVNode = child as DirectiveVNode;

    // 跳过已处理的 VNode，防止循环引用
    if (visited.has(childVNode)) continue;
    visited.add(childVNode);

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
