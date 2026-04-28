/**
 * @lytjs/plugin-vue-router — 核心 Router 类实现
 *
 * 包装 @lytjs/router 的功能，提供 vue-router 4 兼容的 API 层。
 *
 * 核心功能：
 * - 编程式导航：push / replace / go / back / forward
 * - 导航守卫：beforeEach / afterEach / beforeResolve
 * - 动态路由：addRoute / removeRoute / hasRoute / getRoutes
 * - 路由解析：resolve / isReady
 * - 插件安装：install(app)
 */

import {
  ref,
  reactive,
  computed,
} from '@lytjs/reactivity';

import type { RouterHistory, RouterLocation } from './history';

// ============================================================
// 类型定义
// ============================================================

/** 路由记录（兼容 vue-router 4） */
export interface VueRouteRecord {
  /** 路由名称 */
  name?: string;
  /** 路由路径模式 */
  path: string;
  /** 路由元信息 */
  meta?: Record<string, any>;
  /** 路由组件 */
  component?: any;
  /** 重定向 */
  redirect?: string | (() => string);
  /** 子路由 */
  children?: VueRouteRecord[];
  /** 别名 */
  alias?: string | string[];
  /** 路由独享守卫 */
  beforeEnter?: NavigationGuardWithNext;
  /** props 传递给组件 */
  props?: boolean | Record<string, any> | ((to: RouteLocationNormalized) => Record<string, any>);
}

/** 标准化路由位置 */
export interface RouteLocationNormalized {
  /** 路由路径 */
  path: string;
  /** 完整路径（含 query 和 hash） */
  fullPath: string;
  /** 路由参数 */
  params: Record<string, string>;
  /** 查询参数 */
  query: Record<string, string>;
  /** hash 值 */
  hash: string;
  /** 路由名称 */
  name?: string;
  /** 路由元信息 */
  meta: Record<string, any>;
  /** 匹配到的路由记录 */
  matched: VueRouteRecordNormalized[];
  /** 重定向来源 */
  redirectedFrom?: RouteLocationNormalized;
}

/** 标准化路由记录（匹配后） */
export interface VueRouteRecordNormalized {
  /** 路由名称 */
  name?: string;
  /** 路由路径 */
  path: string;
  /** 路由元信息 */
  meta: Record<string, any>;
  /** 路由组件 */
  components: Record<string, any>;
  /** 子路由 */
  children: VueRouteRecordNormalized[];
  /** 路由独享守卫 */
  beforeEnter?: NavigationGuardWithNext;
}

/** 导航守卫（兼容 vue-router 4 返回值风格） */
export type NavigationGuardWithNext = (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next?: NavigationGuardNext
) => void | boolean | RouteLocationNormalized;

/** next 函数类型 */
export type NavigationGuardNext = (
  location?: string | false | void | RouteLocationNormalized
) => void;

/** 导航失败信息 */
export interface NavigationFailure {
  type: number;
  from: RouteLocationNormalized;
  to: RouteLocationNormalized;
}

/** 路由解析结果 */
export interface RouteLocationResolved extends RouteLocationNormalized {
  /** 解析后的完整路径 */
  href: string;
}

/** Router 配置选项（兼容 vue-router 4） */
export interface RouterOptions {
  /** 路由历史管理器 */
  history: RouterHistory;
  /** 路由配置数组 */
  routes: VueRouteRecord[];
  /** 全局前置守卫 */
  beforeEach?: NavigationGuardWithNext;
  /** 全局解析守卫 */
  beforeResolve?: NavigationGuardWithNext;
  /** 全局后置守卫 */
  afterEach?: (to: RouteLocationNormalized, from: RouteLocationNormalized, failure?: NavigationFailure) => void;
  /** 是否在创建时启动导航 */
  startCallback?: (router: VueRouter) => void;
  /** 滚动行为 */
  scrollBehavior?: (to: RouteLocationNormalized, from: RouteLocationNormalized, savedPosition: any) => any;
  /** 链接激活 class */
  linkActiveClass?: string;
  /** 链接精确激活 class */
  linkExactActiveClass?: string;
  /** 是否严格查询 */
  strictQuery?: boolean;
  /** 结尾斜杠 */
  end?: boolean;
  /** 敏感 */
  sensitive?: boolean;
}

