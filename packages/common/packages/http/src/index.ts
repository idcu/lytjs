/**
 * @lytjs/common-http
 * Lightweight HTTP client based on native fetch API
 */

// --- Imports ---
import { stringifyQueryString } from '@lytjs/common-query';

// --- Types ---

export interface HttpClientOptions {
  baseURL?: string;
  headers?: Record<string, string>;
  timeout?: number;
  withCredentials?: boolean;
}

export interface RequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean | Array<string | number | boolean>>;
  timeout?: number;
  signal?: AbortSignal;
  responseType?: 'json' | 'text' | 'blob' | 'arraybuffer';
}

export interface HttpResponse<T> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  ok: boolean;
}

export interface InternalRequestConfig {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: BodyInit | null;
  signal?: AbortSignal;
  responseType?: 'json' | 'text' | 'blob' | 'arraybuffer';
  withCredentials?: boolean;
  timeout?: number;
}

export interface Interceptor {
  request?(config: InternalRequestConfig): InternalRequestConfig | Promise<InternalRequestConfig>;
  response?(response: HttpResponse<unknown>): HttpResponse<unknown> | Promise<HttpResponse<unknown>>;
  error?(error: HttpError): unknown;
}

// --- HttpError ---

export class HttpError extends Error {
  readonly response?: HttpResponse<unknown>;
  readonly status?: number;

  constructor(message: string, response?: HttpResponse<unknown>) {
    super(message);
    this.name = 'HttpError';
    this.response = response;
    this.status = response?.status;
  }
}

// --- CancellationToken ---

export class CancellationToken {
  private readonly _controller: AbortController;
  private readonly _linkedTokens: CancellationToken[];

  constructor() {
    this._controller = new AbortController();
    this._linkedTokens = [];
  }

  get signal(): AbortSignal {
    return this._controller.signal;
  }

  cancel(): void {
    this._controller.abort();
    for (const token of this._linkedTokens) {
      token.cancel();
    }
  }

  get isCancelled(): boolean {
    return this._controller.signal.aborted;
  }

  static createLinkedToken(...tokens: CancellationToken[]): CancellationToken {
    const linked = new CancellationToken();
    for (const token of tokens) {
      token._linkedTokens.push(linked);
      if (token.isCancelled) {
        linked.cancel();
        return linked;
      }
    }
    return linked;
  }
}

// --- HttpClient ---

export class HttpClient {
  private readonly _options: HttpClientOptions;
  private readonly _interceptors: Interceptor[];

  constructor(options?: HttpClientOptions) {
    this._options = { ...options };
    this._interceptors = [];
  }

  get<T = unknown>(url: string, options?: RequestOptions): Promise<HttpResponse<T>> {
    return this.request<T>('GET', url, options);
  }

  post<T = unknown>(url: string, data?: unknown, options?: RequestOptions): Promise<HttpResponse<T>> {
    return this.request<T>('POST', url, { ...options, body: data } as RequestOptions & { body?: unknown });
  }

  put<T = unknown>(url: string, data?: unknown, options?: RequestOptions): Promise<HttpResponse<T>> {
    return this.request<T>('PUT', url, { ...options, body: data } as RequestOptions & { body?: unknown });
  }

  delete<T = unknown>(url: string, options?: RequestOptions): Promise<HttpResponse<T>> {
    return this.request<T>('DELETE', url, options);
  }

  patch<T = unknown>(url: string, data?: unknown, options?: RequestOptions): Promise<HttpResponse<T>> {
    return this.request<T>('PATCH', url, { ...options, body: data } as RequestOptions & { body?: unknown });
  }

  async request<T = unknown>(
    method: string,
    url: string,
    options?: RequestOptions & { body?: unknown },
  ): Promise<HttpResponse<T>> {
    let config = this._buildConfig(method, url, options);

    // Apply request interceptors
    for (const interceptor of this._interceptors) {
      if (interceptor.request) {
        config = await interceptor.request(config);
      }
    }

    try {
      const response = await this._fetch(config);
      let httpResponse = await this._parseResponse<T>(response, config.responseType);

      // Apply response interceptors
      for (const interceptor of this._interceptors) {
        if (interceptor.response) {
          httpResponse = (await interceptor.response(httpResponse as HttpResponse<unknown>)) as HttpResponse<T>;
        }
      }

      return httpResponse;
    } catch (err) {
      // Apply error interceptors
      for (const interceptor of this._interceptors) {
        if (interceptor.error) {
          const result = interceptor.error(err instanceof HttpError ? err : new HttpError(String(err)));
          if (result !== undefined) return result as HttpResponse<T>;
        }
      }
      throw err;
    }
  }

  use(interceptor: Interceptor): () => void {
    this._interceptors.push(interceptor);
    return () => this.eject(interceptor);
  }

  eject(interceptor: Interceptor): void {
    const index = this._interceptors.indexOf(interceptor);
    if (index !== -1) {
      this._interceptors.splice(index, 1);
    }
  }

  private _buildConfig(
    method: string,
    url: string,
    options?: RequestOptions & { body?: unknown },
  ): InternalRequestConfig {
    const { baseURL = '', headers: defaultHeaders = {} } = this._options;
    const resolvedURL = this._resolveURL(baseURL, url, options?.params);

    const headers: Record<string, string> = { ...defaultHeaders, ...options?.headers };

    let body: BodyInit | null = null;
    if (options && 'body' in options && options.body !== undefined) {
      if (typeof options.body === 'object' && options.body !== null) {
        body = JSON.stringify(options.body);
        if (!headers['Content-Type']) {
          headers['Content-Type'] = 'application/json';
        }
      } else {
        body = String(options.body);
      }
    }

    const timeout = options?.timeout ?? this._options.timeout;

    return {
      method: method.toUpperCase(),
      url: resolvedURL,
      headers,
      body,
      signal: options?.signal,
      responseType: options?.responseType,
      withCredentials: this._options.withCredentials,
      timeout,
    };
  }

