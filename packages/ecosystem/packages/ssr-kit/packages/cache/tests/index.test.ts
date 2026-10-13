import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryCache, MultiLayerCache, createCache } from '../src';

describe('@lytjs/cache', () => {
  describe('MemoryCache', () => {
    let cache: MemoryCache;

    beforeEach(() => {
      cache = new MemoryCache();
    });

    it('should set and get values', async () => {
      await cache.set('key', 'value');
      const result = await cache.get('key');
      expect(result).toBe('value');
    });

    it('should return undefined for non-existent keys', async () => {
      const result = await cache.get('nonexistent');
      expect(result).toBeUndefined();
    });

    it('should delete values', async () => {
      await cache.set('key', 'value');
      const deleted = await cache.delete('key');
      expect(deleted).toBe(true);
      const result = await cache.get('key');
      expect(result).toBeUndefined();
    });

    it('should check if key exists', async () => {
      await cache.set('key', 'value');
      expect(await cache.has('key')).toBe(true);
      expect(await cache.has('nonexistent')).toBe(false);
    });

    it('should clear all values', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      await cache.clear();
      expect(await cache.has('key1')).toBe(false);
      expect(await cache.has('key2')).toBe(false);
    });

    it('should invalidate by tag', async () => {
      await cache.set('key1', 'value1', { tags: ['tag1'] });
      await cache.set('key2', 'value2', { tags: ['tag1', 'tag2'] });
      await cache.set('key3', 'value3', { tags: ['tag2'] });

      await cache.invalidateTag('tag1');

      expect(await cache.get('key1')).toBeUndefined();
      expect(await cache.get('key2')).toBeUndefined();
      expect(await cache.get('key3')).toBe('value3');
    });

    it('should get stats', async () => {
      await cache.set('key', 'value');
      await cache.get('key');
      await cache.get('nonexistent');

      const stats = await cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0.5);
    });
  });

  describe('MultiLayerCache', () => {
    it('should create multi-layer cache', async () => {
      const cache = new MultiLayerCache();
      await cache.set('key', 'value');
      expect(await cache.get('key')).toBe('value');
    });

    // ============================================================
    // P1-7 回归（2026-10-10）
    //
    // 此前 MultiLayerCacheConfig 声明了 redis / http 两层，但构造函数里
    // 是**空 if 块** ⇒ 配了也只有内存层，且无任何提示。
    // 现在改为 extraLayers（真实可用）。下面用假层验证多层语义。
    // ============================================================
    it('set 应写入所有层（含 extraLayers）', async () => {
      const lower = new MemoryCache();
      const setSpy = vi.spyOn(lower, 'set');
      const cache = new MultiLayerCache({ extraLayers: [lower] });

      await cache.set('k', 'v');

      expect(setSpy).toHaveBeenCalledWith('k', 'v', undefined);
      expect(await lower.get('k')).toBe('v');
    });

    it('下层命中时应回写到上层（read-through 提升）', async () => {
      const lower = new MemoryCache();
      const cache = new MultiLayerCache({ extraLayers: [lower] });
      const memoryLayer = cache.layers[0]!;

      // 只写进下层，模拟「内存层过期但下层仍在」
      await lower.set('k', 'from-lower');
      expect(await memoryLayer.get('k')).toBeUndefined();

      expect(await cache.get('k')).toBe('from-lower');
      // 回写生效
      expect(await memoryLayer.get('k')).toBe('from-lower');
    });

    it('memory:false + extraLayers 时只使用自定义层', async () => {
      const lower = new MemoryCache();
      const cache = new MultiLayerCache({ memory: false, extraLayers: [lower] });

      await cache.set('k', 'v');
      expect(await cache.get('k')).toBe('v');
      expect(await lower.get('k')).toBe('v');
    });
  });

  describe('createCache', () => {
    it('should create memory cache by default', () => {
      const cache = createCache();
      expect(cache).toBeInstanceOf(MemoryCache);
    });

    it('should create multi-layer cache', () => {
      const cache = createCache({ type: 'multi' });
      expect(cache).toBeInstanceOf(MultiLayerCache);
    });
  });
});
