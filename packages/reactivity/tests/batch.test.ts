import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ref, batch, batchAsync, untrack } from '@lytjs/reactivity';
import {
  batchScope,
  batchScopeAsync,
  batchScopeUntrack,
  getBatchScopeDepth,
  getCurrentBatchScopeStack,
  isInBatchScope,
  flushBatchScopes,
} from '@lytjs/reactivity';

describe('batch', () => {
  it('should batch multiple signal updates', () => {
    const count = ref(0);
    const doubled = ref(0);

    batch(() => {
      count.value = 1;
      doubled.value = 2;
    });

    expect(count.value).toBe(1);
    expect(doubled.value).toBe(2);
  });

  it('should not track dependencies during batch', () => {
    const a = ref(1);
    const b = ref(2);
    const result = ref(0);

    batch(() => {
      result.value = a.value + b.value;
    });

    a.value = 10;
    expect(result.value).toBe(3);
  });
});

describe('batchAsync', () => {
  it('should handle async batch operations', async () => {
    const count = ref(0);

    await batchAsync(async () => {
      count.value = 5;
    });

    expect(count.value).toBe(5);
  });
});

describe('untrack', () => {
  it('should skip dependency tracking', () => {
    const a = ref(1);
    const b = ref(2);
    const result = ref(0);

    untrack(() => {
      result.value = a.value + b.value;
    });

    expect(result.value).toBe(3);

    a.value = 10;
    expect(result.value).toBe(3);
  });
});

describe('batchScope', () => {
  it('should batch operations within scope', () => {
    const count = ref(0);

    const result = batchScope(() => {
      count.value = 1;
      count.value = 2;
      count.value = 3;
      return 'success';
    });

    expect(result).toBe('success');
    expect(count.value).toBe(3);
  });

  it('should track batch scope depth', () => {
    expect(getBatchScopeDepth()).toBe(0);

    batchScope(() => {
      expect(getBatchScopeDepth()).toBe(1);
      return 0;
    });

    expect(getBatchScopeDepth()).toBe(0);
  });

  it('should detect if in batch scope', () => {
    expect(isInBatchScope()).toBe(false);

    batchScope(() => {
      expect(isInBatchScope()).toBe(true);
      return 0;
    });

    expect(isInBatchScope()).toBe(false);
  });

  it('should provide scope context', () => {
    let ctxDepth = -1;

    batchScope((ctx) => {
      ctxDepth = ctx.depth;
      return 0;
    });

    expect(ctxDepth).toBe(0);
  });

  it('should support custom scope name', () => {
    batchScope(
      (ctx) => {
        expect(ctx.name).toBe('custom-batch');
        return 0;
      },
      { name: 'custom-batch' },
    );
  });

  it('should handle nested batch scopes', () => {
    const count = ref(0);

    batchScope(() => {
      count.value = 1;

      batchScope(() => {
        count.value = 2;
        return 0;
      });

      count.value = 3;
      return 0;
    });

    expect(count.value).toBe(3);
  });

  it('should call onError callback', () => {
    const error = new Error('test error');
    const errorHandler = vi.fn();

    expect(() => {
      batchScope(
        () => {
          throw error;
        },
        { onError: errorHandler },
      );
    }).toThrow(error);

    expect(errorHandler).toHaveBeenCalledWith(error);
  });
});

describe('batchScopeAsync', () => {
  it('should handle async operations', async () => {
    const count = ref(0);

    await batchScopeAsync(async () => {
      await Promise.resolve();
      count.value = 42;
    });

    expect(count.value).toBe(42);
  });

  it('should track async scope depth', async () => {
    await batchScopeAsync(async () => {
      expect(getBatchScopeDepth()).toBe(1);
    });
    expect(getBatchScopeDepth()).toBe(0);
  });

  it('should handle errors in async scope', async () => {
    const error = new Error('async error');
    const errorHandler = vi.fn();

    try {
      await batchScopeAsync(
        async () => {
          throw error;
        },
        { onError: errorHandler },
      );
    } catch (e) {
      expect(e).toBe(error);
    }

    expect(errorHandler).toHaveBeenCalledWith(error);
  });
});

describe('batchScopeUntrack', () => {
  it('should skip dependency tracking', () => {
    const a = ref(1);
    const b = ref(2);
    const result = ref(0);

    batchScopeUntrack(() => {
      result.value = a.value + b.value;
    });

    expect(result.value).toBe(3);

    a.value = 10;
    expect(result.value).toBe(3);
  });
});

describe('getCurrentBatchScopeStack', () => {
  it('should return empty array when not in scope', () => {
    const stack = getCurrentBatchScopeStack();
    expect(stack).toEqual([]);
  });

  it('should return scope contexts when in batch scope', () => {
    batchScope(() => {
      const stack = getCurrentBatchScopeStack();
      expect(stack.length).toBe(1);
      expect(stack[0]?.name).toBe('batchScope');
      return 0;
    });
  });
});

describe('flushBatchScopes', () => {
  it('should return a resolved promise', async () => {
    const result = await flushBatchScopes();
    expect(result).toBeUndefined();
  });
});
