/**
 * @lytjs/router - Location utilities
 */

import type {
  RouteLocationNormalized,
  RouteLocationRaw,
  LocationQuery,
  RouteParams,
} from './types';
import { parseFullPath, resolveFullPath } from './matcher';

/**
 * Resolve a raw location to a normalized location
 */
export function resolveLocation(
  raw: RouteLocationRaw,
  currentLocation?: RouteLocationNormalized,
  router?: {
    resolveName: (name: string | symbol, params?: RouteParams) => { path: string } | null;
  },
): { path: string; query: LocationQuery; hash: string; params?: RouteParams } {
  if (typeof raw === 'string') {
    const { path, query, hash } = parseFullPath(raw);
    return { path, query, hash };
  }

  const { name, path, query = {}, hash = '', params } = raw;

  // name-based resolution
  if (name !== undefined && name !== null && router) {
    const resolved = router.resolveName(name, params);
    if (resolved) {
      return {
        path: resolved.path,
        query,
        hash,
        params,
      };
    }
  }

  if (path !== undefined) {
    const { path: parsedPath, query: parsedQuery, hash: parsedHash } = parseFullPath(path);
    return {
      path: parsedPath,
      query: { ...parsedQuery, ...query },
      hash: hash || parsedHash,
      params,
    };
  }

  return {
    path: currentLocation?.path || '/',
    query,
    hash,
    params,
  };
}

export interface RouteLocationSimplified {
  path: string;
  query: LocationQuery;
  hash: string;
  params?: RouteParams;
}

/**
 * Check if two locations are the same
 */
export function isSameRouteLocation(
  a: RouteLocationNormalized | RouteLocationSimplified | undefined,
  b: RouteLocationNormalized | RouteLocationSimplified | undefined,
): boolean {
  if (!a || !b) return false;
  return (
    a.path === b.path && a.hash === b.hash && JSON.stringify(a.query) === JSON.stringify(b.query)
  );
}

/**
 * Create a normalized route location
 */
export function createRouteLocation(
  path: string,
  query: LocationQuery = {},
  hash: string = '',
  params: RouteParams = {},
): RouteLocationNormalized {
  return {
    name: null,
    path,
    fullPath: resolveFullPath(path, query, hash),
    query,
    hash,
    params,
    matched: [],
    meta: {},
  };
}
