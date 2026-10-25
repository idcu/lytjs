/**
 * 行为级判据：`@lytjs/component` 的**生命周期**模块（`src/lifecycle.ts`，454 行、19 个导出）
 *
 * ## 为什么要有这条
 *
 * 这是所有 `onMounted` / `onUpdated` / `onUnmounted` / `onErrorCaptured` 的落点，
 * 也是「钩子里抛的错去哪了」的唯一出口。覆盖率实测仅 ~64%（96 行空档），
 * 而空档里有一条 P1：
 *
 * **`handleError()` 在「无人处理」时静默返回 false** —— 而全部调用点
 * （setup / 生命周期 / data / computed / watch / render）都忽略返回值。
 * 于是没有 `onErrorCaptured`、也没有 `app.errorHandler` 时，钩子里抛的错
 * **完全不留痕**：页面空白、控制台一行没有。本电池最后一条守住"必须留痕"。
 *
 * ## 手法
 *
 * 生命周期是纯注册 + 纯调用，不需要渲染器：造一个最小内部实例（`lifecycle` 六个 Set、
 * `type` 上的选项式钩子、`parent` 链、`root.appContext.config`），直接驱动
 * `call*Hook` / `handleError`，断言**调用顺序、调用次数、错误去向**。
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  setCurrentInstance,
  getCurrentInstance,
  onMounted,
  onUpdated,
  onUnmounted,
  onBeforeMount,
  onBeforeUpdate,
  onBeforeUnmount,
  onErrorCaptured,
  onActivated,
  onDeactivated,
  onRenderTracked,
  onRenderTriggered,
  callLifecycleHook,
  callCreatedHook,
  callMountedHook,
  callUpdatedHook,
  callBeforeUnmountHook,
  callUnmountedHook,
  handleError,
} from '../src/lifecycle';
import type { ComponentInternalInstance } from '../src/types';

const LIFECYCLE_KEYS = [
  'beforeMount',
  'mounted',
  'beforeUpdate',
  'updated',
  'beforeUnmount',
  'unmounted',
] as const;

function makeInstance(over: Record<string, unknown> = {}) {
  const lifecycle = Object.fromEntries(
    LIFECYCLE_KEYS.map((k) => [k, new Set<() => void>()]),
  ) as Record<(typeof LIFECYCLE_KEYS)[number], Set<() => void>>;

  const instance = {
    lifecycle,
    type: {} as Record<string, unknown>,
    ctx: {} as Record<string, unknown>,
    parent: null as unknown,
    isMounted: false,
    isUnmounted: false,
    ...over,
  };

  // `root` 指向自己（无父时即根）
  if (!('root' in instance)) {
    (instance as unknown as Record<string, unknown>).root = instance;
    (instance as unknown as Record<string, unknown>).appContext = {
      config: { globalProperties: {}, errorHandler: undefined },
    };
  }

  return instance;
}

const asInternal = (i: ReturnType<typeof makeInstance>) =>
  i as unknown as ComponentInternalInstance;

let warnSpy: ReturnType<typeof vi.spyOn>;
let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  setCurrentInstance(null);
  vi.restoreAllMocks();
});

// ==================== 当前实例 ====================

describe('currentInstance', () => {
  it('setCurrentInstance / getCurrentInstance 成对', () => {
    expect(getCurrentInstance()).toBeNull();

    const inst = makeInstance();
    setCurrentInstance(asInternal(inst));

    expect(getCurrentInstance()).toBe(asInternal(inst));

    setCurrentInstance(null);
    expect(getCurrentInstance()).toBeNull();
  });
});

// ==================== 注册 ====================

describe('组合式钩子注册到对应集合', () => {
  it('六个基础钩子各进各的 Set', () => {
    const inst = makeInstance();
    setCurrentInstance(asInternal(inst));

    const fns = {
      beforeMount: vi.fn(),
      mounted: vi.fn(),
      beforeUpdate: vi.fn(),
      updated: vi.fn(),
      beforeUnmount: vi.fn(),
      unmounted: vi.fn(),
    };

    onBeforeMount(fns.beforeMount);
    onMounted(fns.mounted);
    onBeforeUpdate(fns.beforeUpdate);
    onUpdated(fns.updated);
    onBeforeUnmount(fns.beforeUnmount);
    onUnmounted(fns.unmounted);

    for (const key of LIFECYCLE_KEYS) {
      expect(inst.lifecycle[key].size).toBe(1);
      expect([...inst.lifecycle[key]][0]).toBe(fns[key]);
    }
  });

  it('同一钩子注册多次会全部保留（不覆盖）', () => {
    const inst = makeInstance();
    setCurrentInstance(asInternal(inst));

    const a = vi.fn();
    const b = vi.fn();
    onMounted(a);
    onMounted(b);

    expect(inst.lifecycle.mounted.size).toBe(2);
  });

  it('★ 没有当前实例时注册会被丢弃，但必须告警（不能静默）', () => {
    setCurrentInstance(null);

    onMounted(vi.fn());

    expect(warnSpy).toHaveBeenCalled();
    expect(String(warnSpy.mock.calls[0]?.[0])).toContain('onMounted');
  });

  it('onErrorCaptured 收集到 errorCapturedHooks 数组', () => {
    const inst = makeInstance();
    setCurrentInstance(asInternal(inst));

    const fn = vi.fn();
    onErrorCaptured(fn);

    expect(inst.errorCapturedHooks).toEqual([fn]);
  });

  it('onActivated / onDeactivated 收集到各自数组', () => {
    const inst = makeInstance();
    setCurrentInstance(asInternal(inst));

    const a = vi.fn();
    const d = vi.fn();
    onActivated(a);
    onDeactivated(d);

    expect(inst.activatedHooks).toEqual([a]);
    expect(inst.deactivatedHooks).toEqual([d]);
  });

  it('onRenderTracked / onRenderTriggered 在 DEV 下注册', () => {
    const inst = makeInstance();
    setCurrentInstance(asInternal(inst));

    const t = vi.fn();
    const g = vi.fn();
    onRenderTracked(t);
    onRenderTriggered(g);

    expect(inst.renderTrackedHooks).toEqual([t]);
    expect(inst.renderTriggeredHooks).toEqual([g]);
  });
});

// ==================== 调用顺序 ====================

describe('调用阶段：组合式与选项式都按顺序执行', () => {
  it('callMountedHook：beforeMount → mounted，并置 isMounted', () => {
    const order: string[] = [];
    const inst = makeInstance({
      type: {
        beforeMount: () => order.push('opt:beforeMount'),
        mounted: () => order.push('opt:mounted'),
      },
    });
    inst.lifecycle.beforeMount.add(() => order.push('comp:beforeMount'));
    inst.lifecycle.mounted.add(() => order.push('comp:mounted'));

    callMountedHook(asInternal(inst));

    expect(order).toEqual(['comp:beforeMount', 'opt:beforeMount', 'comp:mounted', 'opt:mounted']);
    expect(inst.isMounted).toBe(true);
  });

  it('callCreatedHook：beforeCreate → created', () => {
    const order: string[] = [];
    const inst = makeInstance({
      type: {
        beforeCreate: () => order.push('beforeCreate'),
        created: () => order.push('created'),
      },
    });

    callCreatedHook(asInternal(inst));

    expect(order).toEqual(['beforeCreate', 'created']);
  });

  it('callUpdatedHook：beforeUpdate → updated', () => {
    const order: string[] = [];
    const inst = makeInstance({
      isMounted: true,
      type: {
        beforeUpdate: () => order.push('opt:beforeUpdate'),
        updated: () => order.push('opt:updated'),
      },
    });
    inst.lifecycle.beforeUpdate.add(() => order.push('comp:beforeUpdate'));
    inst.lifecycle.updated.add(() => order.push('comp:updated'));

    callUpdatedHook(asInternal(inst));

    expect(order).toEqual(['comp:beforeUpdate', 'opt:beforeUpdate', 'comp:updated', 'opt:updated']);
  });

  it('未挂载就调用 update 钩子 ⇒ 告警（顺序契约）', () => {
    const inst = makeInstance();

    callUpdatedHook(asInternal(inst));

    expect(warnSpy).toHaveBeenCalled();
  });

  it('callBeforeUnmountHook 不置 isUnmounted；callUnmountedHook 才置', () => {
    const inst = makeInstance({ isMounted: true });
    const order: string[] = [];
    inst.lifecycle.beforeUnmount.add(() => order.push('beforeUnmount'));
    inst.lifecycle.unmounted.add(() => order.push('unmounted'));

    callBeforeUnmountHook(asInternal(inst));
    expect(inst.isUnmounted).toBe(false);

    callUnmountedHook(asInternal(inst));
    expect(inst.isUnmounted).toBe(true);
    expect(order).toEqual(['beforeUnmount', 'unmounted']);
  });

  it('callLifecycleHook 只跑指定阶段', () => {
    const inst = makeInstance();
    const mounted = vi.fn();
    const updated = vi.fn();
    inst.lifecycle.mounted.add(mounted);
    inst.lifecycle.updated.add(updated);

    callLifecycleHook(asInternal(inst), 'mounted');

    expect(mounted).toHaveBeenCalledTimes(1);
    expect(updated).not.toHaveBeenCalled();
  });

  it('选项式钩子的 this 指向实例 ctx', () => {
    const ctx = { tag: 'CTX' };
    const seen: unknown[] = [];
    const inst = makeInstance({
      ctx,
      type: {
        mounted(this: unknown) {
          seen.push(this);
        },
      },
    });

    callMountedHook(asInternal(inst));

    expect(seen[0]).toBe(ctx);
  });
});

// ==================== 错误去向 ====================

describe('handleError：捕获链与传播', () => {
  it('组件级 onErrorCaptured 返回 false ⇒ 停止传播并报告已处理', () => {
    const inst = makeInstance();
    const hook = vi.fn(() => false);
    inst.errorCapturedHooks = [hook];

    const handled = handleError(new Error('boom'), asInternal(inst), 'mounted');

    expect(handled).toBe(true);
    expect(hook).toHaveBeenCalledTimes(1);
    expect((hook.mock.calls[0] as unknown[])[2]).toBe('mounted');
  });

  it('onErrorCaptured 返回 undefined ⇒ 继续向父传播', () => {
    const parentHook = vi.fn(() => false);
    const parent = makeInstance();
    parent.errorCapturedHooks = [parentHook];
    const child = makeInstance({ parent, root: parent });
    child.errorCapturedHooks = [vi.fn()];

    const handled = handleError(new Error('boom'), asInternal(child), 'mounted');

    expect(handled).toBe(true);
    expect(parentHook).toHaveBeenCalledTimes(1);
  });

  it('选项式 errorCaptured 返回 false 同样能拦截', () => {
    const inst = makeInstance({
      type: {
        errorCaptured: vi.fn(() => false),
      },
    });

    expect(handleError(new Error('x'), asInternal(inst), 'setup')).toBe(true);
    expect(inst.type.errorCaptured).toHaveBeenCalled();
  });

  it('无人处理但有 app.errorHandler ⇒ 交给它并报告已处理', () => {
    const appErrorHandler = vi.fn();
    const inst = makeInstance();
    (inst.appContext as { config: Record<string, unknown> }).config.errorHandler = appErrorHandler;

    const handled = handleError(new Error('x'), asInternal(inst), 'render');

    expect(handled).toBe(true);
    expect(appErrorHandler).toHaveBeenCalledTimes(1);
  });

  it('★ 完全无人处理 ⇒ 返回 false，且**必须**在控制台留痕', () => {
    const inst = makeInstance();

    const handled = handleError(new Error('nobody-handles-me'), asInternal(inst), 'onMounted');

    expect(handled).toBe(false);
    expect(errorSpy).toHaveBeenCalled();
    const out = errorSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(out).toContain('nobody-handles-me');
    expect(out).toContain('onMounted');
  });

  it('★ 钩子抛错不向外冒泡，且错误同样留痕', () => {
    const inst = makeInstance();
    inst.lifecycle.mounted.add(() => {
      throw new Error('thrown-in-mounted');
    });

    expect(() => callLifecycleHook(asInternal(inst), 'mounted')).not.toThrow();

    const out = errorSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(out).toContain('thrown-in-mounted');
  });

  it('钩子抛错但被 onErrorCaptured 接住 ⇒ 不再重复打印', () => {
    const inst = makeInstance();
    inst.errorCapturedHooks = [() => false];
    inst.lifecycle.mounted.add(() => {
      throw new Error('captured');
    });

    callLifecycleHook(asInternal(inst), 'mounted');

    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('选项式钩子抛错同样被接住并留痕', () => {
    const inst = makeInstance({
      type: {
        mounted() {
          throw new Error('opt-throw');
        },
      },
    });

    expect(() => callMountedHook(asInternal(inst))).not.toThrow();
    const out = errorSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(out).toContain('opt-throw');
  });

  it('instance 为 null 时 handleError 不抛，返回 false 并留痕', () => {
    expect(() => handleError(new Error('orphan'), null, 'unknown')).not.toThrow();
    expect(errorSpy).toHaveBeenCalled();
  });
});
