/**
 * @lytjs/router - Route path matching
 *
 * Lightweight path-to-regexp style matcher for route resolution.
 * Supports: static paths, named params (:id), wildcard (*), optional params (:id?)
 */

import type { RouteParams, RouteRecordRaw, RouteRecordNormalized, RouteLocationNormalized, LocationQuery } from './types';

// ===== Token Types =====

export interface TokenStatic {
  type: 'static';
  value: string;
}

export interface TokenParam {
  type: 'param';
  name: string;
  repeatable: boolean;
  optional: boolean;
}

export interface TokenWildcard {
  type: 'wildcard';
  value: string;
}

export type PathToken = TokenStatic | TokenParam | TokenWildcard;

// ===== Path Tokenizer =====

const PARAM_RE = /^:(\w+)(\??)?(\.\.\.)?$/;
const WILDCARD_RE = /^\*$/;

/**
 * Tokenize a path segment string into tokens
 */
export function tokenizePath(path: string): PathToken[] {
  const segments = path.split('/');
  const tokens: PathToken[] = [];

  for (const segment of segments) {
    if (!segment) continue;

    const paramMatch = segment.match(PARAM_RE);
    if (paramMatch) {
      const [, name, optional, repeatable] = paramMatch;
      tokens.push({
        type: 'param',
        name,
        repeatable: repeatable === '...',
        optional: optional === '?',
      });
      continue;
    }

    if (WILDCARD_RE.test(segment)) {
      tokens.push({ type: 'wildcard', value: '*' });
      continue;
    }

    tokens.push({ type: 'static', value: segment });
  }

  return tokens;
}

// ===== Path Scoring =====

/**
 * Score a route record for ranking (higher = more specific)
 */
export function scoreRoute(tokens: PathToken[]): number {
  let score = 0;
  for (const token of tokens) {
    switch (token.type) {
      case 'static':
        score += 3;
        break;
      case 'param':
        score += token.optional ? 1 : 2;
        break;
      case 'wildcard':
        score += 0;
        break;
    }
  }
  return score;
}

// ===== Path Matching =====

export interface PathMatchResult {
  matched: boolean;
  params: RouteParams;
  path: string;
  score: number;
}

/**
 * Match a pathname against a tokenized route
 */
export function matchPath(
  pathname: string,
  tokens: PathToken[],
  strict: boolean = false,
): PathMatchResult {
  const pathSegments = pathname.split('/').filter(Boolean);
  const params: RouteParams = {};
  let matched = true;
  let i = 0;

  for (const token of tokens) {
    if (i >= pathSegments.length) {
      if (token.type === 'param' && token.optional) continue;
      if (token.type === 'wildcard') continue;
      matched = false;
      break;
    }

    const segment = pathSegments[i];

    switch (token.type) {
      case 'static':
        if (segment !== token.value) {
          matched = false;
        }
        i++;
        break;

      case 'param':
        if (token.repeatable) {
          // Collect remaining segments
          params[token.name] = pathSegments.slice(i);
          i = pathSegments.length;
        } else {
          params[token.name] = segment;
          i++;
        }
        break;

      case 'wildcard':
        params[token.value] = pathSegments.slice(i).join('/');
        i = pathSegments.length;
        break;
    }

    if (!matched) break;
  }

  // Check if all path segments were consumed
  if (matched && i < pathSegments.length) {
    matched = false;
  }

  // In non-strict mode, trailing slash is ok
  if (!strict && matched && pathSegments.length === 0 && tokens.length === 0) {
    matched = true;
  }

  return {
    matched,
    params,
    path: '/' + pathSegments.slice(0, i).join('/'),
    score: scoreRoute(tokens),
  };
}

// ===== Route Record Normalization =====

export interface RouteRecordMatcher {
  record: RouteRecordNormalized;
  tokens: PathToken[];
  score: number;
  children: RouteRecordMatcher[];
  parent?: RouteRecordMatcher;
}

/**
 * Normalize a raw route record into a flat matcher tree
 */
