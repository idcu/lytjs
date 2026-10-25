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
        const result = await finalHandler(request, context);
        return result as unknown as Response;
      }

      const middleware = middlewares[i];
      if (!middleware) {
        return dispatch(i + 1);
      }

      // ★ 2026-10-25 修复（P1）：**下游只能下发一次**。
      //
      //   此前是「中间件返回 undefined ⇒ `return dispatch(i + 1)`」，而洋葱圈的常规写法正是
      //   `await next()` 之后**不返回任何东西** —— 于是 `next()` 已经把下游跑完一遍，
      //   这里又跑一遍。N 层就是 **2^N 次** `finalHandler`（实测三层 = 8 次）：
      //   响应被重复写、数据库被重复提交、日志翻倍。
      //
      //   修法：`next()` 的结果被记住并**复用**（重复调用 `next()` 也只在第一次下发）；
      //   中间件自己返回了响应就用它的（允许后置处理覆盖），否则返回下游的结果，
      //   而**没有调过** `next()` 的中间件仍然按「放行」语义继续往下走。
      let nextPromise: Promise<Response> | undefined;
      const next = (): Promise<void> => {
        if (!nextPromise) {
          nextPromise = dispatch(i + 1);
        }
        return nextPromise as unknown as Promise<void>;
      };

      const result = await middleware(request, context, next);
      if (result !== undefined && result !== null) {
        return result as Response;
      }
      if (nextPromise) {
        return nextPromise;
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
