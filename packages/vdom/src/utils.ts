/**
 * @lytjs/vdom - utils
 * VNode 检查和操作的工具函数
 */

import { PatchFlags, ShapeFlags } from '@lytjs/common-vnode';
import type { VNode } from '@lytjs/common-vnode';
import { isArray } from '@lytjs/common-is';

// ============================================================
// VNode 检查工具函数
// ============================================================

/**
 * 检查 vnode 是否为静态（hoist）vnode
 */
export function isStaticVNode(vnode: VNode): boolean {
  return vnode.patchFlag === PatchFlags.HOISTED;
}

/**
 * 检查 vnode 是否为动态 vnode（有 patchFlag 但不是 HOISTED）
 */
export function isDynamicVNode(vnode: VNode): boolean {
  return (
    vnode.patchFlag !== 0 &&
    vnode.patchFlag !== PatchFlags.HOISTED &&
    vnode.patchFlag !== PatchFlags.BAIL
  );
}

/**
 * 从 vnode 提取文本内容
 */
export function getVNodeText(vnode: VNode): string {
  if (vnode.children == null) return '';
  if (typeof vnode.children === 'string') return vnode.children;
  if (typeof vnode.children === 'number') return String(vnode.children);
  return '';
}

/**
 * 检查 vnode 是否有动态 children
 */
export function hasDynamicChildren(vnode: VNode): boolean {
  return vnode.dynamicChildren !== null && vnode.dynamicChildren.length > 0;
}

/**
 * 收集 vnode 树中所有动态 children（BFS）
 */
export function collectDynamicChildren(vnode: VNode): VNode[] {
  const result: VNode[] = [];
  const visited = new Set<VNode>();

  if (vnode.dynamicChildren) {
    const queue = [...vnode.dynamicChildren];
    let head = 0;
    while (head < queue.length) {
      const current = queue[head++]!;
      if (visited.has(current)) continue;
      visited.add(current);
      result.push(current);
      if (current.dynamicChildren) {
        for (let i = 0; i < current.dynamicChildren.length; i++) {
          queue.push(current.dynamicChildren[i]!);
        }
      }
    }
  }

  return result;
}

/**
 * 检查 vnode 是否有数组 children
 */
export function hasArrayChildren(vnode: VNode): boolean {
  return (vnode.shapeFlag & ShapeFlags.ARRAY_CHILDREN) !== 0;
}

/**
 * 检查 vnode 是否有文本 children
 */
export function hasTextChildren(vnode: VNode): boolean {
  return (vnode.shapeFlag & ShapeFlags.TEXT_CHILDREN) !== 0;
}

/**
 * 获取 vnode 的数组 children
 */
export function getArrayChildren(vnode: VNode): VNode[] {
  if (isArray(vnode.children)) return vnode.children;
  return [];
}
