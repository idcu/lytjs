/**
 * 行为级判据：`@lytjs/devtools` 的 **Store 状态检查器**（`src/storeInspector.ts`，235 行）
 *
 * ## 为什么要有这条
 *
 * 该模块是 `@lytjs/devtools` 的公开导出面（12 个函数：注册表 / 读状态 / **按路径写状态** /
 * 派发 action / 订阅变更 / 序列化），而同包 `tests/index.test.ts`（786 行）**一个符号都没引用**。
 * `setStoreState(storeId, path, value)` 是**按路径写值**的 API —— 这类地方最容易出
 * 「返回值说谎」「原型污染」「路径不存在却报成功」三类问题。
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  registerStore,
  unregisterStore,
  getStoreStates,
  getStoreState,
  setStoreState,
  dispatchStoreAction,
  serializeStoreStates,
  subscribeStore,
  unsubscribeStore,
  onStoreChange,
  clearStoreRegistry,
  getRegisteredStoreIds,
} from '../src/storeInspector';

beforeEach(() => {
  clearStoreRegistry();
});

afterEach(() => {
  clearStoreRegistry();
  // 清理原型污染测试可能留下的痕迹
  delete (Object.prototype as Record<string, unknown>).__lytjs_polluted__;
  delete (Object.prototype as Record<string, unknown>).polluted;
});

// ==================== 注册表 ====================

describe('registerStore / unregisterStore / getRegisteredStoreIds', () => {
  it('注册后可按 id 列出；注销后消失', () => {
    registerStore('a', { $state: { n: 1 } });
    registerStore('b', { $state: { n: 2 } });
    expect(getRegisteredStoreIds()).toEqual(['a', 'b']);

    unregisterStore('a');
    expect(getRegisteredStoreIds()).toEqual(['b']);
  });

  it('重复注册同 id 覆盖', () => {
    registerStore('a', { $state: { n: 1 } });
    registerStore('a', { $state: { n: 9 } });

    expect(getRegisteredStoreIds()).toEqual(['a']);
    expect(getStoreState('a')!.state.n).toBe(9);
  });

  it('clearStoreRegistry 清空全部', () => {
    registerStore('a', { $state: {} });
    clearStoreRegistry();

    expect(getRegisteredStoreIds()).toEqual([]);
  });
});

// ==================== 读状态 ====================

describe('getStoreStates / getStoreState', () => {
  it('Pinia 风格（$state）读取状态', () => {
    registerStore('user', { $state: { name: 'a', age: 1 } });

    expect(getStoreState('user')!.state).toEqual({ name: 'a', age: 1 });
    expect(getStoreStates()).toHaveLength(1);
    expect(getStoreStates()[0]!.state).toEqual({ name: 'a', age: 1 });
  });

  it('普通对象风格：取非 $ 开头、非函数属性作为 state', () => {
    registerStore('plain', {
      count: 3,
      label: 'x',
      $internal: 'skip',
      doSomething: () => 1,
    } as never);

    expect(getStoreState('plain')!.state).toEqual({ count: 3, label: 'x' });
  });

  it('读不到时返回 null', () => {
    expect(getStoreState('nope')).toBeNull();
  });

  it('★ 返回的是**深拷贝**：改返回值不得影响 store 内部状态', () => {
    const state = { nested: { n: 1 } };
    registerStore('s', { $state: state });

    const got = getStoreState('s')!;
    (got.state.nested as { n: number }).n = 999;

    expect(state.nested.n).toBe(1);
  });

  it('★ 两个公开函数对同一个 store 的 id 必须一致（否则 setStoreState 无法回写）', () => {
    // 注册键与 store 自带的 $id 不同时，`getStoreStates()` 用 $id 覆盖了注册键，
    // 而 `getStoreState()` 用注册键 ⇒ 调用方拿 `getStoreStates()[i].id` 去 `setStoreState` 会失败。
    registerStore('registry-key', { $id: 'pinia-id', $state: { n: 1 } });

    const fromList = getStoreStates()[0]!.id;
    const fromSingle = getStoreState('registry-key')!.id;

    expect(fromList).toBe(fromSingle);
    // 且该 id 必须能回写（这是列表 → 写值 的自然用法）
    expect(setStoreState(fromList, 'n', 2)).toBe(true);
    expect(getStoreState('registry-key')!.state.n).toBe(2);
  });
});

// ==================== 按路径写状态 ====================

describe('setStoreState', () => {
  it('写顶层键成功并返回 true', () => {
    registerStore('s', { $state: { n: 1 } });

    expect(setStoreState('s', 'n', 42)).toBe(true);
    expect(getStoreState('s')!.state.n).toBe(42);
  });

  it('写嵌套路径成功', () => {
    registerStore('s', { $state: { a: { b: { c: 1 } } } });

    expect(setStoreState('s', 'a.b.c', 7)).toBe(true);
    expect(getStoreState('s')!.state).toEqual({ a: { b: { c: 7 } } });
  });

  it('store 不存在 ⇒ false', () => {
    expect(setStoreState('nope', 'n', 1)).toBe(false);
  });

  it('★ 中间路径不存在 ⇒ 必须返回 false（不得谎报成功）', () => {
    registerStore('s', { $state: { a: 1 } });

    expect(setStoreState('s', 'x.y.z', 1)).toBe(false);
    // 也不应把中间层"顺手创建"出来
    expect(getStoreState('s')!.state).toEqual({ a: 1 });
  });

  it('★ 空路径 ⇒ 必须返回 false（不得谎报成功）', () => {
    registerStore('s', { $state: { n: 1 } });

    expect(setStoreState('s', '', 1)).toBe(false);
  });

  it('★ 路径经过非对象（如字符串）⇒ 必须返回 false', () => {
    registerStore('s', { $state: { a: 'str' } });

    expect(setStoreState('s', 'a.b', 1)).toBe(false);
  });

  it('★ 不得原型污染：`__proto__` 路径不得写到 Object.prototype', () => {
    registerStore('s', { $state: { n: 1 } });

    const ok = setStoreState('s', '__proto__.polluted', 'X');

    expect(ok).toBe(false);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('★ 不得原型污染：`constructor.prototype` 路径同样必须被拒', () => {
    registerStore('s', { $state: { n: 1 } });

    const ok = setStoreState('s', 'constructor.prototype.polluted', 'X');

    expect(ok).toBe(false);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});

// ==================== 派发 action ====================

describe('dispatchStoreAction', () => {
  it('调用 action 并透传参数，this 绑定到 store', () => {
    const store = {
      $state: { n: 0 },
      add(a: number, b: number) {
        (this as { $state: { n: number } }).$state.n = a + b;
        return a + b;
      },
    };
    registerStore('s', store);

    expect(dispatchStoreAction('s', 'add', 2, 3)).toBe(5);
    expect(getStoreState('s')!.state.n).toBe(5);
  });

  it('action 不存在 ⇒ 抛错（明确失败，不静默）', () => {
    registerStore('s', { $state: {} });

    expect(() => dispatchStoreAction('s', 'nope')).toThrow(/not found/);
  });

  it('store 不存在 ⇒ 返回 null', () => {
    expect(dispatchStoreAction('nope', 'x')).toBeNull();
  });
});

// ==================== 序列化 ====================

describe('serializeStoreStates', () => {
  it('输出 JSON 文本', () => {
    const text = serializeStoreStates([{ id: 'a', state: { n: 1 } }]);
    expect(JSON.parse(text)).toEqual([{ id: 'a', state: { n: 1 } }]);
  });
});

// ==================== 订阅 ====================

describe('subscribeStore / unsubscribeStore / onStoreChange', () => {
  /** 造一个 Pinia 风格可订阅 store */
  const makeSubscribable = () => {
    const cbs = new Set<(m: unknown, s: Record<string, unknown>) => void>();
    const store = {
      $state: { n: 0 },
      $subscribe: vi.fn((cb: (m: unknown, s: Record<string, unknown>) => void) => {
        cbs.add(cb);
        return () => void cbs.delete(cb);
      }),
    };
    const emit = (s: Record<string, unknown>) => cbs.forEach((cb) => cb({}, s));
    return { store, emit, cbs };
  };

  it('订阅后变更会通知全局回调（收到 storeId 与 state 拷贝）', () => {
    const { store, emit } = makeSubscribable();
    registerStore('s', store);
    const seen: Array<[string, Record<string, unknown>]> = [];
    onStoreChange((id, state) => seen.push([id, state]));

    expect(subscribeStore('s')).toBe(true);
    emit({ n: 5 });

    expect(seen).toHaveLength(1);
    expect(seen[0]![0]).toBe('s');
    expect(seen[0]![1]).toEqual({ n: 5 });
  });

  it('回调收到的是**拷贝**：改它不影响原 state', () => {
    const { store, emit } = makeSubscribable();
    registerStore('s', store);
    let got: Record<string, unknown> | null = null;
    onStoreChange((_id, state) => {
      got = state;
    });

    subscribeStore('s');
    const live = { n: 1 };
    emit(live);
    (got as unknown as { n: number }).n = 99;

    expect(live.n).toBe(1);
  });

  it('重复订阅会先取消旧订阅（不重复通知）', () => {
    const { store, emit, cbs } = makeSubscribable();
    registerStore('s', store);
    const cb = vi.fn();
    onStoreChange(cb);

    subscribeStore('s');
    subscribeStore('s');

    expect(cbs.size).toBe(1); // 旧订阅已被取消
    emit({ n: 1 });
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('无 $subscribe ⇒ 返回 false（降级）', () => {
    registerStore('s', { $state: {} });

    expect(subscribeStore('s')).toBe(false);
  });

  it('store 不存在 ⇒ false', () => {
    expect(subscribeStore('nope')).toBe(false);
  });

  it('unsubscribeStore 后不再通知', () => {
    const { store, emit } = makeSubscribable();
    registerStore('s', store);
    const cb = vi.fn();
    onStoreChange(cb);

    subscribeStore('s');
    unsubscribeStore('s');
    emit({ n: 1 });

    expect(cb).not.toHaveBeenCalled();
  });

  it('onStoreChange 返回的取消函数生效', () => {
    const { store, emit } = makeSubscribable();
    registerStore('s', store);
    const cb = vi.fn();
    const off = onStoreChange(cb);

    subscribeStore('s');
    off();
    emit({ n: 1 });

    expect(cb).not.toHaveBeenCalled();
  });

  it('clearStoreRegistry 会取消所有订阅', () => {
    const { store, emit, cbs } = makeSubscribable();
    registerStore('s', store);
    subscribeStore('s');

    clearStoreRegistry();
    emit({ n: 1 });

    expect(cbs.size).toBe(0);
  });
});
