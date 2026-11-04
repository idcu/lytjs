/**
 * @lytjs/router - Route path matching
 *
 * Lightweight path-to-regexp style matcher for route resolution.
 * Supports: static paths, named params (:id), wildcard (*), optional params (:id?)
 */

import type { RouteParams, RouteRecordRaw, RouteRecordNormalized, LocationQuery } from './types';

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
      if (name) {
        tokens.push({
          type: 'param',
          name,
          repeatable: repeatable === '...',
          optional: optional === '?',
        });
      }
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
 * 逐段权重（越大越具体）。
 *
 * ⚠️ 2026-11-04 修（P1）：此前**只用总和**排序（`scoreRoute`），于是
 *   `/a/b/*`（3+3+0=6）输给 `/a/:x/:y`（3+2+2=7）—— 通配符路由注册了却**永不命中**。
 *   这是同一缺陷族的**第三次**出现（2026-11-03 已在 `@lytjs/http-server` 与
 *   `@lytjs/runtime-edge` 各修过一次），两处都用「逐段字典序」：
 *
 *     static(3) > param(2) > optional(1) > wildcard(0)，「路由已结束」按 1 处理
 *
 *   ⇒ 前几段先决出胜负，不会被后面的段数「凑总分」翻盘。
 */
export const TOKEN_WEIGHT = { static: 3, param: 2, optional: 1, wildcard: 0 } as const;
/** 路由在该位置已经结束（没有 token 了） */
const END_WEIGHT = 1;

/** 把 token 列表摊平成权重序列（逐段比较用） */
export function priorityOf(tokens: PathToken[]): number[] {
  return tokens.map((token) => {
    switch (token.type) {
      case 'static':
        return TOKEN_WEIGHT.static;
      case 'param':
        return token.optional ? TOKEN_WEIGHT.optional : TOKEN_WEIGHT.param;
      case 'wildcard':
        return TOKEN_WEIGHT.wildcard;
    }
  });
}

/** 字典序比较：>0 表示 a 更具体 */
export function comparePriority(a: number[], b: number[]): number {
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const av = a[i] ?? END_WEIGHT;
    const bv = b[i] ?? END_WEIGHT;
    if (av !== bv) return av - bv;
  }
  return 0;
}

/**
 * Score a route record for ranking (higher = more specific)
 *
 * ⚠️ 仅供展示 / 兼容：**不要再拿它排序**（求和会被「段数多」翻盘，见 `priorityOf`）。
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
  /** 逐段权重（排序用；`score` 只是总和，会被段数翻盘） */
  priority: number[];
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
          params[token.name] = pathSegments.slice(i);
          i = pathSegments.length;
        } else if (segment !== undefined) {
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
    priority: priorityOf(tokens),
  };
}

// ===== Route Record Normalization =====

export interface RouteRecordMatcher {
  record: RouteRecordNormalized;
  tokens: PathToken[];
  /**
   * 树深度（根路由 = 1）。
   *
   * 用于「默认子路由」的排序：`{ path: '/parent', children: [{ path: '' }] }` 里
   * 父与子的 token 序列**完全相同**（子路径为空）⇒ 逐段比较打平。
   * 此时**更深（子）优先** —— 否则父路由永远抢走命中，默认子路由永不渲染。
   */
  depth: number;
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

  // 别名：解析成**绝对路径**（相对别名相对父路径），供 flattenMatchers 额外产出一条 matcher
  const rawAliases = record.alias
    ? Array.isArray(record.alias)
      ? record.alias
      : [record.alias]
    : [];
  const aliases = rawAliases.map((alias) =>
    alias.startsWith('/')
      ? alias
      : (parent ? parent.record.path : '') + '/' + alias.replace(/^\/+/, ''),
  );

  const normalized: RouteRecordNormalized = {
    path: fullPath,
    name: record.name ?? null,
    ...(aliases.length > 0 ? { alias: aliases } : {}),
    meta: record.meta ?? {},
    children: [],
    redirect: record.redirect,
    beforeEnter: record.beforeEnter,
    props: record.props ?? false,
    component: record.component,
    components:
      'components' in record
        ? (record as { components?: Record<string, unknown> }).components
        : undefined,
  };

  const matcher: RouteRecordMatcher = {
    record: normalized,
    tokens,
    score: scoreRoute(tokens),
    depth: parent ? parent.depth + 1 : 1,
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

    // 别名：额外产出一条 matcher，**共享同一个 record**（所以 name / meta / component 都一致，
    // 而 `currentRoute().path` 仍是用户实际访问的那个别名路径）。
    for (const alias of matcher.record.alias ?? []) {
      result.push({
        ...matcher,
        tokens: [...parentTokens, ...tokenizePath(alias)],
      });
    }

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
 * 解码一个 query 组件（键或值）。
 *
 * ⚠️ 2026-11-04 修（P1）：浏览器把搜索框里的 `a b` 编码成 `?q=a+b`
 * （`application/x-www-form-urlencoded`），而 `decodeURIComponent('a+b')` 仍是 `"a+b"`
 * ⇒ 搜索「a b」永远搜不到。真正的加号由发送方编码成 `%2B`，所以先换 `+` 不会误伤。
 *
 * 另：畸形转义（`%zz`）此前会**抛 URIError** 把整次导航打断，现在保留原串。
 *
 * （`@lytjs/common-query` 在 2026-11-03 修过同一处；router 自带一份 parseQuery 副本，
 *   当时没同步 ⇒ 同语义两套实现又漂了一次。）
 */
function decodeQueryComponent(raw: string): string {
  try {
    return decodeURIComponent(raw.replace(/\+/g, ' '));
  } catch {
    return raw;
  }
}

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
    const decodedKey = decodeQueryComponent(key!);
    const decodedValue = value !== undefined ? decodeQueryComponent(value) : undefined;

    if (decodedKey in query) {
      const existing = query[decodedKey];
      if (Array.isArray(existing)) {
        if (decodedValue !== undefined) {
          existing.push(decodedValue);
        }
      } else if (decodedValue !== undefined) {
        if (existing === null) {
          query[decodedKey] = [decodedValue as string];
        } else {
          query[decodedKey] = [existing as string, decodedValue as string];
        }
      }
    } else if (decodedValue !== undefined) {
      query[decodedKey] = decodedValue;
    } else {
      query[decodedKey] = null;
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
export function parseFullPath(fullPath: string): {
  path: string;
  query: LocationQuery;
  hash: string;
} {
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
    queryString = path.slice(queryIndex);
    path = path.slice(0, queryIndex);
  }

  return {
    path: path || '/',
    query: parseQuery(queryString),
    hash: hash.replace(/^#/, ''),
  };
}
