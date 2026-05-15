/**
 * @lytjs/plugin-vite unit tests
 */

import { describe, it, expect } from 'vitest';
// 直接导入构建好的包而不是源文件
const pluginModule = require('../dist/index.cjs');
const lytjs = pluginModule.default;
const { resolveOptions, defaultOptions } = pluginModule;

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
      expect(typeof plugin.resolveId).toBe('function');
      expect(typeof plugin.transform).toBe('function');
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
  });
});
