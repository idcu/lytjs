 
import { describe, it, expect } from 'vitest';
import { definePlugin, validatePluginConfig, transformPluginConfig } from '../src/plugin-sdk';
import type { EnhancedPlugin } from '../src/types';
import type { ConfigSchema } from '../src/config-schema';

describe('definePlugin', () => {
  describe('基础功能', () => {
    it('应创建带有基本属性的插件', () => {
      const plugin = definePlugin({
        name: 'test-plugin',
        version: '1.0.0',
        description: 'A test plugin',
        install: () => {},
      });

      expect(plugin.name).toBe('test-plugin');
      expect(plugin.version).toBe('1.0.0');
      expect(plugin.meta?.description).toBe('A test plugin');
      expect(typeof plugin.install).toBe('function');
    });

    it('应正确设置元数据', () => {
      const plugin = definePlugin({
        name: 'test-plugin',
        author: 'Test Author',
        keywords: ['test', 'plugin'],
        install: () => {},
      });

      expect(plugin.meta?.author).toBe('Test Author');
      expect(plugin.meta?.keywords).toEqual(['test', 'plugin']);
    });
  });

  describe('配置 Schema', () => {
    it('应支持配置 Schema', () => {
      const schema: ConfigSchema = {
        type: 'object',
        properties: {
          debug: {
            type: 'boolean',
            default: false,
          },
        },
      };

      const plugin = definePlugin({
        name: 'test-plugin',
        schema,
        install: () => {},
      });

      expect(plugin.configSchema).toBe(schema);
    });

    it('配置 Schema 应允许有效配置', () => {
      const plugin = definePlugin({
        name: 'test',
        schema: {
          type: 'object',
          properties: {
            debug: { type: 'boolean' },
          },
        },
        install: () => {},
      });

      const report = validatePluginConfig(plugin, { debug: true });
      expect(report.valid).toBe(true);
    });

    it('无 Schema 时应允许任意配置', () => {
      const plugin = definePlugin({
        name: 'test',
        install: () => {},
      });

      const report = validatePluginConfig(plugin, { any: 'config' });
      expect(report.valid).toBe(true);
    });
  });

  describe('类型安全', () => {
    it('应正确推断选项类型', () => {
      const plugin = definePlugin({
        name: 'test-plugin',
        schema: {
          type: 'object',
          properties: {
            theme: {
              type: 'string',
              string: { enum: ['light', 'dark'] },
              default: 'light',
            },
          },
        },
        install: () => {},
      });

      expect(plugin.name).toBe('test-plugin');
      expect(plugin.configSchema).toBeDefined();
    });

    it('应允许泛型选项', () => {
      const plugin = definePlugin<{ value: string }>({
        name: 'test-plugin',
        install: () => {},
      });

      expect(plugin.name).toBe('test-plugin');
    });
  });
});

describe('validatePluginConfig', () => {
  it('无 Schema 时应返回有效', () => {
    const plugin: EnhancedPlugin = {
      name: 'test',
      install: () => {},
    };

    const report = validatePluginConfig(plugin, { any: 'config' });
    expect(report.valid).toBe(true);
  });

  it('应验证布尔配置', () => {
    const plugin = definePlugin({
      name: 'test',
      schema: {
        type: 'object',
        properties: {
          debug: { type: 'boolean' },
        },
      },
      install: () => {},
    });

    expect(validatePluginConfig(plugin, { debug: true }).valid).toBe(true);
    expect(validatePluginConfig(plugin, { debug: false }).valid).toBe(true);
  });
});

describe('transformPluginConfig', () => {
  it('无 Schema 时应直接返回配置', () => {
    const plugin: EnhancedPlugin = {
      name: 'test',
      install: () => {},
    };

    const report = transformPluginConfig(plugin, { any: 'config' });
    expect(report.success).toBe(true);
    expect(report.config).toEqual({ any: 'config' });
  });

  it('应处理空配置', () => {
    const plugin = definePlugin({
      name: 'test',
      schema: {
        type: 'object',
        properties: {
          debug: { type: 'boolean', default: false },
        },
      },
      install: () => {},
    });

    const report = transformPluginConfig(plugin, {});
    expect(report.success).toBe(true);
  });
});