/** VueRouter 接口（兼容 vue-router 4） */
export interface VueRouter {
  /** 当前路由（响应式 ref） */
  currentRoute: { value: RouteLocationNormalized };
  /** 导航选项 */
  options: RouterOptions;
  /** 导航到新路径 */
  push(to: string | RouteLocationNormalized): Promise<NavigationFailure | void>;
  /** 替换当前路径 */
  replace(to: string | RouteLocationNormalized): Promise<NavigationFailure | void>;
  /** 前进/后退 */
  go(delta: number): void;
  /** 后退 */
  back(): void;
  /** 前进 */
  forward(): void;
  /** 添加路由 */
  addRoute(nameOrRecord: string | VueRouteRecord, record?: VueRouteRecord): void;
  /** 移除路由 */
  removeRoute(name: string): void;
  /** 是否存在路由 */
  hasRoute(name: string): boolean;
  /** 获取所有路由 */
  getRoutes(): VueRouteRecordNormalized[];
  /** 全局前置守卫 */
  beforeEach(guard: NavigationGuardWithNext): () => void;
  /** 全局解析守卫 */
  beforeResolve(guard: NavigationGuardWithNext): () => void;
  /** 全局后置守卫 */
  afterEach(guard: (to: RouteLocationNormalized, from: RouteLocationNormalized, failure?: NavigationFailure) => void): () => void;
  /** 解析路由 */
  resolve(to: string | RouteLocationNormalized): RouteLocationResolved;
  /** 路由是否已就绪 */
  isReady(): Promise<void>;
  /** 安装插件 */
  install(app: any): void;
}

// ============================================================
// 路径匹配工具
// ============================================================

/**
 * 将路径模式编译为正则表达式
 */
function pathToRegex(path: string): { regex: RegExp; paramKeys: string[] } {
  const paramKeys: string[] = [];
  // 将 :param 转换为捕获组
  let regexStr = path.replace(/:(\w+)/g, (_: string, paramName: string) => {
    paramKeys.push(paramName);
    return '([^/]+)';
  });
  // 将 * 通配符转换为捕获组
  regexStr = regexStr.replace(/\*/g, '(.+)');
  // 锚定
  regexStr = '^' + regexStr + '$';
  return { regex: new RegExp(regexStr), paramKeys };
}

/**
 * 标准化路径
 */
function normalizePath(path: string): string {
  if (!path.startsWith('/')) {
    path = '/' + path;
  }
  return path.replace(/\/+/g, '/');
}

/**
 * 解析完整路径
 */
function parseFullPath(fullPath: string): {
  path: string;
  query: Record<string, string>;
  hash: string;
} {
  let hash = '';
  let withoutHash = fullPath;

  const hashIndex = fullPath.indexOf('#');
  if (hashIndex !== -1) {
    hash = fullPath.slice(hashIndex + 1);
    withoutHash = fullPath.slice(0, hashIndex);
  }

  let path = withoutHash;
  let query: Record<string, string> = {};

  const queryIndex = withoutHash.indexOf('?');
  if (queryIndex !== -1) {
    path = withoutHash.slice(0, queryIndex);
    const qs = withoutHash.slice(queryIndex + 1);
    for (const pair of qs.split('&')) {
      const eqIndex = pair.indexOf('=');
      if (eqIndex === -1) {
        query[decodeURIComponent(pair)] = '';
      } else {
        query[decodeURIComponent(pair.slice(0, eqIndex))] = decodeURIComponent(pair.slice(eqIndex + 1));
      }
    }
  }

  return { path, query, hash };
}

