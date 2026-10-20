/**
 * 行为级判据：`@lytjs/ssr` 的**服务端组件支持**（`src/server-components.ts`，355 行）
 *
 * ## 为什么要有这条
 *
 * 实测该文件 **178/199 语句未覆盖（10.6%）** —— 生命周期管理、预取缓存、VNode 组件收集、
 * 状态序列化几乎整段未测。这些是 SSR 的"数据通道"：序列化/反序列化一旦丢数据，
 * 客户端水合时就会拿到残缺状态，且**不会报错**。
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  stateManager,
  registerServerComponent,
  unregisterServerComponent,
  collectPrefetchComponents,
  prefetchAllComponents,
  safeSerializeState,
  safeDeserializeState,
  buildDehydratedState,
  ServerComponent,
} from '../src/server-components';

beforeEach(() => {
  stateManager.clearAll();
  vi.restoreAllMocks();
});

const reg = (name: string, extra: Record<string, unknown> = {}) => ({
  name,
  render: () => ({ type: 'div' }) as never,
  ...extra,
});

// ==================== 注册 ====================

describe('注册与注销', () => {
  it('register / getRegistration / unregister', () => {
    registerServerComponent('A', reg('A'));

    expect(stateManager.getRegistration('A')).toBeDefined();

    unregisterServerComponent('A');

    expect(stateManager.getRegistration('A')).toBeUndefined();
  });

  it('注销不存在的组件不抛错', () => {
    expect(() => unregisterServerComponent('nope')).not.toThrow();
  });
});

// ==================== 生命周期 ====================

describe('initializeComponent / cleanupComponent', () => {
  it('未注册的组件初始化 ⇒ 明确报错', async () => {
    await expect(stateManager.initializeComponent('ghost', { componentId: 'c' })).rejects.toThrow(
      /not registered/,
    );
  });

  it('onServerInit 只执行一次（重复初始化幂等）', async () => {
    const init = vi.fn();
    registerServerComponent('A', reg('A', { onServerInit: init }));

    await stateManager.initializeComponent('A', { componentId: 'c1' });
    await stateManager.initializeComponent('A', { componentId: 'c1' });

    expect(init).toHaveBeenCalledTimes(1);
  });

  it('异步 onServerInit 会被等待', async () => {
    const order: string[] = [];
    registerServerComponent(
      'A',
      reg('A', {
        onServerInit: async () => {
          await new Promise((r) => setTimeout(r, 1));
          order.push('init');
        },
      }),
    );

    await stateManager.initializeComponent('A', { componentId: 'c' });
    order.push('after');

    expect(order).toEqual(['init', 'after']);
  });

  it('onServerInit 抛错 ⇒ 初始化状态不置位（可重试）', async () => {
    let attempts = 0;
    registerServerComponent(
      'A',
      reg('A', {
        onServerInit: () => {
          attempts++;
          if (attempts === 1) throw new Error('boom');
        },
      }),
    );

    await expect(stateManager.initializeComponent('A', { componentId: 'c' })).rejects.toThrow(
      'boom',
    );
    await expect(
      stateManager.initializeComponent('A', { componentId: 'c' }),
    ).resolves.toBeUndefined();

    expect(attempts).toBe(2);
  });

  it('cleanup 执行钩子并重置初始化状态（可再次初始化）', async () => {
    const init = vi.fn();
    const cleanup = vi.fn();
    registerServerComponent('A', reg('A', { onServerInit: init, onServerCleanup: cleanup }));

    await stateManager.initializeComponent('A', { componentId: 'c' });
    await stateManager.cleanupComponent('A', { componentId: 'c' });

    expect(cleanup).toHaveBeenCalledTimes(1);

    await stateManager.initializeComponent('A', { componentId: 'c' });
    expect(init).toHaveBeenCalledTimes(2);
  });

  it('清理未注册的组件是空操作', async () => {
    await expect(
      stateManager.cleanupComponent('ghost', { componentId: 'c' }),
    ).resolves.toBeUndefined();
  });
});

// ==================== 预取 ====================

describe('prefetchComponentData', () => {
  it('未注册或没有 prefetch ⇒ 返回空数据', async () => {
    expect(await stateManager.prefetchComponentData('nope', { path: '/' } as never)).toEqual({
      data: {},
    });

    registerServerComponent('B', reg('B'));
    expect(await stateManager.prefetchComponentData('B', { path: '/' } as never)).toEqual({
      data: {},
    });
  });

  it('并发相同 key 只执行一次（复用同一 Promise）', async () => {
    const prefetch = vi.fn(async () => ({ data: { ok: true } }));
    registerServerComponent('C', reg('C', { prefetch }));

    const [a, b] = await Promise.all([
      stateManager.prefetchComponentData('C', { path: '/x' } as never),
      stateManager.prefetchComponentData('C', { path: '/x' } as never),
    ]);

    expect(prefetch).toHaveBeenCalledTimes(1);
    expect(a).toEqual({ data: { ok: true } });
    expect(b).toEqual({ data: { ok: true } });
  });

  it('完成后缓存被清理（下次会重新预取）', async () => {
    const prefetch = vi.fn(async () => ({ data: {} }));
    registerServerComponent('D', reg('D', { prefetch }));

    await stateManager.prefetchComponentData('D', { path: '/' } as never, 'k');
    await stateManager.prefetchComponentData('D', { path: '/' } as never, 'k');

    expect(prefetch).toHaveBeenCalledTimes(2);
  });
});

describe('prefetchAllComponents', () => {
  it('汇总各组件的预取结果', async () => {
    registerServerComponent('A', reg('A', { prefetch: async () => ({ data: { a: 1 } }) }));
    registerServerComponent('B', reg('B', { prefetch: async () => ({ data: { b: 2 } }) }));

    const results = await prefetchAllComponents(['A', 'B'], { path: '/' } as never);

    expect(results.A).toEqual({ data: { a: 1 } });
    expect(results.B).toEqual({ data: { b: 2 } });
  });

  it('★ 单个组件预取失败不影响其余（降级为空数据 + 警告）', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    registerServerComponent(
      'Bad',
      reg('Bad', {
        prefetch: async () => {
          throw new Error('prefetch-boom');
        },
      }),
    );
    registerServerComponent('Good', reg('Good', { prefetch: async () => ({ data: { ok: 1 } }) }));

    const results = await prefetchAllComponents(['Bad', 'Good'], { path: '/' } as never);

    expect(results.Bad).toEqual({ data: {} });
    expect(results.Good).toEqual({ data: { ok: 1 } });
    expect(warn).toHaveBeenCalled();
  });
});

// ==================== VNode 收集 ====================

describe('collectPrefetchComponents', () => {
  const compVNode = (name: string) => {
    const type = function Comp() {};
    // 函数的 `name` 是只读属性（严格模式下直接赋值会抛错）
    Object.defineProperty(type, 'name', { value: name, configurable: true });
    return { type, children: null };
  };

  it('收集已注册的组件名（去重）', () => {
    registerServerComponent('A', reg('A'));

    const tree = { type: 'div', children: [compVNode('A'), compVNode('A')] };

    expect(collectPrefetchComponents(tree as never)).toEqual(['A']);
  });

  it('未注册的组件名不入结果', () => {
    expect(collectPrefetchComponents(compVNode('Unknown') as never)).toEqual([]);
  });

  it('★ 顶层传入**数组**时也要能收集（签名里写了 VNode[]）', () => {
    registerServerComponent('A', reg('A'));
    registerServerComponent('B', reg('B'));

    expect(collectPrefetchComponents([compVNode('A'), compVNode('B')] as never).sort()).toEqual([
      'A',
      'B',
    ]);
  });

  it('单个子对象（非数组）也会被递归', () => {
    registerServerComponent('Nested', reg('Nested'));

    const tree = { type: 'div', children: compVNode('Nested') };

    expect(collectPrefetchComponents(tree as never)).toEqual(['Nested']);
  });

  it('null / 字符串 / 数字等非对象输入安全返回空', () => {
    expect(collectPrefetchComponents(null)).toEqual([]);
    expect(collectPrefetchComponents('text')).toEqual([]);
    expect(collectPrefetchComponents(42)).toEqual([]);
  });
});

// ==================== 状态序列化 ====================

describe('safeSerializeState / safeDeserializeState', () => {
  it('普通对象往返', () => {
    const state = { a: 1, b: [2, 3], c: { d: 'x' } };

    expect(safeDeserializeState(safeSerializeState(state))).toEqual(state);
  });

  it('Date / RegExp / Set / Map 能还原类型', () => {
    const state = {
      d: new Date('2026-01-02T03:04:05.000Z'),
      r: /ab+c/gi,
      s: new Set([1, 2]),
      m: new Map<string, number>([['k', 1]]),
    };

    const out = safeDeserializeState(safeSerializeState(state)) as typeof state;

    expect(out.d).toBeInstanceOf(Date);
    expect(out.d.toISOString()).toBe('2026-01-02T03:04:05.000Z');
    expect(out.r).toBeInstanceOf(RegExp);
    expect(out.r.source).toBe('ab+c');
    expect(out.s).toBeInstanceOf(Set);
    expect([...out.s]).toEqual([1, 2]);
    expect(out.m).toBeInstanceOf(Map);
    expect(out.m.get('k')).toBe(1);
  });

  it('★ 真循环引用被标记为 [Circular]', () => {
    const state: Record<string, unknown> = { name: 'root' };
    state.self = state;

    const json = safeSerializeState(state);

    expect(json).toContain('[Circular]');
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('★ 共享引用（非循环）不得被误判成循环', () => {
    // 原实现用一个只增不减的 `seen` 集合 ⇒ 同一对象出现第二次就返回 '[Circular]'
    // ⇒ `{ a: shared, b: shared }` 里的 b 会变成字符串 '[Circular]'，**丢数据**。
    const shared = { v: 1 };
    const state = { a: shared, b: shared };

    const out = safeDeserializeState(safeSerializeState(state)) as {
      a: unknown;
      b: unknown;
    };

    expect(out.a).toEqual({ v: 1 });
    expect(out.b).toEqual({ v: 1 });
  });
});

// ==================== 脱水状态 / 装饰器 ====================

describe('buildDehydratedState / ServerComponent', () => {
  it('buildDehydratedState 按组件名聚合数据', () => {
    const state = buildDehydratedState({ A: { data: { x: 1 } } as never });

    expect(state.A).toEqual({ componentName: 'A', props: {}, data: { x: 1 } });
  });

  it('ServerComponent 装饰器注册组件（含钩子与默认 render）', () => {
    const onInit = vi.fn();
    const prefetch = async () => ({ data: { p: 1 } });

    const Comp = { render: () => ({ type: 'section' }) as never };
    ServerComponent({ name: 'Decorated', prefetch, onInit })(Comp);

    const registration = stateManager.getRegistration('Decorated')!;
    expect(registration).toBeDefined();
    expect(registration.prefetch).toBe(prefetch);
    expect(registration.onServerInit).toBe(onInit);
    expect(registration.render()).toEqual({ type: 'section' });
  });

  it('被装饰的类没有 render 时使用默认渲染', () => {
    ServerComponent({ name: 'NoRender' })({} as never);

    expect(stateManager.getRegistration('NoRender')!.render()).toEqual({ type: 'div' });
  });
});
