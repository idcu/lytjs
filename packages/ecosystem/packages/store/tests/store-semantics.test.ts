import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  defineStore,
  createPinia,
  setActivePinia,
  storeToRefs,
  clearStoreCache,
} from '../src/index';
import { effect, signal } from '@lytjs/reactivity';

/**
 * 状态管理语义回归（2026-11-05）
 *
 * 钉的是「**界面不更新 / 数据没存住**」这一类 —— 它们都不抛异常：
 * 嵌套变更没被追踪、订阅没触发、getter 返回缓存、`$patch` 静默丢弃写入。
 * 既有 43 个用例全绿也覆盖不到，因为那些用例只读 `store.xxx`（拿到的是新值）。
 */
const fresh = () => {
  clearStoreCache();
  setActivePinia(createPinia());
};

beforeEach(fresh);

describe('嵌套响应：对象 / 数组的原地变更', () => {
  it('★ 数组 push 会触发 effect 与 $subscribe（此前两者都不动）', () => {
    const store = defineStore('nest-array', { state: () => ({ items: [1] }) })();
    const seen: number[] = [];
    effect(() => seen.push(store.items.length));
    const events: string[] = [];
    store.$subscribe((m) => events.push(m.type));

    store.items.push(2);

    expect(seen).toEqual([1, 2]);
    expect(events).toHaveLength(1);
    expect(store.items).toEqual([1, 2]);
  });

  it('★ 对象字段赋值会触发 effect 与 $subscribe', () => {
    const store = defineStore('nest-object', { state: () => ({ user: { name: 'a' } }) })();
    const seen: string[] = [];
    effect(() => seen.push(store.user.name));
    const events: string[] = [];
    store.$subscribe(() => events.push('hit'));

    store.user.name = 'b';

    expect(seen).toEqual(['a', 'b']);
    expect(events).toHaveLength(1);
  });

  it('splice 与 push 各自触发一次订阅', () => {
    const store = defineStore('nest-splice', { state: () => ({ list: ['a', 'b'] }) })();
    let hits = 0;
    store.$subscribe(() => hits++);

    store.list.splice(0, 1);
    store.list.push('c');

    expect(hits).toBe(2);
    expect(store.list).toEqual(['b', 'c']);
  });
});

describe('getters', () => {
  it('★ 跟随数组的嵌套变更（此前返回缓存旧值）', () => {
    const store = defineStore('getter-nested', {
      state: () => ({ items: [1] }),
      getters: { total: (s) => s.items.reduce((a, b) => a + b, 0) },
    })();
    const seen: number[] = [];
    effect(() => seen.push(store.total));

    store.items.push(2);

    expect(seen[seen.length - 1]).toBe(3);
  });

  it('链式 getter 跟随嵌套变更，且一次变更只重算一次', () => {
    const store = defineStore('getter-chain', {
      state: () => ({ items: [1] }),
      getters: {
        total: (s) => s.items.reduce((a, b) => a + b, 0),
        doubled: (s, g) => g.total * 2,
      },
    })();
    const seen: number[] = [];
    effect(() => seen.push(store.doubled));

    store.items.push(2);

    expect(seen).toEqual([2, 6]);
  });
});

describe('$patch / $state', () => {
  it('★ 未知键会告警（此前静默丢弃）', () => {
    const store = defineStore('patch-unknown', { state: () => ({ n: 1 }) })();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    store.$patch({ n: 2, ghost: 1 });

    const lines = warnSpy.mock.calls.map((args) => args.map(String).join(' '));
    warnSpy.mockRestore();
    expect(store.n).toBe(2);
    expect(lines.some((line) => line.includes('ghost'))).toBe(true);
    expect('ghost' in store.$state).toBe(false);
  });

  it('★ $state 整体赋值生效（此前抛 TypeError）', () => {
    const store = defineStore('state-assign', { state: () => ({ a: 1, b: 2 }) })();
    expect(() => {
      store.$state = { a: 9, b: 8 };
    }).not.toThrow();
    expect(store.a).toBe(9);
    expect(store.b).toBe(8);
  });

  it('$patch 只发一条事件、$reset 也只发一条', () => {
    const store = defineStore('patch-events', { state: () => ({ a: 1, b: 2 }) })();
    const events: string[] = [];
    store.$subscribe((m) => events.push(m.type));

    store.$patch({ a: 10, b: 20 });
    expect(events).toEqual(['patch object']);

    events.length = 0;
    store.$reset();
    expect(events).toHaveLength(1);
    expect(store.a).toBe(1);
  });
});

