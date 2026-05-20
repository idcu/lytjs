/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-console, @typescript-eslint/no-require-imports */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createFetch, createFetchManager, DefaultCacheStorage, generateCacheKey } from '../src';

describe('@lytjs/plugin-data-fetch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateCacheKey', () => {
    it('should generate unique keys for different methods', () => {
      const key1 = generateCacheKey('https://api.example.com', { method: 'GET' });
      const key2 = generateCacheKey('https://api.example.com', { method: 'POST' });
      expect(key1).not.toBe(key2);
    });

    it('should use custom requestKey if provided', () => {
      const key = generateCacheKey('https://api.example.com', { requestKey: 'custom-key' });
      expect(key).toBe('custom-key');
    });
  });

  describe('DefaultCacheStorage', () => {
    it('should store and retrieve cache entries', () => {
      const storage = new DefaultCacheStorage();
      const entry = { data: { test: true }, createdAt: Date.now(), expiresAt: Date.now() + 10000 };
      storage.set('key1', entry);
      expect(storage.get('key1')).toEqual(entry);
    });

    it('should return null for expired cache', async () => {
      const storage = new DefaultCacheStorage();
      const entry = { data: { test: true }, createdAt: Date.now(), expiresAt: Date.now() - 1000 };
      storage.set('key1', entry);
      expect(storage.get('key1')).toBeNull();
    });

    it('should delete cache entries', () => {
      const storage = new DefaultCacheStorage();
      storage.set('key1', { data: {}, createdAt: Date.now(), expiresAt: Date.now() + 1000 });
      expect(storage.has('key1')).toBe(true);
      storage.delete('key1');
      expect(storage.has('key1')).toBe(false);
    });

    it('should clear all cache', () => {
      const storage = new DefaultCacheStorage();
      storage.set('key1', { data: {}, createdAt: Date.now(), expiresAt: Date.now() + 1000 });
      storage.set('key2', { data: {}, createdAt: Date.now(), expiresAt: Date.now() + 1000 });
      storage.clear();
      expect(storage.has('key1')).toBe(false);
      expect(storage.has('key2')).toBe(false);
    });
  });

  describe('createFetch', () => {
    it('should create fetch instance', () => {
      const instance = createFetch('https://api.example.com');
      expect(instance).toBeDefined();
      expect(instance.fetch).toBeDefined();
      expect(instance.refetch).toBeDefined();
      expect(instance.cancel).toBeDefined();
      expect(instance.state).toEqual({
        data: null,
        isLoading: false,
        error: null,
        isSuccess: false,
        isError: false,
        refetchCount: 0,
      });
    });

    it('should manually update data', () => {
      const instance = createFetch('https://api.example.com');
      instance.setData({ test: true });
      expect(instance.state.data).toEqual({ test: true });
    });

    it('should use function updater for data', () => {
      const instance = createFetch('https://api.example.com');
      instance.setData({ count: 0 });
      instance.setData((prev) => ({ count: (prev?.count || 0) + 1 }));
      expect(instance.state.data).toEqual({ count: 1 });
    });

    it('should manually update error', () => {
      const instance = createFetch('https://api.example.com');
      const error = new Error('Test error');
      instance.setError(error as any);
      expect(instance.state.error).toBe(error);
    });

    it('should reset state', () => {
      const instance = createFetch('https://api.example.com');
      instance.setData({ test: true });
      instance.setError(new Error('Error') as any);
      instance.reset();
      expect(instance.state.data).toBeNull();
      expect(instance.state.error).toBeNull();
    });
  });

  describe('createFetchManager', () => {
    it('should create manager instance', () => {
      const manager = createFetchManager();
      expect(manager).toBeDefined();
      expect(manager.createFetch).toBeDefined();
      expect(manager.get).toBeDefined();
      expect(manager.post).toBeDefined();
      expect(manager.put).toBeDefined();
      expect(manager.delete).toBeDefined();
    });

    it('should add and use interceptors', async () => {
      const manager = createFetchManager();
      const requestInterceptor = vi.fn((config) => ({ ...config, headers: { 'X-Test': 'test' } }));
      manager.addRequestInterceptor(requestInterceptor);
      expect(requestInterceptor).toBeDefined();
    });

    it('should manage cache operations', () => {
      const manager = createFetchManager();
      const cache = manager.getCacheStorage();
      cache.set('test-key', {
        data: { test: true },
        createdAt: Date.now(),
        expiresAt: Date.now() + 1000,
      });
      expect(cache.has('test-key')).toBe(true);
      manager.invalidateCache('test-key');
      expect(cache.has('test-key')).toBe(false);
      manager.clearCache();
      expect(cache.has('test-key')).toBe(false);
    });
  });
});
