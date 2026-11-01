/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createEdgeRouter,
  createEdgeCache,
  jsonResponse,
  textResponse,
  htmlResponse,
  redirectResponse,
} from '../src';

describe('@lytjs/runtime-edge', () => {
  describe('createEdgeRouter', () => {
    it('should create edge router instance', () => {
      const router = createEdgeRouter();
      expect(router).toBeDefined();
    });

    it('should register and match GET routes', async () => {
      const router = createEdgeRouter();
      const handler = async () => jsonResponse({ success: true });
      router.get('/test', handler);

      const match = router.match({
        url: 'http://localhost/test',
        method: 'GET',
        headers: {},
      });
      expect(match).toBeDefined();
    });

    it('should return 404 for non-existent routes', async () => {
      const router = createEdgeRouter();
      const response = await router.handle({
        url: 'http://localhost/non-existent',
        method: 'GET',
        headers: {},
      });
      expect(response.status).toBe(404);
    });
  });

  describe('createEdgeCache', () => {
    it('should create cache instance', () => {
      const cache = createEdgeCache();
      expect(cache).toBeDefined();
    });

    it('should set and get values', async () => {
      const cache = createEdgeCache();
      await cache.set('key', 'value');
      const value = await cache.get('key');
      expect(value).toBe('value');
    });

    it('should delete values', async () => {
      const cache = createEdgeCache();
      await cache.set('key', 'value');
      await cache.delete('key');
      const value = await cache.get('key');
      expect(value).toBeNull();
    });

    it('should clear all values', async () => {
      const cache = createEdgeCache();
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      await cache.clear();
      expect(await cache.has('key1')).toBe(false);
    });
  });

  describe('response helpers', () => {
    it('should create JSON response', () => {
      const response = jsonResponse({ data: 'test' });
      expect(response.status).toBe(200);
      // ⚠️ 2026-11-02 修：`jsonResponse` 已改为返回**真正的 `Response`**
      //   （2026-10-31 的 P0 修复：鸭子类型对象在 Workers / Deno 上会被序列化成 `{}`），
      //   它的 `headers` 是 `Headers` 实例 —— 只能用 `.get()`，取属性永远是 `undefined`。
      expect(response.headers.get('content-type')).toBe('application/json');
    });

    it('should create text response', () => {
      const response = textResponse('test');
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('text/plain');
    });

    it('should create HTML response', () => {
      const response = htmlResponse('<html></html>');
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('text/html');
    });

    it('should create redirect response', () => {
      const response = redirectResponse('http://example.com');
      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toBe('http://example.com');
    });
  });
});
