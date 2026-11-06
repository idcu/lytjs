// @vitest-environment jsdom
/**
 * 行为级判据：`@lytjs/component` 的 **ErrorBoundary**（`src/error-boundary.ts`，162 行）
 *
 * ## 为什么要有这条
 *
 * 覆盖率实测 **12.5%**（96 行里 84 行空档）—— 全仓最低的核心组件之一。而它正是
 * `handleError()` 传播链的**终点**：错误边界不工作，等于所有组件错误都没有出口。
 *
 * 空档里有一条「声明 ≠ 实际」：
 * **`fallback` prop 声明了却从未被读取** —— render 只认 `$slots.fallback`，
 * 于是 `<ErrorBoundary :fallback="ErrView">` 静默无效，用户只能看到默认文本。
 *
 * ## 手法
 *
 * 组件是纯 `setup`：借 `setCurrentInstance` 把钩子收集到一个假实例上，
 * 再用 `callMountedHook` / `callUnmountedHook` 驱动真实生命周期；
 * render 直接以假 ctx（只带 `$slots`）调用，断言产出的 vnode 形状。
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ErrorBoundary,
  errorLogManager,
  setGlobalErrorReporter,
  getGlobalErrorReporter,
} from '../src/error-boundary';
import { setCurrentInstance, callMountedHook, callUnmountedHook } from '../src/lifecycle';
import type { ComponentInternalInstance } from '../src/types';
import { Text, Fragment } from '@lytjs/common-vnode';

const LIFECYCLE_KEYS = [
  'beforeMount',
  'mounted',
  'beforeUpdate',
  'updated',
  'beforeUnmount',
  'unmounted',
] as const;

function makeInstance() {
  const lifecycle = Object.fromEntries(
    LIFECYCLE_KEYS.map((k) => [k, new Set<() => void>()]),
  ) as Record<(typeof LIFECYCLE_KEYS)[number], Set<() => void>>;

  const instance: Record<string, unknown> = {
    lifecycle,
    type: {},
    ctx: {},
    parent: null,
    isMounted: false,
    isUnmounted: false,
  };
  instance.root = instance;
  instance.appContext = { config: { globalProperties: {}, errorHandler: undefined } };
  return instance;
}

const asInternal = (i: Record<string, unknown>) => i as unknown as ComponentInternalInstance;

/** 挂载组件：注册钩子 → 返回 { render, instance } */
function mountBoundary(props: Record<string, unknown> = {}) {
  const instance = makeInstance();
  setCurrentInstance(asInternal(instance));

  const setup = ErrorBoundary.setup as unknown as (p: Record<string, unknown>) => unknown;
  const render = setup(props) as (ctx: { $slots: Record<string, unknown> }) => unknown;

  setCurrentInstance(null);
  callMountedHook(asInternal(instance));

  return { instance, render };
}

/** 触发错误边界：调用它注册的 onErrorCaptured 钩子 */
function triggerError(instance: Record<string, unknown>, err: Error, info = 'render') {
  const hooks = instance.errorCapturedHooks as
    | Array<(e: Error, i: unknown, info: string) => boolean | void>
    | undefined;
  expect(hooks?.length).toBe(1);
  return hooks![0]!(err, null, info);
}

const ctxWith = (slots: Record<string, unknown>) => ({ $slots: slots });

/** 递归收集 vnode 文本，用于断言默认错误 UI */
function textOf(node: unknown): string {
  if (node == null || node === false) return '';
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (typeof node === 'object' && 'children' in node) {
    return textOf((node as { children: unknown }).children);
  }
  return '';
}

type TestVNode = { type: unknown; props: Record<string, unknown>; children?: unknown };

/** 递归收集 vnode 里的按钮节点 */
function collectButtons(node: unknown, out: TestVNode[] = []): TestVNode[] {
  if (node == null || typeof node !== 'object') return out;
  if (Array.isArray(node)) {
    node.forEach((n) => collectButtons(n, out));
    return out;
  }
  const vnode = node as TestVNode;
  if (vnode.type === 'button') out.push(vnode);
  collectButtons(vnode.children, out);
  return out;
}

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  setCurrentInstance(null);
  vi.restoreAllMocks();
});

// ==================== 正常态 ====================

