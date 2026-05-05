/**
 * @lytjs/vdom - fragment
 * Fragment operations - standalone helpers for fragment vnode handling
 * FIX: P2-6 VDOM-NEW-13 - 片段（Fragment）优化
 */

import { Fragment, ShapeFlags, createBaseVNode } from '@lytjs/common-vnode';
import type { VNode } from '@lytjs/common-vnode';
import { isArray } from '@lytjs/common-is';

// ============================================================
// Fragment helpers
// ============================================================

// Re-export isFragment from common-vnode for backward compatibility
export { isFragment as isFragmentVNode } from '@lytjs/common-vnode';

/**
 * FIX: P2-6 VDOM-NEW-13 - Fragment children 扁平化优化
 * 递归扁平化嵌套的 Fragment children，减少 diff 层级
 */
export function flattenFragmentChildren(children: VNode[]): VNode[] {
  const flattened: VNode[] = [];
  
  for (const child of children) {
    if (!child) continue;
    
    // 如果子节点是 Fragment，递归扁平化其 children
    if (child.type === Fragment) {
      const fragmentChildren = getFragmentChildren(child);
      if (fragmentChildren.length > 0) {
        // 递归扁平化，处理嵌套 Fragment
        flattened.push(...flattenFragmentChildren(fragmentChildren));
      }
    } else {
      flattened.push(child);
    }
  }
  
  return flattened;
}

/**
 * FIX: P2-6 VDOM-NEW-13 - 优化后的 Fragment children 获取
 * 自动扁平化嵌套的 Fragment
 */
export function getFragmentChildren(vnode: VNode): VNode[] {
  if (vnode.type !== Fragment) return [];
  if (isArray(vnode.children)) {
    // FIX: P2-6 自动扁平化嵌套 Fragment
    return flattenFragmentChildren(vnode.children);
  }
  return [];
}

/**
 * FIX: P2-6 VDOM-NEW-13 - 优化后的 Fragment children 计数
 * 计算扁平化后的实际子节点数量
 */
export function getFragmentChildCount(vnode: VNode): number {
  if (vnode.type !== Fragment) return 0;
  return getFragmentChildren(vnode).length;
}

/**
 * FIX: P2-6 VDOM-NEW-13 - 优化的 Fragment 创建
 * 自动扁平化嵌套的 children
 */
export function createFragment(children: VNode[]): VNode {
  // 扁平化嵌套的 Fragment
  const flattenedChildren = flattenFragmentChildren(children);
  
  return createBaseVNode({
    type: Fragment,
    children: flattenedChildren,
    shapeFlag: ShapeFlags.ARRAY_CHILDREN,
  });
}

/**
 * FIX: P2-6 VDOM-NEW-13 - 检查是否为嵌套 Fragment
 * 用于优化决策
 */
export function hasNestedFragments(children: VNode[]): boolean {
  for (const child of children) {
    if (child && child.type === Fragment) {
      return true;
    }
  }
  return false;
}

/**
 * FIX: P2-6 VDOM-NEW-13 - 获取 Fragment 的第一个实际子节点
 * 用于锚点定位
 */
export function getFragmentFirstChild(vnode: VNode): VNode | null {
  const children = getFragmentChildren(vnode);
  return children.length > 0 ? children[0]! : null;
}

/**
 * FIX: P2-6 VDOM-NEW-13 - 获取 Fragment 的最后一个实际子节点
 * 用于锚点定位
 */
export function getFragmentLastChild(vnode: VNode): VNode | null {
  const children = getFragmentChildren(vnode);
  return children.length > 0 ? children[children.length - 1]! : null;
}
