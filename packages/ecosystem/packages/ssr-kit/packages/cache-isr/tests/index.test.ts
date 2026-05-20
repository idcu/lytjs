/**
 * @lytjs/cache-isr 测试
 */
import { describe, it, expect } from 'vitest';
import { ISRCache } from '../src';

describe('@lytjs/cache-isr', () => {
  describe('ISRCache', () => {
    it('应该创建 ISR 缓存', () => {
      const cache = new ISRCache();
      expect(cache).toBeInstanceOf(ISRCache);
    });

    it('应该能够设置和获取缓存', () => {
      const cache = new ISRCache();
      cache.set('key', { data: 'test' });
      const value = cache.get('key');
      expect(value).toEqual({ data: 'test' });
    });

    it('应该支持自定义过期时间', () => {
      const cache = new ISRCache({ maxAge: 1000 });
      cache.set('key', { data: 'test' });
      const value = cache.get('key');
      expect(value).not.toBeNull();
    });

    it('应该能够检查缓存是否存在', () => {
      const cache = new ISRCache();
      cache.set('key', { data: 'test' });
      expect(cache.has('key')).toBe(true);
    });

    it('应该能够删除缓存', () => {
      const cache = new ISRCache();
      cache.set('key', { data: 'test' });
      const deleted = cache.delete('key');
      expect(deleted).toBe(true);
      expect(cache.get('key')).toBeNull();
    });
  });
});
