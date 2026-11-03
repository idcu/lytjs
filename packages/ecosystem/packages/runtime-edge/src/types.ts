/**
 * @lytjs/runtime-edge - Type definitions
 */

/**
 * 边缘请求的最小结构。
 *
 * ⚠️ 2026-11-03 修：`headers` 此前声明为 `Record<string, string>`，而 Workers / Deno /
 *   Vercel 传进来的真实 `Request` 的 `headers` 是 **`Headers` 实例** ⇒ 文档里的
 *   `export default { fetch(request, env, ctx) { return router.handle(request, ctx) } }`
 *   **通不过类型检查**（结构不兼容）。现在放宽为联合类型，真实 `Request` 可直接传入。
 */
export interface EdgeRequest {
  url: string;
  method: string;
  headers: Record<string, string> | Headers;
  body?: ReadableStream | null;
  signal?: AbortSignal;
}

/**
 * 鸭子类型的响应（没有全局 `Response` 的极简宿主才会出现）。
 *
 * 正常运行时 `handle()` 一律返回**真正的 `Response`**；这个接口只用于
 * 「handler 想直接返回普通对象」的写法 —— `handle` 会把它归一化。
 */
export interface EdgePlainResponse {
  status: number;
  statusText?: string;
  headers?: Record<string, string> | Headers;
  body?: unknown;
}

/**
 * 本包对外承诺的响应类型。
 *
 * ⚠️ 2026-11-03：此前是**结构体**（`{status, statusText, headers, body}`），
 *   但四个 helper 早已改成返回真正的 `Response` ⇒ 类型与实现不一致，
 *   用户按类型写 `response.headers['content-type']` 恒为 `undefined`
 *   （真实 `Headers` 只能用 `.get()`）。现在类型就是 `Response`。
 */
export type EdgeResponse = Response;

export interface EdgeContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

/** handler 的返回值：真正的 `Response`，或会被归一化的普通对象 */
export type EdgeHandlerResult = EdgeResponse | EdgePlainResponse;

export interface EdgeHandler {
  (
    request: EdgeRequest,
    context: EdgeContext,
    /** 路径参数（`:id` / `*` 捕获），无参数时是空对象 */
    params?: Record<string, string>,
  ): EdgeHandlerResult | Promise<EdgeHandlerResult>;
}

export interface EdgeRouterOptions {
  basePath?: string;
}

export interface EdgeRoute {
  path: string;
  handler: EdgeHandler;
  method: string;
  /**
   * 本次匹配到的路径参数。
   *
   * ⚠️ `match()` 返回的是**副本**（注册项本身不带 params）—— 否则并发请求会
   * 互相覆盖对方的 `:id`（同一个 route 对象被两个请求共享）。
   */
  params?: Record<string, string>;
}

export interface EdgeRouter {
  get(path: string, handler: EdgeHandler): void;
  post(path: string, handler: EdgeHandler): void;
  put(path: string, handler: EdgeHandler): void;
  delete(path: string, handler: EdgeHandler): void;
  patch(path: string, handler: EdgeHandler): void;
  match(request: EdgeRequest): EdgeRoute | null;
  /** 该路径允许的方法（用于 405 + `Allow`）；空数组表示路径不存在 */
  allowedMethods(path: string): string[];
  handle(request: EdgeRequest, context?: EdgeContext): Promise<EdgeResponse>;
}

export interface EdgeCacheOptions {
  ttl?: number;
  swr?: boolean;
  staleWhileRevalidate?: number;
}

export interface EdgeCacheEntry<T = unknown> {
  value: T;
  expires: number;
}

export interface EdgeCacheConfig {
  /**
   * 最多保留多少个条目，默认 1000。
   *
   * ⚠️ 2026-11-03 新增：边缘 isolate 会**长期存活并服务所有用户**，此前是无上限的
   *   `Map` ⇒ 每个不同的 key 都永久占内存（按用户维度做 key 时尤其危险），
   *   最终被运行时 OOM 杀掉，而单次请求一切正常。
   */
  maxSize?: number;
  /** 默认 TTL（毫秒），默认 60 000 */
  defaultTtl?: number;
}

export interface EdgeCache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, options?: EdgeCacheOptions): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  has(key: string): Promise<boolean>;
  /** 当前条目数（含尚未被清理的过期项） */
  size(): Promise<number>;
}
