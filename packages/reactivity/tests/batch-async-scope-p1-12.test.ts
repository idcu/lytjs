// @vitest-environment node
/**
 * P1-12 负控：`batchScope(cb, { async: true })` 的异步语义此前是 fire-and-forget。
 *
 * `batchAsync(() => { result = callback(ctx); })` 的闭包返回 `void` ——
 * batchAsync 看不到 thenable，`finish()` 同步执行：批次立刻 flush，
 * `await` 之后的 `set()` 不再属于同一批次，`ctx.committed` 也在异步工作完成前就变成 true。
 * 返回值虽然「看起来」是回调的 Promise，但作用域完成时机与它无关。
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { ref } from '../src/ref';
import { effect } from '../src/effect';
import { batchScope, flushBatchScopes, _resetBatchScopeState } from '../src/batch';
import type { BatchScopeContext } from '../src/batch';

beforeEach(() => {
  _resetBatchScopeState();
});

describe('P1-12 batchScope async 真正的批次边界', () => {
  it('await 之后的 set 仍属同一批次：放行前不得触发 effect', async () => {
    const n = ref(0);
    let runs = 0;
    effect(() => {
      void n.value;
      runs++;
    });
    expect(runs).toBe(1);

    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    let ctxRef!: BatchScopeContext;
    const p = batchScope(
      async (ctx) => {
        ctxRef = ctx;
        n.value = 1;
        await gate;
        n.value = 2;
        return 'done';
      },
      { async: true },
    );

    // 作用域尚未结束：两次 set 都应被合并，effect 不得先跑一次
    expect(runs).toBe(1);
    expect(ctxRef.committed).toBe(false);

    release();
    await expect(p).resolves.toBe('done');
    await flushBatchScopes();

    // 两次 set 合并成一次触发
    expect(runs).toBe(2);
    expect(ctxRef.committed).toBe(true);
  });

  it('异步回调失败时，返回的 Promise 必须 reject（不能再静默吞掉）', async () => {
    const boom = new Error('async-scope-boom');
    const p = batchScope(
      async () => {
        throw boom;
      },
      { async: true },
    );

    await expect(p).rejects.toThrow('async-scope-boom');
    await flushBatchScopes();
  });
});
