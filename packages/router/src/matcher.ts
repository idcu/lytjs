/**
 * Lyt.js 路由系统 — 路由匹配器（Matcher）
 *
 * 自研正则路径匹配引擎，将路由路径模式编译为正则表达式，
 * 支持静态路径、动态参数（:param）、通配符（*）。
 *
 * 核心原理：
 * 1. 将路径模式（如 /user/:id）编译为正则表达式（如 /^\/user\/([^/]+)$/）
 * 2. 正则中的捕获组对应动态参数，匹配时自动提取参数值
 * 3. 通配符 * 编译为 (.+)，匹配任意路径
 *
 * 纯原生零依赖实现。
 */

import {
  escapeRegExp,
  normalizePath,
  pathToRegex,
  matchPath,
} from '@lytjs/common';

// ============================================================
// 类型定义
// ============================================================

/** 路由记录 */
export interface RouteRecord {
  /** 路由名称（唯一标识，用于 removeRoute 等） */
  name?: string;
  /** 路由路径模式，如 '/user/:id' */
  path: string;
  /** 路由元信息（自定义数据） */
  meta?: Record<string, any>;
  /** 路由组件 */
  component?: any;
  /** 重定向路径 */
  redirect?: string;
  /** 子路由 */
  children?: RouteRecord[];
  /** 编译后的正则（内部使用） */
  _regex?: RegExp;
  /** 参数名列表（内部使用） */
  _paramKeys?: string[];
  /** 是否为通配符路由 */
  _isWildcard?: boolean;
}

/** 路由匹配结果 */
export interface RouteMatchResult {
  /** 匹配到的路由记录 */
  record: RouteRecord;
  /** 提取的路径参数，如 { id: '123' } */
  params: Record<string, string>;
  /** 匹配到的完整路径 */
  matchedPath: string;
}

/** 路由匹配器实例 */
export interface RouteMatcher {
  /** 匹配路径，返回匹配结果或 null */
  matchRoute(path: string): RouteMatchResult | null;
  /** 动态添加路由 */
  addRoute(route: RouteRecord): void;
  /** 按名称移除路由 */
  removeRoute(name: string): void;
  /** 获取所有路由记录 */
  getRoutes(): RouteRecord[];
}

// ============================================================
// 路径编译
// ============================================================

/**
 * 编译路由记录
 *
 * 递归编译路由记录及其子路由，将路径模式转换为正则表达式。
 *
 * @param record - 路由记录
 * @param parentPath - 父路由路径（用于子路由拼接）
 */
function compileRouteRecord(record: RouteRecord, parentPath: string = ''): void {
  // 拼接完整路径
  const fullPath = normalizePath(parentPath, record.path);

  // 使用 shared 的 pathToRegex 编译路径模式
  const { regex, paramKeys, isWildcard } = pathToRegex(fullPath);

  // 将编译结果存储到路由记录上
  record._regex = regex;
  record._paramKeys = paramKeys;
  record._isWildcard = isWildcard;

  // 递归编译子路由
  if (record.children) {
    for (const child of record.children) {
      compileRouteRecord(child, fullPath);
    }
  }
}

// ============================================================
// 路由匹配器创建
// ============================================================

/**
 * 创建路由匹配器
 *
 * 接收路由配置数组，编译所有路由路径模式为正则表达式，
 * 提供 matchRoute、addRoute、removeRoute 等方法。
 *
 * @param routes - 路由配置数组
 * @returns 路由匹配器实例
 *
 * @example
 * ```ts
 * const matcher = createRouteMatcher([
 *   { path: '/', name: 'home', component: Home },
 *   { path: '/user/:id', name: 'user', component: User },
 *   { path: '/files/*', name: 'files', component: Files },
 * ])
 *
 * const result = matcher.matchRoute('/user/123')
 * // result = { record: {...}, params: { id: '123' }, matchedPath: '/user/123' }
 *
 * matcher.addRoute({ path: '/about', name: 'about', component: About })
 * matcher.removeRoute('about')
 * ```
 */
export function createRouteMatcher(routes: RouteRecord[]): RouteMatcher {
  // 扁平化的路由记录列表（包含所有层级的路由）
  const flatRoutes: RouteRecord[] = [];

  /**
   * 扁平化路由树
   * 将嵌套的路由结构展平为一维数组，方便匹配时遍历
   */
  function flattenRoutes(routeList: RouteRecord[], parentPath: string = ''): void {
    for (const route of routeList) {
      // 编译路由记录
      compileRouteRecord(route, parentPath);

      // 添加到扁平列表
      flatRoutes.push(route);

      // 递归处理子路由
      if (route.children) {
        const fullPath = normalizePath(parentPath, route.path);
        flattenRoutes(route.children, fullPath);
      }
    }
  }

  // 初始化：编译并扁平化所有路由
  flattenRoutes(routes);

  /**
   * 匹配路径
   *
   * 遍历所有路由记录，用编译好的正则进行匹配。
   * 优先匹配静态路径，其次匹配动态参数路径，最后匹配通配符。
   *
   * @param path - 要匹配的路径
   * @returns 匹配结果或 null
   */
  function matchRoute(path: string): RouteMatchResult | null {
    // 标准化路径：去除末尾的 /
    const normalizedPath = path.replace(/\/+$/, '') || '/';

    // 遍历所有路由记录进行匹配
    for (const record of flatRoutes) {
      if (!record._regex) continue;

      // 执行正则匹配
      const match = normalizedPath.match(record._regex);

      if (match) {
        // 提取参数
        const params: Record<string, string> = {};

        if (record._paramKeys) {
          for (let i = 0; i < record._paramKeys.length; i++) {
            const key = record._paramKeys[i];
            params[key] = match[i + 1] || '';
          }
        }

        return {
          record,
          params,
          matchedPath: normalizedPath,
        };
      }
    }

    // 没有匹配到任何路由
    return null;
  }

  /**
   * 动态添加路由
   *
   * 编译新路由记录并添加到匹配列表中。
   *
   * @param route - 要添加的路由记录
   */
  function addRoute(route: RouteRecord): void {
    // 编译路由记录
    compileRouteRecord(route);

    // 添加到扁平列表
    flatRoutes.push(route);

    // 如果有子路由，也一并添加
    if (route.children) {
      const fullPath = normalizePath('', route.path);
      flattenRoutes(route.children, fullPath);
    }
  }

  /**
   * 按名称移除路由
   *
   * @param name - 要移除的路由名称
   */
  function removeRoute(name: string): void {
    // 查找并移除匹配的路由记录
    for (let i = flatRoutes.length - 1; i >= 0; i--) {
      if (flatRoutes[i].name === name) {
        flatRoutes.splice(i, 1);
      }
    }
  }

  /**
   * 获取所有路由记录
   *
   * @returns 扁平化的路由记录数组
   */
  function getRoutes(): RouteRecord[] {
    return [...flatRoutes];
  }

  return {
    matchRoute,
    addRoute,
    removeRoute,
    getRoutes,
  };
}
