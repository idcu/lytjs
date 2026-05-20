/**
 * @lytjs/api - 类型定义
 */

import type { HttpMethod } from '@lytjs/shared-types';

export type { HttpMethod };

/** API 路由配置 */
export interface ApiRouteConfig {
  /** 路由路径 */
  path: string;
  /** HTTP 方法 */
  methods: HttpMethod[];
  /** 处理函数路径 */
  handlerPath: string;
  /** 是否为动态路由 */
  isDynamic: boolean;
  /** 动态路由参数名 */
  params?: string[];
  /** 中间件路径 */
  middlewarePaths?: string[];
}

/** API 路由器配置选项 */
export interface ApiRouterOptions {
  /** API 目录路径 */
  apiDir: string;
  /** API 处理函数扩展名 */
  extensions?: string[];
  /** 中间件文件名称模式 */
  middlewarePattern?: string;
  /** 忽略文件模式 */
  ignorePatterns?: string[];
  /** 是否启用严格模式 */
  strictMode?: boolean;
}

/** API 请求上下文 */
export interface ApiRequestContext {
  /** 请求方法 */
  method: HttpMethod;
  /** 请求路径 */
  path: string;
  /** 请求头 */
  headers: Record<string, string>;
  /** 请求参数 */
  params: Record<string, string>;
  /** 查询参数 */
  query: Record<string, string | string[]>;
  /** 请求体 */
  body?: unknown;
}

/** API 响应对象 */
export interface ApiResponse {
  /** 状态码 */
  status: number;
  /** 响应头 */
  headers: Record<string, string>;
  /** 响应体 */
  body?: unknown;
}

/** API 处理函数 */
export type ApiHandler = (context: ApiRequestContext) => Promise<ApiResponse> | ApiResponse;

/** API 中间件函数 */
export type ApiMiddleware = (
  context: ApiRequestContext,
  next: () => Promise<ApiResponse>,
) => Promise<ApiResponse>;

/** API 匹配结果 */
export interface ApiMatch {
  /** 匹配的路由配置 */
  route: ApiRouteConfig;
  /** 请求方法 */
  method: HttpMethod;
  /** 路由参数 */
  params: Record<string, string>;
  /** 请求路径 */
  path: string;
}

/** API 路由器接口 */
export interface ApiRouter {
  /** 获取所有 API 路由配置 */
  getRoutes(): ApiRouteConfig[];

  /** 匹配 API 路由 */
  match(method: HttpMethod, path: string): ApiMatch | null;

  /** 添加 API 路由 */
  addRoute(route: ApiRouteConfig): void;

  /** 移除 API 路由 */
  removeRoute(path: string): void;

  /** 清除所有 API 路由 */
  clearRoutes(): void;

  /** 重新扫描文件系统 */
  refresh(): Promise<void>;

  /** 处理 API 请求 */
  handleRequest(method: HttpMethod, path: string, context: ApiRequestContext): Promise<ApiResponse>;
}
