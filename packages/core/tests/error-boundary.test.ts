/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @lytjs/core - ErrorBoundary 测试
 *
 * 重写说明（2026-09）：旧测试把 ErrorBoundary 当普通函数组件调用
 * （`ErrorBoundary({...})`）并只断言"返回值存在"，而旧实现本身没有任何捕获通道，
 * 于是 27 个用例全绿、真实行为（能否捕获错误）却完全没被验证。
 * 现改为按组件契约测试，并覆盖「真的能捕获错误 → 渲染 fallback → 重试/重置」。
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createVNode, Text as VText } from '@lytjs/vdom';
import { createComponentInstance, setupComponent, handleError } from '@lytjs/component';
import {
  ErrorBoundary,
  useErrorHandler,
  useErrorBoundaryReset,
  errorLogManager,
  setGlobalErrorReporter,
  getGlobalErrorReporter,
  generateErrorId,
} from '../src/error-boundary';
import type { ErrorBoundaryProps, FallbackProps, ErrorReporter } from '../src/error-boundary';

type AnyInstance = ReturnType<typeof createComponentInstance>;

/** 创建并 setup 一个 ErrorBoundary 实例 */
function createBoundary(props: ErrorBoundaryProps = {}, children: unknown = null) {
  const vnode = createVNode(
    ErrorBoundary as any,
    props as Record<string, unknown>,
    children as any,
  );
  const instance = createComponentInstance(vnode, null) as AnyInstance;
  setupComponent(instance);
  return instance;
}

/** 创建一个父实例为 boundary 的子实例，用于模拟子组件抛错 */
function createChildOf(boundary: AnyInstance) {
  const childVNode = createVNode({ name: 'Child', render: () => null } as any, null, null);
  return createComponentInstance(childVNode, boundary) as AnyInstance;
}

const FALLBACK_COMPONENT = { name: 'TestFallback', render: () => null };

/** 渲染并取出传给 fallback 组件的 FallbackProps */
function fallbackPropsOf(instance: AnyInstance): FallbackProps {
  const tree = renderTree(instance) as any;
  expect(tree.props).toBeDefined();
  return tree.props as unknown as FallbackProps;
}

function renderTree(instance: AnyInstance): any {
  const render = (instance as any).render;
  expect(typeof render).toBe('function');
  return render((instance as any).ctx);
}

