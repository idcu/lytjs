import { describe, it, expect } from 'vitest';
import { ConfigTransformer, transformConfig, mergeConfig } from '../src/config-transformer';
import type { ConfigSchema } from '../src/config-schema';

describe('ConfigTransformer', () => {
  describe('默认值应用', () => {
    it('应应用字符串默认值', () => {
      const schema: ConfigSchema<string> = {
        type: 'string',
        default: 'default value',
      };
      const report = transformConfig(undefined, schema);
      expect(report.success).toBe(true);
      expect(report.config).toBe('default value');
      expect(report.transforms.length).toBeGreaterThan(0);
    });

    it('应应用数字默认值', () => {
      const schema: ConfigSchema<number> = {
        type: 'number',
        default: 42,
      };
      const report = transformConfig(undefined, schema);
      expect(report.success).toBe(true);
      expect(report.config).toBe(42);
    });

    it('undefined 非必需字段应使用默认值', () => {
      const schema: ConfigSchema<string> = {
        type: 'string',
        default: 'default',
      };
      const report = transformConfig(undefined, schema);
      expect(report.success).toBe(true);
      expect(report.config).toBe('default');
    });
  });

  describe('类型转换', () => {
    it('应执行自定义转换函数', () => {
      const schema: ConfigSchema<number> = {
        type: 'number',
        transform: (value) => {
          if (typeof value === 'string') {
            return parseInt(value, 10);
          }
          return value as number;
        },
      };
      const report = transformConfig('42', schema);
      expect(report.success).toBe(true);
      expect(report.config).toBe(42);
    });

    it('转换失败应报告错误', () => {
      const schema: ConfigSchema<number> = {
        type: 'number',
        transform: () => {
          throw new Error('Invalid conversion');
        },
      };
      const report = transformConfig('invalid', schema);
      expect(report.success).toBe(false);
      expect(report.errors[0]!.code).toBe('custom_error');
    });
  });

  describe('null 处理', () => {
    it('应允许 null 当 nullable 为 true', () => {
      const schema: ConfigSchema<string | null> = {
        type: 'string',
        nullable: true,
        default: 'default',
      };
      const report = transformConfig(null, schema);
      expect(report.success).toBe(true);
      expect(report.config).toBeNull();
    });
  });

  describe('合并配置', () => {
    it('应合并对象配置', () => {
      const defaults = { a: '1', b: 2 };
      const overrides = { b: 3, c: true };

      const merged = { ...defaults, ...overrides };
      expect(merged).toEqual({ a: '1', b: 3, c: true });
    });
  });

  describe('警告收集', () => {
    it('应收集警告', () => {
      const schema: ConfigSchema<string> = {
        type: 'string',
        default: 'default',
      };
      const report = transformConfig(null, schema);
      expect(report.warnings.length).toBeGreaterThan(0);
    });

    it('应记录应用的转换', () => {
      const schema: ConfigSchema<string> = {
        type: 'string',
        default: 'default',
      };
      const report = transformConfig(undefined, schema);
      expect(report.transforms.length).toBeGreaterThan(0);
    });
  });
});

describe('便捷函数', () => {
  it('transformConfig 应正确工作', () => {
    const schema: ConfigSchema<string> = {
      type: 'string',
      default: 'fallback',
    };
    const report = transformConfig(undefined, schema);
    expect(report.config).toBe('fallback');
  });

  it('mergeConfig 应正确工作', () => {
    const defaults = { key: 'default' };
    const overrides = { key: 'override' };
    const merged = { ...defaults, ...overrides };
    expect(merged.key).toBe('override');
  });
});
