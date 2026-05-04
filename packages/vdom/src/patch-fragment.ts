/**
 * @lytjs/vdom - patch-fragment
 *
 * Fragment vnode 的挂载、更新和卸载逻辑。
 * 包含 mountFragment、patchFragment、unmountFragment 以及
 * diffStableFragment、diffUnkeyedFragment、diffChildrenFragment 等 diff 策略函数。
 */

import type { VNode, ComponentInternalInstance } from '@lytjs/common-vnode';
import { PatchFlags, isSameVNodeType } from '@lytjs/common-vnode';
import { isArray } from '@lytjs/common-is';
import type { SuspenseBoundary } from './types';
import type { RendererContext } from './patch-element';

// ============================================================
// Fragment patch factory
// ============================================================

export interface FragmentPatchAPI<HN, _HE extends HN> {
  mountFragment: (
    vnode: VNode,
    container: HN,
    anchor: HN | null,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
  ) => void;
  patchFragment: (
    n1: VNode,
    n2: VNode,
    container: HN,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
  ) => void;
  unmountFragment: (
    vnode: VNode,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    doRemove: boolean,
  ) => void;
}

/**
 * 创建 fragment 相关的 patch 函数集合。
 */
export function createFragmentPatch<HN, HE extends HN>(
  ctx: RendererContext<HN, HE>,
): FragmentPatchAPI<HN, HE> {
  const {
    createComment,
    insert,
    remove: hostRemove,
    setVNodeEl,
    getVNodeEl,
    patch,
    unmount,
    unmountChildren,
  } = ctx;

  // ============================================================
  // mountFragment
  // ============================================================

  function mountFragment(
    vnode: VNode,
    container: HN,
    anchor: HN | null,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
  ): void {
    const fragmentStartAnchor = createComment('');
    const fragmentEndAnchor = createComment('');
    setVNodeEl(vnode, fragmentStartAnchor);
    vnode.anchor = fragmentEndAnchor as unknown as Node | null;

    insert(fragmentStartAnchor, container, anchor);
    insert(fragmentEndAnchor, container, anchor);

    // Mount children between the anchors
    const children = isArray(vnode.children) ? vnode.children : [];
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (child != null) {
        patch(null, child, container, fragmentEndAnchor, parentComponent, parentSuspense, isSVG);
      }
    }
  }

  // ============================================================
  // patchFragment
  // ============================================================

  function patchFragment(
    n1: VNode,
    n2: VNode,
    container: HN,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
  ): void {
    // Reuse the existing fragment anchors
    n2.el = n1.el;
    const endAnchor = n1.anchor;
    if (!endAnchor) return;
    n2.anchor = endAnchor;

    const c1 = n1.children as VNode[] | null;
    const c2 = n2.children as VNode[] | null;

    // Both should be arrays for fragments
    if (isArray(c1) && isArray(c2)) {
      // Choose diff strategy based on fragment patchFlag
      if (n2.patchFlag & PatchFlags.STABLE_FRAGMENT) {
        // STABLE_FRAGMENT: children order never changes, patch by index directly
        diffStableFragment(c1, c2, container, endAnchor as HN, parentComponent, parentSuspense, isSVG);
      } else if (n2.patchFlag & PatchFlags.KEYED_FRAGMENT) {
        // KEYED_FRAGMENT: children have keys, use keyed diff algorithm
        diffChildrenFragment(c1, c2, container, endAnchor as HN, parentComponent, parentSuspense, isSVG);
      } else if (n2.patchFlag & PatchFlags.UNKEYED_FRAGMENT) {
        // UNKEYED_FRAGMENT: children have no keys, use simple sync-from-start strategy
        diffUnkeyedFragment(c1, c2, container, endAnchor as HN, parentComponent, parentSuspense, isSVG);
      } else {
        // No fragment-specific patchFlag, use default keyed diff
        diffChildrenFragment(c1, c2, container, endAnchor as HN, parentComponent, parentSuspense, isSVG);
      }
    } else if (isArray(c2)) {
      // Old was null/empty, mount all new before end anchor
      for (let i = 0; i < c2.length; i++) {
        patch(null, c2[i]!, container, endAnchor as HN, parentComponent, parentSuspense, isSVG);
      }
    } else if (isArray(c1)) {
      // New is null/empty, unmount all old
      unmountChildren(c1, parentComponent, parentSuspense);
    }
  }

  // ============================================================
  // diffStableFragment - STABLE_FRAGMENT: patch by index, skip key comparison
  // ============================================================

  function diffStableFragment(
    c1: VNode[],
    c2: VNode[],
    container: HN,
    endAnchor: HN,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
  ): void {
    const commonLength = Math.min(c1.length, c2.length);
    // Patch common prefix by index (no key comparison needed)
    for (let i = 0; i < commonLength; i++) {
      patch(c1[i]!, c2[i]!, container, null, parentComponent, parentSuspense, isSVG);
    }
    // Mount extra new children
    if (c2.length > c1.length) {
      for (let i = commonLength; i < c2.length; i++) {
        patch(null, c2[i]!, container, endAnchor, parentComponent, parentSuspense, isSVG);
      }
    }
    // Unmount extra old children
    else if (c1.length > c2.length) {
      for (let i = commonLength; i < c1.length; i++) {
        unmount(c1[i]!, parentComponent, parentSuspense, true);
      }
    }
  }

  // ============================================================
  // diffUnkeyedFragment - UNKEYED_FRAGMENT: simple sync-from-start strategy
  // ============================================================

  function diffUnkeyedFragment(
    c1: VNode[],
    c2: VNode[],
    container: HN,
    endAnchor: HN,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
  ): void {
    // Sync from start: patch nodes with the same type at the same index
    let i = 0;
    const l1 = c1.length;
    const l2 = c2.length;

    while (i < l1 && i < l2) {
      if (isSameVNodeType(c1[i]!, c2[i]!)) {
        patch(c1[i]!, c2[i]!, container, null, parentComponent, parentSuspense, isSVG);
      } else {
        // Type mismatch: unmount old, mount new
        unmount(c1[i]!, parentComponent, parentSuspense, true);
        patch(null, c2[i]!, container, null, parentComponent, parentSuspense, isSVG);
      }
      i++;
    }

    // Mount remaining new children
    while (i < l2) {
      patch(null, c2[i]!, container, endAnchor, parentComponent, parentSuspense, isSVG);
      i++;
    }

    // Unmount remaining old children
    while (i < l1) {
      unmount(c1[i]!, parentComponent, parentSuspense, true);
      i++;
    }
  }

  // ============================================================
  // diffChildrenFragment - like diffChildren but uses endAnchor as fallback
  // ============================================================

  function diffChildrenFragment(
    c1: VNode[],
    c2: VNode[],
    container: HN,
    endAnchor: HN,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
  ): void {
    ctx.diffChildrenInternal(c1, c2, container, parentComponent, parentSuspense, isSVG, endAnchor);
  }

  // ============================================================
  // unmountFragment
  // ============================================================

  function unmountFragment(
    vnode: VNode,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    doRemove: boolean,
  ): void {
    const { children } = vnode;
    if (isArray(children)) {
      for (let i = 0; i < children.length; i++) {
        unmount(children[i]!, parentComponent, parentSuspense, doRemove);
      }
    }

    if (doRemove) {
      // Remove fragment anchors
      const vEl = getVNodeEl(vnode);
      if (vEl) {
        hostRemove(vEl);
      }
      if (vnode.anchor && vnode.anchor !== vnode.el) {
        hostRemove(vnode.anchor as unknown as HN);
      }
    }
  }

  return {
    mountFragment,
    patchFragment,
    unmountFragment,
  };
}
