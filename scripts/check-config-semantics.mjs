#!/usr/bin/env node
/**
 * 门禁：配置系统语义（`@lytjs/config`）
 *
 * ## 为什么需要这一项
 *
 * 配置是「上线之后才发现错」的典型地带：读到的值不对、默认值没生效、
 * 校验报告说 OK、监听器没收到通知 —— **全都不抛异常**。
 * 更糟的是 `ConfigManager.set()` 是**按字符串路径**写对象，这类实现天生带
 * 原型链污染的风险（`set('__proto__.x', 1)` 会写进 `Object.prototype`）。
 *
 * 本门禁按语义条目驱动真实读写：不检查源码形状，只看行为。
 *
 * ## 2026-11-04 首次运行抓到的 7 个缺陷（修复前实测）
 *
 * | # | 缺陷 | 实测 |
 * |---|---|---|
 * | 1 | **`set('__proto__.x')` 污染 `Object.prototype`**（P0 安全） | `({}).x === 1`，进程内所有对象都被污染；`set('constructor.prototype.x')` 同样成立 |
 * | 2 | `get` / `has` 顺着**原型链**读 | `has('__proto__.toString') === true`、`get('toString')` 返回函数 |
 * | 3 | `get()` 返回**内部引用** | `config.get('api').baseURL = '/hacked'` 改掉内部状态，且**0 个监听器被触发**（`getAll()` 却是深拷贝） |
 * | 4 | `delete()` **不通知** | `delete('a.b')` 后 `watch('a.b')` 与 `watch('a')` 都没触发 |
 * | 5 | `setMultiple(config, false)` **不通知被移除的键** | 整个配置被替换，`watch('a')` 不知道 `a` 没了 |
 * | 6 | 扁平 JSON Schema 写法**静默通过** | `{ type:'object', properties:{ port:{ required:true } } }` ⇒ `valid: true`（一条规则都没跑） |
 * | 7 | **嵌套默认值不生效** | `{ api: { url: { default: '/x' } } }` + 输入 `{}` ⇒ `{}`，而 README 承诺「自动应用默认值」 |
 *
 * 另修：同一个类型错误被报两次（子层 transform 与父层整体校验各一次）。
 */
import { join } from 'node:path';

const ROOT = process.cwd();
const { ConfigManager, validateConfig, transformConfig, mergeConfig } = await import(
  join(ROOT, 'packages/ecosystem/packages/config/dist/index.mjs')
);

let pass = 0;
let fail = 0;
const failures = [];
const check = (name, ok, detail) => {
  if (ok) {
    pass++;
    console.log(`   ✅ ${name}`);
  } else {
    fail++;
    failures.push(name);
    console.log(`   ❌ ${name}`);
    if (detail !== undefined) {
      console.log(`         → ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`);
    }
  }
};
const section = (t) => console.log(`\n${t}`);
const mk = (cfg = {}, opts) => new ConfigManager(cfg, opts);
/** 捕获 console.warn（配置管理器用它报告被拒绝的写入） */
const captureWarn = (fn) => {
  const lines = [];
  const original = console.warn;
  console.warn = (...args) => lines.push(args.map(String).join(' '));
  try {
    fn();
  } finally {
    console.warn = original;
  }
  return lines;
};

// ══════════════════════════════════════════════════════════
section('[1] 原型链安全：按路径写入不能污染 Object.prototype');
{
  const cfg = mk();
  const warnings = captureWarn(() => {
    cfg.set('__proto__.pollutedA', 'yes');
    cfg.set('constructor.prototype.pollutedB', 'yes');
    cfg.delete('__proto__.pollutedC');
  });

  check('set("__proto__.x") 被拒绝', {}.pollutedA === undefined, {}.pollutedA);
  check('set("constructor.prototype.x") 被拒绝', {}.pollutedB === undefined, {}.pollutedB);
  check('拒绝时给出告警（不静默）', warnings.length >= 2, warnings);
  check(
    '普通路径不受影响（对照）',
    (() => {
      const c = mk();
      c.set('a.b', 1);
      return c.get('a.b') === 1;
    })(),
  );
}
{
  const cfg = mk({ a: 1 });
  check(
    'has("__proto__.toString") 为 false（不穿原型链）',
    cfg.has('__proto__.toString') === false,
  );
  check('has("toString") 为 false（不穿原型链）', cfg.has('toString') === false);
  check('get("toString") 不返回函数', typeof cfg.get('toString') !== 'function');
}

// ══════════════════════════════════════════════════════════
section('[2] 读的隔离性：get() 不能把内部对象交出去');
{
  const cfg = mk({ api: { baseURL: '/api' } });
  const api = cfg.get('api');
  api.baseURL = '/hacked';
  check(
    '改 get() 的返回值不影响内部状态',
    cfg.get('api.baseURL') === '/api',
    cfg.get('api.baseURL'),
  );
  check('两次 get 返回不同对象', cfg.get('api') !== cfg.get('api'));

  const all = cfg.getAll();
  all.api.baseURL = '/also-hacked';
  check('getAll() 也是深拷贝', cfg.get('api.baseURL') === '/api');
}

