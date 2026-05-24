/**
 * HTTP 服务器类型定义
 */

export type HttpMethod = string;
export type Context = Record<string, unknown>;
export type Request = unknown;
export type Response = unknown;
export type Route = unknown;

/**
 * 请求处理器函数
 */
export type Handler = (ctx: Context) => Promise<void> | void;
