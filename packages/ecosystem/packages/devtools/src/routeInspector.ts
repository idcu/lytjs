/**
 * @lytjs/devtools - 路由查看器
 */

import type { RouteInfo } from './types';

// 路由器实例
let routerInstance: any = null;

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
 */
export function getRouteHistory(): string[] {
  // 这里可以扩展为实际的历史记录
  return [];
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
