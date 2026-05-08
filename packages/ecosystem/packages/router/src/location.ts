/**
 * @lytjs/router - Location utilities
 */

import type { RouteLocationNormalized, RouteLocationRaw, LocationQuery, RouteParams } from './types';
import { parseFullPath, resolveFullPath } from './matcher';

/**
 * Resolve a raw location to a normalized location
 */
export function resolveLocation(
  raw: RouteLocationRaw,
  currentLocation?: RouteLocationNormalized,
): { path: string; query: LocationQuery; hash: string; params?: RouteParams } {
  if (typeof raw === 'string') {
    const { path, query, hash } = parseFullPath(raw);
    return { path, query, hash };
  }

  const { path, query = {}, hash = '', params } = raw;

  if (path !== undefined) {
    const { path: parsedPath, query: parsedQuery, hash: parsedHash } = parseFullPath(path);
    return {
      path: parsedPath,
      query: { ...parsedQuery, ...query },
      hash: hash || parsedHash,
      params,
    };
  }

  // name-based resolution would go here (requires router instance)
  return {
    path: currentLocation?.path || '/',
    query,
    hash,
    params,
  };
}

/**
 * Check if two locations are the same
 */
export function isSameRouteLocation(
  a: RouteLocationNormalized,
  b: RouteLocationNormalized,
): boolean {
  return (
    a.path === b.path &&
    a.hash === b.hash &&
    JSON.stringify(a.query) === JSON.stringify(b.query)
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
