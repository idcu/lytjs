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
});
