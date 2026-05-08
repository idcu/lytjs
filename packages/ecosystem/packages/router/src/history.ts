/**
 * @lytjs/router - History implementations
 */

import type { RouterHistory, RouteLocationNormalized, NavigationFailure, NavigationInfo } from './types';

/**
 * Create a Web History implementation using the History API
 */
export function createWebHistory(base?: string): RouterHistory {
  const historyBase = base || '';
  let currentLocation: RouteLocationNormalized = normalizeLocation(window.location, historyBase);
  const listeners: Array<(to: RouteLocationNormalized, from: RouteLocationNormalized, info: NavigationInfo) => void> = [];

  function normalizeLocation(loc: Location | RouteLocationNormalized, base: string): RouteLocationNormalized {
    // TODO: implement full URL normalization
    return {
      name: null,
      path: loc.pathname || loc.path,
      fullPath: loc.pathname || loc.path,
      query: {},
      hash: (loc.hash || '').replace(/^#/, ''),
      params: {},
      matched: [],
      meta: {},
    };
  }

  function push(to: any): Promise<NavigationFailure | void> {
    // TODO: implement push
    return Promise.resolve();
  }

  function replace(to: any): Promise<NavigationFailure | void> {
    // TODO: implement replace
    return Promise.resolve();
  }

  function go(delta: number) {
    window.history.go(delta);
  }

  function listen(callback: (to: RouteLocationNormalized, from: RouteLocationNormalized, info: NavigationInfo) => void): () => void {
    listeners.push(callback);
    return () => {
      const index = listeners.indexOf(callback);
      if (index > -1) listeners.splice(index, 1);
    };
  }

  function destroy() {
    listeners.length = 0;
  }

  return {
    get location() { return currentLocation; },
    get state() { return window.history.state; },
    base: historyBase,
    push,
    replace,
    go,
    listen,
    destroy,
  };
}

/**
 * Create a Hash History implementation using hashchange events
 */
export function createWebHashHistory(base?: string): RouterHistory {
  // TODO: implement hash history
  return createWebHistory(base);
}

/**
 * Create a Memory History implementation for SSR/testing
 */
export function createMemoryHistory(initial?: string): RouterHistory {
  // TODO: implement memory history
  const entries: string[] = [initial || '/'];
  let index = 0;

  return {
    get location() {
      return {
        name: null,
        path: entries[index],
        fullPath: entries[index],
        query: {},
        hash: '',
        params: {},
        matched: [],
        meta: {},
      };
    },
    get state() { return undefined; },
    base: '',
    async push(to: any) { entries.push(typeof to === 'string' ? to : to.path || '/'); index = entries.length - 1; },
    async replace(to: any) { entries[index] = typeof to === 'string' ? to : to.path || '/'; },
    go(delta: number) {
      const next = index + delta;
      if (next >= 0 && next < entries.length) index = next;
    },
    listen() { return () => {}; },
    destroy() {},
  };
}