describe('ErrorBoundary（组件契约）', () => {
  beforeEach(() => {
    errorLogManager.clearLogs();
    setGlobalErrorReporter({ report: () => {} });
  });

  describe('形态与导出', () => {
    it('应是组件选项对象而不是普通函数（回归防护）', () => {
      expect(typeof ErrorBoundary).toBe('object');
      expect(ErrorBoundary.name).toBe('ErrorBoundary');
      expect(typeof (ErrorBoundary as any).setup).toBe('function');
    });

    it('应导出全部对外接口', () => {
      expect(typeof useErrorHandler).toBe('function');
      expect(typeof useErrorBoundaryReset).toBe('function');
      expect(typeof setGlobalErrorReporter).toBe('function');
      expect(typeof getGlobalErrorReporter).toBe('function');
      expect(typeof generateErrorId).toBe('function');
      expect(typeof errorLogManager.getLogs).toBe('function');
    });

    it('generateErrorId 应生成唯一 ID', () => {
      const ids = new Set([generateErrorId(), generateErrorId(), generateErrorId()]);
      expect(ids.size).toBe(3);
    });
  });

  describe('正常态渲染', () => {
    it('无错误时应渲染默认插槽内容', () => {
      const child = createVNode('span', null, 'hello');
      const instance = createBoundary({}, { default: () => [child] });
      const tree = renderTree(instance);
      expect(tree.type).toBe('span');
      expect(tree.children).toBe('hello');
    });

    it('无插槽时应渲染空文本节点', () => {
      const instance = createBoundary({}, null);
      const tree = renderTree(instance);
      expect(tree.type).toBe(VText);
    });
  });

  describe('错误捕获（核心行为）', () => {
    it('应捕获子组件错误并阻止向上传播', () => {
      const onError = vi.fn();
      const boundary = createBoundary({ onError });
      const child = createChildOf(boundary);

      const captured = handleError(new Error('boom'), child, 'render');

      expect(captured).toBe(true);
      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
      expect((onError.mock.calls[0][0] as Error).message).toBe('boom');
    });

    it('捕获后应渲染默认降级 UI（包含错误信息）', () => {
      const boundary = createBoundary();
      const child = createChildOf(boundary);
      handleError(new Error('render failed'), child, 'render');

      const tree = renderTree(boundary);
      expect(tree.type).toBe('div');
      expect(tree.props.class).toBe('error-boundary-fallback');
      expect(JSON.stringify(tree)).toContain('render failed');
    });

    it('捕获时应写入 errorLogManager', () => {
      const boundary = createBoundary();
      handleError(new Error('logged'), createChildOf(boundary), 'render');

      const logs = errorLogManager.getLogs();
      expect(logs.length).toBe(1);
      expect(logs[0]?.error.message).toBe('logged');
      expect(logs[0]?.errorInfo.componentStack).toBe('render');
    });

    it('捕获时应上报给全局 reporter', () => {
      const report = vi.fn();
      setGlobalErrorReporter({ report } as unknown as ErrorReporter);

      const boundary = createBoundary();
      handleError(new Error('reported'), createChildOf(boundary), 'render');

      expect(report).toHaveBeenCalledTimes(1);
      expect((report.mock.calls[0][0] as Error).message).toBe('reported');
    });

    it('reporter 抛错不应影响降级渲染', () => {
      setGlobalErrorReporter({
        report: () => {
          throw new Error('reporter down');
        },
      } as unknown as ErrorReporter);

      const boundary = createBoundary();
      handleError(new Error('still works'), createChildOf(boundary), 'render');

      expect(renderTree(boundary).type).toBe('div');
    });
  });

  describe('fallback 优先级', () => {
    it('fallbackRender 应优先于 fallback 组件', () => {
      const fallbackComponent = {
        name: 'FallbackComp',
        render: () => createVNode('b', null, 'fb'),
      };
      const fallbackRender = vi.fn((error: Error) =>
        createVNode('p', null, `custom:${error.message}`),
      );

      const boundary = createBoundary({
        fallback: fallbackComponent as any,
        fallbackRender: fallbackRender as any,
      });
      handleError(new Error('x'), createChildOf(boundary), 'render');

      const tree = renderTree(boundary);
      expect(fallbackRender).toHaveBeenCalledTimes(1);
      expect(tree.type).toBe('p');
      expect(tree.children).toBe('custom:x');
    });

    it('应支持组件式 fallback 并以 props 形式传入 FallbackProps', () => {
      const fallbackComponent = { name: 'MyFallback', render: () => null };
      const boundary = createBoundary({ fallback: fallbackComponent as any });
      handleError(new Error('y'), createChildOf(boundary), 'render');

      const tree = renderTree(boundary) as any;
      // fallback 作为组件类型出现在 vnode.type 上，FallbackProps 走 props
      expect(tree.type).toBe(fallbackComponent);
      const passed = tree.props as unknown as FallbackProps;
      expect(passed.error.message).toBe('y');
      expect(typeof passed.retry).toBe('function');
      expect(typeof passed.reset).toBe('function');
      expect(passed.maxRetries).toBe(3);
    });
  });

  describe('重试与重置', () => {
    it('retry 应自增 retryCount 并调用 onRetry，随后恢复正常渲染', () => {
      const onRetry = vi.fn();
      const boundary = createBoundary({ onRetry, fallback: FALLBACK_COMPONENT as any });

      handleError(new Error('retry me'), createChildOf(boundary), 'render');
      const first = fallbackPropsOf(boundary);
      expect(first.retryCount).toBe(0);

      first.retry();
      expect(onRetry).toHaveBeenCalledWith(1);

      // retry 后错误被清空，回到正常态渲染
      expect(renderTree(boundary).type).toBe(VText);
    });

    it('reset 应清空错误状态', () => {
      const boundary = createBoundary({ fallback: FALLBACK_COMPONENT as any });
      handleError(new Error('nope'), createChildOf(boundary), 'render');

      fallbackPropsOf(boundary).reset();
      expect(renderTree(boundary).type).toBe(VText);
    });

    it('达到 maxRetries 后应调用 onMaxRetriesReached 而不是继续重试', () => {
      const onMaxRetriesReached = vi.fn();
      const onRetry = vi.fn();
      const boundary = createBoundary({
        maxRetries: 1,
        onRetry,
        onMaxRetriesReached,
        fallback: FALLBACK_COMPONENT as any,
      });

      handleError(new Error('1st'), createChildOf(boundary), 'render');
      fallbackPropsOf(boundary).retry(); // 第 1 次重试
      handleError(new Error('2nd'), createChildOf(boundary), 'render');
      fallbackPropsOf(boundary).retry(); // 触顶

      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onMaxRetriesReached).toHaveBeenCalledTimes(1);
      expect((onMaxRetriesReached.mock.calls[0][0] as Error).message).toBe('2nd');
    });

    it('maxRetries 为 0 时首次 retry 即触顶', () => {
      const onMaxRetriesReached = vi.fn();
      const boundary = createBoundary({
        maxRetries: 0,
        onMaxRetriesReached,
        fallback: FALLBACK_COMPONENT as any,
      });
      handleError(new Error('zero'), createChildOf(boundary), 'render');

      fallbackPropsOf(boundary).retry();
      expect(onMaxRetriesReached).toHaveBeenCalledTimes(1);
    });

    it('retryDelay 大于 0 时应延迟重置', () => {
      vi.useFakeTimers();
      const boundary = createBoundary({
        retryDelay: 1000,
        fallback: FALLBACK_COMPONENT as any,
      });
      handleError(new Error('delayed'), createChildOf(boundary), 'render');

      fallbackPropsOf(boundary).retry();
      expect(fallbackPropsOf(boundary).retryCount).toBe(1);
      vi.advanceTimersByTime(1000);
      expect(renderTree(boundary).type).toBe(VText);
      vi.useRealTimers();
    });
  });

  describe('钩子', () => {
    it('useErrorHandler 应抛错交给边界处理', () => {
      const handler = useErrorHandler();
      expect(() => handler(new Error('manual'))).toThrow('manual');
      expect(() => handler('string error')).toThrow('string error');
    });

    it('useErrorBoundaryReset 应提示改用 fallbackRender 的 reset 参数', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      useErrorBoundaryReset()();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('fallbackRender'));
      warn.mockRestore();
    });
  });
});
