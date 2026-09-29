// @vitest-environment jsdom
/**
 * keep-alive 分支补测
 *
 * 补齐 `packages/component/src/keep-alive.ts` 中未被覆盖的分支，重点是：
 * - `matchesPattern` 的 4 类 pattern（undefined / string / RegExp / array）+ 兜底 `true`
 * - `getCacheKey` 的 `onCacheKey` 抛错回退、以及 `vnode.type` 的 string / object(有/无 name) /
 *   function(有/无 name) 全部形态
 * - `cacheInstance` 重复 key 的重排序路径
 * - `evictInstance` 的「已卸载早退」「无渲染器退化路径」「el 无父节点」「el 有父节点」
 *   「无 effects」等分支
 * - `activateInstance` / `deactivateInstance` 的「有/无 hooks」与「hook 抛错」分支
 * - LRU `setMaxSize`（经 `max` prop 的 watcher 触发）
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  createKeepAliveInstance,
  cacheInstance,
  getCachedInstance,
  removeCachedInstance,
  activateInstance,
  deactivateInstance,
  matchesPattern,
  getCacheKey,
  defineComponent,
  createComponentInstance,
  setupComponent,
} from '../src/index';
import type { ComponentInternalInstance } from '../src/types';
import type { VNode } from '@lytjs/common-vnode';

function createSimpleInstance(
  name: string,
  extra: Record<string, unknown> = {},
): ComponentInternalInstance {
  const options = defineComponent({ name, ...extra } as never);
  const vnode = { type: options, props: {}, children: null } as unknown as VNode;
  const instance = createComponentInstance(vnode, null);
  setupComponent(instance);
  return instance;
}

function vnodeOf(type: unknown): VNode {
  return { type, props: {}, children: null } as unknown as VNode;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('keep-alive 分支补测', () => {
  // ==================== matchesPattern ====================
  describe('matchesPattern', () => {
    it('pattern 未提供 ⇒ 视为匹配（true）', () => {
      expect(matchesPattern('Any', undefined)).toBe(true);
    });

    it('name 为 undefined 且提供了 pattern ⇒ 不匹配（false）', () => {
      expect(matchesPattern(undefined, 'Any')).toBe(false);
    });

    it('string pattern：等值才匹配', () => {
      expect(matchesPattern('Foo', 'Foo')).toBe(true);
      expect(matchesPattern('Foo', 'Bar')).toBe(false);
    });

    it('RegExp pattern：test 语义', () => {
      expect(matchesPattern('FooBar', /^Foo/)).toBe(true);
      expect(matchesPattern('FooBar', /^Bar/)).toBe(false);
    });

    it('数组 pattern：任一命中即可（含嵌套 RegExp）', () => {
      expect(matchesPattern('Foo', ['Bar', 'Foo'])).toBe(true);
      expect(matchesPattern('Foo', ['Bar', /^Fo/])).toBe(true);
      expect(matchesPattern('Foo', ['Bar', 'Baz'])).toBe(false);
    });

    it('非法 pattern（既非 string/RegExp/数组）⇒ 兜底返回 true', () => {
      expect(matchesPattern('Foo', {} as never)).toBe(true);
    });
  });

  // ==================== getCacheKey ====================
  describe('getCacheKey', () => {
    it('vnode.type 为字符串 ⇒ 直接作为 key', () => {
      const ka = createKeepAliveInstance();
      expect(getCacheKey(ka, vnodeOf('div'))).toBe('div');
    });

    it('vnode.type 为「具名对象」⇒ 用其 name', () => {
      const ka = createKeepAliveInstance();
      expect(getCacheKey(ka, vnodeOf({ name: 'CompA' }))).toBe('CompA');
    });

    it('vnode.type 为「name 为空字符串的对象」⇒ 回退到 String(type)', () => {
      const ka = createKeepAliveInstance();
      // 注意：`name: undefined` 不行 —— `String(undefined)` 是字符串 'undefined'（真值），
      // 不会走 `||` 兜底。只有 `name === ''` 才让 `String(name)` 为假值。
      const type = { name: '' };
      expect(getCacheKey(ka, vnodeOf(type))).toBe(String(type));
    });

    it('vnode.type 为「具名函数」⇒ 用函数名', () => {
      const ka = createKeepAliveInstance();
      function NamedComp(): null {
        return null;
      }
      expect(getCacheKey(ka, vnodeOf(NamedComp))).toBe('NamedComp');
    });

    it('vnode.type 为「匿名函数」⇒ 回退到 String(type)', () => {
      const ka = createKeepAliveInstance();
      const anon = (): null => null;
      Object.defineProperty(anon, 'name', { value: '' });
      expect(getCacheKey(ka, vnodeOf(anon))).toBe(String(anon));
    });

    it('自定义 onCacheKey：返回数字时转成字符串', () => {
      const ka = createKeepAliveInstance({ onCacheKey: () => 42 });
      expect(getCacheKey(ka, vnodeOf('div'))).toBe('42');
    });

    it('自定义 onCacheKey 抛错 ⇒ 捕获、DEV 下告警、回退默认 key', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const ka = createKeepAliveInstance({
        onCacheKey: () => {
          throw new Error('boom');
        },
      });
      expect(getCacheKey(ka, vnodeOf('div'))).toBe('div');
      expect(warnSpy).toHaveBeenCalled();
    });
  });

  // ==================== cacheInstance / get / remove ====================
  describe('cacheInstance / getCachedInstance / removeCachedInstance', () => {
    it('重复 key 会重排序（不重复占位）', () => {
      const ka = createKeepAliveInstance();
      const a1 = createSimpleInstance('A');
      const a2 = createSimpleInstance('A');
      cacheInstance(ka, 'k', a1);
      cacheInstance(ka, 'k', a2); // 命中 LRU set 的 has(key) 分支
      expect(getCachedInstance(ka, 'k')).toBe(a2);
      expect((ka.setupState as any).cache.size).toBe(1);
    });

    it('未缓存时 get 返回 undefined；remove 返回是否命中', () => {
      const ka = createKeepAliveInstance();
      expect(getCachedInstance(ka, 'missing')).toBeUndefined();
      expect(removeCachedInstance(ka, 'missing')).toBe(false);

      cacheInstance(ka, 'x', createSimpleInstance('X'));
      expect(removeCachedInstance(ka, 'x')).toBe(true);
    });
  });

  // ==================== LRU 淘汰的退化路径 ====================
  describe('evictInstance 退化路径（无渲染器）', () => {
    it('max=1 连续入缓存会淘汰旧条目', () => {
      const ka = createKeepAliveInstance({ max: 1 });
      const a = { type: {} } as unknown as ComponentInternalInstance;
      const b = { type: {} } as unknown as ComponentInternalInstance;
      cacheInstance(ka, 'a', a);
      cacheInstance(ka, 'b', b);
      expect(getCachedInstance(ka, 'a')).toBeUndefined();
      expect(getCachedInstance(ka, 'b')).toBe(b);
    });

    it('对「已卸载」实例再淘汰 ⇒ 提前返回（不重复处理）', () => {
      const ka = createKeepAliveInstance({ max: 1 });
      const a = { type: {} } as unknown as ComponentInternalInstance;
      const b = { type: {} } as unknown as ComponentInternalInstance;
      const c = { type: {} } as unknown as ComponentInternalInstance;
      cacheInstance(ka, 'a', a);
      cacheInstance(ka, 'b', b); // 淘汰 a ⇒ a.isUnmounted=true
      cacheInstance(ka, 'a', a); // 淘汰 b
      cacheInstance(ka, 'c', c); // 再淘汰 a ⇒ 命中 `isUnmounted` 早退分支
      expect(getCachedInstance(ka, 'c')).toBe(c);
      expect((a as any).isUnmounted).toBe(true);
    });

    it('淘汰含 DOM 的实例 ⇒ 从父节点移除该元素', () => {
      const parent = document.createElement('div');
      const el = document.createElement('span');
      parent.appendChild(el);

      const ka = createKeepAliveInstance({ max: 1 });
      const withEl = {
        type: {},
        subTree: { el },
        isUnmounted: false,
      } as unknown as ComponentInternalInstance;
      cacheInstance(ka, 'withEl', withEl);
      cacheInstance(ka, 'other', { type: {} } as unknown as ComponentInternalInstance);

      expect(parent.contains(el)).toBe(false);
    });

    it('淘汰「subTree 无 el」的实例 ⇒ 跳过 DOM 移除（不抛错）', () => {
      const ka = createKeepAliveInstance({ max: 1 });
      cacheInstance(ka, 'noEl', {
        type: {},
        subTree: { el: null },
        isUnmounted: false,
      } as unknown as ComponentInternalInstance);
      expect(() =>
        cacheInstance(ka, 'other', { type: {} } as unknown as ComponentInternalInstance),
      ).not.toThrow();
    });

    it('无 document 时 storage 为 null，deactivate 不移动 DOM（不抛错）', () => {
      vi.stubGlobal('document', undefined);
      const ka = createKeepAliveInstance();
      const inst = createSimpleInstance('NoDoc');
      const vnode = vnodeOf(inst.type);
      (vnode as any).component = inst;
      expect(() => (ka.setupState as any).deactivate(vnode)).not.toThrow();
    });
  });

  // ==================== activateInstance / deactivateInstance ====================
  describe('activateInstance / deactivateInstance', () => {
    it('调用 options 级 activated / deactivated 钩子', () => {
      const activated = vi.fn();
      const deactivated = vi.fn();
      const inst = createSimpleInstance('Hooked', { activated, deactivated });

      activateInstance(inst);
      expect(inst.isDeactivated).toBe(false);
      expect(activated).toHaveBeenCalledTimes(1);

      deactivateInstance(inst);
      expect(inst.isDeactivated).toBe(true);
      expect(deactivated).toHaveBeenCalledTimes(1);
    });

    it('同时调用组合式 activatedHooks / deactivatedHooks（含抛错不中断）', () => {
      const inst = createSimpleInstance('Composed');
      const ok1 = vi.fn();
      const ok2 = vi.fn();
      (inst as any).activatedHooks = [
        ok1,
        () => {
          throw new Error('activated boom');
        },
        ok2,
      ];
      const dok1 = vi.fn();
      (inst as any).deactivatedHooks = [
        dok1,
        () => {
          throw new Error('deactivated boom');
        },
      ];

      expect(() => activateInstance(inst)).not.toThrow();
      expect(ok1).toHaveBeenCalledTimes(1);
      expect(ok2).toHaveBeenCalledTimes(1);

      expect(() => deactivateInstance(inst)).not.toThrow();
      expect(dok1).toHaveBeenCalledTimes(1);
    });

    it('无 hooks 时不抛错（覆盖 `?.` 空分支）', () => {
      const inst = createSimpleInstance('NoHooks');
      (inst as any).activatedHooks = undefined;
      (inst as any).deactivatedHooks = undefined;
      expect(() => activateInstance(inst)).not.toThrow();
      expect(() => deactivateInstance(inst)).not.toThrow();
    });
  });

  // ==================== max prop 变化（已知不生效，见下） ====================
  //
  // ⚠️ 2026-09-29 发现（**预存缺陷，未修**）：`setup` 里有
  //     `watch(() => props.max, newMax => cache.setMaxSize(newMax))`，
  //   但 `initProps`（component-setup.ts）构造的是**普通对象**（未 `reactive()`），
  //   该 getter 不被依赖收集 ⇒ **watcher 永不触发** ⇒ 运行期修改 KeepAlive 的 `max`
  //   **不会**收缩缓存（`LRUCache.setMaxSize` 实际是死路径）。
  //   修复需在 core 层让 props 具备响应式（影响面大，属独立决策），故此处**不写**
  //   「断言当前行为」的假测试（那会把 bug 固化成契约）。
});