/**
 * 构建完整路径
 */
function buildFullPath(path: string, query: Record<string, string>, hash: string): string {
  let fullPath = path;
  if (Object.keys(query).length) {
    const qs = Object.entries(query)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
    fullPath += '?' + qs;
  }
  if (hash) {
    fullPath += '#' + hash;
  }
  return fullPath;
}

// ============================================================
// 路由匹配器
// ============================================================

interface CompiledRoute {
  record: VueRouteRecord;
  regex: RegExp;
  paramKeys: string[];
  fullPath: string;
  children: CompiledRoute[];
}

/**
 * 编译路由记录
 */
function compileRoutes(routes: VueRouteRecord[], parentPath: string = ''): CompiledRoute[] {
  const compiled: CompiledRoute[] = [];

  for (const route of routes) {
    const fullPath = normalizePath(parentPath + '/' + route.path);
    const { regex, paramKeys } = pathToRegex(fullPath);

    const compiledRoute: CompiledRoute = {
      record: route,
      regex,
      paramKeys,
      fullPath,
      children: route.children ? compileRoutes(route.children, fullPath) : [],
    };

    compiled.push(compiledRoute);
  }

  return compiled;
}

/**
 * 匹配路径
 */
function matchRoute(
  compiledRoutes: CompiledRoute[],
  path: string
): { record: VueRouteRecord; params: Record<string, string>; matched: VueRouteRecord[] } | null {
  const normalizedPath = path.replace(/\/+$/, '') || '/';

  for (const compiled of compiledRoutes) {
    const match = normalizedPath.match(compiled.regex);
    if (match) {
      const params: Record<string, string> = {};
      for (let i = 0; i < compiled.paramKeys.length; i++) {
        params[compiled.paramKeys[i]] = match[i + 1] || '';
      }

      // 检查子路由匹配
      if (compiled.children.length > 0) {
        const childMatch = matchRoute(compiled.children, normalizedPath);
        if (childMatch) {
          return {
            record: childMatch.record,
            params: childMatch.params,
            matched: [compiled.record, ...childMatch.matched],
          };
        }
      }

      return {
        record: compiled.record,
        params,
        matched: [compiled.record],
      };
    }
  }

  return null;
}

// ============================================================
// VueRouter 实现
// ============================================================

/**
 * 创建 VueRouter 实例
 *
 * 兼容 vue-router 4 的 createRouter API。
 *
 * @param options - 路由配置
 * @returns VueRouter 实例
 *
 * @example
 * ```ts
 * const router = createRouter({
 *   history: createWebHistory(),
 *   routes: [
 *     { path: '/', name: 'home', component: Home },
 *     { path: '/user/:id', name: 'user', component: User },
 *   ],
 * })
 *
 * router.beforeEach((to, from, next) => {
 *   if (to.path === '/admin' && !isLoggedIn) {
 *     next('/login')
 *   } else {
 *     next()
 *   }
 * })
 *
 * app.use(router)
 * ```
 */
