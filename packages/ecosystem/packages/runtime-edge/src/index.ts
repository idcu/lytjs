/**
 * @lytjs/runtime-edge - LytJS edge runtime support
 *
 * Provides utilities for running LytJS in edge computing environments
 *
 * ## 2026-11-03（第 40 轮）修的两类问题
 *
 * **① 鸭子类型响应仍然漏在路由里。** 2026-10-31 把 `jsonResponse` / `textResponse` /
 * `htmlResponse` 改成返回真正的 `Response`，2026-11-02 补上了漏掉的 `redirectResponse` ——
 * 但**路由器自己的 404 / 500 分支**一直没跟上：它们返回 `{status, headers}` 普通对象，
 * 而且**没有 body**。交给 Workers / Deno / Vercel 会直接抛
 * `TypeError: The "response" argument must be...` 或被序列化成 `{}`。
 * 更隐蔽的是 `handle()` 把 handler 的返回值**原样透传** —— handler 只要写成
 * `return { status: 200, headers: {...}, body }`（类型允许），泄漏就发生了。
 *
 * **② 路由能力只有「精确字符串相等」。** 没有 `:id`、没有 `*`、不容忍尾斜杠、
 * `basePath` 带尾斜杠时会拼出 `/api//users`（永不命中）。edge 上的动态路由
 * 只能靠手写字符串比较，而这层包装的存在意义正是「不用自己写」。
 */

import type {
  EdgeRequest,
  EdgeResponse,
  EdgeContext,
  EdgeHandler,
  EdgeHandlerResult,
  EdgePlainResponse,
  EdgeRouterOptions,
  EdgeRouter,
  EdgeRoute,
  EdgeCacheOptions,
  EdgeCache,
  EdgeCacheConfig,
  EdgeCacheEntry,
} from './types';

// ══════════════════════════════════════════════════════════
// 路径工具
// ══════════════════════════════════════════════════════════

/** 归一化路径：补前导 `/`、折叠重复 `/`、去掉尾 `/`（根路径除外） */
function normalizePath(path: string): string {
  let result = path.trim();
  if (!result.startsWith('/')) result = '/' + result;
  result = result.replace(/\/{2,}/g, '/');
  if (result.length > 1 && result.endsWith('/')) result = result.slice(0, -1);
  return result || '/';
}

/** 安全解码单个路径段（畸形转义保留原串，不抛错） */
function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

type PathSegment =
  | { type: 'static'; value: string }
  | { type: 'param'; name: string }
  | { type: 'wildcard' };

/** 把注册路径切成段；`:name` 为参数，`*` 为通配（吞掉剩余全部段） */
function tokenizePath(path: string): PathSegment[] {
  const segments = normalizePath(path).split('/').filter(Boolean);
  return segments.map((segment): PathSegment => {
    if (segment === '*') return { type: 'wildcard' };
    if (segment.startsWith(':') && segment.length > 1) {
      return { type: 'param', name: segment.slice(1) };
    }
    return { type: 'static', value: decodeSegment(segment) };
  });
}

const WEIGHT = { static: 3, param: 2, wildcard: 0 } as const;
/** 路由在该位置已结束（比通配符更具体） */
const END_WEIGHT = 1;

/**
 * 逐段优先级向量（**不是求和**）。
 *
 * 求和会让 `/a/b/*`(3+3+0=6) 输给 `/a/:x/:y`(3+2+2=7)，通配符路由永不命中 ——
 * 与 `@lytjs/http-server` 第 39 轮修的是同一个错误。这里从一开始就按段比较。
 */
function priorityOf(segments: PathSegment[]): number[] {
  return segments.map((segment) => WEIGHT[segment.type]);
}

function comparePriority(a: number[], b: number[]): number {
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const av = a[i] ?? END_WEIGHT;
    const bv = b[i] ?? END_WEIGHT;
    if (av !== bv) return av - bv;
  }
  return b.length - a.length;
}

interface PathMatch {
  matched: boolean;
  params: Record<string, string>;
}

