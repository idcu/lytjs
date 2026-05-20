/**
 * CORS 中间件实现
 */

import type { Middleware, MiddlewareContext } from '@lytjs/middleware';
import { CorsConfig } from './types';

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

  return async (request: Request, ctx: MiddlewareContext, next: () => Promise<void>): Promise<Response | void | undefined> => {
    const origin = request.headers.get('Origin');
    const isPreflight = request.method === 'OPTIONS' && request.headers.has('Access-Control-Request-Method');

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
    await next();
    if (ctx.response) {
      const newResponse = new Response(ctx.response.body, ctx.response);
      headers.forEach((value, key) => {
        newResponse.headers.set(key, value);
      });
      return newResponse;
    }
  };
}

/**
 * 默认 CORS 中间件
 */
export const corsMiddleware = createCorsMiddleware();
