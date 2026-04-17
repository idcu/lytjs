/**
 * Lyt.js 路由系统 — 路由创建（createRouter）
 *
 * 整合路由匹配器、History 管理和导航守卫，提供完整的路由实例。
 *
 * 核心功能：
 * - 创建路由实例（支持 history 和 hash 两种模式）
 * - 导航方法：push / replace / go / back / forward
 * - 导航守卫：beforeEach / afterEach / beforeResolve
 * - 响应式当前路由（currentRoute，基于 @lytjs/reactivity）
 * - 插件安装（install 方法，供 app.use 调用）
 *
 * 集成 @lytjs/reactivity 实现响应式路由。
 */

import {
  createRouteMatcher,
  type RouteRecord,
  type RouteMatchResult,
  type RouteMatcher,
} from './matcher';

import {
  createWebHistory,
  createHashHistory,
  type RouterHistory,
  type RouterLocation,
} from './history';

import {
  createNavigationGuards,
  runGuards,
  runAfterGuards,
  type NavigationGuards,
  type NavigationGuard,
  type NavigationTarget,
} from './guards';

import {
  ref,
  reactive,
  type Ref,
} from '@lytjs/reactivity';

// ============================================================
// 类型定义
// ============================================================

/** 路由模式 */
export type RouterMode = 'history' | 'hash';

/** 路由创建选项 */
export interface RouterOptions {
  /** 路由模式：history（HTML5 History）或 hash */
  mode: RouterMode;
  /** 路由配置数组 */
  routes: RouteRecord[];
  /** 基础路径（仅 history 模式有效，默认 '/'） */
  base?: string;
}

/** 路由信息（对外暴露） */
export interface Route {
  /** 路由路径 */
  path: string;
  /** 完整路径 */
  fullPath: string;
  /** 路由参数 */
  params: Record<string, string>;
  /** 路由名称 */
  name?: string;
  /** 路由元信息 */
  meta?: Record<string, any>;
  /** 查询参数 */
  query: Record<string, string>;
  /** hash 值 */
  hash: string;
  /** 匹配到的路由记录 */
  matched: RouteRecord[];
}

/** 路由实例 */
export interface Router {
  /** 当前路由信息（响应式 Ref） */
  currentRoute: Ref<Route>;
  /** 导航到新路径 */
  push(path: string): Promise<void>;
  /** 替换当前路径 */
  replace(path: string): Promise<void>;
  /** 前进/后退 n 步 */
  go(n: number): void;
  /** 后退一步 */
  back(): void;
  /** 前进一步 */
  forward(): void;
  /** 注册全局前置守卫 */
  beforeEach(guard: NavigationGuard): () => void;
  /** 注册全局后置守卫 */
  afterEach(guard: (to: Route, from: Route) => void): () => void;
  /** 注册全局解析守卫 */
  beforeResolve(guard: NavigationGuard): () => void;
  /** 动态添加路由 */
  addRoute(route: RouteRecord): void;
  /** 按名称移除路由 */
  removeRoute(name: string): void;
  /** 获取所有路由记录 */
  getRoutes(): RouteRecord[];
  /** 插件安装方法（供 app.use 调用） */
  install(app: any): void;
  /** 销毁路由实例 */
  destroy(): void;
}

// ============================================================
// 内部工具
// ============================================================

/**
 * 将 RouterLocation 转换为 NavigationTarget（守卫使用）
 */
function locationToTarget(location: RouterLocation, match: RouteMatchResult | null): NavigationTarget {
  return {
    path: location.path,
    fullPath: location.fullPath,
    params: match?.params || {},
    name: match?.record.name,
    meta: match?.record.meta || {},
    query: location.query,
    hash: location.hash,
  };
}

/**
 * 将 RouterLocation + RouteMatchResult 转换为 Route（对外暴露）
 *
 * 使用 reactive 包装，使路由对象内部属性（params、query 等）也是响应式的。
 */
function createRoute(
  location: RouterLocation,
  match: RouteMatchResult | null
): Route {
  return reactive({
    path: location.path,
    fullPath: location.fullPath,
    params: match?.params || {},
    name: match?.record.name,
    meta: match?.record.meta || {},
    query: location.query,
    hash: location.hash,
    matched: match ? [match.record] : [],
  });
}

// ============================================================
// 路由创建
// ============================================================

/**
 * 创建路由实例
 *
 * 整合匹配器、History 和守卫，提供完整的路由功能。
 *
 * @param options - 路由配置选项
 * @returns 路由实例
 *
 * @example
 * ```ts
 * const router = createRouter({
 *   mode: 'history',
 *   routes: [
 *     { path: '/', name: 'home', component: Home },
 *     { path: '/user/:id', name: 'user', component: User },
 *   ],
 *   base: '/app',
 * })
 *
 * // 注册守卫
 * router.beforeEach((to, from, next) => {
 *   console.log('导航到:', to.path)
 *   next()
 * })
 *
 * // 编程式导航
 * router.push('/user/123')
 *
 * // 作为插件安装
 * app.use(router)
 * ```
 */
