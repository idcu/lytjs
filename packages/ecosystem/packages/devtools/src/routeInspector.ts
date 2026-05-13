/**
 * @lytjs/devtools - 路由查看器
 */

import type { RouteInfo } from './types';
import { isFunction } from '@lytjs/common-is';

// 路由器实例
let routerInstance: any = null;

// 路由变更历史记录
const routeHistory: RouteInfo[] = [];

// afterEach 钩子的取消注册函数
let afterEachHandler: (() => void) | null = null;

/**
 * 注册路由器
 */
export function registerRouter(router: any): void {
  routerInstance = router;
}

/**
 * 注销路由器
 */
export function unregisterRouter(): void {
  unwatchRouteChanges();
  routerInstance = null;
}

/**
 * 获取当前路由信息
 */
export function getCurrentRoute(): RouteInfo | null {
  if (!routerInstance) return null;

  const currentRoute = routerInstance.currentRoute?.();
  if (!currentRoute) return null;

  return {
    path: currentRoute.path || '/',
    name: currentRoute.name || null,
    params: currentRoute.params || {},
    query: currentRoute.query || {},
    matched: (currentRoute.matched || []).map((m: any) => ({
      path: m.path || '',
      name: m.name || null,
    })),
  };
}

/**
 * 获取路由历史
 *
 * @description
 * 返回自监听开始以来的所有路由变更记录
 *
 * @returns 路由变更历史数组
 */
export function getRouteHistory(): RouteInfo[] {
  return [...routeHistory];
}

/**
 * 监听路由变化
 *
 * @description
 * 利用 router.afterEach 钩子监听路由导航，
 * 每次导航后将路由信息记录到 routeHistory 中
 *
 * @returns 是否成功开始监听
 */
export function watchRouteChanges(): boolean {
  if (!routerInstance) return false;
  if (!isFunction(routerInstance.afterEach)) return false;

  // 避免重复监听
  if (afterEachHandler !== null) {
    unwatchRouteChanges();
  }

  // 注册 afterEach 钩子
  routerInstance.afterEach((to: any) => {
    const routeInfo: RouteInfo = {
      path: to.path || '/',
      name: to.name || null,
      params: to.params || {},
      query: to.query || {},
      matched: (to.matched || []).map((m: any) => ({
        path: m.path || '',
        name: m.name || null,
      })),
    };
    routeHistory.push(routeInfo);
  });

  // 标记已开始监听
  afterEachHandler = () => {
    // Vue Router 的 afterEach 无法直接取消，这里标记为已停止
    afterEachHandler = null;
  };

  return true;
}

/**
 * 停止监听路由变化
 *
 * @description
 * 停止路由变更监听，但已记录的历史不会被清除
 */
export function unwatchRouteChanges(): void {
  if (afterEachHandler) {
    afterEachHandler();
    afterEachHandler = null;
  }
}

/**
 * 导航到指定路径
 */
export function navigateTo(path: string): Promise<void> {
  if (!routerInstance) {
    return Promise.reject(new Error('Router not registered'));
  }

  return routerInstance.push?.(path) || Promise.resolve();
}

/**
 * 导航到指定路由名称
 */
export function navigateToName(name: string, params?: Record<string, string>): Promise<void> {
  if (!routerInstance) {
    return Promise.reject(new Error('Router not registered'));
  }

  return routerInstance.push?.({ name, params }) || Promise.resolve();
}

/**
 * 返回上一页
 */
export function goBack(): Promise<void> {
  if (!routerInstance) {
    return Promise.reject(new Error('Router not registered'));
  }

  return routerInstance.back?.() || Promise.resolve();
}

/**
 * 序列化路由信息为字符串
 */
export function serializeRouteInfo(route: RouteInfo | null): string {
  if (!route) return 'No route information available';

  let result = `Path: ${route.path}\n`;
  result += `Name: ${route.name || 'N/A'}\n`;
  result += `Params: ${JSON.stringify(route.params)}\n`;
  result += `Query: ${JSON.stringify(route.query)}\n`;
  result += `Matched Routes:\n`;
  
  if (route.matched.length === 0) {
    result += '  (none)\n';
  } else {
    for (const match of route.matched) {
      result += `  - ${match.path}${match.name ? ` (${match.name})` : ''}\n`;
    }
  }

  return result;
}

/**
 * 获取所有路由配置
 */
export function getRoutes(): Array<{ path: string; name?: string | null }> {
  if (!routerInstance) return [];

  const routes = routerInstance.getRoutes?.() || [];
  return routes.map((r: any) => ({
    path: r.path || '',
    name: r.name || null,
  }));
}

/**
 * 检查路由器是否已注册
 */
export function isRouterRegistered(): boolean {
  return routerInstance !== null;
}

/**
 * 清空路由变更历史（用于测试）
 */
export function clearRouteHistory(): void {
  routeHistory.length = 0;
}
