/**
 * CORS 中间件实现
 */
import type { Middleware } from '@lytjs/middleware';
import type { CORSOptions } from './types';

const DEFAULT_METHODS = ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'];
const DEFAULT_ALLOWED_HEADERS = [
  'Accept',
  'Accept-Language',
  'Content-Language',
  'Content-Type',
];

/**
 * 创建 CORS 中间件
 */
export function createCorsMiddleware(options: CORSOptions = {}): Middleware {
  const {
    origin = '*',
    methods = DEFAULT_METHODS,
    allowedHeaders = DEFAULT_ALLOWED_HEADERS,
    exposedHeaders,
    credentials = false,
    maxAge,
  } = options;

  return async (request, _context, next) => {
    const requestOrigin = request.headers.get('origin');
    const requestMethod = request.method;

    let allowedOrigin = getOrigin(origin, requestOrigin);

    if (requestMethod === 'OPTIONS') {
      const headers = new Headers();

      if (allowedOrigin) {
        headers.set('Access-Control-Allow-Origin', allowedOrigin);
      }

      if (credentials) {
        headers.set('Access-Control-Allow-Credentials', 'true');
      }

      const requestHeaders = request.headers.get('Access-Control-Request-Headers');
      const actualAllowedHeaders = requestHeaders || (
        Array.isArray(allowedHeaders) ? allowedHeaders.join(', ') : allowedHeaders
      );
      if (actualAllowedHeaders) {
        headers.set('Access-Control-Allow-Headers', actualAllowedHeaders);
      }

      const actualMethods = Array.isArray(methods) ? methods.join(', ') : methods;
      headers.set('Access-Control-Allow-Methods', actualMethods);

      if (maxAge !== undefined) {
        headers.set('Access-Control-Max-Age', String(maxAge));
      }

      if (credentials && allowedOrigin === '*') {
        allowedOrigin = requestOrigin || '*';
      }

      return new Response(null, {
        status: 204,
        headers,
      });
    }

    const response = await next();

    if (response instanceof Response) {
      const headers = new Headers(response.headers);

      if (allowedOrigin) {
        headers.set('Access-Control-Allow-Origin', allowedOrigin);
      }

      if (credentials) {
        headers.set('Access-Control-Allow-Credentials', 'true');
      }

      if (exposedHeaders) {
        const actualExposedHeaders = Array.isArray(exposedHeaders)
          ? exposedHeaders.join(', ')
          : exposedHeaders;
        headers.set('Access-Control-Expose-Headers', actualExposedHeaders);
      }

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }

    return response;
  };
}

function getOrigin(
  origin: CORSOptions['origin'],
  requestOrigin: string | null,
): string | null {
  if (origin === true) {
    return requestOrigin || '*';
  }

  if (origin === false) {
    return null;
  }

  if (typeof origin === 'string') {
    return origin;
  }

  if (Array.isArray(origin)) {
    if (requestOrigin && origin.includes(requestOrigin)) {
      return requestOrigin;
    }
    return origin[0] || '*';
  }

  if (origin instanceof RegExp) {
    if (requestOrigin && origin.test(requestOrigin)) {
      return requestOrigin;
    }
    return null;
  }

  if (typeof origin === 'function') {
    const result = origin(requestOrigin);
    if (typeof result === 'string') {
      return result;
    }
    if (result === true) {
      return requestOrigin || '*';
    }
    return null;
  }

  return '*';
}
