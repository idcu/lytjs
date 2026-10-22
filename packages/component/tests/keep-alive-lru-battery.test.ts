// @vitest-environment jsdom
/**
 * `component/src/keep-alive.ts` —— LRU 容量与缓存键的补充判据。
 *
 * 既有 `keep-alive.test.ts` / `keep-alive-branches.test.ts` 已覆盖 matchesPattern、getCacheKey
 * 主干、淘汰的**退化路径**、activated/deactivated 钩子。本文件补：
 * ① `setMaxSize` 的容量变更（含**负容量死循环**）；
 * ② **匿名组件的缓存键撞车**；
 * ③ 淘汰的**渲染器路径**（`__rendererUnmount`）；
 * ④ 钩子抛错隔离。
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  createKeepAliveInstance,
  getCacheKey,
  activateInstance,
  deactivateInstance,
} from '../src/keep-alive';
import { ShapeFlags } from '@lytjs/common-vnode';
import type { VNode } from '@lytjs/common-vnode';
import type { ComponentInternalInstance } from '../src/types';

/** 轻量 vnode：本包测试统一用普通对象，不引入 vdom 渲染器 */
function vnodeOf(type: unknown): VNode {
  return { type, props: {}, children: null, shapeFlag: ShapeFlags.ELEMENT } as unknown as VNode;
}

afterEach(() => {
  vi.restoreAllMocks();
});

/** 取 KeepAlive 实例内部的 LRU 缓存 */
function getCache(ka: ComponentInternalInstance): {
  size: number;
  set(key: string, instance: unknown): void;
  get(key: string): unknown;
  keys(): IterableIterator<string>;
  setMaxSize(n: number): void;
} {
  return (ka as unknown as { setupState: { cache: never } }).setupState.cache;
}

function makeInstance(tag = 'x'): ComponentInternalInstance {
  const inst = {
    uid: Math.floor(Math.random() * 1e6),
    vnode: vnodeOf(tag),
    subTree: null,
    props: {},
    ctx: {},
    type: { name: tag },
    isUnmounted: false,
    isDeactivated: false,
    effects: [],
    // `handleError` 会沿 parent 链找 errorCaptured，最后读 `instance.root.appContext.config`
    parent: null,
    errorCapturedHooks: [],
    appContext: { config: {} },
  } as unknown as ComponentInternalInstance & { root: ComponentInternalInstance };

  inst.root = inst;
  return inst;
}

describe('LRU 容量变更（setMaxSize）', () => {
  it('缩小容量 ⇒ 立即淘汰最旧条目', () => {
    const ka = createKeepAliveInstance({ max: 5 });
    const cache = getCache(ka);
    cache.set('a', makeInstance('a'));
    cache.set('b', makeInstance('b'));
    cache.set('c', makeInstance('c'));

    cache.setMaxSize(2);

    expect(cache.size).toBe(2);
    expect(Array.from(cache.keys())).toEqual(['b', 'c']);
  });

  it('扩大容量 ⇒ 不淘汰任何条目', () => {
    const ka = createKeepAliveInstance({ max: 2 });
    const cache = getCache(ka);
    cache.set('a', makeInstance('a'));
    cache.set('b', makeInstance('b'));

    cache.setMaxSize(10);

    expect(cache.size).toBe(2);
  });

  it('容量设为 0 ⇒ 清空缓存', () => {
    const ka = createKeepAliveInstance({ max: 3 });
    const cache = getCache(ka);
    cache.set('a', makeInstance('a'));
    cache.set('b', makeInstance('b'));

    cache.setMaxSize(0);

    expect(cache.size).toBe(0);
  });

  it('★ 容量设为负数 ⇒ 必须终止（原实现在 `while` 里删不掉元素，会**死循环**）', () => {
    // ⚠️ 回归守卫：如果 `setMaxSize` 里的 clamp / break 被去掉，本用例会**挂死**
    //    （同步死循环无法被 vitest 超时打断）。这是有意为之 —— 该缺陷的表现就是进程卡死。
    const ka = createKeepAliveInstance({ max: 3 });
    const cache = getCache(ka);
    cache.set('a', makeInstance('a'));

    expect(() => cache.setMaxSize(-1)).not.toThrow();
    expect(cache.size).toBe(0);
  });

  it('★ 容量为 0 的缓存不接收任何条目', () => {
    const ka = createKeepAliveInstance({ max: 0 });
    const cache = getCache(ka);

    cache.set('a', makeInstance('a'));

    expect(cache.size).toBe(0);
  });
});

