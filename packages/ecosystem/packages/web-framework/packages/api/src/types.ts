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
  /** 中间件路径（root → leaf） */
  middlewarePaths?: string[];
  /**
   * 方法是否由**模块导出**决定（文件名为 `posts.ts` 而不是 `posts.post.ts`）。
   *
   * 此时 `methods` 只是默认值 `['GET']`，实际可用方法要看模块导出了哪些
   * `GET` / `POST` / … 或 `default` / `handler`。
   */
  dynamicMethods?: boolean;
}

/** API 路由器配置选项 */
export interface ApiRouterOptions {
  /**
   * 自定义 handler 解析器（默认按 `handlerPath` 动态 `import()`）。
   *
   * 用途：
   *  - 打包场景：handler 已被 bundle，无法按文件路径 import ⇒ 由构建插件注入映射表；
   *  - 测试：注入假 handler，避免依赖真实文件系统。
   */
  resolveHandler?: (
    handlerPath: string,
    method: HttpMethod,
  ) => Promise<ApiHandler | undefined> | ApiHandler | undefined;
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

  /**
   * 等待**首次**扫描完成。
   *
   * ⚠️ 2026-11-03 新增：`createApiRouter()` 是同步返回的，而扫描是异步的。
   *   此前 `handleRequest` 不等扫描完成 ⇒ 服务刚起来时头几个请求会 404（随后又"自己好了"）。
   *   现在 `handleRequest` 内部会 await 它；手动调 `match()` 的场景请先 `await router.ready()`。
   */
  ready(): Promise<void>;

  /** 处理 API 请求 */
  handleRequest(method: HttpMethod, path: string, context: ApiRequestContext): Promise<ApiResponse>;
}
