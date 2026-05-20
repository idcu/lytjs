/**
 * @lytjs/router - History implementations
 *
 * Provides three history modes:
 * - createWebHistory: HTML5 History API
 * - createWebHashHistory: hash-based routing
 * - createMemoryHistory: in-memory (SSR/testing)
 */

import type {
  RouterHistory,
  RouteLocationNormalized,
  RouteLocationRaw,
  NavigationFailure,
  NavigationInfo,
  HistoryState,
} from './types';
import { createRouteLocation } from './location';
import { parseFullPath, resolveFullPath } from './matcher';

// ===== Base History =====

type HistoryListener = (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  info: NavigationInfo,
) => void;

function createBaseHistory(base: string): {
  listeners: HistoryListener[];
  currentLocation: RouteLocationNormalized;
  pushState(location: RouteLocationNormalized, data?: HistoryState): void;
  replaceState(location: RouteLocationNormalized, data?: HistoryState): void;
  triggerListeners(
    to: RouteLocationNormalized,
    from: RouteLocationNormalized,
    info: NavigationInfo,
  ): void;
} {
  const listeners: HistoryListener[] = [];
  const currentLocation = createRouteLocation(base);

  return {
    listeners,
    currentLocation,
    pushState(location, _data) {
      currentLocation.path = location.path;
      currentLocation.fullPath = location.fullPath;
      currentLocation.query = location.query;
      currentLocation.hash = location.hash;
      currentLocation.params = location.params;
      currentLocation.matched = location.matched;
      currentLocation.meta = location.meta;
      currentLocation.name = location.name;
    },
    replaceState(location, _data) {
      currentLocation.path = location.path;
      currentLocation.fullPath = location.fullPath;
      currentLocation.query = location.query;
      currentLocation.hash = location.hash;
      currentLocation.params = location.params;
      currentLocation.matched = location.matched;
      currentLocation.meta = location.meta;
      currentLocation.name = location.name;
    },
    triggerListeners(to, from, info) {
      for (const listener of listeners) {
        listener(to, from, info);
      }
    },
  };
}

// ===== Web History (HTML5 History API) =====

/**
 * Create a Web History implementation using the HTML5 History API
 */
export function createWebHistory(base: string = ''): RouterHistory {
  const normalizedBase = base.startsWith('/') ? base : `/${base}`;
  const { listeners, currentLocation, pushState, replaceState, triggerListeners } =
    createBaseHistory(normalizedBase);

  // Initialize from current browser URL
  function getCurrentUrl(): string {
    const { pathname, search, hash } = window.location;
    const path = pathname.startsWith(normalizedBase)
      ? pathname.slice(normalizedBase.length) || '/'
      : pathname;
    return `${path}${search}${hash}`;
  }

  // Set initial location from browser
  const initialUrl = getCurrentUrl();
  const { path, query, hash } = parseFullPath(initialUrl);
  currentLocation.path = path;
  currentLocation.fullPath = initialUrl;
  currentLocation.query = query;
  currentLocation.hash = hash;

  let popStateHandler: ((e: PopStateEvent) => void) | null = null;

  function setupListeners() {
    popStateHandler = (e: PopStateEvent) => {
      const url = getCurrentUrl();
      const { path, query, hash } = parseFullPath(url);
      const to = createRouteLocation(path, query, hash);

      const from = { ...currentLocation };
      pushState(to, e.state);
      triggerListeners(to, from, { type: 'pop', direction: 'unknown', delta: 0 });
    };

    window.addEventListener('popstate', popStateHandler);
  }

  function destroy() {
    if (popStateHandler) {
      window.removeEventListener('popstate', popStateHandler);
      popStateHandler = null;
    }
    listeners.length = 0;
  }

  function push(to: RouteLocationRaw): Promise<NavigationFailure | void> {
    const routeLocation = typeof to === 'string' ? parseFullPath(to) : to;
    const path = routeLocation.path || '/';
    const query = routeLocation.query || {};
    const hash = routeLocation.hash || '';

    const fullPath = resolveFullPath(path, query, hash);
    const from = { ...currentLocation };
    const location = createRouteLocation(path, query, hash);

    pushState(location);
    window.history.pushState(
      { ...window.history.state, current: fullPath },
      '',
      `${normalizedBase}${fullPath}`,
    );
    triggerListeners(location, from, { type: 'push', direction: 'forward', delta: 1 });

    return Promise.resolve();
  }

  function replace(to: RouteLocationRaw): Promise<NavigationFailure | void> {
    const routeLocation = typeof to === 'string' ? parseFullPath(to) : to;
    const path = routeLocation.path || '/';
    const query = routeLocation.query || {};
    const hash = routeLocation.hash || '';

    const fullPath = resolveFullPath(path, query, hash);
    const from = { ...currentLocation };
    const location = createRouteLocation(path, query, hash);

    replaceState(location);
    window.history.replaceState(
      { ...window.history.state, current: fullPath },
      '',
      `${normalizedBase}${fullPath}`,
    );
    triggerListeners(location, from, { type: 'replace', direction: 'unknown', delta: 0 });

    return Promise.resolve();
  }

  function go(delta: number) {
    window.history.go(delta);
  }

  function listen(callback: HistoryListener): () => void {
    listeners.push(callback);
    return () => {
      const index = listeners.indexOf(callback);
      if (index > -1) listeners.splice(index, 1);
    };
  }

  // Auto-setup listeners on creation
  setupListeners();

  return {
    get location() {
      return currentLocation;
    },
    get state() {
      return window.history.state;
    },
    base: normalizedBase,
    push,
    replace,
    go,
    listen,
    destroy,
  };
}

