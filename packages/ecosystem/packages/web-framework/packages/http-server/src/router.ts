/**
 * HTTP 路由实现
 */
import type { Handler } from './types';
import type { HttpMethod } from '@lytjs/shared-types';

// ===== Token Types =====

interface TokenStatic {
  type: 'static';
  value: string;
}

interface TokenParam {
  type: 'param';
  name: string;
  repeatable: boolean;
  optional: boolean;
}

interface TokenWildcard {
  type: 'wildcard';
  value: string;
}

type PathToken = TokenStatic | TokenParam | TokenWildcard;

// ===== Path Tokenizer =====

const PARAM_RE = /^:(\w+)(\??)?(\.\.\.)?$/;
const WILDCARD_RE = /^\*$/;

/**
 * Tokenize a path segment string into tokens
 */
function tokenizePath(path: string): PathToken[] {
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
 * Score a route record for ranking (higher = more specific)
 */
function scoreRoute(tokens: PathToken[]): number {
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

interface PathMatchResult {
  matched: boolean;
  params: Record<string, string | string[]>;
  path: string;
  score: number;
}

/**
 * Match a pathname against a tokenized route
 */
function matchPath(
  pathname: string,
  tokens: PathToken[],
  strict: boolean = false,
): PathMatchResult {
  const pathSegments = pathname.split('/').filter(Boolean);
  const params: Record<string, string | string[]> = {};
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
  };
}

/**
 * 路由类
 */
export class Router {
  /** 路由列表 */
  private routes: Array<{
    method: HttpMethod;
    path: string;
    tokens: ReturnType<typeof tokenizePath>;
    handler: Handler;
  }> = [];

  /**
   * 添加路由
   *
   * @param method - HTTP 方法
   * @param path - 路径
   * @param handler - 处理器
   * @returns 路由实例
   */
  on(method: HttpMethod, path: string, handler: Handler): this {
    const tokens = tokenizePath(path);
    this.routes.push({ method, path, tokens, handler });
    return this;
  }

  /**
   * 添加 GET 路由
   *
   * @param path - 路径
   * @param handler - 处理器
   * @returns 路由实例
   */
  get(path: string, handler: Handler): this {
    return this.on('GET', path, handler);
  }

  /**
   * 添加 POST 路由
   *
   * @param path - 路径
   * @param handler - 处理器
   * @returns 路由实例
   */
  post(path: string, handler: Handler): this {
    return this.on('POST', path, handler);
  }

  /**
   * 添加 PUT 路由
   *
   * @param path - 路径
   * @param handler - 处理器
   * @returns 路由实例
   */
  put(path: string, handler: Handler): this {
    return this.on('PUT', path, handler);
  }

  /**
   * 添加 PATCH 路由
   *
   * @param path - 路径
   * @param handler - 处理器
   * @returns 路由实例
   */
  patch(path: string, handler: Handler): this {
    return this.on('PATCH', path, handler);
  }

  /**
   * 添加 DELETE 路由
   *
   * @param path - 路径
   * @param handler - 处理器
   * @returns 路由实例
   */
  delete(path: string, handler: Handler): this {
    return this.on('DELETE', path, handler);
  }

  /**
   * 匹配路由
   *
   * @param method - HTTP 方法
   * @param path - 路径
   * @returns 匹配结果或 null
   */
  match(
    method: HttpMethod,
    path: string,
  ): { handler: Handler; params: Record<string, string | string[]> } | null {
    const candidates = this.routes.filter((r) => r.method === method);

    let bestMatch: { handler: Handler; params: Record<string, string | string[]> } | null = null;
    let bestScore = -1;

    for (const route of candidates) {
      const result = matchPath(path, route.tokens);
      if (result.matched && result.score > bestScore) {
        bestScore = result.score;
        bestMatch = { handler: route.handler, params: result.params };
      }
    }

    return bestMatch;
  }
}

/**
 * 创建路由
 *
 * @returns 路由实例
 */
export function createRouter(): Router {
  return new Router();
}
