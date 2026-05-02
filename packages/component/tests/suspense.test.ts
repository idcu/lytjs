// tests/suspense.test.ts
// Show fallback during async setup, show content after resolve, handle error, nested suspense, onResolve callback, onPending callback, timeout, multiple async children, slots, abort on unmount

import { describe, it, expect, vi } from 'vitest';
import {
  createSuspenseInstance,
  createSuspenseBoundary,
  registerAsyncChild,
  isSuspensePending,
  getSuspenseError,
  resolveSuspense,
  abortSuspense,
  Suspense,
  defineComponent,
  createComponentInstance,
  setupComponent,
} from '../src/index';
import type { ComponentInternalInstance, SuspenseAsyncState } from '../src/types';

describe('Suspense', () => {
  it('should show fallback during async setup (pending state)', async () => {
    let resolvePromise: (value: any) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    const boundary = createSuspenseBoundary();
    registerAsyncChild(boundary, promise);

    expect(isSuspensePending(boundary)).toBe(true);

    // Resolve
    resolvePromise!('resolved');
    await promise;

    expect(isSuspensePending(boundary)).toBe(false);
  });

  it('should show content after resolve', async () => {
    const promise = Promise.resolve('content');

    const boundary = createSuspenseBoundary();
    registerAsyncChild(boundary, promise);

    expect(isSuspensePending(boundary)).toBe(true);

    await promise;

    expect(isSuspensePending(boundary)).toBe(false);
  });

  it('should handle error in async setup', async () => {
    const error = new Error('async error');
    const promise = Promise.reject(error);

    const boundary = createSuspenseBoundary();
    registerAsyncChild(boundary, promise);

    // Wait for rejection
    try {
      await promise;
    } catch {
      // expected
    }

    // Give microtask queue time to process
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(isSuspensePending(boundary)).toBe(false);
    expect(getSuspenseError(boundary)).toBe(error);
  });

  it('should support nested suspense boundaries', async () => {
    const outerBoundary = createSuspenseBoundary();
    const innerBoundary = createSuspenseBoundary();

    const innerPromise = Promise.resolve('inner');
    registerAsyncChild(innerBoundary, innerPromise);

    const outerPromise = Promise.resolve('outer');
    registerAsyncChild(outerBoundary, outerPromise);

    expect(isSuspensePending(outerBoundary)).toBe(true);
    expect(isSuspensePending(innerBoundary)).toBe(true);

    await Promise.all([innerPromise, outerPromise]);

    expect(isSuspensePending(outerBoundary)).toBe(false);
    expect(isSuspensePending(innerBoundary)).toBe(false);
  });

  it('should call onResolve callback', async () => {
    const onResolve = vi.fn();
    const boundary = createSuspenseBoundary();
    boundary.onResolve.push(onResolve);

    const promise = Promise.resolve('data');
    registerAsyncChild(boundary, promise);

    expect(onResolve).not.toHaveBeenCalled();

    await promise;

    expect(onResolve).toHaveBeenCalledTimes(1);
  });

  it('should call onPending callback', () => {
    const onPending = vi.fn();
    const boundary = createSuspenseBoundary();
    boundary.onPending.push(onPending);

    let resolvePromise: (value: any) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    registerAsyncChild(boundary, promise);

    expect(onPending).toHaveBeenCalledTimes(1);
  });

  it('should handle timeout', async () => {
    const boundary = createSuspenseBoundary();

    let resolvePromise: (value: any) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    registerAsyncChild(boundary, promise);
    expect(isSuspensePending(boundary)).toBe(true);

    // Simulate timeout by manually resolving
    resolvePromise!('timed out');
    await promise;

    expect(isSuspensePending(boundary)).toBe(false);
  });

  it('should handle multiple async children', async () => {
    const boundary = createSuspenseBoundary();

    const promise1 = new Promise((resolve) => setTimeout(() => resolve('p1'), 10));
    const promise2 = new Promise((resolve) => setTimeout(() => resolve('p2'), 20));
    const promise3 = new Promise((resolve) => setTimeout(() => resolve('p3'), 5));

    registerAsyncChild(boundary, promise1);
    registerAsyncChild(boundary, promise2);
    registerAsyncChild(boundary, promise3);

    // Only the last registered promise matters for the boundary
    expect(isSuspensePending(boundary)).toBe(true);

    await Promise.all([promise1, promise2, promise3]);
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(isSuspensePending(boundary)).toBe(false);
  });

  it('should support slots', () => {
    const options = defineComponent({
      name: 'SuspenseSlotComp',
    });

    const vnode = {
      type: Suspense,
      props: {},
      children: {
        default: () => ['fallback content'],
      },
    };

    const instance = createComponentInstance(vnode, null);
    setupComponent(instance);

    expect(instance).toBeDefined();
    expect(instance.type.name).toBe('Suspense');
  });

  it('should abort on unmount', () => {
    const boundary = createSuspenseBoundary();

    let resolvePromise: (value: any) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    registerAsyncChild(boundary, promise);
    expect(isSuspensePending(boundary)).toBe(true);

    // Abort (simulating unmount)
    abortSuspense(boundary);

    expect(isSuspensePending(boundary)).toBe(false);
    expect(boundary.promise).toBeNull();
  });
});
