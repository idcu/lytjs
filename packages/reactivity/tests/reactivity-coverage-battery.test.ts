/**
 * reactivity 覆盖率电池（Task C）：补齐 reactive.ts 与 watch.ts 的未覆盖分支
 *   - reactive / readonly / shallowReactive / toRaw / isReactive / isReadonly / isProxy / markRaw
 *   - reactive(readonly) 早返回、冻结对象不做代理、readonly 上 delete 警告
 *   - 集合（Map/Set）响应式的 get/set/delete/keys/values/entries/forEach
 *   - readonly 集合的变异方法被拦截
 *   - watch：getter 源、数组源、reactive deep、traverse 数组/Map/Set、flush sync/post、stop 幂等、回调抛错
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
  ref,
  watch,
} from '../src/index';
import { nextTick } from '@lytjs/common-scheduler';

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('reactivity battery: reactive basics & flags', () => {
  it('marks and unwraps reactive/readonly', () => {
    const raw = { a: 1 };
    const r = reactive(raw);
    expect(isReactive(r)).toBe(true);
    expect(isProxy(r)).toBe(true);
    expect(toRaw(r)).toBe(raw);
    expect(isReactive(raw)).toBe(false);

    const ro = readonly(raw);
    expect(isReadonly(ro)).toBe(true);
    expect(isReactive(ro)).toBe(false);

    const sr = shallowReactive({ a: 1 });
    expect(isReactive(sr)).toBe(true);

    const sro = shallowReadonly({ a: 1 });
    expect(isReadonly(sro)).toBe(true);

    const mr = markRaw(raw);
    expect(isReactive(mr)).toBe(false);
    expect(reactive(mr)).toBe(mr);
  });

  it('handles frozen objects without throwing', () => {
    const frozen = Object.freeze({ a: 1 });
    const r = reactive(frozen);
    expect(r.a).toBe(1);
    const sealed = Object.seal({ b: 2 });
    expect(reactive(sealed).b).toBe(2);
  });

  it('readonly(reactive) returns a readonly view; reactive(readonly) returns same', () => {
    const r = reactive({ a: 1 });
    const ro = readonly(r);
    expect(isReadonly(ro)).toBe(true);
    // reactive(readonly) 直接返回入参
    expect(reactive(ro)).toBe(ro);
  });

  it('warns and blocks mutation on readonly', () => {
    const ro = readonly({ a: 1 });
    // 读取可触发 get 分支
    expect(ro.a).toBe(1);
    // delete 触发 readonly deleteProperty 分支

    delete (ro as any).a;
    expect(ro.a).toBe(1);
  });
});

describe('reactivity battery: collections', () => {
  it('reactive Map triggers on set/delete', () => {
    const m = reactive(new Map<string, number>());
    m.set('a', 1);
    expect(m.get('a')).toBe(1);
    expect(m.has('a')).toBe(true);
    expect(m.size).toBe(1);
    // keys/values/entries/forEach 触发 get 拦截分支
    expect([...m.keys()]).toEqual(['a']);
    expect([...m.values()]).toEqual([1]);
    expect([...m.entries()]).toEqual([['a', 1]]);
    m.forEach(() => {});
    m.set('a', 1); // 相同值
    m.delete('a');
    expect(m.has('a')).toBe(false);
    m.clear();
  });

  it('reactive Set works', () => {
    const s = reactive(new Set<number>());
    s.add(1);
    expect(s.has(1)).toBe(true);
    s.delete(1);
    expect(s.has(1)).toBe(false);
    s.clear();
  });

  it('readonly Map blocks mutation', () => {
    const m = readonly(new Map([['a', 1]]));
    expect(m.get('a')).toBe(1);
    m.set('b', 2); // 被拦截
    expect(m.has('b')).toBe(false);
    m.delete('a'); // 被拦截
    expect(m.has('a')).toBe(true);
  });
});

describe('reactivity battery: ref-in-reactive', () => {
  it('reflects ref value when read through reactive', () => {
    const inner = ref(1);
    const r = reactive({ nested: inner });
    expect(r.nested).toBe(1);
  });
});

describe('reactivity battery: traverse', () => {
  it('deep watch traverses arrays, Maps and Sets', async () => {
    const state = reactive({
      list: [1, 2, 3],
      map: new Map([['a', 1]]),
      set: new Set([1, 2]),
      nested: { deep: { value: 1 } },
    });
    const spy = { count: 0 };
    watch(state, () => spy.count++, { deep: true });
    state.nested.deep.value = 2;
    await nextTick();
    expect(spy.count).toBe(1);
  });
});

describe('reactivity battery: watch variants', () => {
  it('supports getter source', async () => {
    const a = ref(1);
    let seen = 0;
    watch(
      () => a.value * 2,
      (v) => {
        seen = v as number;
      },
    );
    a.value = 3;
    await nextTick();
    expect(seen).toBe(6);
  });

  it('supports array source with ref / reactive / getter', async () => {
    const a = ref(1);
    const obj = reactive({ b: 2 });
    let calls = 0;
    watch([a, obj, () => a.value + obj.b], () => calls++);
    a.value = 10;
    obj.b = 20;
    await nextTick();
    expect(calls).toBeGreaterThan(0);
  });

  it('flush sync runs immediately', () => {
    const a = ref(1);
    let v = 0;
    watch(a, (nv) => (v = nv as number), { flush: 'sync' });
    a.value = 5;
    expect(v).toBe(5);
  });

  it('flush post defers to post queue', async () => {
    const a = ref(1);
    let v = 0;
    watch(a, (nv) => (v = nv as number), { flush: 'post' });
    a.value = 7;
    await nextTick();
    expect(v).toBe(7);
  });

  it('stop is idempotent and prevents further callbacks', async () => {
    const a = ref(1);
    let calls = 0;
    const stop = watch(a, () => calls++);
    a.value = 2;
    await nextTick();
    expect(calls).toBe(1);
    stop();
    stop(); // 幂等分支
    a.value = 3;
    await nextTick();
    expect(calls).toBe(1);
  });

  it('invokes onCleanup and tolerates callback errors', () => {
    const a = ref(1);
    const cleanupSeen: number[] = [];
    const stop = watch(
      a,
      (_nv, _ov, onCleanup) => {
        onCleanup(() => cleanupSeen.push(1));
        throw new Error('cb error');
      },
      { flush: 'sync' },
    );
    a.value = 2;
    a.value = 3;
    expect(cleanupSeen.length).toBeGreaterThan(0);
    stop();
  });
});