function matchSegments(pathname: string, segments: PathSegment[]): PathMatch {
  const parts = normalizePath(pathname).split('/').filter(Boolean).map(decodeSegment);
  const params: Record<string, string> = {};
  let i = 0;

  for (const segment of segments) {
    if (segment.type === 'wildcard') {
      // 通配吞掉剩余全部（含零段）
      if (i < parts.length) params['*'] = parts.slice(i).join('/');
      i = parts.length;
      continue;
    }
    if (i >= parts.length) {
      // 参数要求有值：`/users/:id` 不匹配 `/users`
      return { matched: false, params: {} };
    }
    if (segment.type === 'param') {
      params[segment.name] = parts[i];
      i++;
      continue;
    }
    if (segment.value !== parts[i]) {
      return { matched: false, params: {} };
    }
    i++;
  }

  // 还有剩余段 ⇒ 路由更短，不算匹配（`/a` 不匹配 `/a/b`）
  const matched = i === parts.length;
  return { matched, params: matched ? params : {} };
}

// ══════════════════════════════════════════════════════════
// 响应归一化
// ══════════════════════════════════════════════════════════

const NO_BODY_STATUS = new Set([204, 205, 304]);

function toHeaders(source: Record<string, string> | Headers | undefined): Headers {
  const headers = new Headers();
  if (!source) return headers;
  if (typeof (source as Headers).forEach === 'function') {
    (source as Headers).forEach((value, key) => headers.set(key, value));
    return headers;
  }
  for (const [key, value] of Object.entries(source as Record<string, string>)) {
    if (value === undefined || value === null) continue;
    headers.set(key, String(value));
  }
  return headers;
}

/**
 * 把 handler 的任意返回值归一化成**真正的 `Response`**。
 *
 * 这是「鸭子类型泄漏」的唯一收口：此前 `handle()` 原样透传 handler 的返回值，
 * 于是 `return { status: 200, headers: {}, body }` 在 Workers 上直接失败，
 * 而本地单测（只看 `.status`）完全正常。
 */
function toResponse(value: EdgeHandlerResult | undefined | null): EdgeResponse {
  if (typeof Response === 'undefined') {
    // 极简嵌入宿主：没有全局 Response，保持旧的结构体形态（并在文档里标注）
    return value as unknown as EdgeResponse;
  }
  if (value instanceof Response) return value;

  const plain = (value ?? {}) as EdgePlainResponse;
  const status = typeof plain.status === 'number' ? plain.status : 200;
  const headers = toHeaders(plain.headers);

  const raw = plain.body;
  const noBody = NO_BODY_STATUS.has(status) || status < 200;
  let body: BodyInit | null = null;
  if (!noBody && raw !== undefined && raw !== null) {
    if (typeof raw === 'string') {
      body = raw;
    } else if (typeof ReadableStream !== 'undefined' && raw instanceof ReadableStream) {
      body = raw as ReadableStream<Uint8Array>;
    } else {
      body = JSON.stringify(raw);
      if (!headers.has('content-type')) headers.set('content-type', 'application/json');
    }
  }

  return new Response(body, { status, statusText: plain.statusText, headers });
}

// ══════════════════════════════════════════════════════════
// 缓存
// ══════════════════════════════════════════════════════════

/**
 * 创建内存边缘缓存
 *
 * ⚠️ 2026-11-03：加 `maxSize`（默认 1000）。此前是**无上限**的 `Map` ——
 *   edge isolate 长期存活，按用户维度做 key 时内存只增不减，最终 OOM，
 *   而「单次请求」永远看不出问题。
 */