describe('正常态渲染默认插槽', () => {
  it('单个根节点 ⇒ 原样返回该 vnode', () => {
    const { render } = mountBoundary();
    const child = { type: 'div', children: 'ok' };

    expect(render(ctxWith({ default: () => [child] }))).toBe(child);
  });

  it('多个根节点 ⇒ 用 Fragment 包起来', () => {
    const { render } = mountBoundary();
    const kids = [{ type: 'i' }, { type: 'b' }];

    const out = render(ctxWith({ default: () => kids })) as { type: unknown; children: unknown[] };

    expect(out.type).toBe(Fragment);
    expect(out.children).toEqual(kids);
  });

  it('没有默认插槽 ⇒ 渲染空文本节点', () => {
    const { render } = mountBoundary();

    const out = render(ctxWith({})) as { type: unknown };

    expect(out.type).toBe(Text);
    expect(textOf(out)).toBe('');
  });

  it('默认插槽返回空数组 ⇒ 渲染空文本（不产出空 Fragment）', () => {
    const { render } = mountBoundary();

    const out = render(ctxWith({ default: () => [] })) as { type: unknown };

    expect(out.type).toBe(Text);
  });
});

// ==================== 错误态 ====================

describe('错误态', () => {
  it('捕获后 onErrorCaptured 返回 false（阻止继续向父传播）', () => {
    const { instance } = mountBoundary();

    expect(triggerError(instance, new Error('boom'))).toBe(false);
  });

  it('捕获后渲染默认错误 UI，含原始消息', () => {
    const { instance, render } = mountBoundary();
    triggerError(instance, new Error('kaboom'));

    const out = render(ctxWith({})) as { props: Record<string, unknown> };

    expect(out.props.class).toBe('error-boundary-fallback');
    expect(textOf(out)).toContain('kaboom');
  });

  it('onError 回调收到 (error, ErrorInfo)', () => {
    const onError = vi.fn();
    const { instance } = mountBoundary({ onError });

    const err = new Error('x');
    triggerError(instance, err, 'onMounted');

    expect(onError).toHaveBeenCalledWith(
      err,
      expect.objectContaining({ componentStack: 'onMounted', timestamp: expect.any(Date) }),
    );
  });

  it('具名插槽 fallback 优先，且能拿到 error', () => {
    const { instance, render } = mountBoundary();
    const err = new Error('slot-err');
    triggerError(instance, err);

    const slotVNode = { type: 'section' };
    const fallback = vi.fn(() => [slotVNode]);
    const out = render(ctxWith({ fallback }));

    expect(out).toBe(slotVNode);
    expect(fallback).toHaveBeenCalledWith({ error: err });
  });

  it('fallback 插槽返回多个节点 ⇒ Fragment 包装', () => {
    const { instance, render } = mountBoundary();
    triggerError(instance, new Error('multi'));

    const kids = [{ type: 'i' }, { type: 'b' }];
    const out = render(ctxWith({ fallback: () => kids })) as {
      type: unknown;
      children: unknown[];
    };

    expect(out.type).toBe(Fragment);
    expect(out.children).toEqual(kids);
  });

  it('fallback 插槽返回单个 vnode（非数组）也能直接用', () => {
    const { instance, render } = mountBoundary();
    triggerError(instance, new Error('single'));

    const single = { type: 'p' };
    expect(render(ctxWith({ fallback: () => single }))).toBe(single);
  });

  it('★ `fallback` prop（组件）必须生效 —— 此前只认插槽，prop 静默无效', () => {
    const FallbackView = { name: 'FallbackView' };
    const { instance, render } = mountBoundary({ fallback: FallbackView });
    const err = new Error('prop-err');
    triggerError(instance, err);

    const out = render(ctxWith({})) as { type: unknown; props: Record<string, unknown> };

    expect(out.type).toBe(FallbackView);
    expect(out.props.error).toBe(err);
  });

  it('fallback prop 优先于具名插槽（core 契约，2026-11-07 起）', () => {
    const FallbackView = { name: 'FallbackView' };
    const { instance, render } = mountBoundary({ fallback: FallbackView });
    triggerError(instance, new Error('both'));

    const out = render(ctxWith({ fallback: () => [{ type: 'aside' }] })) as {
      type: unknown;
      props: Record<string, unknown>;
    };

    expect(out.type).toBe(FallbackView);
  });
});

// ==================== 异步 Promise 拒绝 ====================

