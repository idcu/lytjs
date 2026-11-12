/* eslint-disable @typescript-eslint/no-unused-expressions */
import { describe, it, expect, vi } from 'vitest';
import {
  reactive,
  shallowReactive,
  readonly,
  shallowReadonly,
  isReactive,
  isReadonly,
  isProxy,
  toRaw,
  markRaw,
  effect,
} from '../src/index';

describe('reactive', () => {
  it('should create a reactive proxy', () => {
    const original = { count: 0 };
    const observed = reactive(original);
    expect(observed).not.toBe(original);
    expect(observed.count).toBe(0);
  });

  it('should track property access and trigger changes', () => {
    const obj = reactive({ count: 0 });
    const fn = vi.fn();
    let dummy: number;
    effect(() => {
      dummy = obj.count;
      fn();
    });
    expect(dummy).toBe(0);
    expect(fn).toHaveBeenCalledTimes(1);
    obj.count++;
    expect(dummy).toBe(1);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should make nested objects reactive', () => {
    const obj = reactive({ nested: { count: 0 } });
    const fn = vi.fn();
    let dummy: number;
    effect(() => {
      dummy = obj.nested.count;
      fn();
    });
    expect(dummy).toBe(0);
    obj.nested.count++;
    expect(dummy).toBe(1);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should handle reactive arrays', () => {
    const arr = reactive<number[]>([1, 2, 3]);
    const fn = vi.fn();
    let dummy: number;
    effect(() => {
      dummy = arr.length;
      fn();
    });
    expect(dummy).toBe(3);
    arr.push(4);
    expect(dummy).toBe(4);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should track array index changes', () => {
    const arr = reactive([1, 2, 3]);
    const fn = vi.fn();
    let dummy: number;
    effect(() => {
      dummy = arr[0];
      fn();
    });
    expect(dummy).toBe(1);
    arr[0] = 10;
    expect(dummy).toBe(10);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should trigger on property deletion', () => {
    const obj = reactive<{ count?: number }>({ count: 1 });
    const fn = vi.fn();
    let dummy: number | undefined;
    effect(() => {
      dummy = 'count' in obj ? obj.count : undefined;
      fn();
    });
    expect(dummy).toBe(1);
    delete obj.count;
    expect(dummy).toBeUndefined();
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should track has operations', () => {
    const obj = reactive<{ foo?: string }>({ foo: 'bar' });
    const fn = vi.fn();
    let dummy: boolean;
    effect(() => {
      dummy = 'foo' in obj;
      fn();
    });
    expect(dummy).toBe(true);
    delete obj.foo;
    expect(dummy).toBe(false);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should track iteration with for...in', () => {
    const obj = reactive<{ a?: number; b?: number }>({ a: 1 });
    const fn = vi.fn();
    let dummy: string[];
    effect(() => {
      dummy = Object.keys(obj);
      fn();
    });
    expect(dummy).toEqual(['a']);
    obj.b = 2;
    expect(dummy).toEqual(['a', 'b']);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should return the same proxy for the same object', () => {
    const original = {};
    const proxy1 = reactive(original);
    const proxy2 = reactive(original);
    expect(proxy1).toBe(proxy2);
  });

  it('should correctly identify reactive objects with isReactive', () => {
    const obj = reactive({});
    expect(isReactive(obj)).toBe(true);
    expect(isReactive({})).toBe(false);
  });

  it('should return the raw object with toRaw', () => {
    const original = { count: 0 };
    const observed = reactive(original);
    expect(toRaw(observed)).toBe(original);
  });

  it('should return raw for nested objects', () => {
    const original = { nested: { count: 0 } };
    const observed = reactive(original);
    expect(toRaw(observed.nested)).toBe(original.nested);
  });

  it('should prevent making marked raw objects reactive', () => {
    const raw = markRaw({ count: 0 });
    const observed = reactive({ nested: raw });
    expect(isReactive(observed)).toBe(true);
    expect(isReactive(observed.nested)).toBe(false);
    expect(observed.nested).toBe(raw);
  });

  it('should handle reactive Map', () => {
    const map = reactive(new Map<string, number>());
    const fn = vi.fn();
    let dummy: number | undefined;
    effect(() => {
      dummy = map.get('key');
      fn();
    });
    expect(dummy).toBeUndefined();
    map.set('key', 1);
    expect(dummy).toBe(1);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should handle reactive Set', () => {
    const set = reactive(new Set<number>());
    const fn = vi.fn();
    let dummy: number;
    effect(() => {
      dummy = set.size;
      fn();
    });
    expect(dummy).toBe(0);
    set.add(1);
    expect(dummy).toBe(1);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should only track first level with shallowReactive', () => {
    const obj = shallowReactive({ nested: { count: 0 } });
    const fn = vi.fn();
    let _dummy: any;
    effect(() => {
      _dummy = obj.nested;
      fn();
    });
    expect(fn).toHaveBeenCalledTimes(1);
    obj.nested.count++; // 不应触发
    expect(fn).toHaveBeenCalledTimes(1);
    obj.nested = { count: 1 }; // 应触发
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should prevent mutations on readonly objects', () => {
    const obj = readonly({ count: 0 });
    expect(isReadonly(obj)).toBe(true);
    // readonly 的 set 返回 true 但不实际修改
    (obj as any).count = 1;
    expect(obj.count).toBe(0);
  });

  it('should make nested objects readonly', () => {
    const obj = readonly({ nested: { count: 0 } });
    (obj.nested as any).count = 1;
    expect(obj.nested.count).toBe(0);
  });

  it('should correctly identify proxy objects with isProxy', () => {
    const reactiveObj = reactive({});
    const readonlyObj = readonly({});
    expect(isProxy(reactiveObj)).toBe(true);
    expect(isProxy(readonlyObj)).toBe(true);
    expect(isProxy({})).toBe(false);
  });

  it('should only make first level readonly with shallowReadonly', () => {
    const obj = shallowReadonly({ count: 0, nested: { count: 0 } });
    expect(isReadonly(obj)).toBe(true);
    (obj as any).count = 1;
    expect(obj.count).toBe(0); // readonly 阻止了修改
    expect(isReadonly(obj.nested)).toBe(false);
    obj.nested.count = 1; // 浅层只读不阻止深层
    expect(obj.nested.count).toBe(1);
  });

  it('should reflect changes on proxy to raw object', () => {
    const raw = { count: 0 };
    const observed = reactive(raw);
    const fn = vi.fn();
    let dummy: number;
    effect(() => {
      dummy = observed.count;
      fn();
    });
    observed.count = 1;
    expect(dummy).toBe(1);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(raw.count).toBe(1); // 代理修改同步到原始对象
  });

  it('should track symbol keys', () => {
    const sym = Symbol('key');
    const obj = reactive({ [sym]: 'value' });
    const fn = vi.fn();
    let dummy: string;
    effect(() => {
      dummy = obj[sym];
      fn();
    });
    expect(dummy).toBe('value');
    obj[sym] = 'changed';
    expect(dummy).toBe('changed');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should handle reactive object with null prototype', () => {
    const original = Object.create(null);
    original.count = 0;
    const observed = reactive(original);
    expect(observed.count).toBe(0);
    observed.count = 1;
    expect(observed.count).toBe(1);
  });

  it('should handle setting non-existent property', () => {
    const obj = reactive<{ a?: number; b?: number }>({ a: 1 });
    const fn = vi.fn();
    effect(() => {
      obj.b;
      fn();
    });
    expect(fn).toHaveBeenCalledTimes(1);
    obj.b = 2;
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should handle array methods that mutate the array', () => {
    const arr = reactive([1, 2, 3]);
    const fn = vi.fn();
    effect(() => {
      fn(arr.join(','));
    });
    expect(fn).toHaveBeenCalledTimes(1);
    arr.pop();
    // pop should trigger a single update
    expect(fn.mock.calls.length).toBe(2);
    expect(arr.length).toBe(2);
  });

  it('should handle multiple effects tracking same property', () => {
    const obj = reactive({ count: 0 });
    const fn1 = vi.fn();
    const fn2 = vi.fn();

    effect(() => {
      fn1(obj.count);
    });
    effect(() => {
      fn2(obj.count * 2);
    });

    obj.count = 5;
    expect(fn1).toHaveBeenCalledTimes(2);
    expect(fn2).toHaveBeenCalledTimes(2);
    expect(fn2).toHaveBeenCalledWith(10);
  });

  it('should handle deep nested reactive objects', () => {
    const obj = reactive({
      level1: {
        level2: {
          level3: {
            value: 0,
          },
        },
      },
    });
    const fn = vi.fn();
    effect(() => {
      fn(obj.level1.level2.level3.value);
    });
    expect(fn).toHaveBeenCalledTimes(1);
    obj.level1.level2.level3.value = 42;
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenCalledWith(42);
  });

  it('should preserve object identity when accessing reactive properties', () => {
    const innerObj = { id: 1 };
    const obj = reactive({ inner: innerObj });
    // reactive recursively proxies nested objects, so obj.inner is a proxy of innerObj
    expect(obj.inner).toEqual(innerObj);
    expect(isReactive(obj.inner)).toBe(true);
  });

  it('should handle reactive with undefined and null values', () => {
    const obj = reactive({
      undef: undefined,
      nil: null,
    });
    expect(obj.undef).toBeUndefined();
    expect(obj.nil).toBeNull();
    obj.undef = 'defined';
    expect(obj.undef).toBe('defined');
  });

  it('should handle readonly with nested reactive objects', () => {
    const inner = reactive({ count: 0 });
    const outer = readonly({ inner });
    expect(isReadonly(outer)).toBe(true);
    // 深层的 inner 仍然是 reactive
    expect(isReactive(outer.inner)).toBe(true);
  });

  it('should handle markRaw on nested objects', () => {
    const nested = markRaw({ count: 0 });
    const obj = reactive({ nested });
    expect(isReactive(obj)).toBe(true);
    expect(isReactive(obj.nested)).toBe(false);
    expect(obj.nested).toBe(nested);
    // 修改 raw 对象不应该触发响应
    const fn = vi.fn();
    effect(() => {
      fn(obj.nested.count);
    });
    obj.nested.count = 1;
    expect(fn).toHaveBeenCalledTimes(1); // 不应再次调用
  });
});

