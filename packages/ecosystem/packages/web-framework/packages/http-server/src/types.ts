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