describe('capturePromiseRejections', () => {
  it('默认关闭 ⇒ 不注册 unhandledrejection', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');

    mountBoundary();

    expect(addSpy.mock.calls.filter((c) => c[0] === 'unhandledrejection')).toHaveLength(0);
  });

  it('开启后注册全局监听，拒绝事件把组件推进错误态', () => {
    const onError = vi.fn();
    const { render } = mountBoundary({ capturePromiseRejections: true, onError });

    window.dispatchEvent(
      Object.assign(new Event('unhandledrejection'), { reason: new Error('async-boom') }),
    );

    const out = render(ctxWith({}));
    expect(textOf(out)).toContain('async-boom');
    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ componentStack: 'unhandledrejection' }),
    );
  });

  it('非 Error 的 reason 被包成 Error（不能把字符串塞进 error 状态）', () => {
    const { render } = mountBoundary({ capturePromiseRejections: true });

    window.dispatchEvent(
      Object.assign(new Event('unhandledrejection'), { reason: 'plain-string' }),
    );

    const out = render(ctxWith({}));
    expect(textOf(out)).toContain('plain-string');
  });

  it('卸载后不再响应（监听器已摘除）', () => {
    const { instance, render } = mountBoundary({ capturePromiseRejections: true });

    callUnmountedHook(asInternal(instance));

    window.dispatchEvent(
      Object.assign(new Event('unhandledrejection'), { reason: new Error('after-unmount') }),
    );

    const out = render(ctxWith({})) as { type: unknown };
    expect(out.type).toBe(Text);
    expect(textOf(out)).toBe('');
  });

  it('多个边界各自独立：一个卸载不影响另一个', () => {
    const a = mountBoundary({ capturePromiseRejections: true });
    const b = mountBoundary({ capturePromiseRejections: true });

    callUnmountedHook(asInternal(a.instance));

    window.dispatchEvent(
      Object.assign(new Event('unhandledrejection'), { reason: new Error('still-alive') }),
    );

    const outB = b.render(ctxWith({}));
    expect(textOf(outB)).toContain('still-alive');
  });
});

// ==================== core 契约（唯一权威） ====================

describe('core 契约', () => {
  it('fallbackRender 优先于 fallback prop，并收到 (error, ErrorInfo, reset)', () => {
    const fallbackRender = vi.fn(() => ({ type: 'main' }));
    const FallbackView = { name: 'FallbackView' };
    const { instance, render } = mountBoundary({ fallbackRender, fallback: FallbackView });
    const err = new Error('render-fn');
    triggerError(instance, err);

    const out = render(ctxWith({})) as { type: unknown };

    expect(out.type).toBe('main');
    expect(fallbackRender).toHaveBeenCalledWith(
      err,
      expect.objectContaining({ componentStack: 'render' }),
      expect.any(Function),
    );
  });

  it('retry 递增计数、触发 onRetry 并清空错误态', () => {
    const onRetry = vi.fn();
    const { instance, render } = mountBoundary({ maxRetries: 1, onRetry });
    triggerError(instance, new Error('retry-me'));

    // 默认错误 UI 的「重试」按钮直接绑定了 retry()
    const buttons = collectButtons(render(ctxWith({})));
    (buttons[0]!.props.onClick as () => void)();

    expect(onRetry).toHaveBeenCalledWith(1);
    expect(render(ctxWith({ default: () => [{ type: 'p' }] }))).toEqual({ type: 'p' });
  });

  it('reset 清空错误态', () => {
    let resetBoundary: (() => void) | undefined;
    const fallbackRender = vi.fn((_err: Error, _info: unknown, reset: () => void) => {
      resetBoundary = reset;
      return { type: 'section' };
    });
    const { instance, render } = mountBoundary({ fallbackRender });
    triggerError(instance, new Error('reset-me'));

    expect(render(ctxWith({}))).toEqual({ type: 'section' });
    expect(resetBoundary).toBeTypeOf('function');

    resetBoundary!();
    expect(render(ctxWith({ default: () => [{ type: 'p' }] }))).toEqual({ type: 'p' });
  });

  it('错误进入 errorLogManager，并调用自定义 reporter', () => {
    const reporter = { report: vi.fn() };
    const previous = getGlobalErrorReporter();
    setGlobalErrorReporter(reporter);
    errorLogManager.clearLogs();

    try {
      const { instance } = mountBoundary();
      const err = new Error('logged');
      triggerError(instance, err, 'onMounted');

      expect(reporter.report).toHaveBeenCalledWith(
        err,
        expect.objectContaining({ componentStack: 'onMounted' }),
      );
      expect(errorLogManager.getLogs()).toEqual([
        expect.objectContaining({ error: err, retryCount: 0 }),
      ]);
    } finally {
      setGlobalErrorReporter(previous);
      errorLogManager.clearLogs();
    }
  });
});
