// src/suspense.ts
// Suspense component (simplified)

import type {
  ComponentInternalInstance,
  ComponentOptions,
  SetupContext,
} from "./types";
import { createComponentInstance, setupComponent } from "./component";
import { ShapeFlags, createBaseVNode } from "@lytjs/common-vnode";
import type { VNode } from "@lytjs/common-vnode";
import { error } from "@lytjs/common-error";

// ==================== Types ====================

/**
 * Error thrown when a Suspense boundary is aborted.
 * Contains the pendingId for error identification.
 */
export class SuspenseAbortedError extends Error {
  constructor(public pendingId: number) {
    super(`Suspense boundary (id: ${pendingId}) was aborted`);
    this.name = "SuspenseAbortedError";
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
}

// ==================== Suspense Component ====================

export const Suspense: ComponentOptions = {
  name: "Suspense",

  props: {
    timeout: { type: Number, default: undefined },
  },

  setup(_props: Record<string, unknown>, _ctx: SetupContext) {
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
      }
      return result;
    })
    .catch((err: Error) => {
      if (boundary.aborted) return;
      boundary.pendingPromises.delete(promise);
      boundary.error = err;
      // When all promises are settled, transition based on error state
      if (boundary.pendingPromises.size === 0) {
        boundary.isPending = false;
        boundary.promise = null;
        // Call onError callbacks (P1-16 fix: was incorrectly calling onPending)
        for (const cb of boundary.onError) {
          try {
            cb(err);
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
        if (typeof p.abort === "function") {
          p.abort(abortError);
        }
      } catch {
        // Ignore errors during abort
      }
    });
    boundary.pendingPromises.clear();
  }

  boundary.onResolve.length = 0;
  boundary.onPending.length = 0;
  boundary.onError.length = 0;
}
