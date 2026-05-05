// src/suspense.ts
// Suspense component

import type { ComponentInternalInstance, ComponentOptions, SetupContext } from './types';
import { createComponentInstance, setupComponent } from './component';
import { ShapeFlags, createBaseVNode } from '@lytjs/common-vnode';
import type { VNode } from '@lytjs/common-vnode';
import { error, warn } from '@lytjs/common-error';
import { nextTick } from '@lytjs/common-scheduler';
import { registerSuspenseLinker } from '@lytjs/vdom';

// ============================================================
// Register cross-package suspense boundary linker
// ============================================================

// This links the vdom-layer SuspenseBoundary with the component-layer
// SuspenseAsyncState so that async state changes can drive DOM switching.
let _linkerRegistered = false;
function ensureLinkerRegistered(): void {
  if (_linkerRegistered) return;
  _linkerRegistered = true;
  registerSuspenseLinker(
    (asyncState: SuspenseAsyncState, vnodeBoundary: SuspenseAsyncState['vnodeBoundary'], domSwitch: SuspenseAsyncState['domSwitch']) => {
      linkSuspenseBoundary(asyncState, vnodeBoundary, domSwitch);
    },
  );
}

// ==================== Types ====================

/**
 * Error thrown when a Suspense boundary is aborted.
 * Contains the pendingId for error identification.
 */
export class SuspenseAbortedError extends Error {
  constructor(public pendingId: number) {
    super(`Suspense boundary (id: ${pendingId}) was aborted`);
    this.name = 'SuspenseAbortedError';
  }
}

export interface SuspenseProps {
  timeout?: number;
  onResolve?: () => void;
  onPending?: () => void;
  onError?: (error: Error) => void;
}

export interface SuspenseAsyncState {
  isPending: boolean;
  error: Error | null;
  /** @deprecated 使用 pendingPromises 代替 */
  promise: Promise<unknown> | null;
  pendingPromises: Set<Promise<unknown>>;
  onResolve: (() => void)[];
  onPending: (() => void)[];
  onError: ((error: Error) => void)[];
  aborted: boolean;
  /**
   * 关联的 vdom 层 SuspenseBoundary 引用。
   * 当异步状态变化时，通过此引用驱动 DOM 切换。
   */
  vnodeBoundary?: {
    vnode: VNode;
    container: unknown;
    anchor: unknown;
    parentComponent: ComponentInternalInstance | null;
    isSVG: boolean;
    isInFallback: boolean;
    activeBranch: VNode | null;
    pendingBranch: VNode | null;
  };
  /**
   * DOM 切换函数，由 vdom 层的 patch 函数提供。
   * 用于在 pending/resolve 状态变化时执行实际的 DOM 操作。
   */
  domSwitch?: (boundary: SuspenseAsyncState, toFallback: boolean) => void;
}

// ==================== Suspense Component ====================

export const Suspense: ComponentOptions = {
  name: 'Suspense',

  props: {
    timeout: { type: Number, default: undefined },
  },

  setup(_props: Record<string, unknown>, _ctx: SetupContext) {
    // Ensure the cross-package linker is registered so vdom can call linkSuspenseBoundary
    ensureLinkerRegistered();

    // __DEV__ mode: validate props types
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      const props = _props as SuspenseProps;
      if (props.timeout !== undefined && typeof props.timeout !== 'number') {
        warn(`[Suspense] Invalid prop: timeout should be a number, got ${typeof props.timeout}.`);
      }
      if (props.onResolve !== undefined && typeof props.onResolve !== 'function') {
        warn(
          `[Suspense] Invalid prop: onResolve should be a function, got ${typeof props.onResolve}.`,
        );
      }
      if (props.onPending !== undefined && typeof props.onPending !== 'function') {
        warn(
          `[Suspense] Invalid prop: onPending should be a function, got ${typeof props.onPending}.`,
        );
      }
      if (props.onError !== undefined && typeof props.onError !== 'function') {
        warn(`[Suspense] Invalid prop: onError should be a function, got ${typeof props.onError}.`);
      }
    }

    const boundary: SuspenseAsyncState = {
      isPending: false,
      error: null,
      promise: null,
      pendingPromises: new Set(),
      onResolve: [],
      onPending: [],
      onError: [],
      aborted: false,
    };

    const props = _props as SuspenseProps;
    if (props.onResolve) boundary.onResolve.push(props.onResolve);
    if (props.onPending) boundary.onPending.push(props.onPending);
    if (props.onError) boundary.onError.push(props.onError);

    return {
      boundary,
    } as Record<string, unknown>;
  },
};

// ==================== Suspense helpers ====================

/**
 * Create a Suspense component instance.
 */
export function createSuspenseInstance(
  props: SuspenseProps = {},
  parent: ComponentInternalInstance | null = null,
): ComponentInternalInstance {
  const vnode: VNode = createBaseVNode({
    type: Suspense,
    props: {
      timeout: props.timeout,
      onResolve: props.onResolve,
      onPending: props.onPending,
      onError: props.onError,
    },
    shapeFlag: ShapeFlags.SUSPENSE | ShapeFlags.STATEFUL_COMPONENT,
  });

  const instance = createComponentInstance(vnode, parent);
  setupComponent(instance);
  return instance;
}

/**
 * Create a suspense boundary for managing async children.
 */
