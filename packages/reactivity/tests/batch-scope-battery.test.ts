// @vitest-environment node
/**
 * `reactivity/src/batch.ts` 行为电池。
 *
 * 该文件此前 **121/133 语句未覆盖（9%）** —— 批量作用域是响应式核心语义
 * （「作用域内多次 set 只触发一次 effect」），却几乎没有判据。
 * 既有 `tests/batch.test.ts` 只覆盖了「返回值透传 / 深度计数」等皮毛。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ref } from '../src/ref';
import { effect } from '../src/effect';
import {
  batchScope,
  batchScopeAsync,
  batchScopeUntrack,
  getBatchScopeDepth,
  getCurrentBatchScopeStack,
  isInBatchScope,
  flushBatchScopes,
  _resetBatchScopeState,
  _getPendingCallbacksCount,
} from '../src/batch';
import type { BatchScopeContext } from '../src/batch';

beforeEach(() => {
  _resetBatchScopeState();
});

afterEach(() => {
  vi.restoreAllMocks();
  _resetBatchScopeState();
});

describe('batchScope（同步）', () => {
  it('透传回调返回值', () => {
    expect(batchScope(() => 42)).toBe(42);
  });

  it('★ 作用域内多次 set 只触发一次 effect（批量语义）', () => {
    const n = ref(0);
    let runs = 0;
    effect(() => {
      runs++;
      void n.value;
    });
    expect(runs).toBe(1);

    batchScope(() => {
      n.value = 1;
      n.value = 2;
      n.value = 3;
      return true;
    });

    expect(n.value).toBe(3);
    expect(runs).toBe(2);
  });

  it('★ 回调返回 undefined 不得抛错（void 回调是常态，文档示例即如此）', () => {
    const n = ref(0);

    expect(() =>
      batchScope(() => {
        n.value = 1;
      }),
    ).not.toThrow();

    expect(n.value).toBe(1);
  });

  it('作用域内深度为 1，结束后回到 0', () => {
    expect(getBatchScopeDepth()).toBe(0);

    batchScope(() => {
      expect(getBatchScopeDepth()).toBe(1);
      return 1;
    });

    expect(getBatchScopeDepth()).toBe(0);
  });

  it('isInBatchScope 与深度一致', () => {
    expect(isInBatchScope()).toBe(false);
    batchScope(() => {
      expect(isInBatchScope()).toBe(true);
      return 1;
    });
    expect(isInBatchScope()).toBe(false);
  });

  it('回调内 ctx.committed 为 false，结束后为 true', () => {
    let captured: BatchScopeContext | undefined;

    batchScope((ctx) => {
      captured = ctx;
      expect(ctx.committed).toBe(false);
      return 1;
    });

    expect(captured!.committed).toBe(true);
  });

  it('ctx 带上自定义 name 与嵌套深度', () => {
    batchScope(
      (ctx) => {
        expect(ctx.name).toBe('outer');
        expect(ctx.depth).toBe(0);
        return 1;
      },
      { name: 'outer' },
    );
  });

  it('嵌套作用域：内层 depth 递增，外层结束时统一提交', () => {
    const n = ref(0);
    let runs = 0;
    effect(() => {
      runs++;
      void n.value;
    });

    batchScope((outer) => {
      n.value = 1;
      batchScope((inner) => {
        expect(inner.depth).toBe(1);
        expect(getBatchScopeDepth()).toBe(2);
        n.value = 2;
        return 1;
      });
      expect(outer.depth).toBe(0);
      n.value = 3;
      return 1;
    });

    expect(runs).toBe(2); // 初始 1 次 + 批量后 1 次
    expect(n.value).toBe(3);
  });

  it('回调抛错 ⇒ 冒泡，且 onError 收到同一个错误', () => {
    const boom = new Error('boom');
    const onError = vi.fn();

    expect(() =>
      batchScope(
        () => {
          throw boom;
        },
        { onError },
      ),
    ).toThrow(boom);

    expect(onError).toHaveBeenCalledWith(boom);
  });

  it('抛错后深度与栈都必须复位（不能卡在批量态）', () => {
    expect(() =>
      batchScope(() => {
        throw new Error('x');
      }),
    ).toThrow();

    expect(getBatchScopeDepth()).toBe(0);
    expect(getCurrentBatchScopeStack()).toHaveLength(0);
  });

  it('嵌套超过 100 层 ⇒ 抛错并带明确提示，且状态复位', () => {
    const onError = vi.fn();
    const nest = (n: number): number => batchScope(() => (n > 0 ? nest(n - 1) : 1), { onError });

    expect(() => nest(150)).toThrow(/Maximum batchScope nesting depth \(100\)/);
    expect(onError).toHaveBeenCalled();
    expect(getBatchScopeDepth()).toBe(0);
  });

  it('getCurrentBatchScopeStack 返回副本（外部 push 不影响内部）', () => {
    batchScope(() => {
      const snapshot = getCurrentBatchScopeStack();
      expect(snapshot).toHaveLength(1);
      (snapshot as BatchScopeContext[]).push({} as BatchScopeContext);
      expect(getCurrentBatchScopeStack()).toHaveLength(1);
      return 1;
    });
  });
});

describe('batchScope({ async: true })', () => {
  it('同步回调的返回值仍被透传', () => {
    const r = batchScope(() => 'ok', { async: true });
    expect(r).toBe('ok');
  });

  it('完成后深度复位', async () => {
    batchScope(() => 1, { async: true });
    await flushBatchScopes();

    expect(getBatchScopeDepth()).toBe(0);
    expect(getCurrentBatchScopeStack()).toHaveLength(0);
  });

  it('失败且提供 onError ⇒ onError 收到错误，且不产生 unhandledRejection', async () => {
    const unhandled: unknown[] = [];
    const onUnhandled = (e: unknown): void => {
      unhandled.push(e);
    };
    process.on('unhandledRejection', onUnhandled);
    const onError = vi.fn();
    const boom = new Error('async-boom');

    batchScope(
      () => {
        throw boom;
      },
      { async: true, onError },
    );
    await flushBatchScopes();
    await new Promise((r) => setTimeout(r, 20));

    process.off('unhandledRejection', onUnhandled);

    expect(onError).toHaveBeenCalledWith(boom);
    expect(unhandled).toEqual([]);
    expect(getBatchScopeDepth()).toBe(0);
  });

  it('★ 失败且没有 onError ⇒ 不得把错误抛进无人接收的 Promise（unhandledRejection）', async () => {
    const unhandled: unknown[] = [];
    const onUnhandled = (e: unknown): void => {
      unhandled.push(e);
    };
    process.on('unhandledRejection', onUnhandled);
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    batchScope(
      () => {
        throw new Error('nobody-handles-me');
      },
      { async: true },
    );
    await flushBatchScopes();
    await new Promise((r) => setTimeout(r, 20));

    process.off('unhandledRejection', onUnhandled);

    // 修复前：`.catch` 里 `throw error` ⇒ 未处理的 rejection（Node 会打印警告/崩溃）
    expect(unhandled).toEqual([]);
    // 至少要留下可诊断的日志，不能静默
    expect(errSpy).toHaveBeenCalled();
    expect(getBatchScopeDepth()).toBe(0);
  });
});

describe('batchScopeAsync', () => {
  it('await 后拿到返回值', async () => {
    await expect(batchScopeAsync(async () => 'async-ok')).resolves.toBe('async-ok');
  });

  it('支持真正的 await（中间挂起后仍能提交）', async () => {
    const n = ref(0);
    let runs = 0;
    effect(() => {
      runs++;
      void n.value;
    });

    await batchScopeAsync(async () => {
      n.value = 1;
      await new Promise((r) => setTimeout(r, 5));
      n.value = 2;
      return 'done';
    });

    expect(n.value).toBe(2);
    expect(runs).toBe(2);
  });

  it('完成后深度复位', async () => {
    await batchScopeAsync(async () => 1);
    expect(getBatchScopeDepth()).toBe(0);
    expect(getCurrentBatchScopeStack()).toHaveLength(0);
  });

  it('抛错 ⇒ reject 且 onError 被调用，深度复位', async () => {
    const boom = new Error('async-scope-boom');
    const onError = vi.fn();

    await expect(
      batchScopeAsync(
        async () => {
          throw boom;
        },
        { onError },
      ),
    ).rejects.toThrow(boom);

    expect(onError).toHaveBeenCalledWith(boom);
    expect(getBatchScopeDepth()).toBe(0);
  });

  it('嵌套超过 100 层 ⇒ reject 并带明确提示', async () => {
    const nest = async (n: number): Promise<number> =>
      batchScopeAsync(async () => (n > 0 ? nest(n - 1) : 1));

    await expect(nest(150)).rejects.toThrow(/Maximum batchScope nesting depth \(100\)/);
    expect(getBatchScopeDepth()).toBe(0);
  });
});

describe('batchScopeUntrack', () => {
  it('内部读取 signal 不建立依赖（effect 不被触发）', () => {
    const n = ref(0);
    let runs = 0;
    effect(() => {
      runs++;
      batchScopeUntrack(() => n.value);
    });
    expect(runs).toBe(1);

    n.value = 1;

    expect(runs).toBe(1); // 未建立依赖 ⇒ 不重跑
  });

  it('透传返回值', () => {
    expect(batchScopeUntrack(() => 'v')).toBe('v');
  });
});

describe('工具与内部 API', () => {
  it('初始深度为 0、栈为空', () => {
    expect(getBatchScopeDepth()).toBe(0);
    expect(getCurrentBatchScopeStack()).toEqual([]);
    expect(isInBatchScope()).toBe(false);
  });

  it('★ flushBatchScopes 会等到挂起的异步作用域完成', async () => {
    let done = false;

    batchScope(
      () => {
        // 同步回调，但 batchAsync 的完成是异步的
        done = true;
        return 1;
      },
      { async: true },
    );

    await flushBatchScopes();

    expect(done).toBe(true);
    expect(getBatchScopeDepth()).toBe(0);
  });

  it('_getPendingCallbacksCount 在无挂起时返回 0', () => {
    expect(_getPendingCallbacksCount()).toBe(0);
  });

  it('_resetBatchScopeState 清空栈与深度', () => {
    batchScope(
      () => {
        _resetBatchScopeState();
        expect(getBatchScopeDepth()).toBe(0);
        expect(getCurrentBatchScopeStack()).toHaveLength(0);
        return 1;
      },
      { name: 'to-reset' },
    );
  });
});
