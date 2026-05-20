/**
 * 中间件类型定义
 */

/**
 * 中间件上下文 - 在中间件链中传递的上下文对象
 */
export interface MiddlewareContext {
  /** URL 参数 */
  params: Record<string, string>;
  /** 查询参数 */
  query: URLSearchParams;
  /** 自定义属性扩展 */
  [key: string]: any;
}

/**
 * 中间件函数类型
 */
export type MiddlewareFunction = (
  request: Request,
  context: MiddlewareContext,
  next: () => Promise<Response | null | undefined>,
) => Response | null | undefined | Promise<Response | null | undefined>;

/**
 * 中间件类型
 */
export type Middleware = MiddlewareFunction;

/**
 * 最终处理函数类型
 */
export type FinalHandler = (
  request: Request,
  context: MiddlewareContext,
) => Response | Promise<Response>;