function createEdgeCache(config: EdgeCacheConfig = {}): EdgeCache {
  const cache = new Map<string, EdgeCacheEntry>();
  const maxSize = Math.max(1, config.maxSize ?? 1000);
  const defaultTtl = config.defaultTtl ?? 60000;

  const isExpired = (entry: EdgeCacheEntry): boolean => Date.now() > entry.expires;

  /** 容量满时先清过期项，再按插入顺序淘汰最旧的 */
  function evictIfNeeded(): void {
    if (cache.size < maxSize) return;
    for (const [key, entry] of cache) {
      if (isExpired(entry)) cache.delete(key);
    }
    while (cache.size >= maxSize) {
      const oldest = cache.keys().next();
      if (oldest.done) break;
      cache.delete(oldest.value);
    }
  }

  return {
    async get<T>(key: string): Promise<T | null> {
      const entry = cache.get(key);
      if (!entry) return null;
      if (isExpired(entry)) {
        cache.delete(key);
        return null;
      }
      return entry.value as T;
    },

    async set<T>(key: string, value: T, options: EdgeCacheOptions = {}): Promise<void> {
      const ttl = options.ttl ?? defaultTtl;
      // 覆盖同一 key 时先删再插 ⇒ 插入顺序反映「最近写入」，淘汰才符合 LRU 直觉
      if (cache.has(key)) cache.delete(key);
      evictIfNeeded();
      const entry: EdgeCacheEntry<T> = { value, expires: Date.now() + ttl };
      cache.set(key, entry);
    },

    async delete(key: string): Promise<void> {
      cache.delete(key);
    },

    async clear(): Promise<void> {
      cache.clear();
    },

    async has(key: string): Promise<boolean> {
      const entry = cache.get(key);
      if (!entry) return false;
      if (isExpired(entry)) {
        cache.delete(key);
        return false;
      }
      return true;
    },

    async size(): Promise<number> {
      return cache.size;
    },
  };
}

// ══════════════════════════════════════════════════════════
// 路由器
// ══════════════════════════════════════════════════════════

const DEFAULT_CONTEXT: EdgeContext = {
  waitUntil: () => {},
  passThroughOnException: () => {},
};

/** 把请求 URL 解析成 pathname；相对 URL 用占位 base 兜底 */
function pathnameOf(request: EdgeRequest): string | null {
  try {
    return normalizePath(new URL(request.url, 'http://localhost').pathname);
  } catch {
    return null;
  }
}

/**
 * 创建边缘路由器
 */
function createEdgeRouter(options: EdgeRouterOptions = {}): EdgeRouter {
  const routes: Array<{
    path: string;
    method: string;
    handler: EdgeHandler;
    segments: PathSegment[];
    priority: number[];
  }> = [];
  const basePath = normalizePath(options.basePath ?? '/');

  function addRoute(method: string, path: string, handler: EdgeHandler): void {
    // 用 `/` 拼接再由 normalizePath 折叠：既容忍 basePath 的尾斜杠，
    // 也容忍 `router.get('users')` 这种不带前导斜杠的写法
    const fullPath = normalizePath(basePath === '/' ? path : `${basePath}/${path}`);
    const segments = tokenizePath(fullPath);
    routes.push({ path: fullPath, method, handler, segments, priority: priorityOf(segments) });
  }

  /** 在给定方法下找最具体的匹配；返回**副本**（params 是本次请求私有的） */
  function findRoute(method: string, pathname: string): EdgeRoute | null {
    let best: EdgeRoute | null = null;
    let bestPriority: number[] | null = null;

    for (const route of routes) {
      if (route.method !== method) continue;
      const result = matchSegments(pathname, route.segments);
      if (!result.matched) continue;
      if (!bestPriority || comparePriority(route.priority, bestPriority) > 0) {
        bestPriority = route.priority;
        best = {
          path: route.path,
          method: route.method,
          handler: route.handler,
          params: result.params,
        };
      }
    }
    return best;
  }

  function allowedMethods(pathname: string): string[] {
    const allowed = new Set<string>();
    for (const route of routes) {
      if (matchSegments(pathname, route.segments).matched) {
        allowed.add(route.method);
        if (route.method === 'GET') allowed.add('HEAD');
      }
    }
    return [...allowed];
  }

  function match(request: EdgeRequest): EdgeRoute | null {
    const pathname = pathnameOf(request);
    if (pathname === null) return null;
    const method = String(request.method ?? 'GET').toUpperCase();
    const found = findRoute(method, pathname);
    // HEAD 回落 GET（RFC 9110 §9.3.2：同语义、只是不返回体）
    if (!found && method === 'HEAD') return findRoute('GET', pathname);
    return found;
  }

  async function handle(request: EdgeRequest, context?: EdgeContext): Promise<EdgeResponse> {
    const ctx = context ?? DEFAULT_CONTEXT;
    const pathname = pathnameOf(request);

    if (pathname === null) {
      return textResponse('Bad Request', 400);
    }

    const route = match(request);
    if (!route) {
      const allowed = allowedMethods(pathname);
      if (allowed.length > 0) {
        return textResponse('Method Not Allowed', 405, { allow: allowed.join(', ') });
      }
      return textResponse('Not Found', 404);
    }

    try {
      const result = await route.handler(request, ctx, route.params ?? {});
      return toResponse(result);
    } catch (error) {
      console.error('Edge handler error:', error);
      // 不把内部信息泄漏给客户端（本地调试看控制台）
      return textResponse('Internal Server Error', 500);
    }
  }

  return {
    get: (path, handler) => addRoute('GET', path, handler),
    post: (path, handler) => addRoute('POST', path, handler),
    put: (path, handler) => addRoute('PUT', path, handler),
    delete: (path, handler) => addRoute('DELETE', path, handler),
    patch: (path, handler) => addRoute('PATCH', path, handler),
    match,
    allowedMethods,
    handle,
  };
}

