/**
 * 行为级判据：组件实例的 **effect scope**（资源释放）
 *
 * ## 为什么要有这条
 *
 * 2026-11-03 实测的 P0：组件实例**从来没有 effect scope**。
 * `runSetup` 只是 `setCurrentInstance(instance); setup(...)`，于是 setup 里
 * `watch()` / `watchEffect()` 创建的 effect 落在「当前活跃 scope」——
 * 顶层调用时根本没有 scope ⇒ **无人持有、无人停止**。
 *
 * 这个缺陷的恶劣之处是**任何行为断言都不会因此变红**：
 *
 *   · `app.unmount()` 后 `onUnmounted` 照常触发（4/4）
 *   · DOM 照常移除干净
 *   · 页面看不出任何异常
 *
 * 但那些 effect 还活着，并且**持有组件实例引用** ⇒ 实例 → subTree →
 * 已脱离文档的 DOM 全部无法回收。实测 20 轮挂载/卸载后改一次状态，
 * 20 个已卸载组件的回调全被调用（泄漏正好 = N）。
 *
 * 本文件守的是「结构契约」：实例有 scope、setup 跑在 scope 里、
 * `callUnmountedHook` 会停它。**端到端行为**由门禁
 * `scripts/check-lifecycle-release.mjs` 守（33 条断言）。
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ref,
  watch,
  watchEffect,
  getCurrentScope,
  onScopeDispose,
  type EffectScope,
} from '@lytjs/reactivity';
import { createComponentInstance, setupComponent } from '../src/component-setup';
import { callUnmountedHook, setCurrentInstance } from '../src/lifecycle';
import type { ComponentInternalInstance } from '../src/types';

/** 造一个能被 createComponentInstance 接受的最小 vnode */
function makeVNode(type: Record<string, unknown>) {
  return {
    type,
    props: null,
    children: null,
    el: null,
    key: null,
    shapeFlag: 4, // STATEFUL_COMPONENT
    component: null,
  } as unknown as Parameters<typeof createComponentInstance>[0];
}

let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  setCurrentInstance(null);
  vi.restoreAllMocks();
  void warnSpy;
});

describe('组件实例的 effect scope', () => {
  it('createComponentInstance 会创建 scope', () => {
    const inst = createComponentInstance(makeVNode({ name: 'A' }), null);
    expect(inst.scope).toBeDefined();
    expect(inst.scope?.active).toBe(true);
  });

  it('scope 是 detached 的（不挂到父 scope 上）', () => {
    const inst = createComponentInstance(makeVNode({ name: 'A' }), null);
    // detached scope 不参与父级的 stop 级联 —— KeepAlive 停用的组件必须保持"活"。
    // effectScope 的父链在创建时确定；顶层创建时 parent 为 undefined。
    expect(inst.scope?.parent).toBeUndefined();
  });

  it('setup 运行在组件 scope 里（getCurrentScope 非空）', () => {
    let scopeInSetup: EffectScope | null = null;
    const type = {
      name: 'A',
      setup() {
        scopeInSetup = getCurrentScope() ?? null;
        return {};
      },
    };
    const inst = createComponentInstance(makeVNode(type), null);
    setupComponent(inst);

    expect(scopeInSetup).not.toBeNull();
    expect(scopeInSetup).toBe(inst.scope);
  });

  it('setup 里创建的 watch / watchEffect 被收进 scope', () => {
    const state = ref(0);
    const type = {
      name: 'A',
      setup() {
        watch(state, () => {});
        watchEffect(() => {
          state.value;
        });
        return {};
      },
    };
    const inst = createComponentInstance(makeVNode(type), null);
    setupComponent(inst);

    // watch 1 个 + watchEffect 1 个（computed 若用到也会进来）
    expect(inst.scope?.effects.length).toBeGreaterThanOrEqual(2);
  });

  it('callUnmountedHook 会 stop scope，之后副作用不再执行', () => {
    const state = ref(0);
    let watchRuns = 0;
    let effectRuns = 0;

    const type = {
      name: 'A',
      setup() {
        watch(state, () => watchRuns++, { flush: 'sync' });
        watchEffect(() => {
          state.value;
          effectRuns++;
        });
        return {};
      },
    };
    const inst = createComponentInstance(makeVNode(type), null);
    setupComponent(inst);

    const beforeWatch = watchRuns;
    const beforeEffect = effectRuns;
    expect(beforeEffect).toBe(1); // watchEffect 首跑

    callUnmountedHook(inst as ComponentInternalInstance);

    expect(inst.scope?.active).toBe(false);

    state.value = 1;
    expect(watchRuns).toBe(beforeWatch);
    expect(effectRuns).toBe(beforeEffect);
  });

  it('setup 里 onScopeDispose 注册的回调在卸载时执行', () => {
    let disposed = 0;
    const type = {
      name: 'A',
      setup() {
        onScopeDispose(() => disposed++);
        return {};
      },
    };
    const inst = createComponentInstance(makeVNode(type), null);
    setupComponent(inst);

    expect(disposed).toBe(0);
    callUnmountedHook(inst as ComponentInternalInstance);
    expect(disposed).toBe(1);
  });

  it('unmounted 钩子里副作用仍然可读（stop 发生在钩子之后）', () => {
    const state = ref('init');
    let seenInUnmounted: unknown = null;

    const type = {
      name: 'A',
      unmounted() {
        // 选项式钩子 —— 在 stop 之前执行，此时读状态应正常
        seenInUnmounted = state.value;
      },
      setup() {
        watch(state, () => {});
        return {};
      },
    };
    const inst = createComponentInstance(makeVNode(type), null);
    setupComponent(inst);
    callUnmountedHook(inst as ComponentInternalInstance);

    expect(seenInUnmounted).toBe('init');
  });

  it('重复 callUnmountedHook 不会抛错（stop 幂等）', () => {
    const inst = createComponentInstance(makeVNode({ name: 'A', setup: () => ({}) }), null);
    setupComponent(inst);
    expect(() => {
      callUnmountedHook(inst as ComponentInternalInstance);
      callUnmountedHook(inst as ComponentInternalInstance);
    }).not.toThrow();
  });

  it('手工构造的实例（无 scope）调用 callUnmountedHook 不抛错', () => {
    // 单测里常见这种部分构造的实例；`scope?.stop()` 必须容忍 undefined
    const fake = {
      lifecycle: {
        beforeMount: new Set(),
        mounted: new Set(),
        beforeUpdate: new Set(),
        updated: new Set(),
        beforeUnmount: new Set(),
        unmounted: new Set(),
      },
      type: {},
      ctx: {},
      parent: null,
      root: null,
      appContext: { config: { globalProperties: {} } },
      isMounted: true,
      isUnmounted: false,
    } as unknown as ComponentInternalInstance;

    expect(() => callUnmountedHook(fake)).not.toThrow();
  });
});
