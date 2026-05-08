/**
 * @lytjs/router - createRouter implementation
 *
 * Core router with navigation, guard pipeline, and route matching.
 */

import type {
  Router,
  RouterOptions,
  RouteLocationNormalized,
  RouteLocationRaw,
  NavigationGuard,
  NavigationFailure,
  NavigationGuardNext,
  NavigationGuardReturn,
} from './types';
import { NavigationFailureType } from './types';
import { signal } from '@lytjs/reactivity';
import {
  normalizeRouteRecord,
  flattenMatchers,
  matchPath,
  type RouteRecordMatcher,
} from './matcher';
import { resolveLocation, isSameRouteLocation } from './location';
import { setCurrentRouter } from './composables/useRouter';

/**
 * Create a router instance
 */
export function createRouter(options: RouterOptions): Router {
  // Build the matcher tree from route records
  const matchers = options.routes.map((route) => normalizeRouteRecord(route));
  const flatMatchers = flattenMatchers(matchers);

  // Current route state
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

  // Navigation guard queues
  const beforeEachGuards: NavigationGuard[] = [];
  const beforeResolveGuards: NavigationGuard[] = [];
  const afterEachHooks: Array<
    (to: RouteLocationNormalized, from: RouteLocationNormalized, failure?: NavigationFailure) => void
  > = [];

  // Ready state
  let readyResolve: (() => void) | null = null;
  const readyPromise = new Promise<void>((resolve) => {
    readyResolve = resolve;
  });

  // Pending navigation
  let pendingNavigation: Promise<NavigationFailure | void> | null = null;

  /**
   * Resolve a route location by matching against all route records
   */
  function resolveRoute(
    path: string,
  ): { matched: RouteRecordMatcher[]; params: Record<string, string | string[]>; meta: Record<string | number | symbol, unknown> } {
    let bestMatch: RouteRecordMatcher | null = null;
    let bestScore = -1;
    let bestParams: Record<string, string | string[]> = {};

    for (const matcher of flatMatchers) {
      const result = matchPath(path, matcher.tokens, options.strict);

      if (result.matched && result.score > bestScore) {
        bestScore = result.score;
        bestMatch = matcher;
        bestParams = result.params;
      }
    }

    if (!bestMatch) {
      return { matched: [], params: {}, meta: {} };
    }

    // Build the matched chain (parent -> child)
    const matched: RouteRecordMatcher[] = [];
    let current: RouteRecordMatcher | undefined = bestMatch;
    while (current) {
      matched.unshift(current);
      current = current.parent;
    }

    // Merge meta from all matched records
    const meta: Record<string | number | symbol, unknown> = {};
    for (const m of matched) {
      Object.assign(meta, m.record.meta);
    }

    return { matched, params: bestParams, meta };
  }

  /**
   * Navigate to a new route
   */
  async function navigate(
    to: RouteLocationRaw,
    replace: boolean = false,
  ): Promise<NavigationFailure | void> {
    // Check for duplicate navigation
    const resolved = resolveLocation(to, currentRoute.value);
    const targetPath = resolved.path;

    // Resolve the route
    const { matched, params, meta } = resolveRoute(targetPath);

    if (matched.length === 0) {
      return {
        type: NavigationFailureType.aborted,
        from: currentRoute.value,
        to: currentRoute.value,
      };
    }

    // Build the target location
    const targetLocation: RouteLocationNormalized = {
      name: matched[matched.length - 1].record.name,
      path: targetPath,
      fullPath: resolved.path + (Object.keys(resolved.query).length ? '?' + new URLSearchParams(resolved.query as any).toString() : '') + (resolved.hash ? `#${resolved.hash}` : ''),
      query: resolved.query,
      hash: resolved.hash,
      params,
      matched: matched.map((m) => m.record),
      meta,
    };

    // Check for same route navigation
    if (isSameRouteLocation(currentRoute.value, targetLocation)) {
      return {
        type: NavigationFailureType.duplicated,
        from: currentRoute.value,
        to: targetLocation,
      };
    }

    const from = currentRoute.value;

    // Run navigation guards
    const failure = await runGuardSequence(targetLocation, from, matched);
    if (failure) {
      return failure;
    }

    // Commit navigation
    if (replace) {
      await options.history.replace(targetLocation);
    } else {
      await options.history.push(targetLocation);
    }

    currentRoute.value = targetLocation;

    // Run afterEach hooks
    for (const hook of afterEachHooks) {
      hook(targetLocation, from);
    }

    return;
  }

  /**
   * Run the full navigation guard sequence
   */
  async function runGuardSequence(
    to: RouteLocationNormalized,
    from: RouteLocationNormalized,
    matched: RouteRecordMatcher[],
  ): Promise<NavigationFailure | void> {
    // 1. in-component beforeRouteLeave (not implemented yet)

    // 2. global beforeEach guards
    for (const guard of beforeEachGuards) {
      const result = await guard(to, from, noop as NavigationGuardNext);
      if (result === false || result instanceof Error) {
        return {
          type: NavigationFailureType.aborted,
          from,
          to,
        };
      }
      if (typeof result === 'string' || (typeof result === 'object' && result !== null)) {
        // Redirect
        return navigate(result, true);
      }
    }

    // 3. route record beforeEnter guards
    for (const matcher of matched) {
      if (matcher.record.beforeEnter) {
        const result = await matcher.record.beforeEnter(to, from, noop as NavigationGuardNext);
        if (result === false || result instanceof Error) {
          return {
            type: NavigationFailureType.aborted,
            from,
            to,
          };
        }
        if (typeof result === 'string' || (typeof result === 'object' && result !== null)) {
          return navigate(result, true);
        }
      }
    }

    // 4. global beforeResolve guards
    for (const guard of beforeResolveGuards) {
      const result = await guard(to, from, noop as NavigationGuardNext);
      if (result === false || result instanceof Error) {
        return {
          type: NavigationFailureType.aborted,
          from,
          to,
        };
      }
      if (typeof result === 'string' || (typeof result === 'object' && result !== null)) {
        return navigate(result, true);
      }
    }

    return;
  }

  // No-op function for guard next() callback
  function noop() {}

  // Listen to history changes (popstate/hashchange)
  options.history.listen((to, from, info) => {
    if (info.type === 'pop') {
      // Re-resolve the route for the new location
      const { matched, params, meta } = resolveRoute(to.path);
      const newLocation: RouteLocationNormalized = {
        ...to,
        params,
        matched: matched.map((m) => m.record),
        meta: { ...meta, ...to.meta },
      };
      currentRoute.value = newLocation;
    }
  });

  const router: Router = {
    currentRoute,
    options,

    async push(to) {
      if (pendingNavigation) return pendingNavigation;
      pendingNavigation = navigate(to, false).finally(() => {
        pendingNavigation = null;
      });
      return pendingNavigation;
    },

    async replace(to) {
      if (pendingNavigation) return pendingNavigation;
      pendingNavigation = navigate(to, true).finally(() => {
        pendingNavigation = null;
      });
      return pendingNavigation;
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
      beforeEachGuards.push(guard);
      return () => {
        const index = beforeEachGuards.indexOf(guard);
        if (index > -1) beforeEachGuards.splice(index, 1);
      };
    },

    afterEach(hook) {
      afterEachHooks.push(hook);
      return () => {
        const index = afterEachHooks.indexOf(hook);
        if (index > -1) afterEachHooks.splice(index, 1);
      };
    },

    beforeResolve(guard) {
      beforeResolveGuards.push(guard);
      return () => {
        const index = beforeResolveGuards.indexOf(guard);
        if (index > -1) beforeResolveGuards.splice(index, 1);
      };
    },

    install(app) {
      // Set the router instance for composables
      setCurrentRouter(router);

      // Register global properties
      if (app.config) {
        app.config.globalProperties.$router = router;
      }

      // Provide the router via inject
      if (app.provide) {
        app.provide('__lytjs_router__', router);
      }

      // Initial navigation
      const initialLocation = options.history.location;
      const { matched, params, meta } = resolveRoute(initialLocation.path);
      currentRoute.value = {
        ...initialLocation,
        params,
        matched: matched.map((m) => m.record),
        meta: { ...meta, ...initialLocation.meta },
      };

      readyResolve?.();
    },

    async isReady() {
      return readyPromise;
    },
  };

  return router;
}
