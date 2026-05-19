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
  HttpMethod,
} from './types';
import { scanApiDirectory } from './utils';

/** 默认配置选项 */
const DEFAULT_OPTIONS: Required<ApiRouterOptions> = {
  apiDir: 'src/api',
  extensions: ['.ts', '.tsx', '.js', '.jsx'],
  middlewarePattern: '_middleware',
  ignorePatterns: ['node_modules', '.git', 'dist'],
  strictMode: false,
};

/**
 * 创建 API 路由器
 */
export function createApiRouter(
  options?: ApiRouterOptions
): ApiRouter {
  const config = { ...DEFAULT_OPTIONS, ...options };
  let routes: ApiRouteConfig[] = [];

  async function refresh() {
    routes = scanApiDirectory(
      config.apiDir,
      config.apiDir,
      config.extensions,
      config.ignorePatterns
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
    _context: ApiRequestContext
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
      // 这里我们需要动态加载并执行处理函数
      // 由于我们是库，实际的加载逻辑需要根据具体环境实现
      // 这里提供一个默认的响应
      return {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          message: 'API Route Matched',
          method,
          path,
          params: matched.params,
        },
      };
    } catch (error) {
      return {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
        body: { error: 'Internal Server Error', message: String(error) },
      };
    }
  }

  function getRoutes() {
    return [...routes];
  }

  function addRoute(route: ApiRouteConfig) {
    routes.push(route);
  }

  function removeRoute(path: string) {
    routes = routes.filter(r => r.path !== path);
  }

  function clearRoutes() {
    routes = [];
  }

  refresh().catch(err => {
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
