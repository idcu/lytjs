/**
 * @lytjs/vdom - fragment
 * Fragment operations - standalone helpers for fragment vnode handling
 */

import { Fragment } from "@lytjs/common-vnode";
import type { VNode } from "@lytjs/common-vnode";
import { isArray } from "@lytjs/common-is";

// ============================================================
// Fragment helpers
// ============================================================

/**
 * Check if a vnode is a Fragment
 */
export function isFragmentVNode(vnode: VNode): boolean {
  return vnode.type === Fragment;
}

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
  return {
    type: Fragment,
    key: null,
    ref: null,
    isStatic: false,
    isStaticRoot: false,
    isOnce: false,
    isAsyncPlaceholder: false,
    isComment: false,
    isCloned: false,
    isBlockTree: false,
    shapeFlag: 16, // ARRAY_CHILDREN
    patchFlag: 0,
    dynamicProps: null,
    dynamicChildren: null,
    children,
    component: null,
    el: null,
    anchor: null,
    target: null,
    targetAnchor: null,
    targetStart: null,
    loc: null,
    __v_isVNode: true,
  };
}
