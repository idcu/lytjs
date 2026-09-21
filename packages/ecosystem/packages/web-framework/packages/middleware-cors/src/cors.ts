/**
 * CORS 中间件实现
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
 * 创建 CORS 中间件
 */
export function createCorsMiddleware(config: CorsConfig = {}): Middleware {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  return async (
    request: Request,
    ctx: MiddlewareContext,
    next: () => Promise<void>,
  ): Promise<Response | void | undefined> => {
    const origin = request.headers.get('Origin');
    const isPreflight =
      request.method === 'OPTIONS' && request.headers.has('Access-Control-Request-Method');

    // 设置 CORS 响应头
    const headers = new Headers();

    // 处理 Origin
    let allowOrigin = finalConfig.origin;
    if (allowOrigin === true && origin) {
      allowOrigin = origin;
    } else if (Array.isArray(allowOrigin) && origin) {
      allowOrigin = allowOrigin.includes(origin) ? origin : '';
    }
    if (typeof allowOrigin === 'string') {
      headers.set('Access-Control-Allow-Origin', allowOrigin);
    }

    // 处理 Methods
    if (finalConfig.methods) {
      headers.set('Access-Control-Allow-Methods', finalConfig.methods.join(','));
    }

    // 处理 Allowed Headers
    if (finalConfig.allowedHeaders) {
      headers.set('Access-Control-Allow-Headers', finalConfig.allowedHeaders.join(','));
    }

    // 处理 Exposed Headers
    if (finalConfig.exposedHeaders && finalConfig.exposedHeaders.length > 0) {
      headers.set('Access-Control-Expose-Headers', finalConfig.exposedHeaders.join(','));
    }

    // 处理 Credentials
    if (finalConfig.credentials) {
      headers.set('Access-Control-Allow-Credentials', 'true');
    }

    // 处理 Max Age
    if (finalConfig.maxAge) {
      headers.set('Access-Control-Max-Age', String(finalConfig.maxAge));
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
        mergedHeaders.set(key, value);
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
