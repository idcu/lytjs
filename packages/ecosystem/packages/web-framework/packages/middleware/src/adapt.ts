/**
 * 三参中间件适配器
 *
 * Fetch 风格的 `middleware-cors` / `middleware-auth` / `middleware-rate-limit` 签名是
 * `(request, ctx, next)`，而本仓规范是 `(ctx, next)`。适配器把 `ctx.request` 包装成
 * 带 Fetch 风格 `headers.get / has / entries` 的门面，再按三参调用。
 *
 * ⚠️ 2026-11-13 新增（P1-8，owner 批准「新增适配器导出」）：
 *   此前 `@lytjs/http-server` 自己维护了一份**私有**适配（`normalizeMiddleware`），
 *   其他宿主无法复用。现在适配器统一放在这里并导出，http-server 改为引用。
 */

import type { MiddlewareContext, MiddlewareFn } from './types';

/** Fetch 风格的只读 headers 门面 */
export interface HeadersFacade {
  get(name: string): string | null;
  has(name: string): boolean;
  entries(): IterableIterator<[string, string]>;
}

/** 三参中间件签名（`request` 由适配器提供，`ctx` 透传宿主上下文） */
export type ThreeArgMiddleware<C extends MiddlewareContext = MiddlewareContext> = (
  request: unknown,
  ctx: C,
  next: () => Promise<void>,
) => unknown;

/** 把普通 headers 对象包装成 Fetch 风格门面（大小写不敏感，数组按逗号拼接） */
export function createHeadersFacade(headers: unknown): HeadersFacade {
  const normalized = new Map<string, string>();
  if (headers && typeof headers === 'object') {
    for (const [key, value] of Object.entries(headers as Record<string, unknown>)) {
      if (value === undefined) continue;
      normalized.set(key.toLowerCase(), Array.isArray(value) ? value.join(', ') : String(value));
    }
  }
  return {
    get: (name: string) => normalized.get(name.toLowerCase()) ?? null,
    has: (name: string) => normalized.has(name.toLowerCase()),
    entries: () => normalized.entries(),
  };
}

/** 由 `ctx.request` 生成三参中间件期望的 request 门面 */
function createRequestFacade(
  request: unknown,
): Record<string, unknown> & { headers: HeadersFacade } {
  const source = (request && typeof request === 'object' ? request : {}) as Record<string, unknown>;
  return {
    method: source.method,
    url: source.url,
    path: source.path,
    query: source.query,
    params: source.params,
    body: source.body,
    rawBody: source.rawBody,
    ip: source.ip,
    headers: createHeadersFacade(source.headers),
  };
}

/**
 * 把三参中间件适配成规范的 `(ctx, next)` 中间件。
 *
 * 注意：判据仍是调用方按 `fn.length` 分派 —— 带默认值的写法
 * （`(request, ctx, next = noop)`）length 会变成 2，这种情况请显式包一层。
 */
export function adaptMiddleware<C extends MiddlewareContext = MiddlewareContext>(
  middleware: ThreeArgMiddleware<C>,
): MiddlewareFn {
  return async (ctx, next) => {
    const request = createRequestFacade(ctx.request);
    return middleware(request, ctx as C, next);
  };
}
