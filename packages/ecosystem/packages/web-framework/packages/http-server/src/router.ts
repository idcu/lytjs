/**
 * HTTP 路由实现
 */
import type { Handler, HttpMethod } from './types';

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

// ===== Path Ranking =====

/**
 * 逐段优先级向量（**不是求和**）。
 *
 * ⚠️ 2026-11-03 修（P1）：此前是 `score += 3 / 2 / 0` 的**总和**，于是
 *   `/a/b/*`（3+3+0 = 6）会**输给** `/a/:x/:y`（3+2+2 = 7）—— 通配符路由注册了却
 *   永远命中不了，请求被参数路由悄悄吃掉（实测 `/a/b/c` 返回 `{route:'params'}`）。
 *   总和还让「段数不同」的路由可比：`/a/:x/:y` 与 `/a/b/*` 段数相同但语义不同，
 *   求和把「第 2 段是静态」这个决定性差异抹平了。
 *
 * 现在改为**从左到右逐段比较**（字典序）：静态 3 > 参数 2 > 可选参数 1 > 通配符 0，
 * 「路由已结束」按 1 处理（比通配符更具体，与可选参数并列，由长度再分）。
 */
const TOKEN_WEIGHT = { static: 3, param: 2, optional: 1, wildcard: 0 } as const;
/** 路由在该位置已经结束（没有 token 了） */
const END_WEIGHT = 1;

function priorityOf(tokens: PathToken[]): number[] {
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
function comparePriority(a: number[], b: number[]): number {
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const av = a[i] ?? END_WEIGHT;
    const bv = b[i] ?? END_WEIGHT;
    if (av !== bv) return av - bv;
  }
  // 优先级完全相同：**段数少的更具体**（`/a` 胜过 `/a/*`），否则先注册者胜
  return b.length - a.length;
}

/**
 * 安全解码单个路径段。
 *
 * 畸形转义（`%zz`）会让 `decodeURIComponent` 抛 `URIError` —— 此时保留原串，
 * 由路由匹配自然得到 404，而不是让整个请求 500。
 */
function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

// ===== Path Matching =====

interface PathMatchResult {
  matched: boolean;
  params: Record<string, string | string[]>;
  path: string;
  priority: number[];
}

/**
 * Match a pathname against a tokenized route
 */
function matchPath(
  pathname: string,
  tokens: PathToken[],
  strict: boolean = false,
): PathMatchResult {
  // ⚠️ 2026-11-03 修（P0）：此前**不解码**路径段 ⇒ `/users/%E4%B8%AD%E6%96%87` 的
  //   `params.id` 是 `%E4%B8%AD%E6%96%87` 而不是 `中文`，业务拿它查库必然查不到，
  //   且 `%2F` 也无法表达「段内含斜杠」。现在先解码再匹配（静态段同样按解码后比较）。
  const pathSegments = pathname.split('/').filter(Boolean).map(decodeSegment);
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
    priority: priorityOf(tokens),
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
    const found = this.matchInternal(method, path);
    if (found) return found;
    // ⚠️ 2026-11-03 修（P0）：`HEAD` 此前**完全没有路由可命中** —— 只注册了 GET 的
    //   资源收到 HEAD 一律 404（健康检查 / CDN 回源 / 预检 / 监控探测全部挂掉，
    //   而 GET 明明正常）。RFC 9110 §9.3.2 要求 HEAD 与 GET 同语义、只是不返回体，
    //   所以这里回落到 GET 表（若显式注册了 HEAD 则 HEAD 优先）。
    if (method === 'HEAD') return this.matchInternal('GET', path);
    return null;
  }

  /**
   * 该路径**存在**、但方法不匹配时返回允许的方法集合（用于 405 + `Allow`）。
   *
   * 返回空数组表示路径本身不存在（应 404）。`HEAD` 视为允许当且仅当允许 `GET`。
   */
  allowedMethods(path: string): HttpMethod[] {
    const allowed = new Set<HttpMethod>();
    for (const route of this.routes) {
      if (matchPath(path, route.tokens).matched) {
        allowed.add(route.method);
        if (route.method === 'GET') allowed.add('HEAD');
      }
    }
    return [...allowed];
  }

  private matchInternal(
    method: HttpMethod,
    path: string,
  ): { handler: Handler; params: Record<string, string | string[]> } | null {
    let bestMatch: { handler: Handler; params: Record<string, string | string[]> } | null = null;
    let bestPriority: number[] | null = null;

    for (const route of this.routes) {
      if (route.method !== method) continue;
      const result = matchPath(path, route.tokens);
      if (!result.matched) continue;
      if (!bestPriority || comparePriority(result.priority, bestPriority) > 0) {
        bestPriority = result.priority;
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