// ===== Hash History =====

/**
 * Create a Hash History implementation using hashchange events
 */
export function createWebHashHistory(base: string = ''): RouterHistory {
  const normalizedBase = base.startsWith('/') ? base : `/${base}`;
  const { listeners, currentLocation, pushState, replaceState, triggerListeners } =
    createBaseHistory(normalizedBase);

  function getHash(): string {
    // Get the hash value without the leading '#'
    const href = window.location.href;
    const hashIndex = href.indexOf('#');
    return hashIndex === -1 ? '' : href.slice(hashIndex + 1);
  }

  function getCurrentUrl(): string {
    const hash = getHash();
    // Remove base prefix from hash if present
    if (normalizedBase !== '/' && hash.startsWith(normalizedBase)) {
      return hash.slice(normalizedBase.length) || '/';
    }
    return hash || '/';
  }

  // Set initial location from browser hash
  const initialUrl = getCurrentUrl();
  const { path, query, hash } = parseFullPath(initialUrl);
  currentLocation.path = path;
  currentLocation.fullPath = initialUrl;
  currentLocation.query = query;
  currentLocation.hash = hash;

  let hashChangeHandler: (() => void) | null = null;

  function setupListeners() {
    hashChangeHandler = () => {
      const url = getCurrentUrl();
      const { path, query, hash } = parseFullPath(url);
      const to = createRouteLocation(path, query, hash);

      const from = { ...currentLocation };
      pushState(to);
      triggerListeners(to, from, { type: 'pop', direction: 'unknown', delta: 0 });
    };

    window.addEventListener('hashchange', hashChangeHandler);
  }

  function destroy() {
    if (hashChangeHandler) {
      window.removeEventListener('hashchange', hashChangeHandler);
      hashChangeHandler = null;
    }
    listeners.length = 0;
  }

  function push(to: RouteLocationRaw): Promise<NavigationFailure | void> {
    const routeLocation = typeof to === 'string' ? parseFullPath(to) : to;
    const path = routeLocation.path || '/';
    const query = routeLocation.query || {};
    const hash = routeLocation.hash || '';

    const fullPath = resolveFullPath(path, query, hash);
    const from = { ...currentLocation };
    const location = createRouteLocation(path, query, hash);

    pushState(location);
    window.location.hash = `${normalizedBase}${fullPath}`;
    triggerListeners(location, from, { type: 'push', direction: 'forward', delta: 1 });

    return Promise.resolve();
  }

  function replace(to: RouteLocationRaw): Promise<NavigationFailure | void> {
    const routeLocation = typeof to === 'string' ? parseFullPath(to) : to;
    const path = routeLocation.path || '/';
    const query = routeLocation.query || {};
    const hash = routeLocation.hash || '';

    const fullPath = resolveFullPath(path, query, hash);
    const from = { ...currentLocation };
    const location = createRouteLocation(path, query, hash);

    replaceState(location);
    const url = window.location.href;
    const hashIndex = url.indexOf('#');
    const base = hashIndex === -1 ? url : url.slice(0, hashIndex);
    window.location.replace(`${base}#${normalizedBase}${fullPath}`);
    triggerListeners(location, from, { type: 'replace', direction: 'unknown', delta: 0 });

    return Promise.resolve();
  }

  function go(delta: number) {
    window.history.go(delta);
  }

  function listen(callback: HistoryListener): () => void {
    listeners.push(callback);
    return () => {
      const index = listeners.indexOf(callback);
      if (index > -1) listeners.splice(index, 1);
    };
  }

  setupListeners();

  return {
    get location() {
      return currentLocation;
    },
    get state() {
      return null;
    },
    base: normalizedBase,
    push,
    replace,
    go,
    listen,
    destroy,
  };
}

