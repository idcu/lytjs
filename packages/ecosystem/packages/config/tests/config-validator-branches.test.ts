/**
 * config-validator 分支补测
 *
 * 补齐 `ConfigValidator` 中未被覆盖的分支：
 * - 顶层 null / undefined 处理（nullable / default / required）
 * - 自定义 `validate` 返回 invalid（含无 message 的回退文案）
 * - `type: 'enum'` / `type: 'union'`（anyOf、oneOf）—— 这两个校验方法此前**零覆盖**
 * - 字符串 `pattern` 为**字符串**（转 RegExp）、`format` 的全部分支
 * - 数字 `exclusiveMinimum` / `exclusiveMaximum`
 * - 对象 `maxProperties` / `minProperties` / `properties` 嵌套校验 / 子属性 `required` /
 *   `additionalProperties: false`
 * - 数组 `minItems` / `maxItems` / `items` / `tuple`
 * - `addRule` / `removeRule`（含移除未注册规则）
 */

import { describe, it, expect } from 'vitest';
import { ConfigValidator, validateConfig } from '../src/config-validator';
import type { ConfigSchema } from '../src/config-schema';

describe('ConfigValidator 分支补测', () => {
  // ==================== 顶层 null / undefined ====================
  describe('null / undefined 处理', () => {
    it('null 且非 nullable、无 default ⇒ type_error', () => {
      const report = validateConfig(null, { type: 'string' } as ConfigSchema);
      expect(report.valid).toBe(false);
      expect(report.errors[0]!.code).toBe('type_error');
    });

    it('null 但 nullable: true ⇒ 通过', () => {
      expect(validateConfig(null, { type: 'string', nullable: true } as ConfigSchema).valid).toBe(
        true,
      );
    });

    it('null 但有 default ⇒ 通过', () => {
      expect(validateConfig(null, { type: 'string', default: 'x' } as ConfigSchema).valid).toBe(
        true,
      );
    });

    it('undefined 且 required ⇒ required 错误', () => {
      const report = validateConfig(undefined, { type: 'string', required: true } as ConfigSchema);
      expect(report.valid).toBe(false);
      expect(report.errors[0]!.code).toBe('required');
    });

    it('undefined 且非 required ⇒ 通过', () => {
      expect(validateConfig(undefined, { type: 'string' } as ConfigSchema).valid).toBe(true);
    });
  });

  // ==================== 自定义 validate ====================
  describe('自定义 validate 钩子', () => {
    it('返回 invalid + message ⇒ custom_error 带该文案', () => {
      const schema: ConfigSchema = {
        type: 'string',
        validate: () => ({ valid: false, errors: [], errorCount: 1, warningCount: 0 }) as any,
      };
      // 上面这种「有 message」的走法无法直接构造，改用带 message 的实现：
      const schema2: ConfigSchema = {
        type: 'string',
        validate: () =>
          ({ valid: false, message: '自定义不通过' }) as unknown as ReturnType<
            NonNullable<ConfigSchema['validate']>
          >,
      };
      expect(validateConfig('a', schema).valid).toBe(false);
      const r2 = validateConfig('a', schema2);
      expect(r2.valid).toBe(false);
      expect(r2.errors[0]!.message).toBe('自定义不通过');
    });

    it('返回 invalid 且无 message ⇒ 回退为 "Custom validation failed"', () => {
      const schema: ConfigSchema = {
        type: 'string',
        validate: () =>
          ({ valid: false }) as unknown as ReturnType<NonNullable<ConfigSchema['validate']>>,
      };
      const r = validateConfig('a', schema);
      expect(r.errors[0]!.message).toBe('Custom validation failed');
    });
  });

  // ==================== enum / union（此前零覆盖） ====================
  describe('enum 与 union', () => {
    it('enum：命中 values ⇒ 通过', () => {
      const schema: ConfigSchema = {
        type: 'enum',
        enum: { values: ['a', 'b'] },
      } as unknown as ConfigSchema;
      expect(validateConfig('a', schema).valid).toBe(true);
    });

    it('enum：未命中 ⇒ enum_mismatch', () => {
      const schema: ConfigSchema = {
        type: 'enum',
        enum: { values: ['a', 'b'] },
      } as unknown as ConfigSchema;
      const r = validateConfig('c', schema);
      expect(r.valid).toBe(false);
      expect(r.errors[0]!.code).toBe('enum_mismatch');
    });

    it('union.anyOf：任一匹配即通过；全不匹配则报错', () => {
      const schema: ConfigSchema = {
        type: 'union',
        union: { anyOf: [{ type: 'string' }, { type: 'number' }] },
      } as unknown as ConfigSchema;
      expect(validateConfig('a', schema).valid).toBe(true);
      expect(validateConfig(1, schema).valid).toBe(true);
      expect(validateConfig(true, schema).valid).toBe(false);
    });

    it('union.oneOf：恰好命中 1 个才通过', () => {
      const schema: ConfigSchema = {
        type: 'union',
        union: { oneOf: [{ type: 'string' }, { type: 'number' }] },
      } as unknown as ConfigSchema;
      expect(validateConfig('a', schema).valid).toBe(true);
      expect(validateConfig(true, schema).valid).toBe(false);
    });
  });

  // ==================== 字符串 ====================
  describe('字符串 pattern 与 format', () => {
    it('pattern 为字符串 ⇒ 内部转 RegExp', () => {
      const schema: ConfigSchema<string> = {
        type: 'string',
        string: { pattern: '^ab+$' },
      };
      expect(validateConfig('abb', schema).valid).toBe(true);
      const bad = validateConfig('cd', schema);
      expect(bad.valid).toBe(false);
      expect(bad.errors[0]!.code).toBe('pattern_mismatch');
    });

    it('pattern 为 RegExp ⇒ 直接使用', () => {
      const schema: ConfigSchema<string> = { type: 'string', string: { pattern: /^z/ } };
      expect(validateConfig('zz', schema).valid).toBe(true);
    });

    it('format: date', () => {
      const s: ConfigSchema<string> = { type: 'string', string: { format: 'date' } };
      expect(validateConfig('2026-01-02', s).valid).toBe(true);
      expect(validateConfig('not-a-date', s).valid).toBe(false);
    });

    it('format: time / date-time', () => {
      const t: ConfigSchema<string> = { type: 'string', string: { format: 'time' } };
      expect(validateConfig('12:30', t).valid).toBe(true);
      // 注意：time 只做**形状**校验（`\d{2}:\d{2}`），不做取值范围校验，
      // 故 '25:99' 仍算「形状合法」；此处用形状不合法的值。
      expect(validateConfig('abc', t).valid).toBe(false);

      const dt: ConfigSchema<string> = { type: 'string', string: { format: 'date-time' } };
      expect(validateConfig('2026-01-02T03:04:05Z', dt).valid).toBe(true);
      expect(validateConfig('nope', dt).valid).toBe(false);
    });

    it('format: url / uri / uuid', () => {
      const u: ConfigSchema<string> = { type: 'string', string: { format: 'url' } };
      expect(validateConfig('https://example.com', u).valid).toBe(true);
      expect(validateConfig('not a url', u).valid).toBe(false);

      const uri: ConfigSchema<string> = { type: 'string', string: { format: 'uri' } };
      expect(validateConfig('mailto:a@b.com', uri).valid).toBe(true);

      const uuid: ConfigSchema<string> = { type: 'string', string: { format: 'uuid' } };
      expect(validateConfig('123e4567-e89b-12d3-a456-426614174000', uuid).valid).toBe(true);
      expect(validateConfig('bad-uuid', uuid).valid).toBe(false);
    });

    it('format: 未知格式 ⇒ 走 default 返回 null（不报错）', () => {
      const s: ConfigSchema<string> = {
        type: 'string',
        string: { format: 'unknown-fmt' as never },
      };
      expect(validateConfig('anything', s).valid).toBe(true);
    });

    it('string 级 enum 未命中 ⇒ enum_mismatch', () => {
      const s: ConfigSchema<string> = { type: 'string', string: { enum: ['x', 'y'] } };
      const r = validateConfig('z', s);
      expect(r.valid).toBe(false);
      expect(r.errors[0]!.code).toBe('enum_mismatch');
    });
  });

  // ==================== 数字 ====================
  describe('数字边界', () => {
    it('exclusiveMinimum / exclusiveMaximum', () => {
      const s: ConfigSchema<number> = {
        type: 'number',
        number: { exclusiveMinimum: 0, exclusiveMaximum: 10 },
      };
      expect(validateConfig(5, s).valid).toBe(true);
      expect(validateConfig(0, s).valid).toBe(false);
      expect(validateConfig(10, s).valid).toBe(false);
    });
  });

  // ==================== 对象 ====================
  describe('对象校验', () => {
    it('maxProperties / minProperties', () => {
      const max: ConfigSchema<Record<string, unknown>> = {
        type: 'object',
        object: { properties: {}, maxProperties: 1 },
      };
      expect(validateConfig({ a: 1, b: 2 }, max).valid).toBe(false);

      const min: ConfigSchema<Record<string, unknown>> = {
        type: 'object',
        object: { properties: {}, minProperties: 2 },
      };
      expect(validateConfig({ a: 1 }, min).valid).toBe(false);
    });

    it('properties 嵌套校验：错误路径为 "父.子"，子属性 required', () => {
      const schema: ConfigSchema<Record<string, unknown>> = {
        type: 'object',
        object: {
          properties: {
            name: { type: 'string' },
            age: { type: 'number', required: true },
          },
        },
      };
      const bad = validateConfig({ name: 123, age: undefined }, schema);
      expect(bad.valid).toBe(false);
      const paths = bad.errors.map((e) => e.path);
      expect(paths).toContain('name');
      expect(paths).toContain('age');
    });

    it('additionalProperties: false ⇒ 未声明键报错', () => {
      const schema: ConfigSchema<Record<string, unknown>> = {
        type: 'object',
        object: {
          properties: { name: { type: 'string' } },
          additionalProperties: false,
        },
      };
      expect(validateConfig({ name: 'a' }, schema).valid).toBe(true);
      const bad = validateConfig({ name: 'a', extra: 1 }, schema);
      expect(bad.valid).toBe(false);
    });
  });

  // ==================== 数组 ====================
  describe('数组校验', () => {
    it('minItems / maxItems', () => {
      const min: ConfigSchema<unknown[]> = { type: 'array', array: { minItems: 2 } };
      expect(validateConfig([1], min).valid).toBe(false);
      expect(validateConfig([1, 2], min).valid).toBe(true);

      const max: ConfigSchema<unknown[]> = { type: 'array', array: { maxItems: 1 } };
      expect(validateConfig([1, 2], max).valid).toBe(false);
    });

    it('items ⇒ 逐元素校验（路径含下标）', () => {
      const schema: ConfigSchema<unknown[]> = {
        type: 'array',
        array: { items: { type: 'number' } },
      };
      expect(validateConfig([1, 2], schema).valid).toBe(true);
      const bad = validateConfig([1, 'x'], schema);
      expect(bad.valid).toBe(false);
      expect(bad.errors[0]!.path).toBe('[1]');
    });

    it('tuple ⇒ 按下标逐位校验', () => {
      const schema: ConfigSchema<unknown[]> = {
        type: 'array',
        array: { tuple: [{ type: 'string' }, { type: 'number' }] },
      };
      expect(validateConfig(['a', 1], schema).valid).toBe(true);
      expect(validateConfig(['a', 'b'], schema).valid).toBe(false);
    });
  });

  // ==================== 自定义规则 ====================
  describe('addRule / removeRule', () => {
    it('addRule 生效；removeRule 移除后不再生效', () => {
      const validator = new ConfigValidator();
      const rule = () => ({
        path: 'x',
        code: 'custom_error' as const,
        message: 'rule failed',
      });

      validator.addRule(rule);
      expect(validator.validate('v', { type: 'string' }).valid).toBe(false);

      validator.removeRule(rule);
      expect(validator.validate('v', { type: 'string' }).valid).toBe(true);
    });

    it('removeRule 移除未注册的规则 ⇒ 静默无操作', () => {
      const validator = new ConfigValidator();
      expect(() => validator.removeRule(() => null)).not.toThrow();
    });
  });
});
