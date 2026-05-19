/**
 * @lytjs/router-fs
 *
 * LytJS File-System Router Engine
 *
 * @packageDocumentation
 */

import type { FileSystemRouterOptions, RouteConfig, RouteMatch, FileSystemRouter } from './types';
import { scanDirectory } from './utils';

/** 默认配置选项 */
const DEFAULT_OPTIONS: Required<FileSystemRouterOptions> = {
  pagesDir: 'src/pages',
  extensions: ['.ts', '.tsx', '.js', '.jsx'],
  layoutPattern: '_layout',
  ignorePatterns: ['node_modules', '.git', 'dist'],
  strictMode: false,
};

/**
 * 创建文件系统路由管理器
 */
export function createFileSystemRouter(options?: FileSystemRouterOptions): FileSystemRouter {
  const config = { ...DEFAULT_OPTIONS, ...options };
  let routes: RouteConfig[] = [];

  async function refresh() {
    routes = scanDirectory(
      config.pagesDir,
      config.pagesDir,
      config.extensions,
      config.ignorePatterns,
    );
  }

  function match(path: string): RouteMatch | null {
    // 精确匹配
    for (const route of routes) {
      if (route.path === path) {
        return {
          route,
          params: {},
          path,
        };
      }
    }

    // 动态匹配
    const pathSegments = path.split('/').filter(Boolean);

    for (const route of routes) {
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
          params,
          path,
        };
      }
    }

    return null;
  }

  function getRoutes() {
    return [...routes];
  }

  function addRoute(route: RouteConfig) {
    routes.push(route);
  }

  function removeRoute(path: string) {
    routes = routes.filter((r) => r.path !== path);
  }

  function clearRoutes() {
    routes = [];
  }

  refresh().catch((err) => {
    console.warn('Failed to scan routes:', err);
  });

  return {
    getRoutes,
    match,
    addRoute,
    removeRoute,
    clearRoutes,
    refresh,
  };
}

// 导出类型
export type { FileSystemRouterOptions, RouteConfig, RouteMatch, FileSystemRouter } from './types';
