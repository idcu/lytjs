/**
 * @lytjs/vdom - patch-suspense
 *
 * Suspense vnode 的挂载、更新和卸载逻辑。
 * 包含 mountSuspense、patchSuspense、unmountSuspense、resolveSuspenseChildren 函数。
 */

import type { VNode, ComponentInternalInstance } from '@lytjs/common-vnode';
import { isSameVNodeType } from '@lytjs/common-vnode';
import { isArray } from '@lytjs/common-is';

declare const __DEV__: boolean;

/** FIX: P2-14 fallback 层级限制，防止无限嵌套 suspense */
const MAX_SUSPENSE_DEPTH = 10;
import type { SuspenseBoundary } from './types';
import type { RendererContext } from './patch-element';

// ============================================================
// Cross-package linker registration (avoids circular dependency)
// ============================================================

type SuspenseLinkerFn = (
  asyncState: unknown,
  vnodeBoundary: SuspenseBoundary,
  domSwitch: (boundary: unknown, toFallback: boolean) => void,
) => void;

let suspenseLinker: SuspenseLinkerFn | null = null;

/**
 * Register a linker function that connects the vdom-layer SuspenseBoundary
 * with the component-layer SuspenseAsyncState.
 *
 * Called by @lytjs/component during initialization to avoid circular imports.
 */
export function registerSuspenseLinker(linker: SuspenseLinkerFn): void {
  suspenseLinker = linker;
}

// ============================================================
// Suspense patch factory
// ============================================================

export interface SuspensePatchAPI<HN, _HE extends HN> {
  mountSuspense: (
    vnode: VNode,
    container: HN,
    anchor: HN | null,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
  ) => void;
  patchSuspense: (
    n1: VNode,
    n2: VNode,
    container: HN,
    anchor: HN | null,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
  ) => void;
  unmountSuspense: (
    vnode: VNode,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    doRemove: boolean,
  ) => void;
  resolveSuspenseChildren: (
    children: VNode['children'],
  ) => { defaultBranch: VNode | null; fallbackBranch: VNode | null };
}

/**
 * 创建 suspense 相关的 patch 函数集合。
 */