  private _resolveURL(
    base: string, 
    url: string, 
    params?: Record<string, string | number | boolean | Array<string | number | boolean>>,
  ): string {
    let resolved = base ? base.replace(/\/+$/, '') + '/' + url.replace(/^\/+/, '') : url;
    if (params) {
      const qs = stringifyQueryString(params);
      if (qs) {
        resolved += (resolved.includes('?') ? '&' : '?') + qs;
      }
    }
    return resolved;
  }

  private async _fetch(config: InternalRequestConfig): Promise<Response> {
    const { method, url, headers, body, signal, withCredentials, timeout } = config;

    // Handle timeout via AbortController
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let timeoutController: AbortController | undefined;

    if (timeout && timeout > 0) {
      timeoutController = new AbortController();
      timeoutId = setTimeout(() => timeoutController!.abort(), timeout);

      // Link with existing signal
      if (signal) {
        if (signal.aborted) {
          clearTimeout(timeoutId);
          throw new HttpError('Request was aborted', undefined);
        }
        signal.addEventListener('abort', () => {
          clearTimeout(timeoutId);
          timeoutController!.abort();
        }, { once: true });
      }
    }

    const fetchOptions: RequestInit = {
      method,
      headers,
      body,
      credentials: withCredentials ? 'include' : undefined,
      signal: timeoutController ? timeoutController.signal : signal,
    };

    try {
      const response = await fetch(url, fetchOptions);

      if (!response.ok) {
        const errorResponse: HttpResponse<unknown> = {
          data: null,
          status: response.status,
          statusText: response.statusText,
          headers: this._parseHeaders(response.headers),
          ok: false,
        };
        throw new HttpError(
          `HTTP ${response.status}: ${response.statusText}`,
          errorResponse,
        );
      }

      return response;
    } finally {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    }
  }

  private async _parseResponse<T>(
    response: Response,
    responseType?: 'json' | 'text' | 'blob' | 'arraybuffer',
  ): Promise<HttpResponse<T>> {
    let data: T;
    switch (responseType) {
      case 'text':
        data = (await response.text()) as unknown as T;
        break;
      case 'blob':
        data = (await response.blob()) as unknown as T;
        break;
      case 'arraybuffer':
        data = (await response.arrayBuffer()) as unknown as T;
        break;
      case 'json':
      default: {
        const text = await response.text();
        data = text ? JSON.parse(text) : (null as unknown as T);
        break;
      }
    }

    return {
      data,
      status: response.status,
      statusText: response.statusText,
      headers: this._parseHeaders(response.headers),
      ok: response.ok,
    };
  }

  private _parseHeaders(headers: Headers): Record<string, string> {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }
}

// --- Convenience exports ---

export function createHttpClient(options?: HttpClientOptions): HttpClient {
  return new HttpClient(options);
}

export const http: HttpClient = new HttpClient();

// --- Convenience methods for the default http client ---

/**
 * 便捷 GET 请求
 */
export function get<T = unknown>(url: string, options?: RequestOptions): Promise<HttpResponse<T>> {
  return http.get<T>(url, options);
}

/**
 * 便捷 POST 请求
 */
export function post<T = unknown>(url: string, data?: unknown, options?: RequestOptions): Promise<HttpResponse<T>> {
  return http.post<T>(url, data, options);
}

/**
 * 便捷 PUT 请求
 */
export function put<T = unknown>(url: string, data?: unknown, options?: RequestOptions): Promise<HttpResponse<T>> {
  return http.put<T>(url, data, options);
}

/**
 * 便捷 DELETE 请求
 */
export function del<T = unknown>(url: string, options?: RequestOptions): Promise<HttpResponse<T>> {
  return http.delete<T>(url, options);
}

/**
 * 便捷 PATCH 请求
 */
export function patch<T = unknown>(url: string, data?: unknown, options?: RequestOptions): Promise<HttpResponse<T>> {
  return http.patch<T>(url, data, options);
}

/**
 * 发送 JSON 请求并直接获取数据
 * 自动处理响应解析和错误
 */
export async function requestJson<T = unknown>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  url: string,
  options?: RequestOptions & { data?: unknown },
): Promise<T> {
  const { data, ...config } = options || {};
  
  if (method === 'GET' || method === 'DELETE') {
    const response = await http.request<T>(method, url, config);
    return response.data;
  }
  
  const response = await http.request<T>(method, url, { ...config, body: data });
  return response.data;
}

/**
 * 发送 GET JSON 请求
 */
export async function getJson<T = unknown>(url: string, options?: RequestOptions): Promise<T> {
  return requestJson<T>('GET', url, options);
}

/**
 * 发送 POST JSON 请求
 */
export async function postJson<T = unknown>(url: string, data?: unknown, options?: RequestOptions): Promise<T> {
  return requestJson<T>('POST', url, { ...options, data });
}

/**
 * 发送 PUT JSON 请求
 */
export async function putJson<T = unknown>(url: string, data?: unknown, options?: RequestOptions): Promise<T> {
  return requestJson<T>('PUT', url, { ...options, data });
}

/**
 * 发送 PATCH JSON 请求
 */
export async function patchJson<T = unknown>(url: string, data?: unknown, options?: RequestOptions): Promise<T> {
  return requestJson<T>('PATCH', url, { ...options, data });
}

/**
 * 发送 DELETE JSON 请求
 */
export async function deleteJson<T = unknown>(url: string, options?: RequestOptions): Promise<T> {
  return requestJson<T>('DELETE', url, options);
}
