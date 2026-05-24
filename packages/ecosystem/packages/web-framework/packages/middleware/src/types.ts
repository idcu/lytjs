/**
 * 中间件类型定义
 */
type Request = unknown;
type Response = unknown;

/**
 * 中间件链中传递的请求上下文
 */
export interface MiddlewareContext {
  /** 请求对象 */
  request: Request;
  /** 响应对象（初始为 undefined，由处理器设置） */
  response?: Response;
  /** 额外的上下文属性 */
  [key: string]: unknown;
}

/**
 * 中间件函数类型 - 传统的 (request, context, next) 签名
 */
export type Middleware = (
  request: Request,
  context: MiddlewareContext,
  next: () => Promise<void>,
) => Promise<Response | void | undefined>;

/**
 * 中间件函数类型 - 洋葱圈模型签名
 *
 * @param ctx - 当前中间件上下文
 * @param next - 调用链中下一个中间件的函数
 * @returns 中间件完成时的 Promise
 */
export type MiddlewareFn = (ctx: MiddlewareContext, next: () => Promise<void>) => Promise<void>;

/**
 * 最终处理器函数
 */
export type FinalHandler = (request: Request, context: MiddlewareContext) => Promise<Response>;

/**
 * 中间件处理器函数
 */
export type HandlerFn = (
  request: Request,
  ctx: Record<string, unknown>,
) => Promise<Response> | Response;

/**
 * 错误处理函数
 */
export type ErrorHandlerFn = (error: Error, ctx: MiddlewareContext) => Promise<Response> | Response;

/**
 * 中间件组合器配置
 */
export interface MiddlewareComposerConfig {
  /** 中间件链的错误处理器 */
  errorHandler?: ErrorHandlerFn;
  /** 是否抛出错误或调用错误处理器 */
  throwOnError?: boolean;
}
