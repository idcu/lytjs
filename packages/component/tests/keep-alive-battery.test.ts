/**
 * 行为级判据：`@lytjs/component` 的 **KeepAlive 缓存层**（`src/keep-alive.ts`，639 行、覆盖率 72%）
 *
 * ## 为什么要有这条
 *
 * KeepAlive 是**状态机 + 缓存**：`include`/`exclude` 决定进不进缓存、LRU 决定谁被淘汰、
 * `activate`/`deactivate` 决定钩子顺序。算错的表现不是崩，而是「组件被销毁了但页面还在」
 * 或「缓存无限增长」。这里只测**可独立驱动**的导出函数（匹配 / key / 缓存 / 激活钩子），
 * 不涉及渲染器。
 *
 * ## 空档里的缺陷
 *
 * `matchesPattern` 对正则直接 `pattern.test(name)`。带 `g` / `y` 标志的正则 `test()`
 * 会**推进 `lastIndex`** ⇒ 同一个模式连续调用会在 true/false 之间跳变：
 * `include: /Foo/g` 于是"第一次缓存、第二次不缓存"，取决于调用次数而不是组件名。
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  matchesPattern,
  getCacheKey,
  createKeepAliveInstance,
  cacheInstance,
  getCachedInstance,
  removeCachedInstance,
  activateInstance,
  deactivateInstance,
} from '../src/keep-alive';

const vnodeOf = (type: unknown) => ({ type }) as never;

let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ==================== include / exclude 匹配 ====================

describe('matchesPattern', () => {
  it('未配置模式 ⇒ 一律匹配', () => {
    expect(matchesPattern('Foo', undefined)).toBe(true);
  });

  it('字符串按**全等**匹配（不是包含）', () => {
    expect(matchesPattern('Foo', 'Foo')).toBe(true);
    expect(matchesPattern('FooBar', 'Foo')).toBe(false);
  });

  it('正则匹配', () => {
    expect(matchesPattern('FooBar', /^Foo/)).toBe(true);
  });

  it('★ 带 g 标志的正则连续调用结果必须一致（不能受 lastIndex 影响）', () => {
    const pattern = /Foo/g;

    expect(matchesPattern('Foo', pattern)).toBe(true);
    expect(matchesPattern('Foo', pattern)).toBe(true);
    expect(matchesPattern('Foo', pattern)).toBe(true);
  });

  it('★ 带 y（粘性）标志同理', () => {
    const pattern = /Foo/y;

    expect(matchesPattern('Foo', pattern)).toBe(true);
    expect(matchesPattern('Foo', pattern)).toBe(true);
  });

  it('数组：任一命中即可', () => {
    expect(matchesPattern('Bar', ['Foo', /^Bar$/])).toBe(true);
    expect(matchesPattern('Baz', ['Foo', /^Bar$/])).toBe(false);
  });

  it('组件无名 ⇒ 不匹配（避免把匿名组件全部纳入缓存）', () => {
    expect(matchesPattern(undefined, 'Foo')).toBe(false);
    expect(matchesPattern(undefined, /Foo/)).toBe(false);
  });
});

// ==================== 缓存 key ====================

describe('getCacheKey', () => {
  it('字符串 type 直接作 key', () => {
    expect(getCacheKey(createKeepAliveInstance({}), vnodeOf('div'))).toBe('div');
  });

  it('具名组件对象取 name', () => {
    expect(getCacheKey(createKeepAliveInstance({}), vnodeOf({ name: 'MyComp' }))).toBe('MyComp');
  });

  it('具名函数组件取 name', () => {
    function NamedComp() {}
    expect(getCacheKey(createKeepAliveInstance({}), vnodeOf(NamedComp))).toBe('NamedComp');
  });

  it('onCacheKey 优先于默认推导', () => {
    const ka = createKeepAliveInstance({ onCacheKey: () => 'custom' });
    expect(getCacheKey(ka, vnodeOf('div'))).toBe('custom');
  });

  it('onCacheKey 抛错 ⇒ 回落到默认 key 并告警（不向外抛）', () => {
    const ka = createKeepAliveInstance({
      onCacheKey: () => {
        throw new Error('bad key');
      },
    });

    expect(() => getCacheKey(ka, vnodeOf('div'))).not.toThrow();
    expect(getCacheKey(ka, vnodeOf('div'))).toBe('div');
    expect(warnSpy).toHaveBeenCalled();
  });

  it('两个不同的匿名组件不得共享同一个 key', () => {
    const ka = createKeepAliveInstance({});
    const a = getCacheKey(ka, vnodeOf({ render: () => null }));
    const b = getCacheKey(ka, vnodeOf({ render: () => null }));

    expect(a).not.toBe(b);
  });
});

// ==================== 缓存读写与 LRU ====================

describe('缓存读写', () => {
  it('cacheInstance 后能取回同一个实例', () => {
    const ka = createKeepAliveInstance({});
    const inst = { uid: 1 };

    cacheInstance(ka, 'k', inst as never);

    expect(getCachedInstance(ka, 'k')).toBe(inst);
  });

  it('removeCachedInstance 删除并返回是否删到', () => {
    const ka = createKeepAliveInstance({});
    cacheInstance(ka, 'k', { uid: 1 } as never);

    expect(removeCachedInstance(ka, 'k')).toBe(true);
    expect(getCachedInstance(ka, 'k')).toBeUndefined();
    expect(removeCachedInstance(ka, 'k')).toBe(false);
  });

  it('★ 超过 max 时淘汰最久未使用的（get 会刷新新鲜度）', () => {
    const ka = createKeepAliveInstance({ max: 2 });
    cacheInstance(ka, 'a', { id: 'a' } as never);
    cacheInstance(ka, 'b', { id: 'b' } as never);

    // 读一次 a ⇒ a 变成最近使用，b 才是最久未用
    getCachedInstance(ka, 'a');
    cacheInstance(ka, 'c', { id: 'c' } as never);

    expect(getCachedInstance(ka, 'a')).toBeDefined();
    expect(getCachedInstance(ka, 'b')).toBeUndefined();
    expect(getCachedInstance(ka, 'c')).toBeDefined();
  });

  it('max: 0 ⇒ 不缓存任何条目', () => {
    const ka = createKeepAliveInstance({ max: 0 });
    cacheInstance(ka, 'a', { id: 'a' } as never);

    expect(getCachedInstance(ka, 'a')).toBeUndefined();
  });
});

// ==================== 激活 / 停用钩子 ====================

describe('activateInstance / deactivateInstance', () => {
  // 实例需要 `type` / `ctx`（选项式钩子路径）与 `isDeactivated`（状态位）
  const withHooks = () => {
    const activated = vi.fn();
    const deactivated = vi.fn();
    return {
      instance: {
        type: {},
        ctx: {},
        isDeactivated: false,
        activatedHooks: [activated],
        deactivatedHooks: [deactivated],
      },
      activated,
      deactivated,
    };
  };

  it('activate 调用所有 activatedHooks', () => {
    const { instance, activated, deactivated } = withHooks();

    activateInstance(instance as never);

    expect(activated).toHaveBeenCalledTimes(1);
    expect(deactivated).not.toHaveBeenCalled();
  });

  it('deactivate 调用所有 deactivatedHooks', () => {
    const { instance, activated, deactivated } = withHooks();

    deactivateInstance(instance as never);

    expect(deactivated).toHaveBeenCalledTimes(1);
    expect(activated).not.toHaveBeenCalled();
  });

  it('activate 置 isDeactivated=false，deactivate 置 true', () => {
    const { instance } = withHooks();

    deactivateInstance(instance as never);
    expect(instance.isDeactivated).toBe(true);

    activateInstance(instance as never);
    expect(instance.isDeactivated).toBe(false);
  });

  it('选项式 type.activated / type.deactivated 也会被调用，this 指向 ctx', () => {
    const seen: unknown[] = [];
    const instance = {
      type: {
        activated(this: unknown) {
          seen.push(this);
        },
        deactivated(this: unknown) {
          seen.push(this);
        },
      },
      ctx: { tag: 'ctx' },
      isDeactivated: false,
    };

    activateInstance(instance as never);
    deactivateInstance(instance as never);

    expect(seen).toEqual([instance.ctx, instance.ctx]);
  });

  it('钩子抛错不向外冒泡', () => {
    const instance = {
      type: {},
      ctx: {},
      isDeactivated: false,
      // handleError 会读 instance.root.appContext.config，缺了就会在错误处理里再抛一次
      root: { appContext: { config: {} } },
      activatedHooks: [
        () => {
          throw new Error('boom');
        },
      ],
      deactivatedHooks: [],
    };

    expect(() => activateInstance(instance as never)).not.toThrow();
  });
});