// ══════════════════════════════════════════════════════════
section('[3] 变更通知的完整性（set / delete / setMultiple / merge）');
{
  const log = [];
  const cfg = mk({ a: { b: 1 } });
  cfg.watch('a.b', () => log.push('a.b'));
  cfg.watch('a', (nv) => log.push(`a:${JSON.stringify(nv)}`));
  cfg.set('a.b', 2);
  check('set 子路径：子 + 父监听都触发', log.join(',') === 'a.b,a:{"b":2}', log);

  log.length = 0;
  cfg.delete('a.b');
  check('★ delete 也会通知（此前一次都不触发）', log.length === 2, log);
}
{
  const log = [];
  const cfg = mk({ a: 1, b: 2 });
  cfg.watch('a', (nv, ov) => log.push(`a:${JSON.stringify(nv)}/${JSON.stringify(ov)}`));
  cfg.setMultiple({ c: 3 }, false);
  check(
    '★ setMultiple(merge=false)：被移除的键会以 undefined 通知（此前完全静默）',
    log.length === 1 && log[0] === 'a:undefined/1',
    log,
  );
  check('被移除的键确实不存在了', cfg.has('a') === false);
}
{
  const log = [];
  const cfg = mk({ api: { baseURL: '/a' } });
  cfg.watch('api.baseURL', () => log.push('hit'));
  cfg.merge({ api: { baseURL: '/b' } });
  check('merge 深合并也会通知', log.length === 1, log);
}

// ══════════════════════════════════════════════════════════
section('[4] 校验器：必填 / 类型 / 额外键 / 枚举 / 两种 schema 形状');
{
  const canonical = {
    type: 'object',
    object: {
      properties: {
        port: { type: 'number', required: true },
        mode: { type: 'enum', enum: { values: ['dev', 'prod'] } },
      },
      additionalProperties: false,
    },
  };
  check('规范形状：必填缺失 ⇒ invalid', validateConfig({}, canonical).valid === false);
  check('规范形状：类型错 ⇒ invalid', validateConfig({ port: 'x' }, canonical).valid === false);
  check('规范形状：未知键 ⇒ invalid', validateConfig({ port: 1, x: 1 }, canonical).valid === false);
  check(
    '规范形状：枚举非法 ⇒ invalid',
    validateConfig({ port: 1, mode: 'x' }, canonical).valid === false,
  );
  check(
    '规范形状：合法 ⇒ valid',
    validateConfig({ port: 1, mode: 'dev' }, canonical).valid === true,
  );

  // 扁平 JSON Schema 写法（最常见的误写）
  const flat = { type: 'object', properties: { port: { type: 'number', required: true } } };
  check(
    '★ 扁平写法 `{ type:"object", properties }` 也会真正校验（此前静默通过）',
    validateConfig({}, flat).valid === false,
    validateConfig({}, flat),
  );
  check('扁平写法：类型错也能抓到', validateConfig({ port: 'x' }, flat).valid === false);
}

// ══════════════════════════════════════════════════════════
section('[5] 转换器：默认值（含嵌套）/ transform / 错误去重');
{
  const scalar = transformConfig(undefined, { type: 'number', default: 42 });
  check('单值默认值', scalar.config === 42, scalar.config);

  const flatDefaults = transformConfig(
    {},
    {
      type: 'object',
      object: {
        properties: {
          host: { type: 'string', default: 'localhost' },
          port: { type: 'number', default: 80 },
        },
      },
    },
  );
  check(
    '对象字段默认值',
    JSON.stringify(flatDefaults.config) === '{"host":"localhost","port":80}',
    flatDefaults.config,
  );

  const nested = transformConfig(
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
  check(
    '★ 嵌套对象字段的默认值（此前整个分支被跳过）',
    JSON.stringify(nested.config) === '{"api":{"url":"/x","timeout":5}}',
    nested.config,
  );

  const transformed = transformConfig(
    { port: '8080' },
    {
      type: 'object',
      object: { properties: { port: { type: 'number', transform: (v) => Number(v) } } },
    },
  );
  check('字段级 transform 生效', transformed.config.port === 8080, transformed.config);

  const dup = transformConfig(
    { port: 'x' },
    { type: 'object', object: { properties: { port: { type: 'number' } } } },
  );
  check('同一个类型错只报一次（此前报两次）', dup.errors.length === 1, dup.errors);

  const mergeSchema = {
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
  };
  const merged = mergeConfig(
    { api: { baseURL: '/a' }, list: [1, 2] },
    { api: { timeout: 10 }, list: [9] },
    mergeSchema,
  );
  check(
    '深合并：对象合并、数组替换',
    JSON.stringify(merged.config) === '{"api":{"baseURL":"/a","timeout":10},"list":[9]}',
    merged.config,
  );

  // 未在 schema 里声明的键会被丢弃 —— 但**必须留下告警**（静默丢数据是最坏形态）
  const dropped = mergeConfig({ api: { baseURL: '/a' }, extra: 1 }, {}, mergeSchema);
  check(
    '未声明的键被丢弃时有告警（不静默丢数据）',
    dropped.warnings.some((line) => line.includes('extra')),
    dropped.warnings,
  );
}

// ══════════════════════════════════════════════════════════
section('[6] 不可变模式');
{
  const cfg = mk({ a: 1 }, { mutable: false });
  const warnings = captureWarn(() => cfg.set('a', 2));
  check('不可变：set 返回 false 且值不变', cfg.get('a') === 1);
  check('不可变：给出告警（不静默）', warnings.length === 1, warnings);
}

// ══════════════════════════════════════════════════════════
section('[7] 实例隔离（SSR 场景：每个请求一个 ConfigManager）');
{
  const a = mk({ token: 'A' });
  const b = mk({ token: 'B' });
  check('两个实例互不影响', a.get('token') === 'A' && b.get('token') === 'B');
}

// ══════════════════════════════════════════════════════════
console.log(`\n共 ${pass + fail} 条断言：✅ ${pass} / ❌ ${fail}`);
if (fail > 0) {
  console.log('\n失败项：');
  for (const f of failures) console.log(`  · ${f}`);
  process.exit(1);
}
process.exit(0);
