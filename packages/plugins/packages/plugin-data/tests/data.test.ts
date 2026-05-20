 
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createData, createDataManager, TTLCache, LRUCache, generateCacheKey } from '../src';

describe('@lytjs/plugin-data', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('TTLCache', () => {
    it('should store and retrieve cache entries', () => {
      const cache = new TTLCache();
      const entry = { data: { test: true }, createdAt: Date.now(), expiresAt: Date.now() + 10000 };
      cache.set('key1', entry);
      expect(cache.get('key1')).toEqual(entry);
    });

    it('should return null for expired cache', async () => {
      const cache = new TTLCache();
      const entry = { data: { test: true }, createdAt: Date.now(), expiresAt: Date.now() - 1000 };
      cache.set('key1', entry);
      expect(cache.get('key1')).toBeNull();
    });

    it('should delete cache entries', () => {
      const cache = new TTLCache();
      cache.set('key1', { data: {}, createdAt: Date.now(), expiresAt: Date.now() + 1000 });
      expect(cache.has('key1')).toBe(true);
      cache.delete('key1');
      expect(cache.has('key1')).toBe(false);
    });

    it('should clear all cache', () => {
      const cache = new TTLCache();
      cache.set('key1', { data: {}, createdAt: Date.now(), expiresAt: Date.now() + 1000 });
      cache.set('key2', { data: {}, createdAt: Date.now(), expiresAt: Date.now() + 1000 });
      cache.clear();
      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key2')).toBe(false);
    });

    it('should return correct size', () => {
      const cache = new TTLCache();
      cache.set('key1', { data: {}, createdAt: Date.now(), expiresAt: Date.now() + 1000 });
      cache.set('key2', { data: {}, createdAt: Date.now(), expiresAt: Date.now() + 1000 });
      expect(cache.size()).toBe(2);
    });
  });

  describe('LRUCache', () => {
    it('should store and retrieve cache entries', () => {
      const cache = new LRUCache(10);
      const entry = { data: { test: true }, createdAt: Date.now(), expiresAt: Date.now() + 10000 };
      cache.set('key1', entry);
      expect(cache.get('key1')).toMatchObject(entry);
    });

    it('should evict oldest entries when exceeding max size', () => {
      const cache = new LRUCache(3);
      cache.set('key1', { data: { id: 1 }, createdAt: Date.now(), expiresAt: Date.now() + 10000 });
      cache.set('key2', { data: { id: 2 }, createdAt: Date.now(), expiresAt: Date.now() + 10000 });
      cache.set('key3', { data: { id: 3 }, createdAt: Date.now(), expiresAt: Date.now() + 10000 });
      cache.set('key4', { data: { id: 4 }, createdAt: Date.now(), expiresAt: Date.now() + 10000 });

      expect(cache.size()).toBe(3);
      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key4')).toBe(true);
    });

    it('should update access time and keep most recently used', () => {
      const cache = new LRUCache(3);
      cache.set('key1', { data: { id: 1 }, createdAt: Date.now(), expiresAt: Date.now() + 10000 });
      cache.set('key2', { data: { id: 2 }, createdAt: Date.now(), expiresAt: Date.now() + 10000 });
      cache.set('key3', { data: { id: 3 }, createdAt: Date.now(), expiresAt: Date.now() + 10000 });
      cache.get('key1');
      cache.set('key4', { data: { id: 4 }, createdAt: Date.now(), expiresAt: Date.now() + 10000 });

      expect(cache.has('key1')).toBe(true);
    });
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

  describe('createData', () => {
    it('should create data instance', () => {
      const instance = createData('https://api.example.com');
      expect(instance).toBeDefined();
      expect(instance.fetch).toBeDefined();
      expect(instance.refetch).toBeDefined();
      expect(instance.cancel).toBeDefined();
      expect(instance.optimisticUpdate).toBeDefined();
      expect(instance.rollbackOptimistic).toBeDefined();
    });

    it('should perform optimistic update', () => {
      const instance = createData('https://api.example.com');
      expect(instance.state.data).toBeNull();
      instance.optimisticUpdate({ success: true });
      expect(instance.state.data).toEqual({ success: true });
    });

    it('should rollback optimistic update', () => {
      const instance = createData('https://api.example.com');
      instance.setData({ original: true });
      instance.optimisticUpdate({ optimistic: true });
      expect(instance.state.data).toEqual({ optimistic: true });
      instance.rollbackOptimistic();
      expect(instance.state.data).toEqual({ original: true });
    });
  });

  describe('createDataManager', () => {
    it('should create data manager', () => {
      const manager = createDataManager();
      expect(manager).toBeDefined();
      expect(manager.createData).toBeDefined();
      expect(manager.get).toBeDefined();
      expect(manager.post).toBeDefined();
      expect(manager.put).toBeDefined();
      expect(manager.delete).toBeDefined();
      expect(manager.prefetch).toBeDefined();
      expect(manager.cancelAllRequests).toBeDefined();
      expect(manager.getPendingRequests).toBeDefined();
    });

    it('should handle cache operations', () => {
      const manager = createDataManager();
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
    });
  });
});