export function createRouter(options: RouterOptions): Router {
  // 1. 创建路由匹配器
  const matcher: RouteMatcher = createRouteMatcher(options.routes);

  // 2. 创建 History 实例
  const history: RouterHistory =
    options.mode === 'hash'
      ? createHashHistory()
      : createWebHistory(options.base || '/');

  // 3. 创建导航守卫管理器
  const guards: NavigationGuards = createNavigationGuards();

  // 4. 当前路由（响应式 ref，基于 @lytjs/reactivity）
  const currentRoute = ref<Route>(
    createRoute(history.location, matcher.matchRoute(history.location.path))
  );

  // 5. 导航锁（防止并发导航）
  let navigationInProgress = false;

  // 6. History 变化监听（用于浏览器前进/后退）
  const unlisten = history.listen(async (location: RouterLocation, from: RouterLocation) => {
    await navigate(location.path, from, true);
  });

  /**
   * 执行导航流程
   *
   * 完整流程：
   * 1. 匹配目标路由
   * 2. 执行 beforeEach 守卫
   * 3. 执行 beforeResolve 守卫
   * 4. 更新当前路由
   * 5. 执行 afterEach 守卫
   *
   * @param targetPath - 目标路径
   * @param fromLocation - 来源位置
   * @param fromHistory - 是否来自 History 事件（popstate/hashchange）
   */
  async function navigate(
    targetPath: string,
    fromLocation?: RouterLocation,
    fromHistory: boolean = false
  ): Promise<void> {
    // 防止并发导航
    if (navigationInProgress) return;
    navigationInProgress = true;

    try {
      // 1. 匹配目标路由
      const match = matcher.matchRoute(targetPath);

      // 2. 构造目标位置
      const targetLocation: RouterLocation = {
        path: targetPath,
        fullPath: targetPath,
        query: {},
        hash: '',
        state: null,
        fromPopState: fromHistory,
      };

      const to = locationToTarget(targetLocation, match);
      const fromRoute = currentRoute.value;
      const from: NavigationTarget = {
        path: fromRoute.path,
        fullPath: fromRoute.fullPath,
        params: fromRoute.params,
        name: fromRoute.name,
        meta: fromRoute.meta,
        query: fromRoute.query,
        hash: fromRoute.hash,
      };

      // 3. 执行 beforeEach 守卫
      try {
        await runGuards(
          guards._beforeEachGuards,
          to,
          from
        );
      } catch (err: any) {
        // 守卫中止或重定向
        if (err?.message?.startsWith('REDIRECT:')) {
          const redirectPath = err.message.replace('REDIRECT:', '');
          if (!fromHistory) {
            history.replace(redirectPath);
          }
          return;
        }
        // 导航被中止
        return;
      }

      // 4. 执行 beforeResolve 守卫
      try {
        await runGuards(
          guards._beforeResolveGuards,
          to,
          from
        );
      } catch (err: any) {
        if (err?.message?.startsWith('REDIRECT:')) {
          const redirectPath = err.message.replace('REDIRECT:', '');
          if (!fromHistory) {
            history.replace(redirectPath);
          }
          return;
        }
        return;
      }

      // 5. 更新当前路由
      const newRoute = createRoute(targetLocation, match);
      currentRoute.value = newRoute;

      // 6. 执行 afterEach 守卫
      runAfterGuards(
        guards._afterEachGuards,
        to,
        from
      );
    } finally {
      navigationInProgress = false;
    }
  }

  // ============================================================
  // 返回路由实例
  // ============================================================

  const router: Router = {
    /** 当前路由（响应式 Ref，通过 .value 访问当前路由对象） */
    currentRoute,

    /**
     * 导航到新路径
     */
    async push(path: string): Promise<void> {
      history.push(path);
      // navigate 会通过 history.listen 触发
    },

    /**
     * 替换当前路径
     */
    async replace(path: string): Promise<void> {
      history.replace(path);
      // navigate 会通过 history.listen 触发
    },

    /**
     * 前进/后退 n 步
     */
    go(n: number): void {
      history.go(n);
    },

    /**
     * 后退一步
     */
    back(): void {
      history.back();
    },

    /**
     * 前进一步
     */
    forward(): void {
      history.forward();
    },

    /**
     * 注册全局前置守卫
     */
    beforeEach(guard: NavigationGuard): () => void {
      return guards.beforeEach(guard);
    },

    /**
     * 注册全局后置守卫
     */
    afterEach(guard: (to: Route, from: Route) => void): () => void {
      // 适配 Route 类型到 NavigationTarget
      return guards.afterEach(guard as any);
    },

    /**
     * 注册全局解析守卫
     */
    beforeResolve(guard: NavigationGuard): () => void {
      return guards.beforeResolve(guard);
    },

    /**
     * 动态添加路由
     */
    addRoute(route: RouteRecord): void {
      matcher.addRoute(route);
    },

    /**
     * 按名称移除路由
     */
    removeRoute(name: string): void {
      matcher.removeRoute(name);
    },

    /**
     * 获取所有路由记录
     */
    getRoutes(): RouteRecord[] {
      return matcher.getRoutes();
    },

    /**
     * 插件安装方法
     *
     * 当通过 app.use(router) 调用时，自动：
     * 1. 将路由实例挂载到 app 上
     * 2. 提供全局 $router 和 $route
     * 3. 初始化当前路由
     */
    install(app: any): void {
      // 将路由实例挂载到 app.config.globalProperties 上
      if (app.config && app.config.globalProperties) {
        app.config.globalProperties.$router = router;
        // 使用 getter 让 $route 始终指向最新路由
        Object.defineProperty(app.config.globalProperties, '$route', {
          get() {
            return currentRoute.value;
          },
        });
      }

      // 通过 provide 注入路由实例
      if (app.provide) {
        app.provide('router', router);
        app.provide('route', currentRoute);
      }

      // 初始化当前路由
      const initialMatch = matcher.matchRoute(history.location.path);
      currentRoute.value = createRoute(history.location, initialMatch);
    },

    /**
     * 销毁路由实例
     */
    destroy(): void {
      unlisten();
      history.destroy();
    },
  };

  return router;
}
