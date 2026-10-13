/**
 * CORS 中间件实现
 *
 * ## 2026-10-10 安全修复（P1-5）
 *
 * 原实现有两处问题：
 *
 * 1. **`credentials: true` 与「镜像任意源」可以共存** —— 原代码只要
 *    `origin === true` 就把请求的 `Origin` **原样反射**到
 *    `Access-Control-Allow-Origin`，同时照常写入
 *    `Access-Control-Allow-Credentials: true`。
 *    这两条合起来等于：**任意站点都能带 Cookie 发请求并读到响应**（真实的数据泄露 / CSRF 面）。
 *    （单看 `origin: true` 只是「不校验来源」，业界常见；**致命的是它与 credentials 的组合**。）
 *
 * 2. **缺少 `Vary: Origin`** —— 当允许的源取决于请求（数组 / 镜像 / 判定函数）时，
 *    响应必须带 `Vary: Origin`，否则共享缓存（CDN / 反向代理）可能把 A 站点的
 *    `ACAO` 响应回给 B 站点。
 *
 * 修法：① 构造时**快速失败**：`credentials: true` 搭配 `origin: '*'` 或 `origin: true`
 * 直接抛错（静默产出浏览器必然拒绝的组合，比报错更糟）；② 按需补 `Vary: Origin`；
 * ③ 来源不被允许时**不写 CORS 头**（而不是写一个空串）。
 */

import type { CorsConfig } from './types';
type Middleware = unknown;
type MiddlewareContext = Record<string, unknown>;

const DEFAULT_CONFIG: CorsConfig = {
  origin: '*',
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: [],
  credentials: false,
  maxAge: 86400,
  preflightStatus: 204,
};

/**
 * 构造期校验：拦住「允许凭证 + 任意源」这一必然出错的组合。
 *
 * 为什么是抛错而不是警告：该组合**不可能**按用户预期工作 ——
 * 浏览器会拒绝 `ACAC:true` 搭配 `ACAO:*`；而若实现改为反射请求源，
 * 就变成把带凭证的响应开放给任意站点。两种结局都不可接受 ⇒ 快速失败。
 */
function assertCredentialsSafe(origin: CorsConfig['origin'], credentials: boolean): void {
  if (!credentials) return;
  if (origin === true) {
    throw new Error(
      '[cors] `credentials: true` 不能与 `origin: true`（镜像任意源）同时使用：' +
        '这会把「带 Cookie 的响应」开放给任意站点，属真实数据泄露风险。' +
        "请改为显式白名单，例如 `origin: ['https://your-site.com']`。",
    );
  }
  if (origin === '*') {
    throw new Error(
      "[cors] `credentials: true` 不能与 `origin: '*'` 同时使用：" +
        '浏览器会直接拒绝 `Access-Control-Allow-Credentials: true` 搭配 `Access-Control-Allow-Origin: *`。' +
        "请改为显式白名单，例如 `origin: ['https://your-site.com']`。",
    );
  }
}

/** 解析本次请求应返回的 `Access-Control-Allow-Origin` 值 */
function resolveAllowOrigin(
  allow: CorsConfig['origin'],
  origin: string | null,
): { value: string | null; varies: boolean } {
  if (allow === '*' || allow === undefined) {
    return { value: '*', varies: false };
  }
  if (allow === true) {
    // 镜像请求源：不校验来源（credentials 已在上层被排除）
    return { value: origin ?? null, varies: true };
  }
  if (typeof allow === 'string') {
    return { value: allow, varies: false };
  }
  if (Array.isArray(allow)) {
    return { value: origin !== null && allow.includes(origin) ? origin : null, varies: true };
  }
  if (typeof allow === 'function') {
    return { value: origin !== null && allow(origin) ? origin : null, varies: true };
  }
  return { value: null, varies: false };
}

/**
 * 创建 CORS 中间件
 */
export function createCorsMiddleware(config: CorsConfig = {}): Middleware {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  assertCredentialsSafe(finalConfig.origin, finalConfig.credentials === true);

  return async (
    request: Request,
    ctx: MiddlewareContext,
    next: () => Promise<void>,
  ): Promise<Response | void | undefined> => {
    const origin = request.headers.get('Origin');
    const isPreflight =
      request.method === 'OPTIONS' && request.headers.has('Access-Control-Request-Method');

    const headers = new Headers();
    const { value: allowOrigin, varies } = resolveAllowOrigin(finalConfig.origin, origin);

    if (allowOrigin !== null) {
      headers.set('Access-Control-Allow-Origin', allowOrigin);

      if (finalConfig.methods) {
        headers.set('Access-Control-Allow-Methods', finalConfig.methods.join(','));
      }
      if (finalConfig.allowedHeaders) {
        headers.set('Access-Control-Allow-Headers', finalConfig.allowedHeaders.join(','));
      }
      if (finalConfig.exposedHeaders && finalConfig.exposedHeaders.length > 0) {
        headers.set('Access-Control-Expose-Headers', finalConfig.exposedHeaders.join(','));
      }
      if (finalConfig.credentials) {
        headers.set('Access-Control-Allow-Credentials', 'true');
      }
      if (finalConfig.maxAge) {
        headers.set('Access-Control-Max-Age', String(finalConfig.maxAge));
      }
    }

    // 允许的源随请求变化时必须声明 Vary，否则共享缓存可能把 A 站的 ACAO 回给 B 站
    if (varies) {
      headers.append('Vary', 'Origin');
    }

    // 预检请求处理
    if (isPreflight) {
      return new Response(null, {
        status: finalConfig.preflightStatus,
        headers,
      });
    }

    // 在响应上设置头部
    // MiddlewareChain 直接返回下游响应，MiddlewareComposer 将响应写入 ctx.response，
    // 因此两者兼容：优先取 next() 返回值，缺失时回退到 ctx.response

    const downstream = ((await next()) ?? ctx.response) as Response | undefined;
    if (downstream) {
      // 复制下游响应并叠加 CORS 头。
      // 注意：不能把 Response 直接当 ResponseInit 强转（两者结构不重叠），
      // 必须显式取 status / statusText / headers。
      const mergedHeaders = new Headers(downstream.headers);
      headers.forEach((value, key) => {
        if (key.toLowerCase() === 'vary') {
          mergedHeaders.append(key, value);
        } else {
          mergedHeaders.set(key, value);
        }
      });

      return new Response(downstream.body, {
        status: downstream.status,
        statusText: downstream.statusText,
        headers: mergedHeaders,
      });
    }
    return undefined;
  };
}

/**
 * 默认 CORS 中间件
 */
export const corsMiddleware = createCorsMiddleware();
