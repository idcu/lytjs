/**
 * 行为级判据：`@lytjs/config` 的**配置转换器**（`src/config-transformer.ts`，372 行）
 *
 * ## 为什么要有这条
 *
 * 实测该文件 **195/275 语句未覆盖（29.1%）**，缺口是 `transformObject` 的
 * patternProperties / additionalProperties 分支、`transformArray` 的元组默认值、
 * `merge` 的深度合并、`extract`、以及 null/required/transform 失败等错误路径。
 * 既有 `tests/config-transformer.test.ts` 只覆盖了「默认值 / 基本转换」。
 */

import { describe, it, expect } from 'vitest';
import { ConfigTransformer, transformConfig, mergeConfig } from '../src/config-transformer';
import type { ConfigSchema } from '../src/config-schema';

const t = new ConfigTransformer();

// ==================== undefined / null ====================

describe('undefined 与 null 的处理', () => {
  it('undefined + 有默认值 ⇒ 应用默认值并记录 transforms', () => {
    const r = t.transform(undefined, { type: 'number', default: 42 } as ConfigSchema);

    expect(r.config).toBe(42);
    expect(r.success).toBe(true);
    expect(r.transforms.join()).toContain('Applied default value');
  });

  it('undefined + 必填且无默认值 ⇒ required 错误', () => {
    const r = t.transform(undefined, { type: 'string', required: true } as ConfigSchema);

    expect(r.success).toBe(false);
    expect(r.errors[0]!.code).toBe('required');
    expect(r.errors[0]!.path).toBe('');
  });

  it('null + nullable ⇒ 原样保留', () => {
    const r = t.transform(null, { type: 'string', nullable: true } as ConfigSchema);

    expect(r.config).toBeNull();
    expect(r.success).toBe(true);
  });

  it('null + 有默认值 ⇒ 用默认值替换并**警告**', () => {
    const r = t.transform(null, { type: 'string', default: 'd' } as ConfigSchema);

    expect(r.config).toBe('d');
    expect(r.warnings.join()).toContain('Null value was replaced');
  });

  it('null + 既不可空也无默认值 ⇒ type_error', () => {
    const r = t.transform(null, { type: 'string' } as ConfigSchema);

    expect(r.success).toBe(false);
    expect(r.errors[0]!.code).toBe('type_error');
  });
});

// ==================== 自定义 transform ====================

describe('自定义 transform', () => {
  it('应用并记录（值确实变了才记）', () => {
    const r = t.transform('5', {
      type: 'number',
      transform: (v) => Number(v),
    } as ConfigSchema);

    expect(r.config).toBe(5);
    expect(r.transforms.join()).toContain('Applied transform function');
  });

  it('★ transform 抛错 ⇒ custom_error（不把异常抛出去）', () => {
    const r = t.transform('x', {
      type: 'number',
      transform: () => {
        throw new Error('boom');
      },
    } as ConfigSchema);

    expect(r.success).toBe(false);
    expect(r.errors[0]!.code).toBe('custom_error');
    expect(r.errors[0]!.message).toContain('boom');
  });
});

// ==================== 对象 ====================

describe('transformObject', () => {
  const objectSchema = (over: Record<string, unknown> = {}): ConfigSchema =>
    ({
      type: 'object',
      object: {
        properties: {
          host: { type: 'string', default: 'localhost' },
          port: { type: 'number' },
        },
        ...over,
      },
    }) as ConfigSchema;

  it('逐属性转换，缺失的属性应用默认值', () => {
    const r = t.transform({ port: 8080 }, objectSchema());

    expect(r.config).toEqual({ host: 'localhost', port: 8080 });
    expect(r.transforms.join()).toContain('Applied default for "host"');
  });

  it('嵌套路径出现在错误里（host.port 这类）', () => {
    const r = t.transform({ port: 'not-a-number' }, objectSchema(), 'server');

    expect(r.success).toBe(false);
    expect(r.errors[0]!.path.startsWith('server.port')).toBe(true);
  });

  it('必填属性缺失 ⇒ required 错误（路径含属性名）', () => {
    const schema = {
      type: 'object',
      object: { properties: { token: { type: 'string', required: true } } },
    } as ConfigSchema;

    const r = t.transform({}, schema);

    expect(r.success).toBe(false);
    expect(r.errors[0]!.path).toBe('token');
  });

  it('patternProperties：匹配的额外键会被转换并保留', () => {
    const schema = objectSchema({
      patternProperties: { '^env_': { type: 'string' } },
    });

    const r = t.transform({ env_A: 'x' }, schema);

    expect(r.config).toEqual({ host: 'localhost', env_A: 'x' });
  });

  it('additionalProperties: false ⇒ 额外键被丢弃并**警告**', () => {
    const r = t.transform({ extra: 1 }, objectSchema());

    expect(r.config).toEqual({ host: 'localhost' });
    expect(r.warnings.join()).toContain('Additional property "extra" will be ignored');
  });

  it('★ additionalProperties: true ⇒ 额外键必须**保留**（字段含义是"允许"）', () => {
    const schema = objectSchema({ additionalProperties: true });

    const r = t.transform({ extra: 1, other: 'x' }, schema);

    // 修复前：只走「!additionalProperties 才警告」的分支，没有任何拷贝逻辑 ⇒ 额外键被**静默丢弃**
    expect(r.config).toMatchObject({ extra: 1, other: 'x' });
  });

  it('额外键命中 patternProperties 时，即使 additionalProperties:false 也不警告', () => {
    const schema = objectSchema({ patternProperties: { '^env_': { type: 'string' } } });

    const r = t.transform({ env_B: 'y' }, schema);

    expect(r.config).toMatchObject({ env_B: 'y' });
    expect(r.warnings.join()).not.toContain('env_B');
  });
});

