/**
 * @lytjs/router - createRouter implementation
 */

import type { Router, RouterOptions, RouteLocationNormalized, NavigationGuard, NavigationFailure } from './types';
import { signal } from '@lytjs/reactivity';

/**
 * Create a router instance
 */
export function createRouter(options: RouterOptions): Router {
  const currentRoute = signal<RouteLocationNormalized>({
    name: null,
    path: '/',
    fullPath: '/',
    query: {},
    hash: '',
    params: {},
    matched: [],
    meta: {},
  });

  const guards: {
    beforeEach: NavigationGuard[];
    afterEach: Array<(to: RouteLocationNormalized, from: RouteLocationNormalized, failure?: NavigationFailure) => void>;
    beforeResolve: NavigationGuard[];
  } = {
    beforeEach: [],
    afterEach: [],
    beforeResolve: [],
  };

  const router: Router = {
    currentRoute,
    options,

    async push(to) {
      // TODO: implement navigation
    },

    async replace(to) {
      // TODO: implement navigation
    },

    go(delta) {
      options.history.go(delta);
    },

    back() {
      this.go(-1);
    },

    forward() {
      this.go(1);
    },

    beforeEach(guard) {
      guards.beforeEach.push(guard);
      return () => {
        const index = guards.beforeEach.indexOf(guard);
        if (index > -1) guards.beforeEach.splice(index, 1);
      };
    },

    afterEach(hook) {
      guards.afterEach.push(hook);
      return () => {
        const index = guards.afterEach.indexOf(hook);
        if (index > -1) guards.afterEach.splice(index, 1);
      };
    },

    beforeResolve(guard) {
      guards.beforeResolve.push(guard);
      return () => {
        const index = guards.beforeResolve.indexOf(guard);
        if (index > -1) guards.beforeResolve.splice(index, 1);
      };
    },

    install(app) {
      // TODO: implement app plugin installation
    },

    async isReady() {
      // TODO: implement ready check
    },
  };

  return router;
}
