/**
 * 中间件组合器 - 洋葱模型实现
 */

import {
  MiddlewareFn,
  MiddlewareComposerConfig,
  HandlerFn,
} from './types';
import { createContext } from './context';
import { combineMiddlewares } from './middleware';

export class MiddlewareComposer {
  private middlewares: MiddlewareFn[] = [];
  private config: Required<MiddlewareComposerConfig>;

  constructor(config?: MiddlewareComposerConfig) {
    this.config = {
      errorHandler: (err: Error) =>
        new Response(`内部服务器错误: ${err.message}`, {
          status: 500,
        }),
      throwOnError: false,
      ...config,
    };
  }

  /**
   * 向链中添加中间件
   */
  use(middleware: MiddlewareFn): this {
    this.middlewares.push(middleware);
    return this;
  }

  /**
   * 添加多个中间件
   */
  useMany(...middlewares: MiddlewareFn[]): this {
    this.middlewares.push(...middlewares);
    return this;
  }

  /**
   * 使用最终处理器组合中间件链
   */
  compose(
    handler: HandlerFn,
  ): (request: Request, extra?: Record<string, unknown>) => Promise<Response> {
    const combined = combineMiddlewares(...this.middlewares);

    return async (request: Request, extra?: Record<string, unknown>): Promise<Response> => {
      const ctx = createContext(request, extra);

      try {
        await combined(ctx, async () => {
          ctx.response = await handler(request, ctx);
        });

        return ctx.response || new Response('未找到', { status: 404 });
      } catch (error) {
        if (this.config.throwOnError) {
          throw error;
        }

        ctx.response = await this.config.errorHandler(
          error instanceof Error ? error : new Error(String(error)),
          ctx,
        );

        return ctx.response;
      }
    };
  }

  /**
   * 清除所有中间件
   */
  clear(): this {
    this.middlewares = [];
    return this;
  }

  /**
   * 获取中间件数量
   */
  get count(): number {
    return this.middlewares.length;
  }
}

/**
 * 创建新的中间件组合器
 */
export function createComposer(config?: MiddlewareComposerConfig): MiddlewareComposer {
  return new MiddlewareComposer(config);
}