/**
 * R-P0-2：数组变异方法必须触发**被改动索引**上的依赖。
 *
 * 回归背景（2026-11-12）：`push/pop/shift/unshift/splice` 在 raw 数组上执行后
 * 只补了一次 `trigger(ADD, ITERATE_KEY)`，被搬移/删除/新增的索引上订阅的
 * effect 一个都不会重跑 ⇒ 读 `arr[0]` 的视图在 `shift()` 后永远停在旧值。
 */
describe('数组变异方法的索引级触发（R-P0-2）', () => {
  it('★ shift 后读取被搬移索引的 effect 必须重跑', () => {
    const arr = reactive([1, 2, 3]);
    let seen: number | undefined;
    effect(() => {
      seen = arr[0];
    });
    expect(seen).toBe(1);

    arr.shift();
    expect(seen).toBe(2);
  });

  it('★ pop 后读取已删除索引的 effect 必须重跑（读到 undefined）', () => {
    const arr = reactive([1, 2, 3]);
    let seen: number | undefined = 0;
    effect(() => {
      seen = arr[2];
    });
    expect(seen).toBe(3);

    arr.pop();
    expect(seen).toBeUndefined();
  });

  it('★ splice 插入/删除后的索引必须触发', () => {
    const arr = reactive(['a', 'b', 'c']);
    let seen: string | undefined;
    effect(() => {
      seen = arr[1];
    });
    expect(seen).toBe('b');

    arr.splice(1, 1, 'x', 'y');
    expect(seen).toBe('x');
  });

  it('★ unshift 后原有索引的值变化必须触发', () => {
    const arr = reactive([1, 2]);
    let seen: number | undefined;
    effect(() => {
      seen = arr[0];
    });

    arr.unshift(0);
    expect(seen).toBe(0);
  });

  it('★ push 前读到 undefined 的新索引，push 后必须重跑', () => {
    const arr = reactive<number[]>([1]);
    let seen: number | undefined = -1;
    effect(() => {
      seen = arr[1];
    });
    expect(seen).toBeUndefined();

    arr.push(2);
    expect(seen).toBe(2);
  });
});

