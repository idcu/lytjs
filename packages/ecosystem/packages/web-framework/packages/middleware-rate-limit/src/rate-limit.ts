/**
 * 限流中间件实现
 *
 * ## 2026-10-10 修复（P1-3）
 *
 * 1. **默认 key 可被客户端伪造 ⇒ 限流可绕过**
 *    原默认 `keyGenerator` 读 `x-forwarded-for`（**客户端可伪造**，换个假 IP 就是新桶），
 *    且写成 `headers?.['x-forwarded-for']?.[0]` —— 对普通对象取到的是**首字符**
 *    （`"1.2.3.4"` → `"1"`），对 Fetch `Headers` 实例取到 `undefined` ⇒ key 恒为
 *    `'unknown'` ⇒ **所有客户端共用一个桶**（一个客户端打满，全体被 429）。
 *    现在改为：优先取宿主提供的 `ctx.clientIp` / `ctx.ip` / `ctx.socket.remoteAddress`
 *    （**不可由客户端伪造**）；只有在显式 `trustProxy: true` 时才读转发头；
 *    两者都拿不到时**大声抛错**（附可操作的修法），而不是静默退化成全局桶。
 *
 * 2. **响应上的 `X-RateLimit-*` 头实际写不上**
 *    原代码在 `next()` 之后只检查 `ctx.response`，但 `MiddlewareChain` **不写** `ctx.response`
 *    （它把下游响应作为 `next()` 的返回值给出）⇒ 该分支在链式路径上是死代码。
 *    现在两种路径都处理：优先用 `next()` 的返回值，回退到 `ctx.response`。
 */
import type { RateLimitOptions, RateLimitInfo } from './types';
import type { Middleware, MiddlewareContext } from '@lytjs/middleware';
import { createRateLimiter } from '@lytjs/common-rate-limit';

/** 从 Fetch `Headers` 或普通对象里取一个头（两种形态都支持） */
function readHeader(request: unknown, name: string): string | undefined {
  const headers = (request as { headers?: unknown } | null | undefined)?.headers;
  if (!headers) return undefined;
  if (typeof (headers as Headers).get === 'function') {
    return (headers as Headers).get(name) ?? undefined;
  }
  const bag = headers as Record<string, unknown>;
  const raw = bag[name] ?? bag[name.toLowerCase()];
  if (Array.isArray(raw)) return typeof raw[0] === 'string' ? raw[0] : undefined;
  return typeof raw === 'string' ? raw : undefined;
}

/**
 * 默认键生成：只认**不可由客户端伪造**的来源。
 *
 * 顺序：`ctx.clientIp` → `ctx.ip` → `ctx.socket.remoteAddress` →
 * （仅当 `trustProxy`）`x-forwarded-for` / `x-real-ip` → 抛错。
 */
function createDefaultKeyGenerator(trustProxy: boolean) {
  return (request: unknown, ctx: unknown): string => {
    const c = (ctx ?? {}) as Record<string, unknown>;
    const hostProvided =
      c.clientIp ?? c.ip ?? (c.socket as { remoteAddress?: string } | undefined)?.remoteAddress;
    if (typeof hostProvided === 'string' && hostProvided.length > 0) return hostProvided;

    if (trustProxy) {
      const forwarded = readHeader(request, 'x-forwarded-for');
      if (forwarded) return forwarded.split(',')[0]!.trim();
      const realIp = readHeader(request, 'x-real-ip');
      if (realIp) return realIp;
    }

    throw new Error(
      '[rate-limit] 无法确定请求来源 —— 限流将无法按客户端生效，故直接报错而不是静默退化。请任选其一：\n' +
        '  ① 在上下文中提供 `clientIp`（推荐：由宿主从 TCP 连接取得，客户端无法伪造）；\n' +
        '  ② 显式传入 `keyGenerator`；\n' +
        '  ③ 若确实位于反向代理之后、且该代理会**覆写**转发头，设置 `trustProxy: true`。',
    );
  };
}

/**
 * 创建限流中间件
 *
 * @param options - 限流配置选项
 * @returns 限流中间件函数
 */
export function createRateLimitMiddleware(options: RateLimitOptions): Middleware {
  const limiter = createRateLimiter({
    max: options.max,
    windowMs: options.windowMs,
    maxKeys: options.maxKeys,
  });
  const keyGenerator =
    options.keyGenerator ?? createDefaultKeyGenerator(options.trustProxy === true);

  return async (request: unknown, ctx: MiddlewareContext, next: () => Promise<void>) => {
    const key = keyGenerator(request, ctx);
    const now = Date.now();
    const result = limiter.check(key);

    const info: RateLimitInfo = {
      remaining: result.remaining,
      reset: result.reset,
      limit: result.limit,
    };

    ctx.rateLimit = info;

    if (!result.allowed) {
      const headers: Record<string, string | string[]> = {
        'X-RateLimit-Limit': String(info.limit),
        'X-RateLimit-Remaining': String(info.remaining),
        'X-RateLimit-Reset': String(info.reset),
        'Retry-After': String(Math.max(0, Math.ceil((result.reset - now) / 1000))),
        'Content-Type': 'application/json',
      };

      return {
        status: 429,
        headers,
        body: JSON.stringify({ error: '请求过多' }),
      };
    }

    const downstream = (await next()) as unknown as Response | undefined;
    const target = downstream ?? (ctx.response as Response | undefined);

    if (target) {
      const rateHeaders: Record<string, string> = {
        'X-RateLimit-Limit': String(info.limit),
        'X-RateLimit-Remaining': String(info.remaining),
        'X-RateLimit-Reset': String(info.reset),
      };
      // 真实 Response（链式路径）：Headers 可原地 set
      if (typeof (target as Response).headers?.set === 'function') {
        for (const [k, v] of Object.entries(rateHeaders)) {
          (target as Response).headers.set(k, v);
        }
        return target;
      }
      // 普通对象（composer 路径）
      const obj = target as unknown as Record<string, unknown>;
      obj.headers = { ...(obj.headers as Record<string, string> | undefined), ...rateHeaders };
      return obj as unknown as Response;
    }
  };
}
