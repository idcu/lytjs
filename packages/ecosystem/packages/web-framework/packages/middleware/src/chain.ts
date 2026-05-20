/**
 * 中间件链实现 - 洋葱圈模型
 */
import { isArray } from '@lytjs/common-is';
import type { Middleware, MiddlewareContext, FinalHandler } from './types';

/**
 * 中间件链类
 */
export class MiddlewareChain {
  private middlewares: Middleware[] = [];

  /**
   * 添加中间件
   */
  use(middleware: Middleware): this;
  use(middlewares: Middleware[]): this;
  use(middlewareOrMiddlewares: Middleware | Middleware[]): this {
    if (isArray(middlewareOrMiddlewares)) {
      this.middlewares.push(...middlewareOrMiddlewares);
    } else {
      this.middlewares.push(middlewareOrMiddlewares);
    }
    return this;
  }

  /**
   * 执行中间件链
   */
  async execute(
    request: Request,
    context: MiddlewareContext,
    finalHandler: FinalHandler,
  ): Promise<Response> {
    const index = 0;
    const middlewares = this.middlewares;

    const dispatch = async (i: number): Promise<Response> => {
      if (i >= middlewares.length) {
        return finalHandler(request, context);
      }

      const middleware = middlewares[i];
      const result = await middleware(request, context, () => dispatch(i + 1));

      if (result instanceof Response) {
        return result;
      }

      return dispatch(i + 1);
    };

    return dispatch(index);
  }

  /**
   * 获取中间件数量
   */
  get size(): number {
    return this.middlewares.length;
  }

  /**
   * 清空中间件链
   */
  clear(): this {
    this.middlewares = [];
    return this;
  }
}

/**
 * 创建中间件链
 */
export function createMiddlewareChain(): MiddlewareChain {
  return new MiddlewareChain();
}