export function createSuspensePatch<HN, HE extends HN>(
  ctx: RendererContext<HN, HE>,
): SuspensePatchAPI<HN, HE> {
  const {
    createComment,
    insert,
    remove: hostRemove,
    setVNodeEl,
    getVNodeEl,
    patch,
    unmount,
  } = ctx;

  // ============================================================
  // resolveSuspenseChildren
  // ============================================================

  /**
   * Extract default and fallback branches from vnode children.
   * Children can be:
   * - VNode[] (default slot only, no fallback)
   * - { default: VNode[], fallback?: VNode[] } (named slots)
   */
  function resolveSuspenseChildren(
    children: VNode['children'],
  ): { defaultBranch: VNode | null; fallbackBranch: VNode | null } {
    if (isArray(children)) {
      // VNode[]: treat as default slot, no fallback
      return {
        defaultBranch: children[0] ?? null,
        fallbackBranch: null,
      };
    }

    if (children && typeof children === 'object' && !isArray(children)) {
      // Slot object: { default: VNode[], fallback?: VNode[] }
      const slots = children as Record<string, VNode[]>;
      const defaultSlot = slots.default;
      const fallbackSlot = slots.fallback;
      return {
        defaultBranch: isArray(defaultSlot) ? (defaultSlot[0] ?? null) : null,
        fallbackBranch: isArray(fallbackSlot) ? (fallbackSlot[0] ?? null) : null,
      };
    }

    return { defaultBranch: null, fallbackBranch: null };
  }

  // ============================================================
  // mountSuspense
  // ============================================================

  function mountSuspense(
    vnode: VNode,
    container: HN,
    anchor: HN | null,
    parentComponent: ComponentInternalInstance | null,
    _parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
  ): void {
    // Create a SuspenseBoundary and store it on the vnode
    const boundary: SuspenseBoundary = {
      vnode,
      parent: parentComponent,
      parentComponent,
      isSVG,
      container,
      anchor,
      activeBranch: null,
      pendingBranch: null,
      isInFallback: false,
      isHydrating: false,
      effects: [],
    };

    vnode.suspense = boundary;

    // Link vdom-layer SuspenseBoundary with component-layer SuspenseAsyncState
    // if the linker has been registered by @lytjs/component.
    if (suspenseLinker && vnode.component) {
      const setupState = (vnode.component as ComponentInternalInstance).setupState;
      if (setupState && typeof setupState === 'object' && 'boundary' in setupState) {
        const asyncState = setupState.boundary;
        if (asyncState && typeof asyncState === 'object') {
          suspenseLinker(asyncState, boundary, (_boundary: unknown, toFallback: boolean) => {
            // domSwitch: toggle between default and fallback branches
            const b = _boundary as { vnodeBoundary?: SuspenseBoundary & { isInFallback: boolean } };
            const vb = b.vnodeBoundary;
            if (!vb) return;
            if (toFallback && !vb.isInFallback) {
              // Switch to fallback: handled by patchSuspense on next update
              vb.isInFallback = true;
            } else if (!toFallback && vb.isInFallback) {
              // Switch back to default: handled by patchSuspense on next update
              vb.isInFallback = false;
            }
          });
        }
      }
    }

    // Resolve default and fallback branches from children
    const { defaultBranch, fallbackBranch } = resolveSuspenseChildren(vnode.children);

    // Check if the default branch contains async components
    const isAsync = defaultBranch?.isAsyncPlaceholder === true;

    if (isAsync && fallbackBranch) {
      // Async content: mount fallback as pendingBranch
      boundary.isInFallback = true;
      boundary.pendingBranch = defaultBranch;
      boundary.activeBranch = null;

      // Mount the fallback content
      patch(null, fallbackBranch, container, anchor, parentComponent, boundary, isSVG);
      vnode.el = fallbackBranch.el;
    } else {
      // Sync content: mount default as activeBranch
      boundary.activeBranch = defaultBranch;

      if (defaultBranch) {
        patch(null, defaultBranch, container, anchor, parentComponent, boundary, isSVG);
        vnode.el = defaultBranch.el;
      }
    }

    // Create placeholder comment node if no el was set
    if (!vnode.el) {
      const placeholder = createComment('');
      setVNodeEl(vnode, placeholder);
      insert(placeholder, container, anchor);
    }
  }

  // ============================================================
  // patchSuspense
  // ============================================================

  function patchSuspense(
    n1: VNode,
    n2: VNode,
    container: HN,
    anchor: HN | null,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
  ): void {
    // Reuse the existing boundary
    const boundary = n1.suspense as SuspenseBoundary | undefined;
    if (boundary) {
      n2.suspense = boundary;
      boundary.vnode = n2;
    }

    n2.el = n1.el;

    // Resolve new children
    const { defaultBranch: newDefault, fallbackBranch: newFallback } =
      resolveSuspenseChildren(n2.children);

    // Check if we need to transition from pending to resolved
    const wasInFallback = boundary?.isInFallback ?? false;
    const isAsync = newDefault?.isAsyncPlaceholder === true;

    if (wasInFallback && !isAsync) {
      // Transition: pending -> resolved
      // Unmount the fallback (pendingBranch display) and mount the active content
      if (boundary) {
        boundary.isInFallback = false;
        boundary.activeBranch = newDefault;
        boundary.pendingBranch = null;
      }

      // Unmount old fallback content (was displayed as the pending branch)
      if (!isArray(n1.children) && n1.children && typeof n1.children === 'object') {
        const slots = n1.children as Record<string, VNode[]>;
        const fallbackSlot = slots.fallback;
        if (isArray(fallbackSlot) && fallbackSlot[0]) {
          unmount(fallbackSlot[0], parentComponent, parentSuspense, true);
        }
      }

      // Mount the new active content
      if (newDefault) {
        patch(null, newDefault, container, anchor, parentComponent, boundary ?? parentSuspense, isSVG);
        n2.el = newDefault.el;
      }
    } else if (!wasInFallback && isAsync && newFallback) {
      // Transition: resolved -> pending
      // Unmount the active content and mount the fallback
      if (boundary) {
        boundary.isInFallback = true;
        boundary.pendingBranch = newDefault;
      }

      // Unmount old active content (save reference before clearing)
      const oldActive = boundary?.activeBranch ?? null;
      if (boundary) {
        boundary.activeBranch = null;
      }
      if (oldActive) {
        unmount(oldActive, parentComponent, parentSuspense, true);
      }

      // Mount the fallback
      patch(null, newFallback, container, anchor, parentComponent, boundary ?? parentSuspense, isSVG);
      n2.el = newFallback.el;
    } else {
      // No state transition: patch the active branch normally
      const oldActive = n1.children as VNode[] | null;
      const newActive = n2.children as VNode[] | null;

      if (isArray(oldActive) && isArray(newActive)) {
        const oldBranch = oldActive[0] ?? null;
        const newBranch = newActive[0] ?? null;

        if (oldBranch && newBranch && isSameVNodeType(oldBranch, newBranch)) {
          patch(oldBranch, newBranch, container, anchor, parentComponent, parentSuspense, isSVG);
        } else {
          if (oldBranch) {
            unmount(oldBranch, parentComponent, parentSuspense, true);
          }
          if (newBranch) {
            patch(null, newBranch, container, anchor, parentComponent, parentSuspense, isSVG);
          }
        }

        if (boundary) {
          boundary.activeBranch = newBranch;
        }
      }
    }
  }

  // ============================================================
  // unmountSuspense
  // ============================================================

  function unmountSuspense(
    vnode: VNode,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    doRemove: boolean,
  ): void {
    // FIX: P1-14 添加 unmountedSet 防止重复卸载，
    // 避免在 activeBranch 和 fallbackBranch 指向同一 VNode 时重复卸载
    const unmountedSet = new Set<VNode>();

    const safeUnmount = (v: VNode) => {
      if (unmountedSet.has(v)) return;
      unmountedSet.add(v);
      unmount(v, parentComponent, parentSuspense, doRemove);
    };

    const boundary = vnode.suspense as SuspenseBoundary | undefined;

    // Unmount the active branch
    if (boundary?.activeBranch) {
      safeUnmount(boundary.activeBranch);
    }

    // Unmount the pending branch (if still mounted)
    if (boundary?.pendingBranch) {
      safeUnmount(boundary.pendingBranch);
    }

    // Also unmount any remaining children from vnode.children
    // (fallback content that may have been mounted)
    const { fallbackBranch: unmountFallback } = resolveSuspenseChildren(vnode.children);
    if (boundary?.isInFallback && unmountFallback) {
      // Fallback was mounted, unmount it
      // (it may already be unmounted via activeBranch above if it was tracked)
      if (unmountFallback.el) {
        safeUnmount(unmountFallback);
      }
    }

    // Clean up boundary
    if (boundary) {
      boundary.activeBranch = null;
      boundary.pendingBranch = null;
      boundary.effects = [];
    }

    if (doRemove) {
      const vEl = getVNodeEl(vnode);
      if (vEl) hostRemove(vEl);
    }
  }

  return {
    mountSuspense,
    patchSuspense,
    unmountSuspense,
    resolveSuspenseChildren,
  };
}