// ===== Memory History (SSR / Testing) =====

/**
 * Create an in-memory history implementation for SSR and testing
 */
export function createMemoryHistory(initial: string = '/'): RouterHistory {
  const { listeners, currentLocation, pushState, replaceState, triggerListeners } =
    createBaseHistory('/');

  const entries: string[] = [initial];
  let currentIndex = 0;

  // Set initial location
  const { path, query, hash } = parseFullPath(initial);
  currentLocation.path = path;
  currentLocation.fullPath = initial;
  currentLocation.query = query;
  currentLocation.hash = hash;

  function push(to: RouteLocationRaw): Promise<NavigationFailure | void> {
    const { path, query, hash } =
      typeof to === 'string'
        ? parseFullPath(to)
        : { path: to.path || '/', query: to.query || {}, hash: to.hash || '' };

    const fullPath = resolveFullPath(path, query, hash);
    const from = { ...currentLocation };
    const location = createRouteLocation(path, query, hash);

    pushState(location);

    // Discard forward entries (standard browser behavior)
    entries.splice(currentIndex + 1);
    entries.push(fullPath);
    currentIndex = entries.length - 1;

    triggerListeners(location, from, { type: 'push', direction: 'forward', delta: 1 });
    return Promise.resolve();
  }

  function replace(to: RouteLocationRaw): Promise<NavigationFailure | void> {
    const { path, query, hash } =
      typeof to === 'string'
        ? parseFullPath(to)
        : { path: to.path || '/', query: to.query || {}, hash: to.hash || '' };

    const fullPath = resolveFullPath(path, query, hash);
    const from = { ...currentLocation };
    const location = createRouteLocation(path, query, hash);

    replaceState(location);
    entries[currentIndex] = fullPath;

    triggerListeners(location, from, { type: 'replace', direction: 'unknown', delta: 0 });
    return Promise.resolve();
  }

  function go(delta: number) {
    const nextIndex = currentIndex + delta;
    if (nextIndex >= 0 && nextIndex < entries.length) {
      const from = { ...currentLocation };
      currentIndex = nextIndex;

      const { path, query, hash } = parseFullPath(entries[currentIndex] as string);
      const to = createRouteLocation(path, query, hash);
      pushState(to);

      triggerListeners(to, from, {
        type: 'pop',
        direction: delta < 0 ? 'back' : 'forward',
        delta,
      });
    }
  }

  function listen(callback: HistoryListener): () => void {
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
    get location() {
      return currentLocation;
    },
    get state() {
      return null;
    },
    base: '',
    push,
    replace,
    go,
    listen,
    destroy,
  };
}
