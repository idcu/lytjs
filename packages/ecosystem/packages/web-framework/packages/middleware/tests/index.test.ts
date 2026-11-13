import { describe, it, expect } from 'vitest';
import { createComposer, createMiddleware, combineMiddlewares, adaptMiddleware } from '../src';

describe('@lytjs/middleware', () => {
  describe('MiddlewareComposer', () => {
    it('should create a composer', () => {
      const composer = createComposer();
      expect(composer).toBeDefined();
      expect(composer.count).toBe(0);
    });

    it('should add middleware', () => {
      const composer = createComposer();
      const middleware = createMiddleware(async (ctx, next) => {
        await next();
      });
      composer.use(middleware);
      expect(composer.count).toBe(1);
    });

    it('should execute middleware chain', async () => {
      const composer = createComposer();
      const order: string[] = [];

      composer.use(async (ctx, next) => {
        order.push('m1-start');
        await next();
        order.push('m1-end');
      });

      composer.use(async (ctx, next) => {
        order.push('m2-start');
        await next();
        order.push('m2-end');
      });

      const handler = composer.compose(async () => {
        order.push('handler');
        return new Response('OK');
      });

      await handler(new Request('http://localhost'));

      expect(order).toEqual(['m1-start', 'm2-start', 'handler', 'm2-end', 'm1-end']);
    });
  });

  describe('combineMiddlewares', () => {
    it('★ 下游返回的 Response 透传给调用方', async () => {
      const combined = combineMiddlewares(async (_ctx, next) => {
        await next();
      });

      // 终点处理器返回 201（规范签名是 Promise<void>，运行时允许带 Response）
      const result = await combined(
        { request: null },
        (async () => new Response('done', { status: 201 })) as unknown as () => Promise<void>,
      );

      // 负控：旧实现只 `await` 不返回 ⇒ 调用方拿到 undefined
      expect(result).toBeInstanceOf(Response);
      expect((result as Response).status).toBe(201);
    });

    it('中间件自己返回的 Response 优先于下游', async () => {
      const combined = combineMiddlewares(async (_ctx, next) => {
        await next();
        return new Response('mine', { status: 202 });
      });

      const result = await combined({ request: null }, async () => {});
      expect((result as Response).status).toBe(202);
    });

    it('★ 重复调用 next() 不会重复执行下游与终点', async () => {
      const calls: string[] = [];
      let finalCalls = 0;

      const combined = combineMiddlewares(
        async (_ctx, next) => {
          await next();
          await next(); // 重复调用：必须复用同一个下游 Promise
        },
        async (_ctx, next) => {
          calls.push('m2');
          await next();
        },
      );

      await combined({ request: null }, async () => {
        finalCalls++;
      });

      // 负控：旧实现每次 next() 都重新 dispatch ⇒ m2 / 终点各执行两次
      expect(calls).toEqual(['m2']);
      expect(finalCalls).toBe(1);
    });

    it('should combine multiple middlewares', async () => {
      const calls: string[] = [];

      const m1 = createMiddleware(async (ctx, next) => {
        calls.push('m1');
        await next();
      });

      const m2 = createMiddleware(async (ctx, next) => {
        calls.push('m2');
        await next();
      });

      const combined = combineMiddlewares(m1, m2);

      await combined({ request: new Request('http://localhost') }, async () => {});

      expect(calls).toEqual(['m1', 'm2']);
    });
  });

  describe('adaptMiddleware', () => {
    it('★ 三参中间件经适配后能读到 request.headers', async () => {
      const seen: (string | null)[] = [];

      const adapted = adaptMiddleware<{ request: unknown; [key: string]: unknown }>(
        async (request, _ctx, next) => {
          const headers = (request as { headers: { get(name: string): string | null } }).headers;
          seen.push(headers.get('origin'));
          seen.push(headers.get('x-missing'));
          await next();
        },
      );

      await adapted(
        {
          request: {
            method: 'GET',
            url: '/x',
            headers: { Origin: 'https://example.com', 'X-Trace': ['a', 'b'] },
          },
        },
        async () => {},
      );

      // 大小写不敏感、缺失返回 null
      expect(seen).toEqual(['https://example.com', null]);
    });
  });
});
