// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';

// mock @lytjs/common-scheduler 的 nextTick
// 使用 vi.hoisted 避免 vi.mock 提升导致的变量引用问题
const { mockNextTick } = vi.hoisted(() => ({
  mockNextTick: vi.fn(),
}));

vi.mock('@lytjs/common-scheduler', () => ({
  nextTick: mockNextTick,
}));

import { nextTick } from '../src/next-tick';

describe('nextTick', () => {
  it('nextTick 应该是一个函数', () => {
    expect(nextTick).toBeDefined();
    expect(typeof nextTick).toBe('function');
  });

  it('nextTick 应该从 @lytjs/common-scheduler 代理', () => {
    expect(nextTick).toBe(mockNextTick);
  });

  it('调用 nextTick 应传递到 @lytjs/common-scheduler', () => {
    const callback = vi.fn();
    nextTick(callback);
    expect(mockNextTick).toHaveBeenCalledWith(callback);
  });

  it('nextTick 应该返回 Promise', async () => {
    // 模拟 nextTick 返回 Promise
    mockNextTick.mockImplementationOnce((fn?: () => void) => {
      if (fn) fn();
      return Promise.resolve();
    });
    const result = nextTick();
    expect(result).toBeInstanceOf(Promise);
    await result;
  });

  it('nextTick 应该在微任务中执行回调', async () => {
    const callOrder: string[] = [];
    mockNextTick.mockImplementationOnce((fn?: () => void) => {
      return new Promise<void>((resolve) => {
        // 使用 queueMicrotask 确保是微任务
        queueMicrotask(() => {
          callOrder.push('nextTick');
          if (fn) fn();
          resolve();
        });
      });
    });

    callOrder.push('sync');
    await nextTick();
    callOrder.push('after-await');

    // 同步代码先执行，然后微任务，最后 await 之后的代码
    expect(callOrder).toEqual(['sync', 'nextTick', 'after-await']);
  });

  it('nextTick 不传回调也应正常工作', async () => {
    mockNextTick.mockResolvedValueOnce(undefined);
    const result = nextTick();
    expect(result).toBeInstanceOf(Promise);
    await expect(result).resolves.toBeUndefined();
  });

  it('nextTick 传递回调时应在 Promise resolve 前执行', async () => {
    const callback = vi.fn();
    mockNextTick.mockImplementationOnce((fn?: () => void) => {
      return new Promise<void>((resolve) => {
        queueMicrotask(() => {
          if (fn) fn();
          resolve();
        });
      });
    });

    await nextTick(callback);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('多次调用 nextTick 应按顺序在微任务中执行', async () => {
    const callOrder: number[] = [];
    mockNextTick.mockImplementation((fn?: () => void) => {
      return new Promise<void>((resolve) => {
        queueMicrotask(() => {
          if (fn) fn();
          resolve();
        });
      });
    });

    nextTick(() => callOrder.push(1));
    nextTick(() => callOrder.push(2));
    nextTick(() => callOrder.push(3));

    // 等待所有微任务完成
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(callOrder).toEqual([1, 2, 3]);
  });
});
