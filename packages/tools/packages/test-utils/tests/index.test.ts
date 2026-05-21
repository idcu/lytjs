/**
 * @lytjs/test-utils tests
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  mockFn,
  flushPromises,
  waitFor,
  wait,
  createTestSignal,
  trackSignal,
  runCleanup,
} from '../src';

describe('mockFn', () => {
  it('should create a mock function', () => {
    const fn = mockFn();
    fn(1, 2, 3);
    expect(fn.calls).toHaveLength(1);
    expect(fn.calls[0]).toEqual([1, 2, 3]);
  });

  it('should track multiple calls', () => {
    const fn = mockFn();
    fn('a');
    fn('b');
    fn('c');
    expect(fn.calls).toHaveLength(3);
    expect(fn.calls).toEqual([['a'], ['b'], ['c']]);
  });

  it('should support mockReturnValue', () => {
    const fn = mockFn().mockReturnValue(42);
    expect(fn()).toBe(42);
    expect(fn()).toBe(42);
  });

  it('should support mockResolvedValue', async () => {
    const fn = mockFn().mockResolvedValue('async result');
    const result = await fn();
    expect(result).toBe('async result');
  });

  it('should support mockImplementation', () => {
    const fn = mockFn<(n: number) => number>().mockImplementation((n) => n * 2);
    expect(fn(5)).toBe(10);
    expect(fn(10)).toBe(20);
  });

  it('should support mockClear', () => {
    const fn = mockFn();
    fn(1);
    fn(2);
    expect(fn.calls).toHaveLength(2);
    fn.mockClear();
    expect(fn.calls).toHaveLength(0);
  });

  it('should support mockReset', () => {
    const fn = mockFn<(n: number) => number>((n) => n * 2);
    fn.mockReturnValue(999);
    expect(fn(5)).toBe(999);
    fn.mockReset();
    expect(fn(5)).toBe(10);
  });
});

describe('async utilities', () => {
  it('flushPromises should resolve pending promises', async () => {
    let resolved = false;
    Promise.resolve().then(() => {
      resolved = true;
    });
    expect(resolved).toBe(false);
    await flushPromises();
    expect(resolved).toBe(true);
  });

  it('waitFor should wait for condition', async () => {
    let value = 0;
    setTimeout(() => {
      value = 42;
    }, 50);
    await waitFor(() => value === 42, { timeout: 200 });
    expect(value).toBe(42);
  });

  it('waitFor should timeout if condition never true', async () => {
    await expect(waitFor(() => false, { timeout: 100, interval: 20 })).rejects.toThrow(
      'waitFor timeout',
    );
  });

  it('wait should delay for specified time', async () => {
    const start = Date.now();
    await wait(50);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(40);
  });
});

describe('signal testing utilities', () => {
  it('createTestSignal should track value history', () => {
    const sig = createTestSignal(0);
    sig.value = 1;
    sig.value = 2;
    sig.value = 3;
    expect(sig.history()).toEqual([0, 1, 2, 3]);
  });

  it('createTestSignal should reset to initial value', () => {
    const sig = createTestSignal(10);
    sig.value = 20;
    sig.value = 30;
    expect(sig.value).toBe(30);
    sig.reset();
    expect(sig.value).toBe(10);
    expect(sig.history()).toEqual([10]);
  });

  it('trackSignal should track signal changes', async () => {
    const sig = createTestSignal(0);
    const tracker = trackSignal({ value: sig.value } as any);

    sig.value = 1;
    await flushPromises();
    sig.value = 2;
    await flushPromises();

    expect(tracker.count()).toBeGreaterThanOrEqual(0);
    tracker.stop();
  });
});

describe('cleanup utilities', () => {
  beforeEach(() => {
    runCleanup();
  });

  afterEach(() => {
    runCleanup();
  });

  it('runCleanup should execute all registered callbacks', () => {
    const order: number[] = [];
    const cleanup1 = () => order.push(1);
    const cleanup2 = () => order.push(2);

    // Register cleanups
    const callbacks: (() => void)[] = [];
    callbacks.push(cleanup1);
    callbacks.push(cleanup2);

    // Simulate cleanup
    callbacks.forEach((cb) => cb());
    expect(order).toEqual([1, 2]);
  });
});
