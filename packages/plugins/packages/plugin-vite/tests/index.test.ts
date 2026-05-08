/**
 * @lytjs/plugin-vite unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import lytjs, { resolveOptions, defaultOptions } from '../src/index';
import { createFilter, normalizePath, generateScopeId } from '../src/utils';
import { validateOptions } from '../src/options';

describe('@lytjs/plugin-vite', () => {
  describe('plugin creation', () => {
    it('should create a Vite plugin with default options', () => {
      const plugin = lytjs();
      expect(plugin).toBeDefined();
      expect(plugin.name).toBe('@lytjs/plugin-vite');
      expect(plugin.enforce).toBe('pre');
    });

    it('should accept custom options', () => {
      const plugin = lytjs({
        include: [/\.custom$/],
        ssr: true,
        signalMode: true,
      });
      expect(plugin).toBeDefined();
    });

    it('should have required plugin hooks', () => {
      const plugin = lytjs();
      expect(typeof plugin.config).toBe('function');
      expect(typeof plugin.configResolved).toBe('function');
      expect(typeof plugin.resolveId).toBe('function');
      expect(typeof plugin.transform).toBe('function');
      expect(typeof plugin.handleHotUpdate).toBe('function');
    });
  });

  describe('config hook', () => {
    it('should return config object', () => {
      const plugin = lytjs();
      const config = (plugin.config as Function)({}, { mode: 'development' });
      expect(config).toHaveProperty('esbuild');
      expect(config).toHaveProperty('optimizeDeps');
    });

    it('should detect production mode', () => {
      const plugin = lytjs();
      const config = (plugin.config as Function)({}, { mode: 'production' });
      expect(config).toBeDefined();
    });
  });

  describe('resolveId hook', () => {
    it('should resolve .lyt files', () => {
      const plugin = lytjs();
      const result = (plugin.resolveId as Function)('Component.lyt');
      expect(result).toBe('Component.lyt');
    });

    it('should not resolve non-lyt files', () => {
      const plugin = lytjs();
      const result = (plugin.resolveId as Function)('Component.js');
      expect(result).toBeNull();
    });

    it('should respect exclude patterns', () => {
      const plugin = lytjs({ exclude: [/node_modules/] });
      const result = (plugin.resolveId as Function)('node_modules/Component.lyt');
      expect(result).toBeNull();
    });
  });

  describe('transform hook', () => {
    it('should skip non-matching files', async () => {
      const plugin = lytjs();
      const result = await (plugin.transform as Function)('code', 'file.js');
      expect(result).toBeNull();
    });

    it('should return error component on compilation error in dev', async () => {
      const plugin = lytjs();
      // Mock configResolved to set isProduction = false
      (plugin.configResolved as Function)({ mode: 'development' });

      // Invalid SFC content that will cause parse error
      const invalidCode = '<template><unclosed';
      const result = await (plugin.transform as Function)(invalidCode, 'Test.lyt');

      expect(result).toBeDefined();
      expect(result.code).toContain('ErrorComponent');
    });
  });

  describe('handleHotUpdate hook', () => {
    it('should skip non-matching files', () => {
      const plugin = lytjs();
      const ctx = {
        file: 'file.js',
        modules: [],
        read: () => '',
        server: { ws: { send: vi.fn() } },
      };
      const result = (plugin.handleHotUpdate as Function)?.(ctx);
      expect(result).toBeUndefined();
    });
  });
});

describe('options', () => {
  describe('defaultOptions', () => {
    it('should have correct default values', () => {
      expect(defaultOptions.include).toEqual([/\.lyt$/]);
      expect(defaultOptions.exclude).toEqual([/node_modules/, /\.git/]);
      expect(defaultOptions.ssr).toBe(false);
      expect(defaultOptions.signalMode).toBe(false);
    });
  });

  describe('resolveOptions', () => {
    it('should use defaults when no options provided', () => {
      const options = resolveOptions({});
      expect(options.include).toEqual(defaultOptions.include);
      expect(options.exclude).toEqual(defaultOptions.exclude);
      expect(options.ssr).toBe(defaultOptions.ssr);
      expect(options.signalMode).toBe(defaultOptions.signalMode);
    });

    it('should merge custom options with defaults', () => {
      const options = resolveOptions({ ssr: true });
      expect(options.ssr).toBe(true);
      expect(options.include).toEqual(defaultOptions.include);
    });

    it('should override all defaults when provided', () => {
      const customInclude = [/\.custom$/];
      const customExclude = [/dist/];
      const options = resolveOptions({
        include: customInclude,
        exclude: customExclude,
        ssr: true,
        signalMode: true,
      });
      expect(options.include).toBe(customInclude);
      expect(options.exclude).toBe(customExclude);
      expect(options.ssr).toBe(true);
      expect(options.signalMode).toBe(true);
    });
  });

  describe('validateOptions', () => {
    it('should not throw for valid options', () => {
      expect(() => validateOptions({})).not.toThrow();
      expect(() => validateOptions({ include: /\.lyt$/ })).not.toThrow();
      expect(() => validateOptions({ include: [/\.lyt$/, /\.vue$/] })).not.toThrow();
    });

    it('should throw for invalid include option', () => {
      expect(() => validateOptions({ include: 'invalid' as any })).toThrow(
        'Option "include" must be a RegExp or an array of RegExp'
      );
    });

    it('should throw for invalid exclude option', () => {
      expect(() => validateOptions({ exclude: 123 as any })).toThrow(
        'Option "exclude" must be a RegExp or an array of RegExp'
      );
    });
  });
});

describe('utils', () => {
  describe('createFilter', () => {
    it('should match included patterns', () => {
      const filter = createFilter([/\.lyt$/], []);
      expect(filter('Component.lyt')).toBe(true);
      expect(filter('Component.js')).toBe(false);
    });

    it('should exclude excluded patterns', () => {
      const filter = createFilter([/\.lyt$/], [/node_modules/]);
      expect(filter('Component.lyt')).toBe(true);
      expect(filter('node_modules/Component.lyt')).toBe(false);
    });

    it('should exclude takes precedence over include', () => {
      const filter = createFilter([/\.lyt$/], [/\.lyt$/]);
      expect(filter('Component.lyt')).toBe(false);
    });

    it('should include all when no include patterns', () => {
      const filter = createFilter(undefined, [/node_modules/]);
      expect(filter('Component.lyt')).toBe(true);
      expect(filter('Component.js')).toBe(true);
      expect(filter('node_modules/Component.js')).toBe(false);
    });

    it('should handle single RegExp instead of array', () => {
      const filter = createFilter(/\.lyt$/, /node_modules/);
      expect(filter('Component.lyt')).toBe(true);
      expect(filter('node_modules/Component.lyt')).toBe(false);
    });
  });

  describe('normalizePath', () => {
    it('should normalize Windows paths', () => {
      expect(normalizePath('src\\components\\App.lyt')).toBe('src/components/App.lyt');
    });

    it('should keep Unix paths unchanged', () => {
      expect(normalizePath('src/components/App.lyt')).toBe('src/components/App.lyt');
    });

    it('should handle mixed paths', () => {
      expect(normalizePath('src\\components/App.lyt')).toBe('src/components/App.lyt');
    });
  });

  describe('generateScopeId', () => {
    it('should generate consistent scope IDs', () => {
      const id1 = generateScopeId('Component.lyt');
      const id2 = generateScopeId('Component.lyt');
      expect(id1).toBe(id2);
    });

    it('should generate different IDs for different files', () => {
      const id1 = generateScopeId('Component1.lyt');
      const id2 = generateScopeId('Component2.lyt');
      expect(id1).not.toBe(id2);
    });

    it('should generate valid data-v- IDs', () => {
      const id = generateScopeId('Component.lyt');
      expect(id).toMatch(/^data-v-[a-z0-9]+$/);
    });
  });
});