describe('storeToRefs', () => {
  it('★ 只提取 state + getters，不把 action 转成 ref', () => {
    const store = defineStore('refs', {
      state: () => ({ n: 1 }),
      getters: { double: (s) => s.n * 2 },
      actions: {
        inc() {
          this.n++;
        },
      },
    })();
    const refs = storeToRefs(store);

    expect(Object.keys(refs).sort()).toEqual(['double', 'n']);
    expect(typeof store.inc).toBe('function');

    store.n = 10;
    expect(refs.n.value).toBe(10);
    expect(refs.double.value).toBe(20);
  });
});

describe('setup store', () => {
  it('★ 状态键解包成值（此前 `store.n` 是信号函数）', () => {
    const store = defineStore('setup-unwrap', () => {
      const n = signal(1);
      const inc = () => n.set(n() + 1);
      return { n, inc };
    })();

    expect(store.n).toBe(1);
    store.n = 5;
    expect(store.n).toBe(5);
    store.inc();
    expect(store.n).toBe(6);
  });

  it('★ 直接赋值会通知订阅者（此前只在 action 边界触发）', () => {
    const store = defineStore('setup-sub', () => {
      const n = signal(1);
      return { n };
    })();
    let hits = 0;
    store.$subscribe(() => hits++);

    store.n = 2;

    expect(hits).toBe(1);
  });

  it('★ $state 只含状态键（此前连 action 一起暴露）', () => {
    const store = defineStore('setup-state', () => {
      const n = signal(1);
      const inc = () => n.set(n() + 1);
      return { n, inc };
    })();

    expect(Object.keys(store.$state)).toEqual(['n']);
    expect(store.$state.n).toBe(1);
  });

  it('★ $patch(fn) 的写入不丢失（此前 mutator 拿到裸 ref 容器）', () => {
    const store = defineStore('setup-patch', () => {
      const n = signal(1);
      return { n };
    })();

    store.$patch((s) => {
      (s as { n: number }).n = 42;
    });

    expect(store.n).toBe(42);
  });

  it('action 里的 this 指向解包后的 store', () => {
    const store = defineStore('setup-this', () => {
      const n = signal(1);
      const inc = function (this: { n: number }) {
        this.n = this.n + 1;
      };
      return { n, inc };
    })();

    store.inc();
    expect(store.n).toBe(2);
  });

  it('$reset() 给出可操作告警（不静默）', () => {
    const store = defineStore('setup-reset', () => ({ n: 1 }))();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    store.$reset();
    const lines = warnSpy.mock.calls.map((args) => args.map(String).join(' '));
    warnSpy.mockRestore();
    expect(lines.some((line) => line.includes('$reset'))).toBe(true);
  });
});

describe('生命周期', () => {
  it('★ $dispose() 之后旧 store 的订阅不再触发', () => {
    const useStore = defineStore('dispose', { state: () => ({ n: 1 }) });
    const first = useStore();
    let hits = 0;
    first.$subscribe(() => hits++);

    first.$dispose();
    first.n = 2;

    expect(hits).toBe(0);
    const second = useStore();
    expect(second).not.toBe(first);
    expect(second.n).toBe(1);
  });

  it('★ clearStoreCache() 之后旧 store 的订阅不再触发', () => {
    const store = defineStore('cache-clear', { state: () => ({ n: 1 }) })();
    let hits = 0;
    store.$subscribe(() => hits++);

    clearStoreCache();
    store.n = 99;

    expect(hits).toBe(0);
  });

  it('不同 pinia 的 store 互不影响', () => {
    const piniaA = createPinia();
    const piniaB = createPinia();
    const useUser = defineStore('user', { state: () => ({ name: 'anon' }) });

    const a = useUser(piniaA);
    const b = useUser(piniaB);
    a.name = 'alice';

    expect(a).not.toBe(b);
    expect(b.name).toBe('anon');
    expect(useUser(piniaA)).toBe(a);
  });
});
