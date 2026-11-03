/**
 * @lytjs/runtime-edge 测试
 *
 * 2026-11-03：原来的 3 条路由用例都是「形状断言」（`toBeDefined()`），
 * 恰好让两类缺陷存活了下来：① 404/500 返回的不是 `Response`；② 路由只有精确匹配。
 * 这里改为断言**行为**（状态码 / 响应体 / `instanceof Response` / params 内容）。
 */
import { describe, it, expect } from 'vitest';
import {
  createEdgeRouter,
  createEdgeCache,
  jsonResponse,
  textResponse,
  htmlResponse,
  redirectResponse,
  normalizePath,
  toResponse,
} from '../src';

const req = (url: string, method = 'GET') => ({ url, method, headers: {} });

describe('@lytjs/runtime-edge', () => {
  describe('createEdgeRouter：匹配', () => {
    it('注册并命中 GET 路由', async () => {
      const router = createEdgeRouter();
      router.get('/test', () => jsonResponse({ success: true }));

      const res = await router.handle(req('http://localhost/test'));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ success: true });
    });

    it('未注册路径返回 404，且必须是真正的 Response', async () => {
      const router = createEdgeRouter();
      const res = await router.handle(req('http://localhost/non-existent'));

      expect(res).toBeInstanceOf(Response);
      expect(res.status).toBe(404);
      expect(await res.text()).toBe('Not Found');
    });

    it('支持 :param 并做百分号解码', async () => {
      const router = createEdgeRouter();
      router.get('/users/:id', (_r, _c, params) => jsonResponse({ id: params?.id }));

      const res = await router.handle(req('http://localhost/users/%E4%B8%AD%E6%96%87'));
      expect(await res.json()).toEqual({ id: '中文' });
    });

    it('静态段胜过参数段', async () => {
      const router = createEdgeRouter();
      router.get('/users/:id', () => jsonResponse({ route: 'param' }));
      router.get('/users/me', () => jsonResponse({ route: 'static' }));

      const res = await router.handle(req('http://localhost/users/me'));
      expect(await res.json()).toEqual({ route: 'static' });
    });

    it('通配符吞掉剩余段，且胜过参数路由', async () => {
      const router = createEdgeRouter();
      router.get('/a/:x/:y', () => jsonResponse({ route: 'params' }));
      router.get('/a/b/*', (_r, _c, params) =>
        jsonResponse({ route: 'wildcard', rest: params?.['*'] }),
      );

      const res = await router.handle(req('http://localhost/a/b/c/d'));
      expect(await res.json()).toEqual({ route: 'wildcard', rest: 'c/d' });
    });

    it('basePath 带尾斜杠也能拼出正确路径', async () => {
      const router = createEdgeRouter({ basePath: '/api/' });
      router.get('/users', () => jsonResponse({ ok: 1 }));

      expect((await router.handle(req('http://x/api/users'))).status).toBe(200);
    });

    it('容忍请求尾斜杠', async () => {
      const router = createEdgeRouter();
      router.get('/users', () => jsonResponse({ ok: 1 }));

      expect((await router.handle(req('http://x/users/'))).status).toBe(200);
    });

    it('相对 URL 不抛错', async () => {
      const router = createEdgeRouter();
      router.get('/users', () => jsonResponse({ ok: 1 }));

      expect((await router.handle(req('/users'))).status).toBe(200);
    });

    it('方法不匹配返回 405 + Allow', async () => {
      const router = createEdgeRouter();
      router.post('/only', () => jsonResponse({}));

      const res = await router.handle(req('http://x/only'));
      expect(res.status).toBe(405);
      expect(res.headers.get('allow')).toBe('POST');
    });

    it('HEAD 回落到 GET', async () => {
      const router = createEdgeRouter();
      router.get('/health', () => jsonResponse({ ok: true }));

      expect((await router.handle(req('http://x/health', 'HEAD'))).status).toBe(200);
    });

    it('并发请求的 params 互不串扰', async () => {
      const router = createEdgeRouter();
      router.get('/users/:id', async (_r, _c, params) => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        return jsonResponse({ id: params?.id });
      });

      const [a, b] = await Promise.all([
        router.handle(req('http://x/users/A')),
        router.handle(req('http://x/users/B')),
      ]);
      expect(await a.json()).toEqual({ id: 'A' });
      expect(await b.json()).toEqual({ id: 'B' });
    });

    it('allowedMethods 给出该路径允许的方法', () => {
      const router = createEdgeRouter();
      router.get('/res', () => jsonResponse({}));
      router.post('/res', () => jsonResponse({}));

      expect(router.allowedMethods('/res').sort()).toEqual(['GET', 'HEAD', 'POST']);
      expect(router.allowedMethods('/nope')).toEqual([]);
    });
  });

  describe('createEdgeRouter：返回值归一化', () => {
    it('handler 返回普通对象时转成真正的 Response', async () => {
      const router = createEdgeRouter();
      router.get('/plain', () => ({ status: 200, headers: { 'x-plain': '1' }, body: { ok: 1 } }));

      const res = await router.handle(req('http://x/plain'));
      expect(res).toBeInstanceOf(Response);
      expect(await res.json()).toEqual({ ok: 1 });
      expect(res.headers.get('x-plain')).toBe('1');
    });

    it('handler 抛错返回 500 且不泄漏内部信息', async () => {
      const router = createEdgeRouter();
      router.get('/boom', () => {
        throw new Error('SECRET');
      });

      const res = await router.handle(req('http://x/boom'));
      expect(res.status).toBe(500);
      expect(await res.text()).toBe('Internal Server Error');
    });

    it('toResponse 对 204 不传 body（Response 构造约束）', () => {
      const res = toResponse({ status: 204, body: 'ignored' });
      expect(res.status).toBe(204);
      expect(res.body).toBeNull();
    });
  });

  describe('normalizePath', () => {
    it('补前导斜杠、折叠重复斜杠、去尾斜杠', () => {
      expect(normalizePath('users')).toBe('/users');
      expect(normalizePath('//api//users//')).toBe('/api/users');
      expect(normalizePath('/')).toBe('/');
      expect(normalizePath('')).toBe('/');
    });
  });

  describe('createEdgeCache', () => {
    it('设置与读取', async () => {
      const cache = createEdgeCache();
      await cache.set('key', 'value');
      expect(await cache.get('key')).toBe('value');
    });

    it('删除与清空', async () => {
      const cache = createEdgeCache();
      await cache.set('key', 'value');
      await cache.delete('key');
      expect(await cache.get('key')).toBeNull();

      await cache.set('k1', 'v1');
      await cache.set('k2', 'v2');
      await cache.clear();
      expect(await cache.has('k1')).toBe(false);
      expect(await cache.size()).toBe(0);
    });

    it('超过 maxSize 时淘汰最旧条目', async () => {
      const cache = createEdgeCache({ maxSize: 3 });
      for (let i = 0; i < 5; i++) await cache.set(`k${i}`, i);

      expect(await cache.size()).toBe(3);
      expect(await cache.has('k0')).toBe(false);
      expect(await cache.get('k4')).toBe(4);
    });

    it('覆盖同一 key 不增加条目数', async () => {
      const cache = createEdgeCache();
      for (let i = 0; i < 5; i++) await cache.set('same', i);

      expect(await cache.size()).toBe(1);
      expect(await cache.get('same')).toBe(4);
    });

    it('过期后不可读', async () => {
      const cache = createEdgeCache();
      await cache.set('short', 'v', { ttl: 1 });
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(await cache.get('short')).toBeNull();
      expect(await cache.has('short')).toBe(false);
    });
  });

  describe('响应辅助工具', () => {
    it('jsonResponse 返回真正的 Response', async () => {
      const response = jsonResponse({ data: 'test' });
      expect(response).toBeInstanceOf(Response);
      expect(response.headers.get('content-type')).toBe('application/json');
      expect(await response.json()).toEqual({ data: 'test' });
    });

    it('textResponse 返回真正的 Response', () => {
      const response = textResponse('test');
      expect(response).toBeInstanceOf(Response);
      expect(response.headers.get('content-type')).toBe('text/plain');
    });

    it('htmlResponse 返回真正的 Response', () => {
      const response = htmlResponse('<html></html>');
      expect(response).toBeInstanceOf(Response);
      expect(response.headers.get('content-type')).toBe('text/html');
    });

    it('redirectResponse 返回真正的 Response', () => {
      const response = redirectResponse('http://example.com');
      expect(response).toBeInstanceOf(Response);
      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toBe('http://example.com');
    });

    it('textResponse 支持附加响应头（405 的 Allow 用这条）', () => {
      const response = textResponse('nope', 405, { allow: 'GET' });
      expect(response.status).toBe(405);
      expect(response.headers.get('allow')).toBe('GET');
    });
  });
});
