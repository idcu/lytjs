/**
 * HTTP 服务器类型定义
 */

import type { HttpMethod as SharedHttpMethod } from '@lytjs/shared-types';

export type HttpMethod = SharedHttpMethod;
export interface Context {
  request: Request;
  response: Response;
  [key: string]: unknown;
}
export interface Request {
  method: HttpMethod;
  url: string;
  path: string;
  headers: Record<string, string | string[] | undefined>;
  query: Record<string, string | string[]>;
  params: Record<string, string>;
  ip?: string;
  /**
   * 解析后的请求体（按 `content-type` 决定形态）：
   * - `application/json` ⇒ 解析后的对象
   * - `application/x-www-form-urlencoded` ⇒ 键值对象
   * - 其它（含 `text/*`）⇒ 原始字符串
   * - GET / HEAD / OPTIONS 或空体 ⇒ `undefined`
   */
  body?: unknown;
  /** 未解析的原始请求体字符串 */
  rawBody?: string;
  [key: string]: unknown;
}
export interface Response {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
  [key: string]: unknown;
}
export type Route = unknown;

/**
 * 请求处理器函数
 */
export type Handler = (ctx: Context) => Promise<void> | void;
