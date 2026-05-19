/**
 * @lytjs/runtime-edge - Type definitions
 */

export interface EdgeRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: ReadableStream;
  signal?: AbortSignal;
}

export interface EdgeResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body?: ReadableStream;
}

export interface EdgeContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

export interface EdgeHandler {
  (request: EdgeRequest, context: EdgeContext): Promise<EdgeResponse> | EdgeResponse;
}

export interface EdgeRouterOptions {
  basePath?: string;
}

export interface EdgeRoute {
  path: string;
  handler: EdgeHandler;
  method: string;
}

export interface EdgeRouter {
  get(path: string, handler: EdgeHandler): void;
  post(path: string, handler: EdgeHandler): void;
  put(path: string, handler: EdgeHandler): void;
  delete(path: string, handler: EdgeHandler): void;
  patch(path: string, handler: EdgeHandler): void;
  match(request: EdgeRequest): EdgeRoute | null;
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

export interface EdgeCache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, options?: EdgeCacheOptions): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  has(key: string): Promise<boolean>;
}