// ==================== 数组 ====================

describe('transformArray', () => {
  it('逐元素转换（经显式 transform；本包不做隐式类型转换）', () => {
    const schema = {
      type: 'array',
      array: { items: { type: 'number', transform: (v: unknown) => Number(v) } },
    } as ConfigSchema;

    const r = t.transform(['1', '2'], schema);

    expect(r.config).toEqual([1, 2]);
  });

  it('元组默认值补齐尾部', () => {
    const schema = {
      type: 'array',
      array: {
        items: { type: 'number' },
        tuple: [{ type: 'number' }, { type: 'number', default: 9 }],
      },
    } as ConfigSchema;

    const r = t.transform([1], schema);

    expect(r.config).toEqual([1, 9]);
    expect(r.transforms.join()).toContain('tuple[1]');
  });

  it('★ 没有 items 的数组（如纯元组）不应崩溃', () => {
    // `items` 在 ArraySchema 里是**可选**的；`transformArray` 里却写了 `arraySchema.items!`
    // ⇒ 会拿 `undefined` 当 schema 去 `transform` ⇒ 读 `schema.default` 时 TypeError。
    const schema = {
      type: 'array',
      array: { tuple: [{ type: 'number' }, { type: 'string' }] },
    } as ConfigSchema;

    expect(() => t.transform([1, 'a'], schema)).not.toThrow();
    const r = t.transform([1, 'a'], schema);
    expect(r.config).toEqual([1, 'a']);
  });
});

// ==================== merge ====================

describe('merge（深度合并）', () => {
  const schema = {
    type: 'object',
    object: {
      properties: {
        server: {
          type: 'object',
          object: { properties: { host: { type: 'string' }, port: { type: 'number' } } },
        },
        list: { type: 'array', array: { items: { type: 'number' } } },
      },
    },
  } as ConfigSchema;

  it('嵌套对象递归合并，标量覆盖', () => {
    const r = t.merge(
      { server: { host: 'a', port: 1 } } as never,
      { server: { port: 2 } } as never,
      schema,
    );

    expect(r.config).toMatchObject({ server: { host: 'a', port: 2 } });
  });

  it('数组整体替换（不按下标合并）', () => {
    const r = t.merge({ list: [1, 2, 3] } as never, { list: [9] } as never, schema);

    expect(r.config).toMatchObject({ list: [9] });
  });

  it('overrides 里的 undefined 不覆盖默认值', () => {
    const r = t.merge(
      { server: { host: 'a' } } as never,
      { server: { host: undefined } } as never,
      schema,
    );

    expect(r.config).toMatchObject({ server: { host: 'a' } });
  });

  it('不修改入参', () => {
    const defaults = { server: { host: 'a' } };
    t.merge(defaults as never, { server: { host: 'b' } } as never, schema);

    expect(defaults.server.host).toBe('a');
  });
});

// ==================== extract ====================

describe('extract', () => {
  const schema = {
    type: 'object',
    object: { properties: { a: { type: 'number' }, b: { type: 'string' } } },
  } as ConfigSchema;

  it('只取指定键', () => {
    const r = t.extract({ a: 1, b: 'x', c: 'other' } as never, schema, ['a'] as never);

    expect(r).toEqual({ a: 1 });
  });

  it('值不通过 schema 校验时该键被**跳过**（无错误通道，属既有语义）', () => {
    const r = t.extract({ a: 'not-a-number' } as never, schema, ['a'] as never);

    expect(r).toEqual({});
  });

  it('schema 里没定义的键原样带出', () => {
    const r = t.extract({ a: 1, c: 'other' } as never, schema, ['c'] as never);

    expect(r).toEqual({ c: 'other' });
  });

  it('不存在的键不出现', () => {
    const r = t.extract({ a: 1 } as never, schema, ['missing'] as never);

    expect(r).toEqual({});
  });
});

// ==================== 便捷函数 ====================

describe('便捷函数', () => {
  it('transformConfig', () => {
    const schema = { type: 'number', transform: (v: unknown) => Number(v) } as ConfigSchema;

    expect(transformConfig('7', schema).config).toBe(7);
  });

  it('mergeConfig', () => {
    const schema = {
      type: 'object',
      object: { properties: { n: { type: 'number' } } },
    } as ConfigSchema;

    expect(mergeConfig({ n: 1 } as never, { n: 2 } as never, schema).config).toEqual({ n: 2 });
  });
});
