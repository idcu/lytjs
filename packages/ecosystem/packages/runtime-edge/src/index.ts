/**
 * @lytjs/runtime-edge - LytJS edge runtime support
 *
 * Provides utilities for running LytJS in edge computing environments
 */

import type {
  EdgeRequest,
  EdgeResponse,
  EdgeContext,
  EdgeHandler,
  EdgeRouterOptions,
  EdgeRouter,
  EdgeRoute,
  EdgeCacheOptions,
  EdgeCache,
  EdgeCacheEntry,
} from './types';

/**
 * 创建内存边缘缓存
 */
function createEdgeCache(): EdgeCache {
  const cache = new Map<string, EdgeCacheEntry>();

  return {
    async get<T>(key: string): Promise<T | null> {
      const entry = cache.get(key);
      if (!entry) return null;
      
      if (entry.expires && Date.now() > entry.expires) {
        cache.delete(key);
        return null;
      }
      
      return entry.value as T;
    },

    async set<T>(key: string, value: T, options: EdgeCacheOptions = {}): Promise<void> {
      const ttl = options.ttl ?? 60000; // 默认 1 分钟
      const entry: EdgeCacheEntry<T> = {
        value,
        expires: Date.now() + ttl,
      };
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
      
      if (entry.expires && Date.now() > entry.expires) {
        cache.delete(key);
        return false;
      }
      
      return true;
    },
  };
}

/**
 * 创建边缘路由器
 */
function createEdgeRouter(options: EdgeRouterOptions = {}): EdgeRouter {
  const routes: EdgeRoute[] = [];
  const basePath = options.basePath ?? '';

  function addRoute(method: string, path: string, handler: EdgeHandler): void {
    const fullPath = basePath + path;
    routes.push({ path: fullPath, handler, method });
  }

  function match(request: EdgeRequest): EdgeRoute | null {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method.toUpperCase();

    for (const route of routes) {
      if (route.method === method && route.path === path) {
        return route;
      }
    }

    return null;
  }

  async function handle(request: EdgeRequest, context?: EdgeContext): Promise<EdgeResponse> {
    const route = match(request);
    if (!route) {
      return {
        status: 404,
        statusText: 'Not Found',
        headers: { 'Content-Type': 'text/plain' },
      };
    }

    try {
      const response = await route.handler(request, context ?? {
        waitUntil: () => {},
        passThroughOnException: () => {},
      });
      return response;
    } catch (error) {
      console.error('Edge handler error:', error);
      return {
        status: 500,
        statusText: 'Internal Server Error',
        headers: { 'Content-Type': 'text/plain' },
      };
    }
  }

  return {
    get: (path, handler) => addRoute('GET', path, handler),
    post: (path, handler) => addRoute('POST', path, handler),
    put: (path, handler) => addRoute('PUT', path, handler),
    delete: (path, handler) => addRoute('DELETE', path, handler),
    patch: (path, handler) => addRoute('PATCH', path, handler),
    match,
    handle,
  };
}

/**
 * 创建 JSON 响应
 */
function jsonResponse(data: unknown, status = 200): EdgeResponse {
  return {
    status,
    statusText: 'OK',
    headers: { 'Content-Type': 'application/json' },
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(JSON.stringify(data)));
        controller.close();
      },
    }),
  };
}

/**
 * 创建文本响应
 */
function textResponse(text: string, status = 200): EdgeResponse {
  return {
    status,
    statusText: 'OK',
    headers: { 'Content-Type': 'text/plain' },
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(text));
        controller.close();
      },
    }),
  };
}

/**
 * 创建 HTML 响应
 */
function htmlResponse(html: string, status = 200): EdgeResponse {
  return {
    status,
    statusText: 'OK',
    headers: { 'Content-Type': 'text/html' },
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(html));
        controller.close();
      },
    }),
  };
}

/**
 * 创建重定向响应
 */
function redirectResponse(location: string, status = 302): EdgeResponse {
  return {
    status,
    statusText: 'Found',
    headers: { Location: location },
  };
}

export {
  createEdgeRouter,
  createEdgeCache,
  jsonResponse,
  textResponse,
  htmlResponse,
  redirectResponse,
};

export type {
  EdgeRequest,
  EdgeResponse,
  EdgeContext,
  EdgeHandler,
  EdgeRouterOptions,
  EdgeRouter,
  EdgeRoute,
  EdgeCacheOptions,
  EdgeCache,
  EdgeCacheEntry,
};