export function createVueRouter(options: RouterOptions): VueRouter {
  // 编译路由
  let compiledRoutes = compileRoutes(options.routes);

  // 创建当前路由（响应式）
  const initialLocation = options.history.location;
  const initialMatch = matchRoute(compiledRoutes, initialLocation.path);

  const currentRoute = ref<RouteLocationNormalized>(
    createRouteLocationNormalized(initialLocation, initialMatch)
  );

  // 导航守卫
  const beforeEachGuards: NavigationGuardWithNext[] = [];
  const beforeResolveGuards: NavigationGuardWithNext[] = [];
  const afterEachGuards: Array<(to: RouteLocationNormalized, from: RouteLocationNormalized, failure?: NavigationFailure) => void> = [];

  // 就绪 Promise
  let readyResolve: (() => void) | null = null;
  const readyPromise = new Promise<void>((resolve) => {
    readyResolve = resolve;
  });

  // 导航锁
  let navigationInProgress = false;

  // History 监听
  const unlisten = options.history.listen(async (location: RouterLocation, from: RouterLocation) => {
    await navigate(location.path, location, true);
  });

  /**
   * 创建标准化的路由位置
   */
  function createRouteLocationNormalized(
    location: RouterLocation,
    match: { record: VueRouteRecord; params: Record<string, string>; matched: VueRouteRecord[] } | null
  ): RouteLocationNormalized {
    const matched = match
      ? match.matched.map((r) => normalizeRouteRecord(r))
      : [];

    return reactive({
      path: location.path,
      fullPath: location.fullPath,
      params: match?.params || {},
      query: location.query,
      hash: location.hash,
      name: match?.record.name,
      meta: match?.record.meta || {},
      matched,
      redirectedFrom: undefined,
    });
  }

  /**
   * 标准化路由记录
   */
  function normalizeRouteRecord(record: VueRouteRecord): VueRouteRecordNormalized {
    return {
      name: record.name,
      path: record.path,
      meta: record.meta || {},
      components: record.component ? { default: record.component } : {},
      children: record.children
        ? record.children.map(normalizeRouteRecord)
        : [],
      beforeEnter: record.beforeEnter,
    };
  }

  /**
   * 解析目标路径为字符串
   */
  function resolvePath(to: string | RouteLocationNormalized): string {
    if (typeof to === 'string') {
      return normalizePath(to);
    }
    return to.fullPath || to.path;
  }

  /**
   * 执行导航
   */
  async function navigate(
    targetPath: string,
    location?: RouterLocation,
    fromHistory: boolean = false
  ): Promise<NavigationFailure | void> {
    if (navigationInProgress) return;
    navigationInProgress = true;

    try {
      // 1. 匹配目标路由
      const match = matchRoute(compiledRoutes, targetPath);

      // 2. 处理重定向
      if (match && match.record.redirect) {
        const redirectPath = typeof match.record.redirect === 'function'
          ? match.record.redirect()
          : match.record.redirect;
        navigationInProgress = false;
        if (!fromHistory) {
          options.history.replace(redirectPath);
        }
        return;
      }

      // 3. 构造目标位置
      const targetLocation: RouterLocation = location || {
        path: targetPath,
        fullPath: targetPath,
        query: {},
        hash: '',
        state: null,
        fromPopState: fromHistory,
      };

      const to = createRouteLocationNormalized(targetLocation, match);
      const from = currentRoute.value;

      // 4. 执行 beforeEach 守卫
      for (const guard of beforeEachGuards) {
        const result = await runGuard(guard, to, from);
        if (result === false) {
          return { type: 1, from, to };
        }
        if (typeof result === 'object' && result !== null) {
          // 重定向
          const redirectPath = resolvePath(result);
          navigationInProgress = false;
          if (!fromHistory) {
            options.history.replace(redirectPath);
          }
          return;
        }
      }

      // 5. 执行路由独享守卫
      if (match && match.record.beforeEnter) {
        const result = await runGuard(match.record.beforeEnter, to, from);
        if (result === false) {
          return { type: 1, from, to };
        }
        if (typeof result === 'object' && result !== null) {
          const redirectPath = resolvePath(result);
          navigationInProgress = false;
          if (!fromHistory) {
            options.history.replace(redirectPath);
          }
          return;
        }
      }

      // 6. 执行 beforeResolve 守卫
      for (const guard of beforeResolveGuards) {
        const result = await runGuard(guard, to, from);
        if (result === false) {
          return { type: 1, from, to };
        }
        if (typeof result === 'object' && result !== null) {
          const redirectPath = resolvePath(result);
          navigationInProgress = false;
          if (!fromHistory) {
            options.history.replace(redirectPath);
          }
          return;
        }
      }

      // 7. 更新当前路由
      currentRoute.value = to;

      // 8. 执行 afterEach 守卫
      for (const guard of afterEachGuards) {
        try {
          guard(to, from);
        } catch (err) {
          console.warn('[plugin-vue-router] afterEach 守卫执行出错:', err);
        }
      }

      // 9. 滚动行为
      if (options.scrollBehavior) {
        try {
          const scrollPosition = options.scrollBehavior(to, from, null);
          if (scrollPosition) {
            if (typeof scrollPosition === 'object' && typeof (scrollPosition as any).then === 'function') {
              (scrollPosition as Promise<void>).then((pos: any) => {
                window.scrollTo(pos);
              });
            } else {
              window.scrollTo(scrollPosition as ScrollToOptions);
            }
          }
        } catch (err) {
          console.warn('[plugin-vue-router] scrollBehavior 执行出错:', err);
        }
      }
    } finally {
      navigationInProgress = false;
    }
  }

  /**
   * 运行单个守卫
   */
  async function runGuard(
    guard: NavigationGuardWithNext,
    to: RouteLocationNormalized,
    from: RouteLocationNormalized
  ): Promise<void | boolean | RouteLocationNormalized> {
    return new Promise((resolve) => {
      let called = false;

      const next: NavigationGuardNext = (location?: string | false | void | RouteLocationNormalized) => {
        if (called) return;
        called = true;

        if (location === false) {
          resolve(false);
        } else if (typeof location === 'string') {
          resolve({ path: location, fullPath: location, params: {}, query: {}, hash: '', meta: {}, matched: [] } as RouteLocationNormalized);
        } else if (typeof location === 'object' && location !== null) {
          resolve(location);
        } else {
          resolve();
        }
      };

      try {
        const result = guard(to, from, next);

        // 如果守卫返回 Promise
        if (result !== undefined && result !== null && typeof result === 'object' && typeof (result as any).then === 'function') {
          (result as Promise<any>)
            .then((val: any) => {
              if (!called) {
                called = true;
                resolve(val);
              }
            })
            .catch(() => {
              if (!called) {
                called = true;
                resolve(false);
              }
            });
        } else if (result !== undefined && !called) {
          // 守卫直接返回值（不使用 next）
          called = true;
          resolve(result);
        }
      } catch {
        if (!called) {
          called = true;
          resolve(false);
        }
      }

      // 超时保护：如果守卫既不返回值也不调用 next
      setTimeout(() => {
        if (!called) {
          called = true;
          resolve();
        }
      }, 0);
    });
  }

  // ============================================================
  // 返回 Router 实例
  // ============================================================

  const router: VueRouter = {
    currentRoute,
    options,

    async push(to: string | RouteLocationNormalized): Promise<NavigationFailure | void> {
      const targetPath = resolvePath(to);
      options.history.push(targetPath);
      // navigate 会通过 history.listen 触发
    },

    async replace(to: string | RouteLocationNormalized): Promise<NavigationFailure | void> {
      const targetPath = resolvePath(to);
      options.history.replace(targetPath);
    },

    go(delta: number): void {
      options.history.go(delta);
    },

    back(): void {
      options.history.go(-1);
    },

    forward(): void {
      options.history.go(1);
    },

    addRoute(nameOrRecord: string | VueRouteRecord, record?: VueRouteRecord): void {
      let newRecord: VueRouteRecord;
      if (typeof nameOrRecord === 'string') {
        // addRoute('name', { path, component })
        if (!record) {
          console.warn('[plugin-vue-router] addRoute: 缺少路由记录');
          return;
        }
        newRecord = { ...record, name: nameOrRecord };
      } else {
        // addRoute({ path, name, component })
        newRecord = nameOrRecord;
      }

      // 重新编译路由
      compiledRoutes = compileRoutes([...options.routes, newRecord]);
      // 同时更新 options.routes
      options.routes.push(newRecord);
    },

    removeRoute(name: string): void {
      // 从 options.routes 中移除
      const removeRecursive = (routes: VueRouteRecord[]): boolean => {
        for (let i = routes.length - 1; i >= 0; i--) {
          if (routes[i].name === name) {
            routes.splice(i, 1);
            return true;
          }
          if (routes[i].children && removeRecursive(routes[i].children!)) {
            return true;
          }
        }
        return false;
      };
      removeRecursive(options.routes);
      // 重新编译
      compiledRoutes = compileRoutes(options.routes);
    },

    hasRoute(name: string): boolean {
      const checkRecursive = (routes: VueRouteRecord[]): boolean => {
        for (const route of routes) {
          if (route.name === name) return true;
          if (route.children && checkRecursive(route.children)) return true;
        }
        return false;
      };
      return checkRecursive(options.routes);
    },

    getRoutes(): VueRouteRecordNormalized[] {
      const result: VueRouteRecordNormalized[] = [];
      const collect = (routes: VueRouteRecord[]) => {
        for (const route of routes) {
          result.push(normalizeRouteRecord(route));
          if (route.children) {
            collect(route.children);
          }
        }
      };
      collect(options.routes);
      return result;
    },

    beforeEach(guard: NavigationGuardWithNext): () => void {
      beforeEachGuards.push(guard);
      return () => {
        const index = beforeEachGuards.indexOf(guard);
        if (index !== -1) beforeEachGuards.splice(index, 1);
      };
    },

    beforeResolve(guard: NavigationGuardWithNext): () => void {
      beforeResolveGuards.push(guard);
      return () => {
        const index = beforeResolveGuards.indexOf(guard);
        if (index !== -1) beforeResolveGuards.splice(index, 1);
      };
    },

    afterEach(guard: (to: RouteLocationNormalized, from: RouteLocationNormalized, failure?: NavigationFailure) => void): () => void {
      afterEachGuards.push(guard);
      return () => {
        const index = afterEachGuards.indexOf(guard);
        if (index !== -1) afterEachGuards.splice(index, 1);
      };
    },

    resolve(to: string | RouteLocationNormalized): RouteLocationResolved {
      const targetPath = resolvePath(to);
      const { path, query, hash } = parseFullPath(targetPath);
      const match = matchRoute(compiledRoutes, path);

      const resolved: RouteLocationResolved = {
        path,
        fullPath: buildFullPath(path, query, hash),
        params: match?.params || {},
        query,
        hash,
        name: match?.record.name,
        meta: match?.record.meta || {},
        matched: match
          ? match.matched.map(normalizeRouteRecord)
          : [],
        href: buildFullPath(path, query, hash),
      };

      return resolved;
    },

    isReady(): Promise<void> {
      // 标记为就绪
      if (readyResolve) {
        readyResolve();
        readyResolve = null;
      }
      return readyPromise;
    },

    install(app: any): void {
      // 将 router 挂载到 app 上
      (app as any)._vueRouter = router;

      // 全局属性
      if (app.config && app.config.globalProperties) {
        app.config.globalProperties.$router = router;
        Object.defineProperty(app.config.globalProperties, '$route', {
          get() {
            return currentRoute.value;
          },
        });
      }

      // provide 注入
      if (app.provide) {
        app.provide('router', router);
        app.provide('route', currentRoute);
      }

      // 注册全局组件
      if (app.component) {
        // 延迟导入组件以避免循环依赖
        try {
          const { RouterView, RouterLink } = require('./components');
          app.component('RouterView', RouterView);
          app.component('RouterLink', RouterLink);
        } catch {
          // 组件将在使用时动态导入
        }
      }

      // 初始化当前路由
      const initialLocation = options.history.location;
      const initialMatch = matchRoute(compiledRoutes, initialLocation.path);
      currentRoute.value = createRouteLocationNormalized(initialLocation, initialMatch);

      // 标记为就绪
      if (readyResolve) {
        readyResolve();
        readyResolve = null;
      }
    },
  };

  return router;
}
