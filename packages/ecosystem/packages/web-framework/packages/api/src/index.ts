/**
 * @lytjs/api
 *
 * LytJS API Router Engine
 *
 * @packageDocumentation
 */

import type {
  ApiRouterOptions,
  ApiRouteConfig,
  ApiMatch,
  ApiRequestContext,
  ApiResponse,
  ApiRouter,
  ApiHandler,
  HttpMethod,
} from './types';
import { scanApiDirectory } from './utils';
import { pathToFileURL } from 'node:url';

/**
 * handler 可抛出它来表达非 200 响应（4xx 业务错误 / 自定义头）。
 *
 * ⚠️ 2026-10-27 新增：此前 handler 从不执行，也就没有"错误如何表达"的契约。
 *   约定：`throw new ApiError(404, '用户不存在')` → `{ status: 404, body: { error: '用户不存在' } }`。
 */
export class ApiError extends Error {
  readonly status: number;
  readonly headers: Record<string, string>;
  readonly details?: Record<string, unknown>;

  constructor(
    status: number,
    message: string,
    details?: Record<string, unknown>,
    headers?: Record<string, string>,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.headers = headers ?? {};
    this.details = details;
  }
}

/** 把文件路径转成可被 `import()` 消费的 URL（Windows 下必需） */
function toFileUrl(filePath: string): string {
  return filePath.startsWith('file:') ? filePath : pathToFileURL(filePath).href;
}

/** 默认配置选项 */
const DEFAULT_OPTIONS: Required<Omit<ApiRouterOptions, 'resolveHandler'>> = {
  apiDir: 'src/api',
  extensions: ['.ts', '.tsx', '.js', '.jsx'],
  middlewarePattern: '_middleware',
  ignorePatterns: ['node_modules', '.git', 'dist'],
  strictMode: false,
};

/**
 * 创建 API 路由器
 */
export function createApiRouter(options?: ApiRouterOptions): ApiRouter {
  const config = { ...DEFAULT_OPTIONS, ...options };
  let routes: ApiRouteConfig[] = [];

  async function refresh() {
    routes = scanApiDirectory(
      config.apiDir,
      config.apiDir,
      config.extensions,
      config.ignorePatterns,
    );
  }

  function match(method: HttpMethod, path: string): ApiMatch | null {
    // 精确匹配
    for (const route of routes) {
      if (route.path === path && route.methods.includes(method)) {
        return {
          route,
          method,
          params: {},
          path,
        };
      }
    }

    // 动态匹配
    const pathSegments = path.split('/').filter(Boolean);

    for (const route of routes) {
      if (!route.methods.includes(method)) continue;

      const routeSegments = route.path.split('/').filter(Boolean);
      if (routeSegments.length !== pathSegments.length) continue;

      const params: Record<string, string> = {};
      let match = true;

      for (let i = 0; i < routeSegments.length; i++) {
        const routeSeg = routeSegments[i];
        const pathSeg = pathSegments[i];
        if (!routeSeg || !pathSeg) continue;

        if (routeSeg.startsWith(':')) {
          params[routeSeg.slice(1)] = pathSeg;
        } else if (routeSeg !== pathSeg) {
          match = false;
          break;
        }
      }

      if (match) {
        return {
          route,
          method,
          params,
          path,
        };
      }
    }

    return null;
  }

  async function handleRequest(
    method: HttpMethod,
    path: string,
    context: ApiRequestContext,
  ): Promise<ApiResponse> {
    const matched = match(method, path);
    if (!matched) {
      return {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
        body: { error: 'Not Found' },
      };
    }

    try {
      // ⚠️ 2026-10-27 修（P0）：此前这里**从不执行用户 handler**，直接返回
      //   `{ message: 'API Route Matched' }`（源码注释自承「这里提供一个默认的响应」）。
      //   后果：任何 API 请求都拿到假响应 200 —— 调用方以为接口通了。
      //   现在按 `handlerPath` 动态 import 模块，取 `default` / `handler` / 同名方法导出并执行。
      const handler = config.resolveHandler
        ? await config.resolveHandler(matched.route.handlerPath, method)
        : await defaultLoadHandler(matched.route.handlerPath, method);

      if (!handler) {
        return {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
          body: {
            error: 'Handler Not Found',
            message:
              `${matched.route.handlerPath} 未导出可调用的 handler` +
              `（期望 default / handler / ${method.toLowerCase()} 之一）`,
          },
        };
      }

      const result = await handler({
        method,
        path,
        headers: context.headers ?? {},
        params: matched.params,
        query: context.query ?? {},
        body: context.body,
      });

      return normalizeResponse(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      // 4xx 语义由 handler 自己抛 `ApiError` 表达；这里只兜底成 500 且**不泄漏内部栈**
      if (error instanceof ApiError) {
        return {
          status: error.status,
          headers: { 'Content-Type': 'application/json', ...error.headers },
          body: { error: error.message, ...error.details },
        };
      }
      return {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
        body: { error: 'Internal Server Error', message: error.message },
      };
    }
  }

  /** 把 handler 的返回值归一化成 ApiResponse */
  function normalizeResponse(result: unknown): ApiResponse {
    // 已经是 { status, headers, body } 形态：直接用
    if (
      result !== null &&
      typeof result === 'object' &&
      typeof (result as { status?: unknown }).status === 'number'
    ) {
      const r = result as Partial<ApiResponse>;
      return {
        status: r.status as number,
        headers: { 'Content-Type': 'application/json', ...(r.headers ?? {}) },
        body: r.body,
      };
    }
    // 普通对象 / 数组 / 字符串：当作 200 的 JSON 体
    return {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: result,
    };
  }

  function getRoutes() {
    return [...routes];
  }

  function addRoute(route: ApiRouteConfig) {
    routes.push(route);
  }

  function removeRoute(path: string) {
    routes = routes.filter((r) => r.path !== path);
  }

  function clearRoutes() {
    routes = [];
  }

  refresh().catch((err) => {
    console.warn('Failed to scan API routes:', err);
  });

  return {
    getRoutes,
    match,
    addRoute,
    removeRoute,
    clearRoutes,
    refresh,
    handleRequest,
  };
}

// 导出类型
export type {
  ApiRouterOptions,
  ApiRouteConfig,
  ApiRequestContext,
  ApiResponse,
  ApiMatch,
  ApiRouter,
  ApiHandler,
  ApiMiddleware,
  HttpMethod,
} from './types';

/**
 * 默认的 handler 解析：按文件路径动态 `import()`，取 `default` / `handler` / 方法名导出。
 *
 * 之所以默认值放在模块级而不是闭包里：`resolveHandler` 选项允许调用方替换它
 * （打包场景 handler 已被 bundle，无法按路径 import；测试场景需要注入假实现）。
 */
async function defaultLoadHandler(
  handlerPath: string,
  method: HttpMethod,
): Promise<ApiHandler | undefined> {
  const mod = (await import(/* @vite-ignore */ toFileUrl(handlerPath))) as Record<string, unknown>;
  const candidates = [mod.default, mod.handler, mod[method.toLowerCase()], mod[method]];
  for (const candidate of candidates) {
    if (typeof candidate === 'function') return candidate as ApiHandler;
  }
  return undefined;
}
