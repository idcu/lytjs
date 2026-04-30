/**
 * @lytjs/vdom - utils
 * Utility functions for VNode inspection and manipulation
 */

import { PatchFlags, ShapeFlags } from "@lytjs/common-vnode";
import type { VNode } from "@lytjs/common-vnode";
import { isArray } from "@lytjs/common-is";

// ============================================================
// VNode inspection utilities
// ============================================================

/**
 * Check if a vnode is a static (hoisted) vnode
 */
export function isStaticVNode(vnode: VNode): boolean {
  return vnode.patchFlag === PatchFlags.HOISTED;
}

/**
 * Check if a vnode is a dynamic vnode (has patchFlag but not HOISTED)
 */
export function isDynamicVNode(vnode: VNode): boolean {
  return (
    vnode.patchFlag !== 0 &&
    vnode.patchFlag !== PatchFlags.HOISTED &&
    vnode.patchFlag !== PatchFlags.BAIL
  );
}

/**
 * Extract text content from a vnode
 */
export function getVNodeText(vnode: VNode): string {
  if (vnode.children == null) return "";
  if (typeof vnode.children === "string") return vnode.children;
  if (typeof vnode.children === "number") return String(vnode.children);
  return "";
}

/**
 * Check if a vnode has dynamic children
 */
export function hasDynamicChildren(vnode: VNode): boolean {
  return vnode.dynamicChildren !== null && vnode.dynamicChildren.length > 0;
}

/**
 * Collect all dynamic children in a vnode tree (BFS)
 */
export function collectDynamicChildren(vnode: VNode): VNode[] {
  const result: VNode[] = [];

  if (vnode.dynamicChildren) {
    const queue = [...vnode.dynamicChildren];
    let head = 0;
    while (head < queue.length) {
      const current = queue[head++]!;
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
 * Check if a vnode has array children
 */
export function hasArrayChildren(vnode: VNode): boolean {
  return (vnode.shapeFlag & ShapeFlags.ARRAY_CHILDREN) !== 0;
}

/**
 * Check if a vnode has text children
 */
export function hasTextChildren(vnode: VNode): boolean {
  return (vnode.shapeFlag & ShapeFlags.TEXT_CHILDREN) !== 0;
}

/**
 * Get the array children of a vnode
 */
export function getArrayChildren(vnode: VNode): VNode[] {
  if (isArray(vnode.children)) return vnode.children;
  return [];
}
