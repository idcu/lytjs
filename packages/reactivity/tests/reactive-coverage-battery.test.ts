/**
 * reactivity/reactive 覆盖率电池（Task C 第二批）
 *
 * 覆盖 `reactive.ts` 里「正常业务路径到不了」的守卫与内部标记分支：
 *  - Proxy get trap 的 `ReactiveFlags` 读取（IS_SHALLOW / RAW / prototype）
 *  - readonly / shallowReadonly 的 set·delete 警告（含 JSON.stringify 抛错的 catch）
 *  - `markRaw` 对 frozen / sealed 对象的早返回
 *  - `isReactive(readonlyProxy)` 的 RAW 递归判定
 *  - Map/Set 集合 handler 中 `toTriggerKey` 返回 undefined 的分支、clear 空/非空
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  reactive,
  readonly,
  shallowReactive,
  shallowReadonly,
  isReactive,
  isReadonly,
  isProxy,
  markRaw,
  toRaw,
} from '../src/reactive';
import { ReactiveFlags } from '../src/constants';
import { ref } from '../src/ref';

type AnyObj = Record<string, unknown>;

afterEach(() => {
  vi.restoreAllMocks();
});

describe('reactive battery: Proxy get trap 内部标记', () => {
  it('mutable proxy 暴露 IS_SHALLOW / RAW', () => {
    const raw = { a: 1 };
    const deep = reactive(raw) as unknown as AnyObj;
    expect(deep[ReactiveFlags.IS_SHALLOW]).toBe(false);
    expect(deep[ReactiveFlags.RAW]).toBe(raw);

    const shallow = shallowReactive({ a: 1 }) as unknown as AnyObj;
    expect(shallow[ReactiveFlags.IS_SHALLOW]).toBe(true);
  });

  it('readonly proxy 暴露 IS_REACTIVE / IS_READONLY / IS_SHALLOW / RAW', () => {
    const raw = { a: 1 };
    const ro = readonly(raw) as unknown as AnyObj;
    expect(ro[ReactiveFlags.IS_REACTIVE]).toBe(false);
    expect(ro[ReactiveFlags.IS_READONLY]).toBe(true);
    expect(ro[ReactiveFlags.IS_SHALLOW]).toBe(false);
    expect(ro[ReactiveFlags.RAW]).toBe(raw);

    const sro = shallowReadonly({ a: 1 }) as unknown as AnyObj;
    expect(sro[ReactiveFlags.IS_SHALLOW]).toBe(true);
  });

  it('读取 prototype 键走 Reflect.get 透传分支', () => {
    const p = reactive({ a: 1 }) as unknown as AnyObj;
    expect(p.prototype).toBeUndefined();
  });

  it('isReactive 对 readonly 代理递归到 RAW 目标', () => {
    expect(isReactive(readonly({ a: 1 }))).toBe(false);
    expect(isReadonly(readonly({ a: 1 }))).toBe(true);
    expect(isProxy(readonly({ a: 1 }))).toBe(true);
    expect(isReactive(reactive({ a: 1 }))).toBe(true);
    expect(isProxy(1)).toBe(false);
  });

  it('reactive() 对已是代理 / readonly 代理的目标直接返回', () => {
    const r = reactive({ a: 1 });
    expect(reactive(r)).toBe(r); // 命中 proxyMap 缓存

    const ro = readonly({ a: 1 });
    expect(reactive(ro as never)).toBe(ro); // RAW 已存在且非 readonly→reactive

    const back = readonly(r as never); // isReadonlyFlag && IS_REACTIVE 同时为真
    expect(isReadonly(back)).toBe(true);
    expect(isReactive(back)).toBe(true);
  });
});

describe('reactive battery: readonly 写入/删除的失败警告', () => {
  it('对 deep readonly 写入会警告并走 JSON.stringify 抛错的 catch', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const circular: AnyObj = {};
    circular.self = circular; // JSON.stringify 会抛 TypeError ⇒ 走 catch

    const ro = readonly(circular) as unknown as AnyObj;
    (ro as AnyObj).x = 1;
    expect(warn).toHaveBeenCalled();

    delete ro.self;
    expect(warn).toHaveBeenCalledTimes(2);
    // deep readonly 的删除警告文案
    expect(String(warn.mock.calls[1]?.[0])).toContain('deep readonly');
  });

  it('对 shallow readonly 删除时警告文案标记 shallow readonly', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const sro = shallowReadonly({ a: 1 }) as unknown as AnyObj;
    delete sro.a;
    expect(String(warn.mock.calls[0]?.[0])).toContain('shallow readonly');
  });

  it('readonly 上可序列化的目标走 JSON.stringify 成功分支', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const ro = readonly({ a: 1 }) as unknown as AnyObj;
    (ro as AnyObj).b = 2;
    expect(String(warn.mock.calls[0]?.[0])).toContain('{"a":1}');
  });
});

describe('reactive battery: markRaw 与冻结/密封对象', () => {
  it('markRaw 对 frozen / sealed 对象早返回且不抛错', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const frozen = Object.freeze({ a: 1 });
    expect(markRaw(frozen)).toBe(frozen);

    const sealed = Object.seal({ a: 1 });
    expect(markRaw(sealed)).toBe(sealed);
    expect(warn).toHaveBeenCalledTimes(2); // 两者都走「冻结/密封」警告分支

    // 普通对象正常打标，且被打标后不再被 reactive 代理
    const plain = { a: 1 };
    markRaw(plain);
    expect(reactive(plain)).toBe(plain);
  });
});

describe('reactive battery: set 时的 ref 解包捷径', () => {
  it('把非 ref 值写入「旧值是 ref」的键时改写 ref.value', () => {
    const r = reactive({ a: ref(1) }) as unknown as { a: number };
    r.a = 2;
    expect(r.a).toBe(2);

    // 数组目标不走该捷径
    const arr = reactive([ref(1)]) as unknown as unknown[];
    arr[0] = 5;
    expect(arr[0]).toBe(5);
  });

  it('shallow reactive 不执行 toRaw 解包', () => {
    const inner = { n: 1 };
    const sr = shallowReactive({ inner }) as unknown as { inner: unknown };
    const wrapped = reactive({ n: 2 });
    sr.inner = wrapped;
    expect(sr.inner).toBe(wrapped);
    expect(toRaw(sr.inner)).toBe(toRaw(wrapped));
  });
});

describe('reactive battery: Map / Set 集合 handler', () => {
  it('Map.set 使用非 string/symbol 键时跳过精确 trigger', () => {
    const m = reactive(new Map<unknown, unknown>([['a', 1]])) as unknown as Map<unknown, unknown>;
    m.set(123, 'x'); // toTriggerKey(123) === undefined
    expect(m.get(123)).toBe('x');

    // 键未变时也不 trigger
    m.set('a', 1);
    expect(m.get('a')).toBe(1);
  });

  it('Set.add 使用非 string/symbol 键时跳过精确 trigger', () => {
    const s = reactive(new Set<unknown>(['a'])) as unknown as Set<unknown>;
    s.add(123); // toTriggerKey(123) === undefined
    expect(s.has(123)).toBe(true);

    s.add('a'); // 已存在，不 trigger
    expect(s.has('a')).toBe(true);
  });

  it('Set.delete 区分命中与未命中', () => {
    const s = reactive(new Set<unknown>(['a'])) as unknown as Set<unknown>;
    expect(s.delete('a')).toBe(true); // 命中 ⇒ 精确 trigger + ITERATE_KEY
    expect(s.delete('missing')).toBe(false);
  });

  it('Map.clear 区分有内容与空表', () => {
    const m = reactive(new Map<unknown, unknown>([['a', 1]])) as unknown as Map<unknown, unknown>;
    m.clear(); // hadItems === true
    expect(m.size).toBe(0);

    m.clear(); // hadItems === false
    expect(m.size).toBe(0);
  });

  it('Map.get 额外追踪具体 key', () => {
    const m = reactive(new Map<string, number>([['a', 1]])) as unknown as Map<string, number>;
    expect(m.get('a')).toBe(1);
    expect(m.get('missing')).toBeUndefined();
  });
});
