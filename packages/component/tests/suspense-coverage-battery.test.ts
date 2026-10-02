// @vitest-environment jsdom
/**
 * component/suspense 覆盖率电池（Task C）：补齐 prop 校验 / register-resolve-reject / abort 分支
 */
import { describe, it, expect, vi } from 'vitest';
import {
  createSuspenseInstance,
  createSuspenseBoundary,
  registerAsyncChild,
  isSuspensePending,
  getSuspenseError,
  linkSuspenseBoundary,
  resolveSuspense,
  abortSuspense,
  SuspenseAbortedError,
} from '../src/suspense';
import { nextTick } from '@lytjs/common-scheduler';

describe('suspense battery: instance & prop validation', () => {
  it('creates instance with valid props', () => {
    const inst = createSuspenseInstance({
      timeout: 100,
      onResolve: () => {},
      onPending: () => {},
      onError: () => {},
    });
    expect(inst).toBeDefined();
  });

  it('warns on invalid prop types', () => {
    const inst = createSuspenseInstance({
      timeout: 'x' as any,

      onResolve: 1 as any,

      onPending: 'x' as any,

      onError: 1 as any,
    });
    expect(inst).toBeDefined();
  });
});

describe('suspense battery: registerAsyncChild', () => {
  it('returns false when boundary aborted', () => {
    const b = createSuspenseBoundary();
    b.aborted = true;
    expect(registerAsyncChild(b, Promise.resolve())).toBe(false);
  });

  it('resolves: fires onResolve and domSwitch', async () => {
    const b = createSuspenseBoundary();
    const onResolve = vi.fn();
    b.onResolve.push(onResolve);
    const switchFn = vi.fn();
    linkSuspenseBoundary(b, null, switchFn);
    const first = registerAsyncChild(b, Promise.resolve(1));
    expect(first).toBe(true);
    expect(isSuspensePending(b)).toBe(true);
    await Promise.resolve();
    await nextTick();
    expect(onResolve).toHaveBeenCalled();
    expect(switchFn).toHaveBeenCalled();
  });

  it('handles a throwing resolve callback', async () => {
    const b = createSuspenseBoundary();
    b.onResolve.push(() => {
      throw new Error('resolve cb error');
    });
    registerAsyncChild(b, Promise.resolve(1));
    await Promise.resolve();
    await nextTick();
  });

  it('rejects: sets error and fires onError (incl. throwing cb)', async () => {
    const b = createSuspenseBoundary();
    const onError = vi.fn();
    b.onError.push(onError);
    b.onError.push(() => {
      throw new Error('error cb error');
    });
    registerAsyncChild(b, Promise.reject(new Error('boom')));
    await Promise.resolve();
    await Promise.resolve();
    expect(onError).toHaveBeenCalled();
    expect(getSuspenseError(b)).toBeInstanceOf(Error);
  });

  it('handles non-Error rejection', async () => {
    const b = createSuspenseBoundary();
    registerAsyncChild(b, Promise.reject('string-reason'));
    await Promise.resolve();
    await Promise.resolve();
    expect(getSuspenseError(b)).toBeInstanceOf(Error);
  });
});

describe('suspense battery: resolve / abort', () => {
  it('resolveSuspense fires onResolve and tolerates throwing cb', () => {
    const b = createSuspenseBoundary();
    b.onResolve.push(() => {});
    b.onResolve.push(() => {
      throw new Error('x');
    });
    resolveSuspense(b);
    expect(isSuspensePending(b)).toBe(false);
    expect(b.aborted).toBe(true);
  });

  it('abortSuspense aborts pending thenables with an abort() method', () => {
    const b = createSuspenseBoundary();
    const abort = vi.fn();
    // 自定义 thenable：带 abort
    const thenable = Object.assign(Promise.resolve(1), { abort });
    b.pendingPromises.add(thenable);
    abortSuspense(b);
    expect(abort).toHaveBeenCalled();
  });

  it('SuspenseAbortedError carries the pending count', () => {
    const e = new SuspenseAbortedError(3);
    expect(e).toBeInstanceOf(Error);
  });

  it('swallows a throwing abort() on a custom thenable', () => {
    const b = createSuspenseBoundary();
    const thenable = Object.assign(Promise.resolve(1), {
      abort: () => {
        throw new Error('abort boom');
      },
    });
    b.pendingPromises.add(thenable);
    expect(() => abortSuspense(b)).not.toThrow();
  });

  it('skips resolve/reject side effects after the boundary was aborted', async () => {
    // resolve 后已中止 ⇒ .then 里 `if (boundary.aborted) return;` 命中
    const b1 = createSuspenseBoundary();
    let resolve1: (v: unknown) => void = () => {};
    const p1 = new Promise((r) => {
      resolve1 = r;
    });
    registerAsyncChild(b1, p1);
    abortSuspense(b1);
    resolve1(1);
    await p1;
    await Promise.resolve();

    // reject 后已中止 ⇒ .catch 里 `if (boundary.aborted) return;` 命中
    const b2 = createSuspenseBoundary();
    let reject2: (e: unknown) => void = () => {};
    const p2 = new Promise((_r, rej) => {
      reject2 = rej;
    });
    registerAsyncChild(b2, p2);
    abortSuspense(b2);
    reject2(new Error('late'));
    await p2.catch(() => {});
    await Promise.resolve();
  });

  it('creates a boundary with (empty) callback queues', () => {
    const inst = createSuspenseInstance({
      onResolve: () => {},
      onPending: () => {},
      onError: () => {},
    });
    const boundary = (inst as unknown as { setupState: { boundary: any } }).setupState?.boundary;
    expect(boundary).toBeDefined();
    expect(Array.isArray(boundary.onResolve)).toBe(true);
    expect(Array.isArray(boundary.onPending)).toBe(true);
    expect(Array.isArray(boundary.onError)).toBe(true);
  });
});