// ══════════════════════════════════════════════════════════
// 响应 helper
// ══════════════════════════════════════════════════════════

/** 无全局 `Response` 时的回退（仅极简嵌入宿主；正常运行时走不到） */
function fallbackResponse(
  body: string,
  status: number,
  statusText: string,
  headers: Record<string, string>,
): EdgeResponse {
  return {
    status,
    statusText,
    headers,
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(body));
        controller.close();
      },
    }),
  } as unknown as EdgeResponse;
}

/**
 * 创建 JSON 响应
 *
 * ⚠️ 2026-10-31 修（P0）：此前返回的是**鸭子类型的普通对象**，
 *   `instanceof Response === false` ⇒ 交给 Workers / Vercel / Deno 会失败
 *   或被序列化成 `{}`。现在返回**真正的 Response**。
 */
function jsonResponse(data: unknown, status = 200): EdgeResponse {
  const body = JSON.stringify(data) ?? '';
  if (typeof Response !== 'undefined') {
    return new Response(body, {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return fallbackResponse(body, status, 'OK', { 'Content-Type': 'application/json' });
}

/**
 * 创建文本响应
 */
function textResponse(
  text: string,
  status = 200,
  extraHeaders: Record<string, string> = {},
): EdgeResponse {
  if (typeof Response !== 'undefined') {
    return new Response(text, {
      status,
      headers: { 'Content-Type': 'text/plain', ...extraHeaders },
    });
  }
  return fallbackResponse(text, status, 'OK', {
    'Content-Type': 'text/plain',
    ...extraHeaders,
  });
}

/**
 * 创建 HTML 响应
 */
function htmlResponse(html: string, status = 200): EdgeResponse {
  if (typeof Response !== 'undefined') {
    return new Response(html, {
      status,
      headers: { 'Content-Type': 'text/html' },
    });
  }
  return fallbackResponse(html, status, 'OK', { 'Content-Type': 'text/html' });
}

/**
 * 创建重定向响应
 *
 * ⚠️ 2026-11-02 修（P0）：**这里被漏掉了**。
 *   2026-10-31 把 json / text / html 三个 helper 改成返回**真正的 `Response`**
 *   （鸭子类型对象交给 Workers / Vercel / Deno 会失败或被序列化成 `{}`），
 *   但 redirect 这一支没跟上 —— 同一个文件里三种修了、一种漏了。
 */
function redirectResponse(location: string, status = 302): EdgeResponse {
  if (typeof Response !== 'undefined') {
    return new Response(null, {
      status,
      headers: { Location: location },
    });
  }
  return {
    status,
    statusText: 'Found',
    headers: { Location: location },
  } as unknown as EdgeResponse;
}

export {
  createEdgeRouter,
  createEdgeCache,
  jsonResponse,
  textResponse,
  htmlResponse,
  redirectResponse,
  toResponse,
  normalizePath,
};

export type {
  EdgeRequest,
  EdgeResponse,
  EdgePlainResponse,
  EdgeHandlerResult,
  EdgeContext,
  EdgeHandler,
  EdgeRouterOptions,
  EdgeRouter,
  EdgeRoute,
  EdgeCacheOptions,
  EdgeCacheConfig,
  EdgeCache,
  EdgeCacheEntry,
};
