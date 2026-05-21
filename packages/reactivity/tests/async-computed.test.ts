import { describe, it, expect, vi } from 'vitest';
import { asyncComputed, useAsyncState } from '../src/async-computed';
import { ref, effect } from '../src/index';

describe('asyncComputed', () => {
  it('should create an AsyncComputedRef', () => {
    const ac = asyncComputed(() => Promise.resolve('hello'));
    expect(ac).toBeDefined();
    expect(ac.__v_isRef).toBe(true);
    expect(ac.loading).toBe(true);
    expect(ac.error).toBeUndefined();
    expect(ac.value).toBeUndefined();
  });

  it('should resolve and update value', async () => {
    const ac = asyncComputed(() => Promise.resolve(42));

    // Initially loading
    expect(ac.loading).toBe(true);
    expect(ac.value).toBeUndefined();

    // Wait for resolution
    await vi.waitFor(() => {
      expect(ac.loading).toBe(false);
    });

    expect(ac.value).toBe(42);
    expect(ac.error).toBeUndefined();
  });

  it('should use initialValue while pending', async () => {
    const ac = asyncComputed(() => Promise.resolve('done'), 'initial');

    expect(ac.value).toBe('initial');
    expect(ac.loading).toBe(true);

    await vi.waitFor(() => {
      expect(ac.loading).toBe(false);
    });

    expect(ac.value).toBe('done');
  });

  it('should capture error on rejection', async () => {
    const ac = asyncComputed(() => Promise.reject(new Error('test error')));

    expect(ac.loading).toBe(true);

    await vi.waitFor(() => {
      expect(ac.loading).toBe(false);
    });

    expect(ac.error).toBeInstanceOf(Error);
    expect((ac.error as Error).message).toBe('test error');
    expect(ac.value).toBeUndefined();
  });

  it('should toggle loading state correctly', async () => {
    let resolveFn: (value: number) => void;
    const promise = new Promise<number>((resolve) => {
      resolveFn = resolve;
    });

    const ac = asyncComputed(() => promise);

    expect(ac.loading).toBe(true);

    resolveFn!(100);

    await vi.waitFor(() => {
      expect(ac.loading).toBe(false);
    });

    expect(ac.value).toBe(100);
  });

  it('should re-compute when reactive dependencies change', async () => {
    const source = ref('a');

    const ac = asyncComputed(() => {
      return Promise.resolve(source.value.toUpperCase());
    });

    // Wait for first computation
    await vi.waitFor(() => {
      expect(ac.loading).toBe(false);
    });

    expect(ac.value).toBe('A');

    // Change dependency
    source.value = 'hello';

    // Should start loading again
    expect(ac.loading).toBe(true);

    // Wait for re-computation
    await vi.waitFor(() => {
      expect(ac.loading).toBe(false);
    });

    expect(ac.value).toBe('HELLO');
  });

  it('should be trackable by effect', async () => {
    const ac = asyncComputed(() => Promise.resolve(10));
    let received: number | undefined;
    let callCount = 0;

    effect(() => {
      received = ac.value;
      callCount++;
    });

    // effect should run once with undefined
    expect(callCount).toBe(1);
    expect(received).toBeUndefined();

    // Wait for resolution
    await vi.waitFor(() => {
      expect(ac.loading).toBe(false);
    });

    // effect should have been triggered by the value change
    expect(received).toBe(10);
    expect(callCount).toBeGreaterThanOrEqual(2);
  });

  it('should handle multiple rapid dependency changes', async () => {
    const source = ref(0);

    const ac = asyncComputed(() => {
      return Promise.resolve(source.value * 2);
    });

    // Wait for first computation
    await vi.waitFor(() => {
      expect(ac.loading).toBe(false);
    });
    expect(ac.value).toBe(0);

    // Rapid changes
    source.value = 1;
    source.value = 2;
    source.value = 3;

    // Wait for the last computation to settle
    await vi.waitFor(() => {
      expect(ac.loading).toBe(false);
    });

    // The final value should reflect the latest dependency
    expect(ac.value).toBe(6);
  });
});

describe('useAsyncState', () => {
  it('should execute factory immediately', async () => {
    const ac = useAsyncState(() => Promise.resolve('loaded'));

    expect(ac.loading).toBe(true);

    await vi.waitFor(() => {
      expect(ac.loading).toBe(false);
    });

    expect(ac.value).toBe('loaded');
  });

  it('should only execute factory once (lazy mode)', async () => {
    let callCount = 0;

    const ac = useAsyncState(() => {
      callCount++;
      return Promise.resolve('data');
    });

    await vi.waitFor(() => {
      expect(ac.loading).toBe(false);
    });

    expect(callCount).toBe(1);
    expect(ac.value).toBe('data');

    // Accessing value again should not re-trigger
    const _ = ac.value;
    expect(callCount).toBe(1);
  });

  it('should use initialValue while pending', async () => {
    const ac = useAsyncState(() => Promise.resolve('result'), 'default');

    expect(ac.value).toBe('default');
    expect(ac.loading).toBe(true);

    await vi.waitFor(() => {
      expect(ac.loading).toBe(false);
    });

    expect(ac.value).toBe('result');
  });

  it('should capture error on rejection', async () => {
    const ac = useAsyncState(() => Promise.reject(new Error('fetch failed')));

    await vi.waitFor(() => {
      expect(ac.loading).toBe(false);
    });

    expect(ac.error).toBeInstanceOf(Error);
    expect((ac.error as Error).message).toBe('fetch failed');
    expect(ac.value).toBeUndefined();
  });

  it('should not re-execute on dependency change (lazy mode)', async () => {
    const source = ref('a');
    let callCount = 0;

    const ac = useAsyncState(() => {
      callCount++;
      return Promise.resolve(source.value);
    });

    await vi.waitFor(() => {
      expect(ac.loading).toBe(false);
    });

    expect(callCount).toBe(1);
    expect(ac.value).toBe('a');

    // Change dependency - should NOT re-execute in lazy mode
    source.value = 'b';

    // Give some time for any potential re-execution
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(callCount).toBe(1);
    expect(ac.value).toBe('a');
  });
});
