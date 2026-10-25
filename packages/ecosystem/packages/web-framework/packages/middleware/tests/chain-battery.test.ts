// @vitest-environment node
/**
 * 行为级判据：`@lytjs/middleware` 的**洋葱圈中间件链**（`src/chain.ts`，82 行）
 *
 * ## 为什么要有这条
 *
 * 覆盖率 **16.3%**（49 条语句 41 条空档）。中间件链算错的表现不是崩，而是
 * **下游被执行多次**：响应被重复写、数据库被重复提交、日志翻倍 —— 全是生产事故级。
 *
 * 空档里的 P1：`dispatch` 在「中间件调了 `next()` 但没返回响应」时会**再下发一次**
 * （`return dispatch(i + 1)`）。而洋葱圈的常规写法正是 `await next()` 不返回任何东西
 * ⇒ 每一层都让下游执行两遍，N 层就是 **2^N 次** `finalHandler`。
 *
 * ## 手法
 *
 * 纯内存：用计数器与顺序数组观察「谁在什么时候执行了几次」，不需要真实 Request。
 */

import { describe, it, expect, vi } from 'vitest';
import { MiddlewareChain, createMiddlewareChain } from '../src/chain';
import type { Middleware, MiddlewareContext } from '../src/types';

const req = {} as unknown as Request;
const ctx = {} as unknown as MiddlewareContext;

const response = (tag: string) => ({ tag }) as unknown as Response;

describe('基础', () => {
  it('createMiddlewareChain 返回 MiddlewareChain 实例', () => {
    expect(createMiddlewareChain()).toBeInstanceOf(MiddlewareChain);
  });

  it('use 支持单个与数组，size 随之增长', () => {
    const chain = createMiddlewareChain();
    const a: Middleware = async () => {};
    const b: Middleware = async () => {};

    chain.use(a).use([b]);

    expect(chain.size).toBe(2);
  });

  it('clear 清空', () => {
    const chain = createMiddlewareChain();
    chain.use(async () => {});

    expect(chain.clear().size).toBe(0);
  });
});

describe('执行', () => {
  it('空链 ⇒ 直接调用 finalHandler', async () => {
    const chain = createMiddlewareChain();
    const final = vi.fn(async () => response('final'));

    const res = await chain.execute(req, ctx, final);

    expect(final).toHaveBeenCalledTimes(1);
    expect(res).toEqual(response('final'));
  });

  it('中间件返回响应 ⇒ 短路，finalHandler 不执行', async () => {
    const chain = createMiddlewareChain();
    const final = vi.fn(async () => response('final'));
    chain.use(async () => response('blocked'));

    const res = await chain.execute(req, ctx, final);

    expect(res).toEqual(response('blocked'));
    expect(final).not.toHaveBeenCalled();
  });

  it('洋葱顺序：A 前 → B 前 → final → B 后 → A 后', async () => {
    const chain = createMiddlewareChain();
    const order: string[] = [];

    chain
      .use(async (_r, _c, next) => {
        order.push('A:before');
        await next();
        order.push('A:after');
      })
      .use(async (_r, _c, next) => {
        order.push('B:before');
        await next();
        order.push('B:after');
      });

    await chain.execute(req, ctx, async () => {
      order.push('final');
      return response('ok');
    });

    expect(order).toEqual(['A:before', 'B:before', 'final', 'B:after', 'A:after']);
  });

  it('`return next()` 的写法同样可用，且返回下游响应', async () => {
    const chain = createMiddlewareChain();
    chain.use(async (_r, _c, next) => {
      const res = await next();
      return res as unknown as Response;
    });

    const res = await chain.execute(req, ctx, async () => response('downstream'));

    expect(res).toEqual(response('downstream'));
  });
});

// ==================== 核心：下游只能执行一次 ====================

describe('★ 下游不得重复执行', () => {
  it('单个中间件 `await next()` 不返回 ⇒ finalHandler 恰好 1 次', async () => {
    const chain = createMiddlewareChain();
    const final = vi.fn(async () => response('final'));

    chain.use(async (_r, _c, next) => {
      await next();
      // 常规写法：不返回任何东西
    });

    await chain.execute(req, ctx, final);

    expect(final).toHaveBeenCalledTimes(1);
  });

  it('★ 三层都 `await next()` 不返回 ⇒ 仍是 1 次（不是 2^3 = 8 次）', async () => {
    const chain = createMiddlewareChain();
    const final = vi.fn(async () => response('final'));

    const passthrough: Middleware = async (_r, _c, next) => {
      await next();
    };
    chain.use([passthrough, passthrough, passthrough]);

    await chain.execute(req, ctx, final);

    expect(final).toHaveBeenCalledTimes(1);
  });

  it('调过 next() 但自己返回了响应 ⇒ 用中间件的（后置处理可覆盖）', async () => {
    const chain = createMiddlewareChain();
    const final = vi.fn(async () => response('final'));

    chain.use(async (_r, _c, next) => {
      await next();
      return response('wrapped');
    });

    const res = await chain.execute(req, ctx, final);

    expect(res).toEqual(response('wrapped'));
    expect(final).toHaveBeenCalledTimes(1);
  });

  it('重复调用 next() 不会重复执行下游（幂等下发）', async () => {
    const chain = createMiddlewareChain();
    const final = vi.fn(async () => response('final'));

    chain.use(async (_r, _c, next) => {
      await next();
      await next();
    });

    await chain.execute(req, ctx, final);

    expect(final).toHaveBeenCalledTimes(1);
  });

  it('不调 next() 也不返回 ⇒ 继续往下走（放行语义）', async () => {
    const chain = createMiddlewareChain();
    const final = vi.fn(async () => response('final'));
    const ran: string[] = [];

    chain
      .use(async () => {
        ran.push('first');
      })
      .use(async () => {
        ran.push('second');
      });

    const res = await chain.execute(req, ctx, final);

    expect(ran).toEqual(['first', 'second']);
    expect(res).toEqual(response('final'));
    expect(final).toHaveBeenCalledTimes(1);
  });

  it('中间件抛错向上冒泡，后续中间件与 finalHandler 都不执行', async () => {
    const chain = createMiddlewareChain();
    const final = vi.fn(async () => response('final'));
    const after = vi.fn();

    chain
      .use(async () => {
        throw new Error('boom');
      })
      .use(after);

    await expect(chain.execute(req, ctx, final)).rejects.toThrow('boom');
    expect(after).not.toHaveBeenCalled();
    expect(final).not.toHaveBeenCalled();
  });
});
