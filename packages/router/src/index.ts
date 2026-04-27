/**
 * Lyt.js 路由系统 — 统一导出入口
 *
 * 导出所有公共 API 和类型定义。
 * 纯原生零依赖实现。
 */

// ============================================================
// 路由创建
// ============================================================

export { createRouter } from './create-router';

export type {
  Router,
  RouterOptions,
  RouterMode,
  Route,
} from './create-router';

// ============================================================
// 路由匹配器
// ============================================================

export { createRouteMatcher } from './matcher';

export type {
  RouteRecord,
  RouteMatchResult,
  RouteMatcher,
} from './matcher';

// ============================================================
// History 管理
// ============================================================

export {
  createWebHistory,
  createHashHistory,
} from './history';

export type {
  RouterHistory,
  RouterLocation,
  HistoryChangeListener,
} from './history';

// ============================================================
// 导航守卫
// ============================================================

export {
  createNavigationGuards,
  runGuards,
  runAfterGuards,
} from './guards';

export type {
  NavigationGuard,
  NavigationGuardNext,
  NavigationTarget,
  NavigationGuards,
} from './guards';
