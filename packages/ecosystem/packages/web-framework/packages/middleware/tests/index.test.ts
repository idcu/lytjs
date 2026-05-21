import { describe, it, expect } from 'vitest';
import { createComposer, createMiddleware, combineMiddlewares } from '../src';

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
});
