import { describe, it, expect, vi } from 'vitest';
import {
  ref,
  reactive,
  effect,
  batch,
  batchAsync,
  untrack,
  signal,
  signalBatch,
} from '@lytjs/reactivity';
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

// ============================================================
// P1-1 回归（2026-10-10）
//
// 此前 batch / batchScope 的所有用例都只断言**值**（`count.value === 3`），
// 没有一条断言**通知次数** ⇒ 「不合并触发」这个缺陷在测试里完全看不出来。
// 下面全部以 effect 的**调用次数**为判据。
// ============================================================

describe('P1-1：batch 必须真正合并通知', () => {
  it('batch 内多次赋值只触发一次 effect', () => {
    const state = reactive({ a: 0, b: 0, c: 0 });
    const fn = vi.fn();

    effect(() => fn(state.a, state.b, state.c));
    expect(fn).toHaveBeenCalledTimes(1);

    batch(() => {
      state.a = 1;
      state.b = 2;
      state.c = 3;
    });

    expect(fn).toHaveBeenCalledTimes(2); // 1 次初始 + 1 次批末
    expect(fn).toHaveBeenLastCalledWith(1, 2, 3);
  });

  it('batch 内 effect 不会看到中间值', () => {
    const state = reactive({ a: 0 });
    const seen: number[] = [];

    effect(() => seen.push(state.a));

    batch(() => {
      state.a = 1;
      state.a = 2;
      state.a = 3;
    });

    expect(seen).toEqual([0, 3]);
  });

  it('嵌套 batch 只在最外层 flush 一次', () => {
    const state = reactive({ a: 0, b: 0 });
    const fn = vi.fn();

    effect(() => fn(state.a, state.b));

    batch(() => {
      state.a = 1;
      batch(() => {
        state.b = 2;
      });
    });

    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith(1, 2);
  });

  it('batchScope 同样合并通知（此前其文档承诺了但没实现）', () => {
    const count = ref(0);
    const fn = vi.fn();

    effect(() => fn(count.value));

    batchScope(() => {
      count.value = 1;
      count.value = 2;
      count.value = 3;
      return 0;
    });

    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith(3);
  });

  it('batch 与 signalBatch 嵌套时不提前 flush', () => {
    const count = ref(0);
    const s = signal(0);
    const fn = vi.fn();

    effect(() => fn(count.value, s()));

    batch(() => {
      count.value = 1;
      signalBatch(() => {
        s.set(2);
      });
    });

    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith(1, 2);
  });

  it('batch 内抛错时仍会 flush 已发生的变更并恢复追踪', () => {
    const count = ref(0);
    const fn = vi.fn();

    effect(() => fn(count.value));

    expect(() =>
      batch(() => {
        count.value = 7;
        throw new Error('boom');
      }),
    ).toThrow('boom');

    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith(7);

    // 追踪状态必须已恢复：批外再改一次应当照常触发
    count.value = 8;
    expect(fn).toHaveBeenCalledTimes(3);
  });
});

describe('P1-1：batchAsync 同样合并通知', () => {
  it('await batchAsync 完成后统一触发一次', async () => {
    const count = ref(0);
    const fn = vi.fn();

    effect(() => fn(count.value));

    await batchAsync(async () => {
      count.value = 1;
      await Promise.resolve();
      count.value = 2;
    });

    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith(2);
  });
});
