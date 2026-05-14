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
  RouteParams,
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
   * Resolve a route name to a path
   */
  function resolveName(name: string | symbol, params?: RouteParams): { path: string } | null {
    for (const matcher of flatMatchers) {
      if (matcher.record.name === name) {
        let path = matcher.record.path;
        // Replace params in path
        if (params) {
          for (const [key, value] of Object.entries(params)) {
            const paramValue = Array.isArray(value) ? value.join('/') : value;
            path = path.replace(`:${key}`, paramValue);
          }
        }
        return { path };
      }
    }
    return null;
  }

  /**
   * Navigate to a new route
   */
  async function navigate(
    to: RouteLocationRaw,
    replace: boolean = false,
  ): Promise<NavigationFailure | void> {
    // Check for duplicate navigation
    const resolved = resolveLocation(to, currentRoute(), { resolveName });
    const targetPath = resolved.path;

    // Check for name-based navigation with unknown route name
    if (typeof to !== 'string' && to.name !== null && to.name !== undefined && !resolveName(to.name, to.params)) {
      return {
        type: NavigationFailureType.aborted,
        from: currentRoute(),
        to: currentRoute(),
      };
    }

    // Resolve the route
    const { matched, params, meta } = resolveRoute(targetPath);

    if (matched.length === 0) {
      return {
        type: NavigationFailureType.aborted,
        from: currentRoute(),
        to: currentRoute(),
      };
    }

    // Build the target location
    const lastMatched = matched[matched.length - 1];
    const targetLocation: RouteLocationNormalized = {
      name: lastMatched?.record?.name ?? null,
      path: targetPath,
      fullPath: resolved.path + (Object.keys(resolved.query).length ? '?' + new URLSearchParams(resolved.query as any).toString() : '') + (resolved.hash ? `#${resolved.hash}` : ''),
      query: resolved.query,
      hash: resolved.hash,
      params,
      matched: matched.map((m) => m.record),
      meta,
    };

    // Check for same route navigation
    if (isSameRouteLocation(currentRoute(), targetLocation)) {
      return {
        type: NavigationFailureType.duplicated,
        from: currentRoute(),
        to: targetLocation,
      };
    }

    const from = currentRoute();

    // Run navigation guards (pass fromMatched for beforeRouteLeave)
    const fromMatched = currentRoute().matched
      .map((record) => {
        // Find the corresponding matcher for the from route records
        return flatMatchers.find((m) => m.record === record);
      })
      .filter((m): m is RouteRecordMatcher => m !== undefined);

    const failure = await runGuardSequence(targetLocation, from, matched, fromMatched);
    if (failure) {
      return failure;
    }

    // Commit navigation
    if (replace) {
      await options.history.replace(targetLocation);
    } else {
      await options.history.push(targetLocation);
    }

    currentRoute.set(targetLocation);

    // Handle scroll behavior
    if (options.scrollBehavior) {
      const savedPosition = replace ? null : null; // Would come from history.state
      const scrollPosition = options.scrollBehavior(targetLocation, from, savedPosition);
      if (scrollPosition) {
        // Use requestAnimationFrame for smooth scrolling
        if (typeof window !== 'undefined') {
          window.scrollTo(scrollPosition);
        }
      }
    }

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
    fromMatched: RouteRecordMatcher[],
  ): Promise<NavigationFailure | void> {
    // 1. in-component beforeRouteLeave guards (from current matched components)
    for (const matcher of fromMatched) {
      const component = matcher.record.component;
      if (component && typeof component === 'object' && (component as any).beforeRouteLeave) {
        const result = await (component as any).beforeRouteLeave(to, from, noop as NavigationGuardNext);
        if (result === false || result instanceof Error) {
          return { type: NavigationFailureType.aborted, from, to };
        }
        if (typeof result === 'string' || (typeof result === 'object' && result !== null)) {
          return navigate(result, true);
        }
      }
    }

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
  options.history.listen((to, _from, info) => {
    if (info.type === 'pop') {
      // Re-resolve the route for the new location
      const { matched, params, meta } = resolveRoute(to.path);
      const newLocation: RouteLocationNormalized = {
        ...to,
        params,
        matched: matched.map((m) => m.record),
        meta: { ...meta, ...to.meta },
      };
      currentRoute.set(newLocation);
    }
  });

  const router: Router = {
    currentRoute,
    options,
    resolveName,

    async push(to) {
      if (pendingNavigation) return pendingNavigation;
      try {
        pendingNavigation = navigate(to, false);
        return await pendingNavigation;
      } finally {
        pendingNavigation = null;
      }
    },

    async replace(to) {
      if (pendingNavigation) return pendingNavigation;
      try {
        pendingNavigation = navigate(to, true);
        return await pendingNavigation;
      } finally {
        pendingNavigation = null;
      }
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
      currentRoute.set({
        ...initialLocation,
        params,
        matched: matched.map((m) => m.record),
        meta: { ...meta, ...initialLocation.meta },
      });

      readyResolve?.();
    },

    async isReady() {
      return readyPromise;
    },
  };

  return router;
}
