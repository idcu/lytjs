/**
 * @lytjs/vdom - fragment
 * Fragment operations - standalone helpers for fragment vnode handling
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
 * Get the children array from a fragment vnode
 */
export function getFragmentChildren(vnode: VNode): VNode[] {
  if (vnode.type !== Fragment) return [];
  if (isArray(vnode.children)) return vnode.children;
  return [];
}

/**
 * Count the number of children in a fragment
 */
export function getFragmentChildCount(vnode: VNode): number {
  if (vnode.type !== Fragment) return 0;
  if (isArray(vnode.children)) return vnode.children.length;
  return 0;
}

/**
 * Create a fragment vnode with the given children
 */
export function createFragment(children: VNode[]): VNode {
  return createBaseVNode({
    type: Fragment,
    children,
    shapeFlag: ShapeFlags.ARRAY_CHILDREN,
  });
}