export function normalizeRouteRecord(
  record: RouteRecordRaw,
  parent?: RouteRecordMatcher,
): RouteRecordMatcher {
  const tokens = tokenizePath(record.path);
  
  // Build full path for nested routes
  const fullPath = parent 
    ? parent.record.path + (record.path.startsWith('/') ? record.path : '/' + record.path)
    : record.path;
  
  const normalized: RouteRecordNormalized = {
    path: fullPath,
    name: record.name ?? null,
    meta: record.meta ?? {},
    children: [],
    beforeEnter: record.beforeEnter,
    props: record.props ?? false,
    component: record.component,
    components: record.components,
  };

  const matcher: RouteRecordMatcher = {
    record: normalized,
    tokens,
    score: scoreRoute(tokens),
    children: [],
    parent,
  };

  if (record.children) {
    for (const child of record.children) {
      const childMatcher = normalizeRouteRecord(child, matcher);
      matcher.children.push(childMatcher);
      normalized.children.push(childMatcher.record);
    }
  }

  return matcher;
}

/**
 * Build a flat list of all matchers from the tree
 * For nested routes, combines parent and child tokens for matching
 */
export function flattenMatchers(matchers: RouteRecordMatcher[]): RouteRecordMatcher[] {
  const result: RouteRecordMatcher[] = [];

  function walk(matcher: RouteRecordMatcher, parentTokens: PathToken[] = []) {
    // Combine parent tokens with current tokens for proper matching
    const combinedTokens = [...parentTokens, ...matcher.tokens];
    
    // Create a copy with combined tokens for matching
    const matcherWithCombinedTokens: RouteRecordMatcher = {
      ...matcher,
      tokens: combinedTokens,
    };
    
    result.push(matcherWithCombinedTokens);
    
    for (const child of matcher.children) {
      walk(child, combinedTokens);
    }
  }

  for (const matcher of matchers) {
    walk(matcher);
  }

  return result;
}

// ===== URL Utilities =====

/**
 * Parse a query string into a LocationQuery object
 */
export function parseQuery(queryString: string): LocationQuery {
  const query: LocationQuery = {};
  if (!queryString) return query;

  const search = queryString.startsWith('?') ? queryString.slice(1) : queryString;
  const pairs = search.split('&');

  for (const pair of pairs) {
    if (!pair) continue;
    const [key, value] = pair.split('=');
    const decodedKey = decodeURIComponent(key);
    const decodedValue = value ? decodeURIComponent(value) : null;

    if (decodedKey in query) {
      const existing = query[decodedKey];
      if (Array.isArray(existing)) {
        existing.push(decodedValue);
      } else {
        query[decodedKey] = [existing, decodedValue];
      }
    } else {
      query[decodedKey] = decodedValue;
    }
  }

  return query;
}

/**
 * Stringify a LocationQuery object back to a query string
 */
export function stringifyQuery(query: LocationQuery): string {
  const pairs: string[] = [];

  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined) {
      pairs.push(encodeURIComponent(key));
      continue;
    }

    if (Array.isArray(value)) {
      for (const v of value) {
        pairs.push(`${encodeURIComponent(key)}=${v === null ? '' : encodeURIComponent(v)}`);
      }
    } else {
      pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
    }
  }

  return pairs.length ? `?${pairs.join('&')}` : '';
}

/**
 * Resolve a full path from path, query, and hash
 */
export function resolveFullPath(
  path: string,
  query: LocationQuery = {},
  hash: string = '',
): string {
  const queryString = stringifyQuery(query);
  const hashString = hash.startsWith('#') ? hash : hash ? `#${hash}` : '';
  return `${path}${queryString}${hashString}`;
}

/**
 * Parse a full path into path, query, and hash
 */
export function parseFullPath(fullPath: string): { path: string; query: LocationQuery; hash: string } {
  const hashIndex = fullPath.indexOf('#');
  const queryIndex = fullPath.indexOf('?');

  let path: string;
  let queryString: string = '';
  let hash: string = '';

  if (hashIndex > -1) {
    hash = fullPath.slice(hashIndex);
    path = fullPath.slice(0, hashIndex);
  } else {
    path = fullPath;
  }

  if (queryIndex > -1) {
    const end = hashIndex > -1 && queryIndex > hashIndex ? path.length : queryIndex;
    queryString = path.slice(queryIndex);
    path = path.slice(0, queryIndex);
  }

  return {
    path: path || '/',
    query: parseQuery(queryString),
    hash: hash.replace(/^#/, ''),
  };
}
