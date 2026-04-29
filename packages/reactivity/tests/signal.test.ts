import { describe, it, expect, vi } from 'vitest';
import {
  signal,
  computedSignal,
  valueOf,
  set,
  update,
  readonlySignal,
} from '../src/signal';
import { effect } from '../src/index';

describe('signal', () => {
  it('should create a signal with initial value', () => {
    const s = signal(0);
    expect(s()).toBe(0);
  });

  it('should set signal value', () => {
    const s = signal(0);
    set(s, 1);
    expect(s()).toBe(1);
  });

  it('should set value via direct call', () => {
    const s = signal(0);
    s(1);
    expect(s()).toBe(1);
  });

  it('should update signal value with updater function', () => {
    const s = signal(5);
    update(s, (prev) => prev * 2);
    expect(s()).toBe(10);
  });

  it('should create a computed signal', () => {
    const count = signal(1);
    const doubled = computedSignal(() => count() * 2);
    expect(doubled()).toBe(2);
    set(count, 2);
    expect(doubled()).toBe(4);
  });

  it('should cache computed signal value', () => {
    const fn = vi.fn();
    const count = signal(1);
    const doubled = computedSignal(() => {
      fn();
      return count() * 2;
    });
    doubled();
    doubled();
    expect(fn).toHaveBeenCalledTimes(1); // 缓存，只计算一次
    set(count, 2);
    // 依赖变更时 effect 立即重新计算
    expect(fn).toHaveBeenCalledTimes(2);
    doubled();
    expect(fn).toHaveBeenCalledTimes(2); // 仍然是 2，因为已经重新计算过了
  });

  it('should trigger effects when signal changes', () => {
    const count = signal(0);
    const fn = vi.fn();
    let dummy: number;
    effect(() => {
      dummy = count();
      fn();
    });
    expect(dummy).toBe(0);
    expect(fn).toHaveBeenCalledTimes(1);
    set(count, 1);
    expect(dummy).toBe(1);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should read signal value with valueOf', () => {
    const s = signal(42);
    expect(valueOf(s)).toBe(42);
  });

  it('should prevent writing to readonly signal', () => {
    const s = signal(0);
    const rs = readonlySignal(s);
    expect(rs()).toBe(0);
    // readonlySignal 返回的函数不接受参数（只读），但调用 set(rs, 1) 实际上
    // 会调用 rs(1)，而 rs 是只读函数，不执行写入
    set(rs as any, 1);
    expect(rs()).toBe(0); // 值不变
  });

  it('should sync with source signal', () => {
    const s = signal(0);
    const rs = readonlySignal(s);
    set(s, 1);
    expect(rs()).toBe(1);
  });

  it('should handle object signal values', () => {
    const s = signal({ count: 0 });
    expect(s()).toEqual({ count: 0 });
    set(s, { count: 1 });
    expect(s()).toEqual({ count: 1 });
  });

  it('should handle array signal values', () => {
    const s = signal<number[]>([1, 2, 3]);
    expect(s()).toEqual([1, 2, 3]);
    set(s, [4, 5, 6]);
    expect(s()).toEqual([4, 5, 6]);
  });

  it('should track multiple signal dependencies', () => {
    const a = signal(1);
    const b = signal(2);
    const sum = computedSignal(() => a() + b());
    expect(sum()).toBe(3);
    set(a, 10);
    expect(sum()).toBe(12);
    set(b, 20);
    expect(sum()).toBe(30);
  });

  it('should support chained computed signals', () => {
    const base = signal(1);
    const plusOne = computedSignal(() => base() + 1);
    const plusTwo = computedSignal(() => plusOne() + 1);
    expect(plusTwo()).toBe(3);
    set(base, 10);
    expect(plusTwo()).toBe(12);
  });

  it('should not trigger when setting the same value', () => {
    const s = signal(0);
    const fn = vi.fn();
    effect(() => { s(); fn(); });
    set(s, 0);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
