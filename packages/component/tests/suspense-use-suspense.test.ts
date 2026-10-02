// tests/suspense-use-suspense.test.ts
// useSuspense 的契约：**只注册**，不返回数据、不挂起渲染。
//
// 背景：本仓不支持 React 风格「throw promise」的读取模式（全仓没有任何
// 「捕获被抛出的 Promise 以挂起」的分支）。此前该函数声明返回 `T` 却
// `return undefined as T`，是类型谎言；本文件把「诚实契约」钉住。

import { describe, it, expect, vi } from 'vitest';
import { useSuspense, createSuspenseBoundary, Suspense } from '../src/suspense';
import { setCurrentInstance } from '../src/lifecycle';
import type { SuspenseAsyncState } from '../src/suspense';
import type { ComponentInternalInstance } from '../src/types';

/**
 * 造一个「当前实例」，其父链上有一个已挂 boundary 的 Suspense 实例，
 * 使 `findNearestSuspenseBoundary` 命中我们提供的边界。
 */
function runWithSuspenseParent<T>(boundary: SuspenseAsyncState, fn: () => T): T {
  const suspenseInstance = {
    type: Suspense,
    setupState: { boundary },
    parent: null,
  } as unknown as ComponentInternalInstance;
  const instance = {
    type: {},
    setupState: {},
    parent: suspenseInstance,
  } as unknown as ComponentInternalInstance;

  setCurrentInstance(instance);
  try {
    return fn();
  } finally {
    setCurrentInstance(null);
  }
}

/** 让已 settle 的 Promise 的 then/catch 回调执行完 */
async function flushMicrotasks(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('useSuspense —— 只注册，不返回、不挂起', () => {
  it('★ 返回该 Promise 本身（调用方 await 它即可挂起首帧）', async () => {
    const boundary = createSuspenseBoundary();
    const promise = Promise.resolve(42);
    const returned = runWithSuspenseParent(boundary, () => useSuspense(promise));

    // 判别点一（运行期，**强判别**）：旧实现 `return undefined as T` ⇒ 这里会得到
    // undefined，断言「返回同一个 Promise」在旧版上必红。
    expect(returned).toBe(promise);
    await expect(returned).resolves.toBe(42);

    // 判别点二（arity）：`_key` 死形参已删除 —— 它暗示了并不存在的「按 key 去重」。
    expect(useSuspense.length).toBe(1);
  });

  it('把 promise 注册到最近的边界，并切到 pending', () => {
    const boundary = createSuspenseBoundary();
    const onPending = vi.fn();
    boundary.onPending.push(onPending);

    const promise = Promise.resolve('data');
    runWithSuspenseParent(boundary, () => useSuspense(promise));

    expect(boundary.isPending).toBe(true);
    expect(boundary.pendingPromises.has(promise)).toBe(true);
    expect(onPending).toHaveBeenCalledTimes(1);
  });

  it('promise 兑现后边界回到非 pending 并触发 onResolve', async () => {
    const boundary = createSuspenseBoundary();
    const onResolve = vi.fn();
    boundary.onResolve.push(onResolve);

    runWithSuspenseParent(boundary, () => useSuspense(Promise.resolve('ok')));
    await flushMicrotasks();

    expect(boundary.isPending).toBe(false);
    expect(boundary.pendingPromises.size).toBe(0);
    expect(onResolve).toHaveBeenCalledTimes(1);
  });

  it('promise 拒绝后边界记录 error 并触发 onError', async () => {
    const boundary = createSuspenseBoundary();
    const onError = vi.fn();
    boundary.onError.push(onError);

    runWithSuspenseParent(boundary, () => useSuspense(Promise.reject(new Error('boom'))));
    await flushMicrotasks();

    expect(boundary.error).toBeInstanceOf(Error);
    expect(boundary.error?.message).toBe('boom');
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('父链上没有 Suspense 边界时不抛错（注册进临时边界，无可见效果）', async () => {
    const instance = {
      type: {},
      setupState: {},
      parent: null,
    } as unknown as ComponentInternalInstance;

    setCurrentInstance(instance);
    try {
      expect(() => useSuspense(Promise.resolve(1))).not.toThrow();
    } finally {
      setCurrentInstance(null);
    }
    await flushMicrotasks();
  });

  it('不在 setup 上下文调用时抛错（原行为保留）', () => {
    setCurrentInstance(null);
    expect(() => useSuspense(Promise.resolve(1))).toThrow(/within a component setup function/);
  });
});
