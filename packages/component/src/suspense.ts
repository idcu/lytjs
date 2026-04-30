// src/suspense.ts
// Suspense component (simplified)

import type { ComponentInternalInstance, ComponentOptions } from "./types";
import { createComponentInstance, setupComponent } from "./component";

// ==================== Types ====================

export interface SuspenseProps {
  timeout?: number;
  onResolve?: () => void;
  onPending?: () => void;
  onError?: (error: Error) => void;
}

export interface SuspenseBoundary {
  isPending: boolean;
  error: Error | null;
  /** @deprecated 使用 pendingPromises 代替 */
  promise: Promise<any> | null;
  pendingPromises: Set<Promise<any>>;
  onResolve: (() => void)[];
  onPending: (() => void)[];
  onError: ((error: Error) => void)[];
}

// ==================== Suspense Component ====================

export const Suspense: ComponentOptions = {
  name: "Suspense",

  props: {
    timeout: { type: Number, default: undefined },
  },

  setup(_props: any, _ctx: any) {
    const boundary: SuspenseBoundary = {
      isPending: false,
      error: null,
      promise: null,
      pendingPromises: new Set(),
      onResolve: [],
      onPending: [],
      onError: [],
    };

    return {
      boundary,
    };
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
  const vnode = {
    type: Suspense,
    props: {
      timeout: props.timeout,
      onResolve: props.onResolve,
      onPending: props.onPending,
      onError: props.onError,
    },
    children: null,
  };

  const instance = createComponentInstance(vnode, parent);
  setupComponent(instance);
  return instance;
}

/**
 * Create a suspense boundary for managing async children.
 */
export function createSuspenseBoundary(): SuspenseBoundary {
  return {
    isPending: false,
    error: null,
    promise: null,
    pendingPromises: new Set(),
    onResolve: [],
    onPending: [],
    onError: [],
  };
}

/**
 * Register an async child with the suspense boundary.
 * Returns true if this is the first pending child (transition to pending).
 */
export function registerAsyncChild(
  boundary: SuspenseBoundary,
  promise: Promise<any>,
): boolean {
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
    .then((result: any) => {
      boundary.pendingPromises.delete(promise);
      // When all promises are resolved, transition to resolved
      if (boundary.pendingPromises.size === 0) {
        boundary.isPending = false;
        boundary.promise = null;
        // Call onResolve callbacks
        for (const cb of boundary.onResolve) {
          cb();
        }
      }
      return result;
    })
    .catch((err: Error) => {
      boundary.pendingPromises.delete(promise);
      boundary.error = err;
      // When all promises are settled, transition based on error state
      if (boundary.pendingPromises.size === 0) {
        boundary.isPending = false;
        boundary.promise = null;
        // Call onError callbacks (P1-16 fix: was incorrectly calling onPending)
        for (const cb of boundary.onError) {
          cb(err);
        }
      }
    });

  return !wasPending;
}

/**
 * Check if a suspense boundary is currently pending.
 */
export function isSuspensePending(boundary: SuspenseBoundary): boolean {
  return boundary.isPending;
}

/**
 * Get the error from a suspense boundary (if any).
 */
export function getSuspenseError(boundary: SuspenseBoundary): Error | null {
  return boundary.error;
}

/**
 * Resolve a suspense boundary manually.
 */
export function resolveSuspense(boundary: SuspenseBoundary): void {
  boundary.isPending = false;
  boundary.promise = null;
  boundary.error = null;
  boundary.pendingPromises.clear();
  for (const cb of boundary.onResolve) {
    cb();
  }
}

/**
 * Abort a suspense boundary (e.g., on unmount).
 */
export function abortSuspense(boundary: SuspenseBoundary): void {
  boundary.isPending = false;
  boundary.promise = null;
  boundary.pendingPromises.clear();
}