/**
 * R-P0-3：`Map` 的对象键 `set` 必须触发对应 key 的订阅者。
 *
 * 回归背景（2026-11-12）：`triggerCollectionMutation` 用 `toTriggerKey` 只放行
 * string/symbol，对象键被丢弃；而 `SET` 又没有 `undefined` 键的回退分支
 * ⇒ `map.set(objKey, v)` 完全不触发，读 `map.get(objKey)` 的 effect 停在旧值。
 * （`map.get` 侧是按**对象本体**订阅的，depsMap 运行期是普通 Map，能承载任意键。）
 */
describe('Map 对象键 set 的触发（R-P0-3）', () => {
  it('★ object 键的 get 订阅者在 set 后必须重跑', () => {
    const key = { id: 1 };
    const map = reactive(new Map<object, number>([[key, 1]]));
    let seen: number | undefined;
    effect(() => {
      seen = map.get(key);
    });
    expect(seen).toBe(1);

    map.set(key, 2);
    expect(seen).toBe(2);
  });

  it('★ 新增 object 键后 size 订阅者必须重跑', () => {
    const map = reactive(new Map<object, number>());
    let size = -1;
    effect(() => {
      size = map.size;
    });
    expect(size).toBe(0);

    map.set({ id: 1 }, 1);
    expect(size).toBe(1);
  });

  it('已有 object 键改值不应惊动 size 订阅者', () => {
    const key = {};
    const map = reactive(new Map<object, number>([[key, 1]]));
    const fn = vi.fn();
    effect(() => {
      fn(map.size);
    });
    expect(fn).toHaveBeenCalledTimes(1);

    map.set(key, 2);
    // size 不变 ⇒ 迭代类订阅者不应被触发
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