export function createSuspenseBoundary(): SuspenseAsyncState {
  return {
    isPending: false,
    error: null,
    promise: null,
    pendingPromises: new Set(),
    onResolve: [],
    onPending: [],
    onError: [],
    aborted: false,
  };
}

/**
 * Register an async child with the suspense boundary.
 * Returns true if this is the first pending child (transition to pending).
 */
export function registerAsyncChild(
  boundary: SuspenseAsyncState,
  promise: Promise<unknown>,
): boolean {
  if (boundary.aborted) return false;

  const wasPending = boundary.isPending;
  boundary.isPending = true;
  boundary.error = null;

  // Track this promise in the set
  boundary.pendingPromises.add(promise);

  // Call onPending callbacks only on first pending child
  if (!wasPending) {
    for (const cb of boundary.onPending) {
      cb();
    }
    // 触发 DOM 切换：显示 fallback slot
    if (boundary.domSwitch) {
      const switchFn = boundary.domSwitch;
      nextTick(() => {
        if (!boundary.aborted) {
          switchFn(boundary, true);
        }
      });
    }
  }

  promise
    .then((result: unknown) => {
      if (boundary.aborted) return;
      boundary.pendingPromises.delete(promise);
      // When all promises are resolved, transition to resolved
      if (boundary.pendingPromises.size === 0) {
        boundary.isPending = false;
        boundary.promise = null;
        // Call onResolve callbacks
        for (const cb of boundary.onResolve) {
          try {
            cb();
          } catch (e) {
            error(`Error in suspense resolve callback: ${String(e)}`);
          }
        }
        // 触发 DOM 切换：从 fallback 切回 default slot
        if (boundary.domSwitch) {
          const switchFn = boundary.domSwitch;
          nextTick(() => {
            if (!boundary.aborted) {
              switchFn(boundary, false);
            }
          });
        }
      }
      return result;
    })
    .catch((err: unknown) => {
      if (boundary.aborted) return;
      boundary.pendingPromises.delete(promise);
      const caughtError = err instanceof Error ? err : new Error(String(err));
      boundary.error = caughtError;
      // When all promises are settled, transition based on error state
      if (boundary.pendingPromises.size === 0) {
        boundary.isPending = false;
        boundary.promise = null;
        // Call onError callbacks (P1-16 fix: was incorrectly calling onPending)
        for (const cb of boundary.onError) {
          try {
            cb(caughtError);
          } catch (e) {
            error(`Error in suspense error callback: ${String(e)}`);
          }
        }
      }
    });

  return !wasPending;
}

/**
 * Check if a suspense boundary is currently pending.
 */
export function isSuspensePending(boundary: SuspenseAsyncState): boolean {
  return boundary.isPending;
}

/**
 * Get the error from a suspense boundary (if any).
 */
export function getSuspenseError(boundary: SuspenseAsyncState): Error | null {
  return boundary.error;
}

/**
 * 将 vdom 层的 SuspenseBoundary 与 component 层的 SuspenseAsyncState 关联。
 * 由 vdom 的 mountSuspense 调用，使异步状态变化能驱动 DOM 切换。
 */
export function linkSuspenseBoundary(
  asyncState: SuspenseAsyncState,
  vnodeBoundary: SuspenseAsyncState['vnodeBoundary'],
  domSwitch: SuspenseAsyncState['domSwitch'],
): void {
  asyncState.vnodeBoundary = vnodeBoundary;
  asyncState.domSwitch = domSwitch;
}

/**
 * Resolve a suspense boundary manually.
 */
export function resolveSuspense(boundary: SuspenseAsyncState): void {
  boundary.isPending = false;
  boundary.aborted = true;
  boundary.promise = null;
  boundary.error = null;
  boundary.pendingPromises.clear();
  for (const cb of boundary.onResolve) {
    try {
      cb();
    } catch (e) {
      error(`Error in suspense resolve callback: ${String(e)}`);
    }
  }
}

/**
 * Abort a suspense boundary (e.g., on unmount).
 * Rejects all pending promises to prevent memory leaks and allows
 * downstream consumers to handle the abort via .catch().
 */
export function abortSuspense(boundary: SuspenseAsyncState): void {
  boundary.aborted = true;
  boundary.isPending = false;
  boundary.promise = null;

  // Reject all pending promises to prevent memory leaks.
  // Since native JavaScript Promises cannot be externally rejected,
  // we attempt to call an abort method if the promise is a custom thenable.
  // For native promises, we rely on the aborted flag which causes
  // .then()/.catch() callbacks in registerAsyncChild to skip side effects.
  if (boundary.pendingPromises.size > 0) {
    const abortError = new SuspenseAbortedError(0);
    boundary.pendingPromises.forEach((promise) => {
      try {
        // If the promise has an abort method (custom thenable), call it
        const p = promise as unknown as Record<string, unknown>;
        if (typeof p.abort === 'function') {
          p.abort(abortError);
        }
      } catch {
        // Ignore errors during abort
      }
    });
    boundary.pendingPromises.clear();
  }

  // 清空所有回调数组，防止 abort 后仍被调用导致内存泄漏或无效操作。
  // 使用 length = 0 方式清空数组，保持数组引用不变（避免影响外部持有的引用）。
  boundary.onResolve.length = 0;
  boundary.onPending.length = 0;
  boundary.onError.length = 0;
}
