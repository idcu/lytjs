/**
 * @lytjs/router - useRouter composable
 */

import type { Router } from '../types';
import { inject } from '@lytjs/component';

let currentRouter: Router | null = null;

/**
 * Set the active router instance (called during install)
 */
export function setCurrentRouter(router: Router): void {
  currentRouter = router;
}

/**
 * Get the current router instance
 */
export function useRouter(): Router {
  // S24：优先取**当前组件所属 app** 的 router。
  // `router.install(app)` 已把实例写入 `app.provide('__lytjs_router__')`，
  // 但此前 useRouter 只读模块级 currentRouter —— 两个 app 同时安装时，
  // 后安装的 router 会覆盖全局，先安装那个 app 的组件会拿到别人的实例。
  // 组件外部（如导航守卫）没有实例上下文，仍回落到 currentRouter。
  const appRouter = inject<Router>('__lytjs_router__');
  const router = appRouter ?? currentRouter;
  if (!router) {
    throw new Error(
      '[@lytjs/router] No active router instance. ' +
        'Make sure to call app.use(router) before using useRouter().',
    );
  }
  return router;
}
