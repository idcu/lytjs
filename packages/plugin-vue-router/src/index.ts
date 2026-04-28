/**
 * @lytjs/plugin-vue-router — 统一导出入口
 *
 * 提供 vue-router 4 兼容的 API，基于 @lytjs/router 包装。
 *
 * 导出内容：
 * - createRouter — 创建路由实例
 * - createWebHistory — HTML5 History 模式
 * - createWebHashHistory — Hash 模式
 * - createMemoryHistory — 内存模式
 * - useRoute — 获取当前路由
 * - useRouter — 获取路由实例
 * - onBeforeRouteLeave — 离开守卫
 * - onBeforeRouteUpdate — 更新守卫
 * - RouterView — 路由视图组件
 * - RouterLink — 路由链接组件
 */

// ============================================================
// History 工厂函数
// ============================================================

export {
  createWebHistory,
  createWebHashHistory,
  createMemoryHistory,
} from './history';

export type {
  RouterHistory,
  RouterLocation,
  HistoryChangeListener,
} from './history';

// ============================================================
// Router 核心
// ============================================================

export { createVueRouter as createRouter } from './router';

export type {
  VueRouter as Router,
  RouterOptions,
  VueRouteRecord as RouteRecord,
  RouteLocationNormalized,
  VueRouteRecordNormalized as RouteRecordNormalized,
  RouteLocationResolved,
  NavigationGuardWithNext as NavigationGuard,
  NavigationGuardNext,
  NavigationFailure,
} from './router';

// ============================================================
// 组合式 API
// ============================================================

import { getCurrentInstance } from '@lytjs/compat';
import type { VueRouter, RouteLocationNormalized, NavigationGuardWithNext } from './router';

/**
 * 获取当前路由信息
 *
 * 在 setup 函数中使用，返回当前路由的标准化对象。
 *
 * @returns 当前路由信息
 *
 * @example
 * ```ts
 * const route = useRoute()
 * console.log(route.path)    // '/user/123'
 * console.log(route.params)  // { id: '123' }
 * ```
 */
export function useRoute(): RouteLocationNormalized {
  const instance = getCurrentInstance();
  const app = instance?.appContext?.app;

  if (app && (app as any)._vueRouter) {
    return (app as any)._vueRouter.currentRoute.value;
  }

  // 回退：尝试从 provide 获取
  if (instance) {
    const route = (instance as any).provides?.route;
    if (route) {
      return route.value;
    }
  }

  console.warn('[plugin-vue-router] useRoute: 无法获取路由信息，请确保 router 已安装');
  return {
    path: '/',
    fullPath: '/',
    params: {},
    query: {},
    hash: '',
    meta: {},
    matched: [],
  };
}

/**
 * 获取路由实例
 *
 * 在 setup 函数中使用，返回路由实例。
 *
 * @returns 路由实例
 *
 * @example
 * ```ts
 * const router = useRouter()
 * router.push('/home')
 * ```
 */
export function useRouter(): VueRouter {
  const instance = getCurrentInstance();
  const app = instance?.appContext?.app;

  if (app && (app as any)._vueRouter) {
    return (app as any)._vueRouter;
  }

  // 回退：尝试从 provide 获取
  if (instance) {
    const router = (instance as any).provides?.router;
    if (router) {
      return router;
    }
  }

  console.warn('[plugin-vue-router] useRouter: 无法获取路由实例，请确保 router 已安装');
  return null as any;
}

/**
 * 注册路由离开守卫
 *
 * 在当前路由离开时触发。常用于表单未保存提醒等场景。
 *
 * @param leaveGuard - 离开守卫函数
 *
 * @example
 * ```ts
 * onBeforeRouteLeave((to, from, next) => {
 *   if (hasUnsavedChanges) {
 *     const answer = window.confirm('确定要离开吗？未保存的更改将丢失。')
 *     if (!answer) next(false)
 *   }
 *   next()
 * })
 * ```
 */
export function onBeforeRouteLeave(leaveGuard: NavigationGuardWithNext): void {
  const router = useRouter();
  if (!router) return;

  const guard: NavigationGuardWithNext = (to, from, next) => {
    leaveGuard(to, from, next);
  };

  router.beforeEach(guard);
}

/**
 * 注册路由更新守卫
 *
 * 在当前路由更新时触发（例如参数变化但组件复用时）。
 *
 * @param updateGuard - 更新守卫函数
 *
 * @example
 * ```ts
 * onBeforeRouteUpdate((to, from, next) => {
 *   // 当 /user/:id 中的 id 变化时触发
 *   fetchData(to.params.id)
 *   next()
 * })
 * ```
 */
export function onBeforeRouteUpdate(updateGuard: NavigationGuardWithNext): void {
  const router = useRouter();
  if (!router) return;

  const guard: NavigationGuardWithNext = (to, from, next) => {
    // 只在路径相同但参数不同时触发
    if (to.path === from.path && JSON.stringify(to.params) !== JSON.stringify(from.params)) {
      updateGuard(to, from, next);
    } else {
      next?.();
    }
  };

  router.beforeEach(guard);
}

// ============================================================
// 组件
// ============================================================

export { RouterView, RouterLink } from './components';
