import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  HttpClient,
  HttpError,
  CancellationToken,
  createHttpClient,
  http,
  get,
  post,
  put,
  patch,
  del,
  getJson,
  postJson,
  putJson,
  patchJson,
  deleteJson,
  requestJson,
  type HttpClientOptions,
  type RequestOptions,
  type HttpResponse,
  type Interceptor,
} from '../src/index';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function createMockResponse(
  body: unknown,
  status = 200,
  statusText = 'OK',
  headers: Record<string, string> = { 'content-type': 'application/json' },
): Response {
  const bodyText = typeof body === 'string' ? body : JSON.stringify(body);
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    headers: new Headers(headers),
    text: () => Promise.resolve(bodyText),
    json: () => Promise.resolve(body),
    blob: () => Promise.resolve(new Blob([bodyText])),
    arrayBuffer: () => Promise.resolve(new TextEncoder().encode(bodyText).buffer),
  } as unknown as Response;
}

describe('@lytjs/common-http', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  // HttpClient
  describe('HttpClient', () => {
    describe('constructor', () => {
      it('should create instance with default options', () => {
        const client = new HttpClient();
        expect(client).toBeInstanceOf(HttpClient);
      });

      it('should create instance with custom options', () => {
        const options: HttpClientOptions = {
          baseURL: 'https://api.example.com',
          headers: { Authorization: 'Bearer token' },
          timeout: 5000,
          withCredentials: true,
        };
        const client = new HttpClient(options);
        expect(client).toBeInstanceOf(HttpClient);
      });
    });

    describe('get', () => {
      it('should make a GET request', async () => {
        mockFetch.mockResolvedValue(createMockResponse({ id: 1 }));
        const client = new HttpClient();
        const result = await client.get<{ id: number }>('/api/users/1');
        expect(result.data).toEqual({ id: 1 });
        expect(result.status).toBe(200);
        expect(result.ok).toBe(true);
        expect(mockFetch).toHaveBeenCalledTimes(1);
        const [url, options] = mockFetch.mock.calls[0]!;
        expect(url).toBe('/api/users/1');
        expect(options.method).toBe('GET');
      });

      it('should merge params into URL', async () => {
        mockFetch.mockResolvedValue(createMockResponse([]));
        const client = new HttpClient();
        await client.get('/api/search', { params: { q: 'hello', page: '1' } });
        const [url] = mockFetch.mock.calls[0]!;
        expect(url).toContain('q=hello');
        expect(url).toContain('page=1');
      });
    });

    describe('post', () => {
      it('should make a POST request with JSON body', async () => {
        mockFetch.mockResolvedValue(createMockResponse({ success: true }));
        const client = new HttpClient();
        const result = await client.post('/api/users', { name: 'test' });
        expect(result.data).toEqual({ success: true });
        const [, options] = mockFetch.mock.calls[0]!;
        expect(options.method).toBe('POST');
        expect(options.headers['Content-Type']).toBe('application/json');
        expect(options.body).toBe(JSON.stringify({ name: 'test' }));
      });
    });

    describe('put', () => {
      it('should make a PUT request', async () => {
        mockFetch.mockResolvedValue(createMockResponse({ updated: true }));
        const client = new HttpClient();
        const result = await client.put('/api/users/1', { name: 'updated' });
        expect(result.data).toEqual({ updated: true });
        const [, options] = mockFetch.mock.calls[0]!;
        expect(options.method).toBe('PUT');
      });
    });

    describe('delete', () => {
      it('should make a DELETE request', async () => {
        mockFetch.mockResolvedValue(createMockResponse({ deleted: true }));
        const client = new HttpClient();
        const result = await client.delete('/api/users/1');
        expect(result.data).toEqual({ deleted: true });
        const [, options] = mockFetch.mock.calls[0]!;
        expect(options.method).toBe('DELETE');
      });
    });

    describe('patch', () => {
      it('should make a PATCH request', async () => {
        mockFetch.mockResolvedValue(createMockResponse({ patched: true }));
        const client = new HttpClient();
        const result = await client.patch('/api/users/1', { name: 'patched' });
        expect(result.data).toEqual({ patched: true });
        const [, options] = mockFetch.mock.calls[0]!;
        expect(options.method).toBe('PATCH');
      });
    });

    describe('request', () => {
      it('should make a custom method request', async () => {
        mockFetch.mockResolvedValue(createMockResponse({ ok: true }));
        const client = new HttpClient();
        const result = await client.request('HEAD', '/api/resource');
        expect(result.status).toBe(200);
        const [, options] = mockFetch.mock.calls[0]!;
        expect(options.method).toBe('HEAD');
      });
    });

    describe('baseURL', () => {
      it('should prepend baseURL to relative URLs', async () => {
        mockFetch.mockResolvedValue(createMockResponse({ ok: true }));
        const client = new HttpClient({ baseURL: 'https://api.example.com' });
        await client.get('/users');
        const [url] = mockFetch.mock.calls[0]!;
        expect(url).toBe('https://api.example.com/users');
      });

      it('should handle baseURL with trailing slash', async () => {
        mockFetch.mockResolvedValue(createMockResponse({ ok: true }));
        const client = new HttpClient({ baseURL: 'https://api.example.com/' });
        await client.get('/users');
        const [url] = mockFetch.mock.calls[0]!;
        expect(url).toBe('https://api.example.com/users');
      });
    });

    describe('default headers', () => {
      it('should merge default headers with request headers', async () => {
        mockFetch.mockResolvedValue(createMockResponse({ ok: true }));
        const client = new HttpClient({ headers: { 'X-Default': 'yes' } });
        await client.get('/api', { headers: { 'X-Custom': 'no' } });
        const [, options] = mockFetch.mock.calls[0]!;
        expect(options.headers['X-Default']).toBe('yes');
        expect(options.headers['X-Custom']).toBe('no');
      });
    });

    describe('responseType', () => {
      it('should handle text responseType', async () => {
        mockFetch.mockResolvedValue(createMockResponse('plain text', 200, 'OK', { 'content-type': 'text/plain' }));
        const client = new HttpClient();
        const result = await client.get<string>('/api/text', { responseType: 'text' });
        expect(result.data).toBe('plain text');
      });
    });

    describe('error handling', () => {
      it('should throw HttpError for non-ok responses', async () => {
        mockFetch.mockResolvedValue(createMockResponse({ error: 'Not Found' }, 404, 'Not Found'));
        const client = new HttpClient();
        await expect(client.get('/api/missing')).rejects.toThrow(HttpError);
        try {
          await client.get('/api/missing');
        } catch (err) {
          expect(err).toBeInstanceOf(HttpError);
          const httpErr = err as HttpError;
          expect(httpErr.status).toBe(404);
          expect(httpErr.response).toBeDefined();
          expect(httpErr.response!.status).toBe(404);
          expect(httpErr.message).toContain('404');
        }
      });

      it('should throw HttpError for 500 responses', async () => {
        mockFetch.mockResolvedValue(createMockResponse({ error: 'Server Error' }, 500, 'Internal Server Error'));
        const client = new HttpClient();
        await expect(client.get('/api/error')).rejects.toThrow(HttpError);
      });
    });

    describe('interceptors', () => {
      it('should apply request interceptor', async () => {
        mockFetch.mockResolvedValue(createMockResponse({ ok: true }));
        const client = new HttpClient();
        const interceptor: Interceptor = {
          request(config) {
            config.headers['X-Intercepted'] = 'true';
            return config;
          },
        };
        client.use(interceptor);
        await client.get('/api');
        const [, options] = mockFetch.mock.calls[0]!;
        expect(options.headers['X-Intercepted']).toBe('true');
      });

      it('should apply response interceptor', async () => {
        mockFetch.mockResolvedValue(createMockResponse({ raw: true }));
        const client = new HttpClient();
        const interceptor: Interceptor = {
          response(response) {
            const data = response.data as Record<string, unknown>;
            return { ...response, data: { ...data, transformed: true } } as HttpResponse<unknown>;
          },
        };
        client.use(interceptor);
        const result = await client.get('/api');
        expect(result.data).toEqual({ raw: true, transformed: true });
      });

      it('should apply error interceptor', async () => {
        mockFetch.mockResolvedValue(createMockResponse({ error: 'Not Found' }, 404, 'Not Found'));
        const client = new HttpClient();
        const interceptor: Interceptor = {
          error(error) {
            return { data: 'fallback', status: 200, statusText: 'OK', headers: {}, ok: true } as HttpResponse<unknown>;
          },
        };
        client.use(interceptor);
        const result = await client.get('/api');
        expect(result.data).toBe('fallback');
      });

      it('use should return eject function', async () => {
        mockFetch.mockResolvedValue(createMockResponse({ ok: true }));
        const client = new HttpClient();
        let callCount = 0;
        const interceptor: Interceptor = {
          request(config) {
            callCount++;
            return config;
          },
        };
        const eject = client.use(interceptor);
        await client.get('/api');
        expect(callCount).toBe(1);
        eject();
        await client.get('/api');
        expect(callCount).toBe(1); // should not increase after eject
      });

      it('eject should remove interceptor', async () => {
        mockFetch.mockResolvedValue(createMockResponse({ ok: true }));
        const client = new HttpClient();
        const interceptor: Interceptor = {
          request(config) {
            config.headers['X-Test'] = 'value';
            return config;
          },
        };
        client.use(interceptor);
        client.eject(interceptor);
        await client.get('/api');
        const [, options] = mockFetch.mock.calls[0]!;
        expect(options.headers['X-Test']).toBeUndefined();
      });

      it('should support async request interceptor', async () => {
        mockFetch.mockResolvedValue(createMockResponse({ ok: true }));
        const client = new HttpClient();
        const interceptor: Interceptor = {
          async request(config) {
            config.headers['X-Async'] = 'true';
            return config;
          },
        };
        client.use(interceptor);
        await client.get('/api');
        const [, options] = mockFetch.mock.calls[0]!;
        expect(options.headers['X-Async']).toBe('true');
      });

      it('should support async response interceptor', async () => {
        mockFetch.mockResolvedValue(createMockResponse({ raw: true }));
        const client = new HttpClient();
        const interceptor: Interceptor = {
          async response(response) {
            const data = response.data as Record<string, unknown>;
            return { ...response, data: { ...data, async: true } } as HttpResponse<unknown>;
          },
        };
        client.use(interceptor);
        const result = await client.get('/api');
        expect(result.data).toEqual({ raw: true, async: true });
      });
    });

    describe('timeout', () => {
      it('should timeout using AbortController', async () => {
        mockFetch.mockImplementation((_url: string, options: RequestInit) => {
          return new Promise((_, reject) => {
            const handler = () => reject(new DOMException('Aborted', 'AbortError'));
            options.signal?.addEventListener('abort', handler, { once: true });
          });
        });
        const client = new HttpClient({ timeout: 100 });
        await expect(client.get('/api/slow')).rejects.toThrow();
      }, 5000);
    });

    describe('signal', () => {
      it('should support AbortSignal from caller', async () => {
        const controller = new AbortController();
        mockFetch.mockImplementation((_url: string, options: RequestInit) => {
          return new Promise((_, reject) => {
            const handler = () => reject(new DOMException('Aborted', 'AbortError'));
            options.signal?.addEventListener('abort', handler, { once: true });
          });
        });
        const client = new HttpClient();
        const promise = client.get('/api', { signal: controller.signal });
        controller.abort();
        await expect(promise).rejects.toThrow();
      });
    });

    describe('response headers', () => {
      it('should parse response headers', async () => {
        mockFetch.mockResolvedValue(
          createMockResponse({ ok: true }, 200, 'OK', { 'x-custom': 'value', 'content-type': 'application/json' }),
        );
        const client = new HttpClient();
        const result = await client.get('/api');
        expect(result.headers['x-custom']).toBe('value');
        expect(result.headers['content-type']).toBe('application/json');
      });
    });
  });

  // HttpError
  describe('HttpError', () => {
    it('should be an instance of Error', () => {
      const error = new HttpError('test error');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(HttpError);
    });

    it('should have correct name', () => {
      const error = new HttpError('test');
      expect(error.name).toBe('HttpError');
    });

    it('should store message', () => {
      const error = new HttpError('something went wrong');
      expect(error.message).toBe('something went wrong');
    });

    it('should store response and status', () => {
      const response: HttpResponse<unknown> = {
        data: null,
        status: 404,
        statusText: 'Not Found',
        headers: {},
        ok: false,
      };
      const error = new HttpError('Not Found', response);
      expect(error.response).toBe(response);
      expect(error.status).toBe(404);
    });

    it('should have undefined response and status when not provided', () => {
      const error = new HttpError('error');
      expect(error.response).toBeUndefined();
      expect(error.status).toBeUndefined();
    });
  });

  // CancellationToken
  describe('CancellationToken', () => {
    it('should create a token', () => {
      const token = new CancellationToken();
      expect(token.isCancelled).toBe(false);
      expect(token.signal).toBeInstanceOf(AbortSignal);
    });

    it('should cancel and update isCancelled', () => {
      const token = new CancellationToken();
      token.cancel();
      expect(token.isCancelled).toBe(true);
    });

    it('should provide an AbortSignal', () => {
      const token = new CancellationToken();
      expect(token.signal.aborted).toBe(false);
      token.cancel();
      expect(token.signal.aborted).toBe(true);
    });

    describe('createLinkedToken', () => {
      it('should create a linked token', () => {
        const token1 = new CancellationToken();
        const token2 = new CancellationToken();
        const linked = CancellationToken.createLinkedToken(token1, token2);
        expect(linked.isCancelled).toBe(false);
      });

      it('should cancel linked token when parent is cancelled', () => {
        const token1 = new CancellationToken();
        const linked = CancellationToken.createLinkedToken(token1);
        token1.cancel();
        expect(linked.isCancelled).toBe(true);
      });

      it('should return already cancelled if parent is cancelled', () => {
        const token1 = new CancellationToken();
        token1.cancel();
        const linked = CancellationToken.createLinkedToken(token1);
        expect(linked.isCancelled).toBe(true);
      });

      it('should link multiple tokens', () => {
        const token1 = new CancellationToken();
        const token2 = new CancellationToken();
        const linked = CancellationToken.createLinkedToken(token1, token2);
        token2.cancel();
        expect(linked.isCancelled).toBe(true);
      });
    });
  });

  // createHttpClient
  describe('createHttpClient', () => {
    it('should create an HttpClient instance', () => {
      const client = createHttpClient();
      expect(client).toBeInstanceOf(HttpClient);
    });

    it('should pass options to HttpClient', () => {
      const client = createHttpClient({ baseURL: 'https://example.com' });
      expect(client).toBeInstanceOf(HttpClient);
    });
  });

  // http default instance
  describe('http', () => {
    it('should be an HttpClient instance', () => {
      expect(http).toBeInstanceOf(HttpClient);
    });
  });

  // Convenience methods
  describe('Convenience methods', () => {
    describe('get', () => {
      it('should make GET request', async () => {
        mockFetch.mockResolvedValue(createMockResponse({ id: 1 }));
        const result = await get('/api/users/1');
        expect(result.data).toEqual({ id: 1 });
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });
    });

    describe('post', () => {
      it('should make POST request', async () => {
        mockFetch.mockResolvedValue(createMockResponse({ success: true }));
        const result = await post('/api/users', { name: 'test' });
        expect(result.data).toEqual({ success: true });
      });
    });

    describe('put', () => {
      it('should make PUT request', async () => {
        mockFetch.mockResolvedValue(createMockResponse({ updated: true }));
        const result = await put('/api/users/1', { name: 'updated' });
        expect(result.data).toEqual({ updated: true });
      });
    });

    describe('patch', () => {
      it('should make PATCH request', async () => {
        mockFetch.mockResolvedValue(createMockResponse({ patched: true }));
        const result = await patch('/api/users/1', { name: 'patched' });
        expect(result.data).toEqual({ patched: true });
      });
    });

    describe('del', () => {
      it('should make DELETE request', async () => {
        mockFetch.mockResolvedValue(createMockResponse({ deleted: true }));
        const result = await del('/api/users/1');
        expect(result.data).toEqual({ deleted: true });
      });
    });

    describe('JSON methods', () => {
      it('getJson should return data directly', async () => {
        mockFetch.mockResolvedValue(createMockResponse({ id: 1, name: 'test' }));
        const result = await getJson<{ id: number; name: string }>('/api/users/1');
        expect(result).toEqual({ id: 1, name: 'test' });
      });

      it('postJson should send data and return response', async () => {
        mockFetch.mockResolvedValue(createMockResponse({ id: 2 }));
        const result = await postJson<{ id: number }>('/api/users', { name: 'new' });
        expect(result).toEqual({ id: 2 });
      });

      it('putJson should send data and return response', async () => {
        mockFetch.mockResolvedValue(createMockResponse({ id: 1, name: 'updated' }));
        const result = await putJson<{ id: number; name: string }>('/api/users/1', { name: 'updated' });
        expect(result).toEqual({ id: 1, name: 'updated' });
      });

      it('patchJson should send data and return response', async () => {
        mockFetch.mockResolvedValue(createMockResponse({ id: 1, name: 'patched' }));
        const result = await patchJson<{ id: number; name: string }>('/api/users/1', { name: 'patched' });
        expect(result).toEqual({ id: 1, name: 'patched' });
      });

      it('deleteJson should return response', async () => {
        mockFetch.mockResolvedValue(createMockResponse({ success: true }));
        const result = await deleteJson<{ success: boolean }>('/api/users/1');
        expect(result).toEqual({ success: true });
      });

      it('requestJson should handle all methods', async () => {
        mockFetch.mockResolvedValue(createMockResponse({ ok: true }));
        const result = await requestJson<{ ok: boolean }>('GET', '/api/test');
        expect(result).toEqual({ ok: true });
      });
    });
  });

  // Array query params support
  describe('Array query params', () => {
    it('should handle array query parameters', async () => {
      mockFetch.mockResolvedValue(createMockResponse([]));
      const client = new HttpClient();
      await client.get('/api/users', { params: { ids: [1, 2, 3], tags: ['admin', 'user'] } });
      const [url] = mockFetch.mock.calls[0]!;
      expect(url).toContain('ids=1&ids=2&ids=3');
      expect(url).toContain('tags=admin&tags=user');
    });

    it('should mix single and array query parameters', async () => {
      mockFetch.mockResolvedValue(createMockResponse([]));
      const client = new HttpClient();
      await client.get('/api/search', { params: { q: 'test', page: 1, filters: ['active', 'verified'] } });
      const [url] = mockFetch.mock.calls[0]!;
      expect(url).toContain('q=test');
      expect(url).toContain('page=1');
      expect(url).toContain('filters=active');
      expect(url).toContain('filters=verified');
    });

    it('should handle boolean values in query params', async () => {
      mockFetch.mockResolvedValue(createMockResponse([]));
      const client = new HttpClient();
      await client.get('/api/config', { params: { debug: true, verbose: false } });
      const [url] = mockFetch.mock.calls[0]!;
      expect(url).toContain('debug=true');
      expect(url).toContain('verbose=false');
    });

    it('should handle number values in array', async () => {
      mockFetch.mockResolvedValue(createMockResponse([]));
      const client = new HttpClient();
      await client.get('/api/items', { params: { ids: [100, 200, 300] } });
      const [url] = mockFetch.mock.calls[0]!;
      expect(url).toContain('ids=100&ids=200&ids=300');
    });

    it('should handle mixed types in array', async () => {
      mockFetch.mockResolvedValue(createMockResponse([]));
      const client = new HttpClient();
      await client.get('/api/test', { params: { values: [1, 'two', false] } });
      const [url] = mockFetch.mock.calls[0]!;
      expect(url).toContain('values=1&values=two&values=false');
    });
  });
});
