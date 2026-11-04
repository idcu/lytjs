/**
 * 配置系统语义回归（2026-11-04）
 *
 * 与门禁 `scripts/check-config-semantics.mjs` 的分工：
 * · 门禁跑 **dist**（消费视角）；本文件跑 **src**，便于定位。
 *
 * 这些缺陷的共同点：**不抛异常**。配置读错、默认值没生效、监听器没收到通知，
 * 都要等到上线之后才发现。
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { ConfigManager } from '../src/config';
import { validateConfig, normalizeFlatSchema } from '../src/config-validator';
import { transformConfig, mergeConfig } from '../src/config-transformer';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('原型链安全', () => {
  it('★ set("__proto__.x") 不能污染 Object.prototype', () => {
    const config = new ConfigManager({});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(config.set('__proto__.pollutedA', 'yes')).toBe(false);
    expect(config.set('constructor.prototype.pollutedB', 'yes')).toBe(false);

    expect(({} as Record<string, unknown>).pollutedA).toBeUndefined();
    expect(({} as Record<string, unknown>).pollutedB).toBeUndefined();
    expect(warn).toHaveBeenCalled();
  });

  it('get / has 不穿原型链', () => {
    const config = new ConfigManager({ a: 1 });
    expect(config.has('__proto__.toString')).toBe(false);
    expect(config.has('toString')).toBe(false);
    expect(typeof config.get('toString')).not.toBe('function');
  });

  it('普通路径不受影响（对照）', () => {
    const config = new ConfigManager({});
    expect(config.set('a.b', 1)).toBe(true);
    expect(config.get('a.b')).toBe(1);
  });
});

describe('读的隔离性', () => {
  it('★ get() 返回拷贝：外部改动不影响内部状态', () => {
    const config = new ConfigManager({ api: { baseURL: '/api' } });
    const api = config.get<{ baseURL: string }>('api')!;
    api.baseURL = '/hacked';
    expect(config.get('api.baseURL')).toBe('/api');
    expect(config.get('api')).not.toBe(config.get('api'));
  });
});

describe('变更通知', () => {
  it('★ delete() 也会通知（子 + 父）', () => {
    const log: string[] = [];
    const config = new ConfigManager({ a: { b: 1 } });
    config.watch('a.b', () => log.push('a.b'));
    config.watch('a', () => log.push('a'));
    expect(config.delete('a.b')).toBe(true);
    expect(log).toEqual(['a.b', 'a']);
  });

  it('★ setMultiple(merge=false) 通知被移除的键', () => {
    const log: string[] = [];
    const config = new ConfigManager({ a: 1, b: 2 });
    config.watch('a', (next, prev) => log.push(`${String(next)}/${String(prev)}`));
    config.setMultiple({ c: 3 }, false);
    expect(log).toEqual(['undefined/1']);
    expect(config.has('a')).toBe(false);
  });

  it('set / merge 的通知不受影响（对照）', () => {
    const log: string[] = [];
    const config = new ConfigManager({ api: { url: '/a' } });
    config.watch('api', () => log.push('api'));
    config.set('api.url', '/b');
    config.merge({ api: { url: '/c' } });
    expect(log.length).toBe(2);
  });
});

describe('校验器', () => {
  const canonical = {
    type: 'object' as const,
    object: {
      properties: {
        port: { type: 'number' as const, required: true },
        mode: { type: 'enum' as const, enum: { values: ['dev', 'prod'] } },
      },
      additionalProperties: false,
    },
  };

  it('规范形状：必填 / 类型 / 未知键 / 枚举', () => {
    expect(validateConfig({}, canonical).valid).toBe(false);
    expect(validateConfig({ port: 'x' }, canonical).valid).toBe(false);
    expect(validateConfig({ port: 1, x: 1 }, canonical).valid).toBe(false);
    expect(validateConfig({ port: 1, mode: 'x' }, canonical).valid).toBe(false);
    expect(validateConfig({ port: 1, mode: 'dev' }, canonical).valid).toBe(true);
  });

  it('★ 扁平 JSON Schema 写法也会真正校验（此前静默通过）', () => {
    const flat = {
      type: 'object' as const,
      properties: { port: { type: 'number' as const, required: true } },
    };
    expect(validateConfig({}, flat).valid).toBe(false);
    expect(validateConfig({ port: 'x' }, flat).valid).toBe(false);
    // 规整函数本身
    expect(normalizeFlatSchema(flat).object?.properties.port).toBeDefined();
  });
});

describe('转换器', () => {
  it('单值 / 对象字段的默认值', () => {
    expect(transformConfig(undefined, { type: 'number', default: 42 }).config).toBe(42);
    const r = transformConfig(
      {},
      {
        type: 'object',
        object: { properties: { host: { type: 'string', default: 'localhost' } } },
      },
    );
    expect(r.config).toEqual({ host: 'localhost' });
  });

  it('★ 嵌套对象的字段默认值（此前整个分支被跳过）', () => {
    const r = transformConfig(
      {},
      {
        type: 'object',
        object: {
          properties: {
            api: {
              type: 'object',
              object: {
                properties: {
                  url: { type: 'string', default: '/x' },
                  timeout: { type: 'number', default: 5 },
                },
              },
            },
          },
        },
      },
    );
    expect(r.config).toEqual({ api: { url: '/x', timeout: 5 } });
  });

  it('★ 同一类型错只报一次（此前两次）', () => {
    const r = transformConfig(
      { port: 'x' },
      { type: 'object', object: { properties: { port: { type: 'number' } } } },
    );
    expect(r.errors).toHaveLength(1);
  });

  it('深合并：对象合并、数组替换', () => {
    const r = mergeConfig(
      { api: { baseURL: '/a' }, list: [1, 2] },
      { api: { timeout: 10 }, list: [9] },
      {
        type: 'object',
        object: {
          properties: {
            api: {
              type: 'object',
              object: { properties: { baseURL: { type: 'string' }, timeout: { type: 'number' } } },
            },
            list: { type: 'array' },
          },
        },
      },
    );
    expect(r.config).toEqual({ api: { baseURL: '/a', timeout: 10 }, list: [9] });
  });
});

describe('不可变模式与实例隔离', () => {
  it('不可变：set 返回 false、值不变、有告警', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const config = new ConfigManager({ a: 1 }, { mutable: false });
    expect(config.set('a', 2)).toBe(false);
    expect(config.get('a')).toBe(1);
    expect(warn).toHaveBeenCalled();
  });

  it('两个实例互不影响（SSR 场景）', () => {
    const a = new ConfigManager({ token: 'A' });
    const b = new ConfigManager({ token: 'B' });
    expect([a.get('token'), b.get('token')]).toEqual(['A', 'B']);
  });
});
