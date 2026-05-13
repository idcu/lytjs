import { describe, it, expect } from 'vitest';
import { ConfigValidator, validateConfig } from '../src/config-validator';
import type { ConfigSchema } from '../src/config-schema';

describe('ConfigValidator', () => {
  // ==================== 字符串验证 ====================

  describe('字符串验证', () => {
    it('应通过有效字符串', () => {
      const schema: ConfigSchema<string> = { type: 'string' };
      const report = validateConfig('hello', schema);
      expect(report.valid).toBe(true);
    });

    it('应拒绝非字符串', () => {
      const schema: ConfigSchema<string> = { type: 'string' };
      const report = validateConfig(123, schema);
      expect(report.valid).toBe(false);
      expect(report.errors[0]!.code).toBe('type_error');
    });

    it('应验证 minLength', () => {
      const schema: ConfigSchema<string> = {
        type: 'string',
        string: { minLength: 5 },
      };
      expect(validateConfig('hi', schema).valid).toBe(false);
      expect(validateConfig('hello', schema).valid).toBe(true);
    });

    it('应验证 maxLength', () => {
      const schema: ConfigSchema<string> = {
        type: 'string',
        string: { maxLength: 3 },
      };
      expect(validateConfig('hello', schema).valid).toBe(false);
      expect(validateConfig('hi', schema).valid).toBe(true);
    });

    it('应验证 pattern', () => {
      const schema: ConfigSchema<string> = {
        type: 'string',
        string: { pattern: '^[a-z]+$' },
      };
      expect(validateConfig('hello', schema).valid).toBe(true);
      expect(validateConfig('Hello', schema).valid).toBe(false);
    });

    it('应验证 email 格式', () => {
      const schema: ConfigSchema<string> = {
        type: 'string',
        string: { format: 'email' },
      };
      expect(validateConfig('test@example.com', schema).valid).toBe(true);
      expect(validateConfig('invalid-email', schema).valid).toBe(false);
    });

    it('应验证 semver 格式', () => {
      const schema: ConfigSchema<string> = {
        type: 'string',
        string: { format: 'semver' },
      };
      expect(validateConfig('1.0.0', schema).valid).toBe(true);
      expect(validateConfig('1.0.0-beta.1', schema).valid).toBe(true);
      expect(validateConfig('v1.0.0', schema).valid).toBe(false);
    });

    it('应验证枚举值', () => {
      const schema: ConfigSchema<string> = {
        type: 'string',
        string: { enum: ['red', 'green', 'blue'] },
      };
      expect(validateConfig('red', schema).valid).toBe(true);
      expect(validateConfig('yellow', schema).valid).toBe(false);
    });
  });

  // ==================== 数字验证 ====================

  describe('数字验证', () => {
    it('应通过有效数字', () => {
      const schema: ConfigSchema<number> = { type: 'number' };
      expect(validateConfig(42, schema).valid).toBe(true);
    });

    it('应拒绝非数字', () => {
      const schema: ConfigSchema<number> = { type: 'number' };
      expect(validateConfig('42', schema).valid).toBe(false);
    });

    it('应拒绝 NaN', () => {
      const schema: ConfigSchema<number> = { type: 'number' };
      expect(validateConfig(NaN, schema).valid).toBe(false);
    });

    it('应验证 minimum', () => {
      const schema: ConfigSchema<number> = {
        type: 'number',
        number: { minimum: 10 },
      };
      expect(validateConfig(15, schema).valid).toBe(true);
      expect(validateConfig(5, schema).valid).toBe(false);
    });

    it('应验证 maximum', () => {
      const schema: ConfigSchema<number> = {
        type: 'number',
        number: { maximum: 100 },
      };
      expect(validateConfig(50, schema).valid).toBe(true);
      expect(validateConfig(150, schema).valid).toBe(false);
    });

    it('应验证 integer', () => {
      const schema: ConfigSchema<number> = {
        type: 'number',
        number: { integer: true },
      };
      expect(validateConfig(42, schema).valid).toBe(true);
      expect(validateConfig(3.14, schema).valid).toBe(false);
    });

    it('应验证数字枚举', () => {
      const schema: ConfigSchema<number> = {
        type: 'number',
        number: { enum: [1, 2, 3] },
      };
      expect(validateConfig(2, schema).valid).toBe(true);
      expect(validateConfig(4, schema).valid).toBe(false);
    });
  });

  // ==================== 布尔验证 ====================

  describe('布尔验证', () => {
    it('应通过有效布尔值', () => {
      const schema: ConfigSchema<boolean> = { type: 'boolean' };
      expect(validateConfig(true, schema).valid).toBe(true);
      expect(validateConfig(false, schema).valid).toBe(true);
    });

    it('应拒绝非布尔值', () => {
      const schema: ConfigSchema<boolean> = { type: 'boolean' };
      expect(validateConfig(1, schema).valid).toBe(false);
      expect(validateConfig('true', schema).valid).toBe(false);
    });
  });

  // ==================== 对象验证 ====================

  describe('对象验证', () => {
    it('应通过有效对象', () => {
      const schema: ConfigSchema<object> = { type: 'object' };
      expect(validateConfig({ name: 'John' }, schema).valid).toBe(true);
    });

    it('应拒绝非对象', () => {
      const schema: ConfigSchema<object> = { type: 'object' };
      expect(validateConfig('{}', schema).valid).toBe(false);
      expect(validateConfig([], schema).valid).toBe(false);
    });

    it('应验证对象属性类型', () => {
      const schema: ConfigSchema<{ name: string }> = {
        type: 'object',
        object: {
          properties: {
            name: { type: 'string' },
          },
        },
      };
      expect(validateConfig({ name: 'John' }, schema).valid).toBe(true);
      expect(validateConfig({ name: 123 }, schema).valid).toBe(false);
    });
  });

  // ==================== 数组验证 ====================

  describe('数组验证', () => {
    it('应通过有效数组', () => {
      const schema: ConfigSchema<unknown[]> = { type: 'array' };
      expect(validateConfig([1, 2, 3], schema).valid).toBe(true);
    });

    it('应拒绝非数组', () => {
      const schema: ConfigSchema<unknown[]> = { type: 'array' };
      expect(validateConfig('abc', schema).valid).toBe(false);
    });

    it('应验证 uniqueItems', () => {
      const schema: ConfigSchema<number[]> = {
        type: 'array',
        array: { uniqueItems: true },
      };
      expect(validateConfig([1, 2, 3], schema).valid).toBe(true);
      expect(validateConfig([1, 2, 2], schema).valid).toBe(false);
    });
  });

  // ==================== 自定义验证 ====================

  describe('自定义验证', () => {
    it('应支持自定义验证函数', () => {
      const schema: ConfigSchema<number> = {
        type: 'number',
        validate: (_value, _context) => {
          return { valid: true };
        },
      };
      expect(validateConfig(10, schema).valid).toBe(true);
    });

    it('应支持 addRule', () => {
      const validator = new ConfigValidator();
      validator.addRule((value, schema, _context) => {
        if (schema.type === 'string' && typeof value === 'string' && value.length > 10) {
          return { path: '', code: 'custom_error', message: 'Too long' };
        }
        return null;
      });

      const schema: ConfigSchema<string> = { type: 'string' };
      expect(validator.validate('short', schema).valid).toBe(true);
      expect(validator.validate('this is very long string', schema).valid).toBe(false);
    });
  });

  // ==================== null/undefined 处理 ====================

  describe('null/undefined 处理', () => {
    it('应处理 null 值', () => {
      const schema: ConfigSchema<null> = {
        type: 'string',
        nullable: true,
      };
      expect(validateConfig(null, schema).valid).toBe(true);
    });

    it('应处理 undefined 值', () => {
      const schema: ConfigSchema<string> = { type: 'string' };
      const report = validateConfig(undefined, schema);
      expect(report.valid).toBe(true); // undefined 默认可接受
    });
  });

  // ==================== 错误报告 ====================

  describe('错误报告', () => {
    it('应正确计算错误数量', () => {
      const schema: ConfigSchema<string> = {
        type: 'string',
        string: { minLength: 10, maxLength: 5 },
      };
      const report = validateConfig('hi', schema);
      expect(report.errorCount).toBeGreaterThanOrEqual(1);
    });
  });
});