describe('缓存键：匿名组件不能撞车', () => {
  const ka = createKeepAliveInstance({});

  it('★ 两个不同的匿名组件对象必须得到**不同**的 key', () => {
    const A = { render: () => null };
    const B = { render: () => null };

    const keyA = getCacheKey(ka, vnodeOf(A));
    const keyB = getCacheKey(ka, vnodeOf(B));

    // 修复前：两者都走 `String(type)` ⇒ 都是 '[object Object]' ⇒ 切回时**渲染出错误的组件**
    expect(keyA).not.toBe(keyB);
  });

  it('同一个匿名组件定义多次取 key 必须稳定', () => {
    const A = { render: () => null };

    const k1 = getCacheKey(ka, vnodeOf(A));
    const k2 = getCacheKey(ka, vnodeOf(A));

    expect(k1).toBe(k2);
  });

  it('两个不同的匿名函数组件也必须得到不同的 key', () => {
    const f1 = (): null => null;
    const f2 = (): null => null;

    const k1 = getCacheKey(ka, vnodeOf(f1));
    const k2 = getCacheKey(ka, vnodeOf(f2));

    expect(k1).not.toBe(k2);
  });

  it('具名组件仍用 name 作为 key（不被匿名分支影响）', () => {
    const k = getCacheKey(ka, vnodeOf({ name: 'Named', render: () => null }));

    expect(k).toBe('Named');
  });
});

describe('淘汰的渲染器路径', () => {
  it('★ 实例带 `__rendererUnmount` 时交给渲染器卸载，并清掉 KEEP_ALIVE 标记', () => {
    const ka = createKeepAliveInstance({ max: 1 });
    const cache = getCache(ka);

    const unmountSpy = vi.fn();
    const inst = makeInstance('a');
    (inst as unknown as { __rendererUnmount: unknown }).__rendererUnmount = unmountSpy;
    inst.vnode!.shapeFlag |= ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE;
    const stopSpy = vi.fn();
    (inst as unknown as { effects: { stop(): void }[] }).effects = [{ stop: stopSpy }];

    cache.set('a', inst);
    cache.set('b', makeInstance('b')); // 触发对 'a' 的淘汰

    expect(unmountSpy).toHaveBeenCalledWith(inst.vnode);
    // 必须先清标记，否则渲染器会走「停用」而不是销毁（泄漏）
    expect(inst.vnode!.shapeFlag & ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE).toBe(0);
    expect(stopSpy).toHaveBeenCalled();
  });
});

describe('激活 / 停用钩子的错误隔离', () => {
  it('activateInstance 清 isDeactivated 并调用钩子', () => {
    const hook = vi.fn();
    const inst = makeInstance('a');
    inst.isDeactivated = true;
    (inst as unknown as { activatedHooks: (() => void)[] }).activatedHooks = [hook];

    activateInstance(inst);

    expect(inst.isDeactivated).toBe(false);
    expect(hook).toHaveBeenCalledTimes(1);
  });

  it('deactivateInstance 置 isDeactivated 并调用钩子', () => {
    const hook = vi.fn();
    const inst = makeInstance('a');
    (inst as unknown as { deactivatedHooks: (() => void)[] }).deactivatedHooks = [hook];

    deactivateInstance(inst);

    expect(inst.isDeactivated).toBe(true);
    expect(hook).toHaveBeenCalledTimes(1);
  });

  it('★ 某个激活钩子抛错不影响后续钩子（错误被 handleError 吞掉）', () => {
    const second = vi.fn();
    const inst = makeInstance('a');
    (inst as unknown as { activatedHooks: (() => void)[] }).activatedHooks = [
      () => {
        throw new Error('hook-boom');
      },
      second,
    ];

    expect(() => activateInstance(inst)).not.toThrow();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('★ 某个停用钩子抛错同样被隔离', () => {
    const second = vi.fn();
    const inst = makeInstance('a');
    (inst as unknown as { deactivatedHooks: (() => void)[] }).deactivatedHooks = [
      () => {
        throw new Error('hook-boom');
      },
      second,
    ];

    expect(() => deactivateInstance(inst)).not.toThrow();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
