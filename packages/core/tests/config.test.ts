import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ConfigManager,
  getGlobalConfig,
  setGlobalConfig,
  getConfig,
  setConfig,
  watchConfig,
  configPresets,
  applyConfigPreset,
} from '../src/config';

describe('Config System', () => {
  describe('ConfigManager', () => {
    it('should create with initial config', () => {
      const config = new ConfigManager({ api: { baseURL: '/api' } });
      expect(config.get('api.baseURL')).toBe('/api');
    });

    it('should get nested values', () => {
      const config = new ConfigManager({
        api: { baseURL: '/api', timeout: 5000 },
      });
      expect(config.get('api.timeout')).toBe(5000);
    });

    it('should return default value for non-existent key', () => {
      const config = new ConfigManager({});
      expect(config.get('missing', 'default')).toBe('default');
    });

    it('should set values', () => {
      const config = new ConfigManager({});
      config.set('key', 'value');
      expect(config.get('key')).toBe('value');
    });

    it('should set nested values', () => {
      const config = new ConfigManager({});
      config.set('api.baseURL', '/api/v2');
      expect(config.get('api.baseURL')).toBe('/api/v2');
    });

    it('should check if key exists', () => {
      const config = new ConfigManager({ key: 'value' });
      expect(config.has('key')).toBe(true);
      expect(config.has('missing')).toBe(false);
    });

    it('should delete values', () => {
      const config = new ConfigManager({ key: 'value' });
      expect(config.delete('key')).toBe(true);
      expect(config.has('key')).toBe(false);
    });

    it('should merge configs', () => {
      const config = new ConfigManager({ a: 1, b: { c: 2 } });
      config.merge({ b: { d: 3 }, e: 4 });
      expect(config.get('a')).toBe(1);
      expect(config.get('b.c')).toBe(2);
      expect(config.get('b.d')).toBe(3);
      expect(config.get('e')).toBe(4);
    });

    it('should get all config', () => {
      const config = new ConfigManager({ key: 'value' });
      const all = config.getAll();
      expect(all).toEqual({ key: 'value' });
      // Should be a clone
      all.key = 'modified';
      expect(config.get('key')).toBe('value');
    });

    it('should reset config', () => {
      const config = new ConfigManager({ key: 'value' });
      config.reset({ newKey: 'newValue' });
      expect(config.has('key')).toBe(false);
      expect(config.get('newKey')).toBe('newValue');
    });

    it('should clear config', () => {
      const config = new ConfigManager({ key: 'value' });
      config.clear();
      expect(config.getAll()).toEqual({});
    });

    it('should watch for changes', () => {
      const config = new ConfigManager({});
      const callback = vi.fn();
      const unwatch = config.watch('key', callback);

      config.set('key', 'value');
      expect(callback).toHaveBeenCalledWith('value', undefined, 'key');

      unwatch();
      config.set('key', 'newValue');
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should watch all changes with empty path', () => {
      const config = new ConfigManager({});
      const callback = vi.fn();
      config.watch('', callback);

      config.set('key', 'value');
      expect(callback).toHaveBeenCalled();
    });

    it('should set mutable option', () => {
      const config = new ConfigManager({});
      config.setMutable(false);
      expect(config.isMutable()).toBe(false);
      expect(config.set('key', 'value')).toBe(false);
    });

    it('should set multiple values', () => {
      const config = new ConfigManager({});
      config.setMultiple({
        'a.b': 1,
        'c.d': 2,
      });
      expect(config.get('a.b')).toBe(1);
      expect(config.get('c.d')).toBe(2);
    });
  });

  describe('Global Config', () => {
    beforeEach(() => {
      // Reset global config before each test
      setGlobalConfig({}, false);
    });

    it('should get global config manager', () => {
      const config = getGlobalConfig();
      expect(config).toBeInstanceOf(ConfigManager);
    });

    it('should set global config', () => {
      setGlobalConfig({ test: 'value' });
      expect(getConfig('test')).toBe('value');
    });

    it('should get global config value', () => {
      setGlobalConfig({ key: 'value' });
      expect(getConfig('key')).toBe('value');
    });

    it('should set global config value', () => {
      setConfig('key', 'value');
      expect(getConfig('key')).toBe('value');
    });

    it('should watch global config', () => {
      const callback = vi.fn();
      const unwatch = watchConfig('key', callback);

      setConfig('key', 'value');
      expect(callback).toHaveBeenCalled();

      unwatch();
    });
  });

  describe('Config Presets', () => {
    beforeEach(() => {
      setGlobalConfig({}, false);
    });

    it('should apply development preset', () => {
      applyConfigPreset('development');
      expect(getConfig('dev.logLevel')).toBe('debug');
      expect(getConfig('compiler.optimize')).toBe(false);
    });

    it('should apply production preset', () => {
      applyConfigPreset('production');
      expect(getConfig('dev.logLevel')).toBe('error');
      expect(getConfig('compiler.optimize')).toBe(true);
    });

    it('should apply test preset', () => {
      applyConfigPreset('test');
      expect(getConfig('dev.logLevel')).toBe('silent');
      expect(getConfig('performance.transitionDuration')).toBe(0);
    });
  });

  // === 新增测试用例 ===

  describe('ConfigManager 边界情况', () => {
    it('should handle deeply nested paths', () => {
      const config = new ConfigManager({
        a: { b: { c: { d: { e: 'deep' } } } },
      });
      expect(config.get('a.b.c.d.e')).toBe('deep');
    });

    it('should handle non-existent nested path', () => {
      const config = new ConfigManager({ a: { b: 1 } });
      expect(config.get('a.b.c', 'fallback')).toBe('fallback');
    });

    it('should create intermediate objects when setting nested values', () => {
      const config = new ConfigManager({});
      config.set('a.b.c', 'value');
      expect(config.get('a.b.c')).toBe('value');
    });

    it('should handle empty string key', () => {
      const config = new ConfigManager({ '': 'empty' });
      expect(config.get('')).toBe('empty');
    });

    it('should handle null value', () => {
      const config = new ConfigManager({ key: null });
      expect(config.get('key')).toBeNull();
    });

    it('should handle undefined value', () => {
      const config = new ConfigManager({ key: undefined });
      expect(config.get('key')).toBeUndefined();
    });

    it('should handle boolean false value', () => {
      const config = new ConfigManager({ enabled: false });
      expect(config.get('enabled')).toBe(false);
    });

    it('should handle number zero value', () => {
      const config = new ConfigManager({ count: 0 });
      expect(config.get('count')).toBe(0);
    });
  });

  describe('ConfigManager watch 高级用例', () => {
    it('should call callback only when value changes', () => {
      const config = new ConfigManager({ key: 'initial' });
      const callback = vi.fn();
      config.watch('key', callback);

      config.set('key', 'initial'); // 相同值
      expect(callback).not.toHaveBeenCalled();

      config.set('key', 'changed'); // 不同值
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should support multiple watchers on same key', () => {
      const config = new ConfigManager({});
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      config.watch('key', callback1);
      config.watch('key', callback2);

      config.set('key', 'value');
      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    it('should not notify after unwatch', () => {
      const config = new ConfigManager({});
      const callback = vi.fn();
      const unwatch = config.watch('key', callback);

      unwatch();
      config.set('key', 'value');
      expect(callback).not.toHaveBeenCalled();
    });

    it('should watch nested object changes', () => {
      const config = new ConfigManager({ user: { name: 'Alice' } });
      const callback = vi.fn();
      config.watch('user.name', callback);

      config.set('user.name', 'Bob');
      expect(callback).toHaveBeenCalledWith('Bob', 'Alice', 'user.name');
    });
  });

  describe('ConfigManager merge 高级用例', () => {
    it('should deep merge nested objects', () => {
      const config = new ConfigManager({
        a: { b: { c: 1, d: 2 } },
      });
      config.merge({ a: { b: { d: 3, e: 4 } } });
      expect(config.get('a.b.c')).toBe(1);
      expect(config.get('a.b.d')).toBe(3);
      expect(config.get('a.b.e')).toBe(4);
    });

    it('should replace non-object values', () => {
      const config = new ConfigManager({ a: 1 });
      config.merge({ a: { b: 2 } });
      expect(config.get('a.b')).toBe(2);
    });

    it('should merge with empty object', () => {
      const config = new ConfigManager({ key: 'value' });
      config.merge({});
      expect(config.get('key')).toBe('value');
    });
  });

  describe('ConfigManager setMultiple', () => {
    it('should set multiple values at once', () => {
      const config = new ConfigManager({});
      config.setMultiple({
        'a.b': 1,
        'c.d': 2,
        'e': 3,
      });
      expect(config.get('a.b')).toBe(1);
      expect(config.get('c.d')).toBe(2);
      expect(config.get('e')).toBe(3);
    });

    it('should handle empty object', () => {
      const config = new ConfigManager({ key: 'value' });
      config.setMultiple({});
      expect(config.get('key')).toBe('value');
    });
  });

  describe('ConfigManager delete', () => {
    it('should return false for non-existent key', () => {
      const config = new ConfigManager({});
      expect(config.delete('missing')).toBe(false);
    });

    it('should delete nested values', () => {
      const config = new ConfigManager({ a: { b: { c: 1 } } });
      config.delete('a.b.c');
      expect(config.has('a.b.c')).toBe(false);
      expect(config.has('a.b')).toBe(true);
    });
  });

  describe('ConfigManager reset', () => {
    it('should clear all watchers after reset', () => {
      const config = new ConfigManager({ key: 'value' });
      const callback = vi.fn();
      config.watch('key', callback);

      config.reset({ newKey: 'newValue' });
      config.set('newKey', 'updated');
      // reset 后应该清除所有 watcher
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('ConfigManager isMutable', () => {
    it('should default to mutable', () => {
      const config = new ConfigManager({});
      expect(config.isMutable()).toBe(true);
    });

    it('should prevent all mutations when immutable', () => {
      const config = new ConfigManager({});
      config.setMutable(false);

      expect(config.set('key', 'value')).toBe(false);
      expect(config.delete('key')).toBe(false);
      expect(config.merge({ key: 'value' })).toBe(false);
    });
  });

  describe('Global Config 边界情况', () => {
    beforeEach(() => {
      setGlobalConfig({}, false);
    });

    it('should return undefined for non-existent key', () => {
      expect(getConfig('nonexistent')).toBeUndefined();
    });

    it('should return default value for non-existent key', () => {
      expect(getConfig('nonexistent', 'default')).toBe('default');
    });

    it('should support watching non-existent key', () => {
      const callback = vi.fn();
      const unwatch = watchConfig('future-key', callback);

      setConfig('future-key', 'value');
      expect(callback).toHaveBeenCalled();

      unwatch();
    });

    it('should persist config across setGlobalConfig calls', () => {
      setGlobalConfig({ initial: 'value' });
      expect(getConfig('initial')).toBe('value');

      setGlobalConfig({ updated: 'value' });
      expect(getConfig('initial')).toBeUndefined();
      expect(getConfig('updated')).toBe('value');
    });
  });

  describe('Config Presets 边界情况', () => {
    beforeEach(() => {
      setGlobalConfig({}, false);
    });

    it('should throw error for invalid preset', () => {
      expect(() => applyConfigPreset('invalid' as any)).toThrow();
    });

    it('should override existing config when applying preset', () => {
      setConfig('dev.logLevel', 'info');
      applyConfigPreset('development');
      expect(getConfig('dev.logLevel')).toBe('debug');
    });

    it('should preserve unrelated config when applying preset', () => {
      setConfig('custom.key', 'value');
      applyConfigPreset('development');
      expect(getConfig('custom.key')).toBe('value');
    });
  });
});
