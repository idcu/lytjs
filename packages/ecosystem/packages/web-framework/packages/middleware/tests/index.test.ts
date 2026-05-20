/**
 * @lytjs/middleware unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMiddlewareChain, MiddlewareChain } from '../src/chain';
import type { MiddlewareContext } from '../src/types';

describe('createMiddlewareChain', () => {
  it('should create a middleware chain', () => {
    const chain = createMiddlewareChain();
    expect(chain).toBeInstanceOf(MiddlewareChain);
  });
});

describe('MiddlewareChain', () => {
  let chain: MiddlewareChain;
  let testContext: MiddlewareContext;

  beforeEach(() => {
    chain = createMiddlewareChain();
    testContext = {
      params: {},
      query: new URLSearchParams(),
    };
  });

  describe('use()', () => {
    it('should add a single middleware', () => {
      const middleware = vi.fn((req, ctx, next) => next());
      chain.use(middleware);
      expect(chain.size).toBe(1);
    });

    it('should add multiple middlewares', () => {
      const middleware1 = vi.fn((req, ctx, next) => next());
      const middleware2 = vi.fn((req, ctx, next) => next());
      chain.use([middleware1, middleware2]);
      expect(chain.size).toBe(2);
    });

    it('should support chaining', () => {
      const result = chain.use(() => {}).use(() => {});
      expect(result).toBe(chain);
      expect(chain.size).toBe(2);
    });
  });

  describe('execute()', () => {
    it('should execute the final handler if no middleware', async () => {
      const finalHandler = vi.fn(() => new Response('OK'));
      const response = await chain.execute(
        new Request('https://example.com'),
        testContext,
        finalHandler
      );
      expect(finalHandler).toHaveBeenCalledTimes(1);
      expect(response).toBeInstanceOf(Response);
    });

    it('should execute middleware in order', async () => {
      const order: string[] = [];
      
      chain.use((req, ctx, next) => {
        order.push('middleware1-before');
        const res = next();
        order.push('middleware1-after');
        return res;
      });
      
      chain.use((req, ctx, next) => {
        order.push('middleware2-before');
        const res = next();
        order.push('middleware2-after');
        return res;
      });

      await chain.execute(
        new Request('https://example.com'),
        testContext,
        () => {
          order.push('final-handler');
          return new Response('OK');
        }
      );

      expect(order).toEqual([
        'middleware1-before',
        'middleware2-before',
        'final-handler',
        'middleware2-after',
        'middleware1-after',
      ]);
    });

    it('should allow middleware to short-circuit', async () => {
      const shortCircuitResponse = new Response('Early exit', { status: 400 });
      
      chain.use(() => shortCircuitResponse);
      chain.use(() => {
        throw new Error('Should not be called');
      });

      const response = await chain.execute(
        new Request('https://example.com'),
        testContext,
        () => {
          throw new Error('Should not be called');
        }
      );

      expect(response).toBe(shortCircuitResponse);
    });

    it('should pass context to all middlewares and final handler', async () => {
      const testValue = 'test-value';
      
      chain.use((req, ctx, next) => {
        ctx.test = testValue;
        return next();
      });
      
      chain.use((req, ctx, next) => {
        expect(ctx.test).toBe(testValue);
        return next();
      });

      const finalHandler = vi.fn((req, ctx) => {
        expect(ctx.test).toBe(testValue);
        return new Response('OK');
      });

      await chain.execute(
        new Request('https://example.com'),
        testContext,
        finalHandler
      );
    });

    it('should handle async middleware', async () => {
      let asyncFinished = false;
      
      chain.use(async (req, ctx, next) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        asyncFinished = true;
        return next();
      });

      await chain.execute(
        new Request('https://example.com'),
        testContext,
        () => {
          expect(asyncFinished).toBe(true);
          return new Response('OK');
        }
      );
    });
  });

  describe('size', () => {
    it('should return the number of middlewares', () => {
      expect(chain.size).toBe(0);
      chain.use(() => {});
      expect(chain.size).toBe(1);
      chain.use([() => {}, () => {}]);
      expect(chain.size).toBe(3);
    });
  });

  describe('clear()', () => {
    it('should clear all middlewares', () => {
      chain.use(() => {}).use(() => {});
      expect(chain.size).toBe(2);
      
      const result = chain.clear();
      expect(result).toBe(chain);
      expect(chain.size).toBe(0);
    });
  });
});
