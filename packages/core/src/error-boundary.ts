/**
 * @lytjs/core - 错误边界组件
 *
 * 提供强大的错误处理和恢复机制
 */

import type { VNode } from '@lytjs/vdom';
import { createVNode } from '@lytjs/vdom';
import { Fragment, Text } from '@lytjs/vdom';
import { onErrorCaptured } from '@lytjs/component';
import type { ComponentOptions, RenderFunction } from '@lytjs/component';
import { ref } from '@lytjs/reactivity';

/** 错误信息 */
export interface ErrorInfo {
  componentStack?: string;
  timestamp: Date;
}

/** 降级组件属性 */
export interface FallbackProps {
  error: Error;
  errorInfo: ErrorInfo;
  reset: () => void;
  retry: () => void;
  retryCount: number;
  maxRetries: number;
  hasRetries: boolean;
}

/** 错误边界属性 */
export interface ErrorBoundaryProps {
  fallback?: unknown;
  fallbackRender?: (error: Error, errorInfo: ErrorInfo, reset: () => void) => VNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  maxRetries?: number;
  retryDelay?: number;
  onRetry?: (retryCount: number) => void;
  onMaxRetriesReached?: (error: Error) => void;
}

/** 错误报告上下文 */
export interface ErrorContext {
  componentName?: string;
  /** 组件调用栈（由 onErrorCaptured 的 info 提供） */
  componentStack?: string;
  props?: Record<string, unknown>;
  state?: Record<string, unknown>;
  url?: string;
  userAgent?: string;
  timestamp: Date;
}

/** 错误报告器接口 */
export interface ErrorReporter {
  report(error: Error, context: ErrorContext): void;
}

/** 错误日志 */
export interface ErrorLog {
  id: string;
  timestamp: Date;
  error: Error;
  errorInfo: ErrorInfo;
  context: ErrorContext;
  retryCount: number;
}

/** 默认错误报告器 - 控制台输出 */
class ConsoleErrorReporter implements ErrorReporter {
  report(error: Error, context: ErrorContext): void {
    console.error('[LytJS ErrorBoundary]', {
      message: error.message,
      stack: error.stack,
      context: context,
    });
  }
}

/** 全局错误报告器 */
let globalReporter: ErrorReporter = new ConsoleErrorReporter();

/** 设置全局错误报告器 */
export function setGlobalErrorReporter(reporter: ErrorReporter): void {
  globalReporter = reporter;
}

/** 获取全局错误报告器 */
export function getGlobalErrorReporter(): ErrorReporter {
  return globalReporter;
}

/** 错误日志管理器 */
class ErrorLogManager {
  private logs: ErrorLog[] = [];
  private maxLogs: number = 100;

  addLog(log: ErrorLog): void {
    this.logs.unshift(log);
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }
  }

  getLogs(): ErrorLog[] {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  getLogById(id: string): ErrorLog | undefined {
    return this.logs.find((log) => log.id === id);
  }

  getLogsByErrorType(errorType: string): ErrorLog[] {
    return this.logs.filter((log) => log.error.name === errorType);
  }

  getLogsByDateRange(start: Date, end: Date): ErrorLog[] {
    return this.logs.filter((log) => log.timestamp >= start && log.timestamp <= end);
  }

  getErrorStats(): {
    totalErrors: number;
    errorTypes: Record<string, number>;
    recentErrors: ErrorLog[];
  } {
    const errorTypes: Record<string, number> = {};
    this.logs.forEach((log) => {
      const type = log.error.name || 'Unknown';
      errorTypes[type] = (errorTypes[type] || 0) + 1;
    });

    return {
      totalErrors: this.logs.length,
      errorTypes,
      recentErrors: this.logs.slice(0, 10),
    };
  }
}

/** 全局错误日志管理器实例 */
export const errorLogManager = new ErrorLogManager();

/** 生成唯一 ID */
export function generateErrorId(): string {
  return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/** 创建 VNode 的辅助函数 */
function createElement(type: unknown, props: unknown, ...children: unknown[]): VNode {
  return createVNode(
    type as unknown as Parameters<typeof createVNode>[0],
    props as Record<string, unknown> | null | undefined,
    children as unknown as Parameters<typeof createVNode>[2],
  );
}

/** 默认错误降级组件 */
function DefaultErrorFallback(props: FallbackProps): VNode {
  return createElement(
    'div',
    {
      class: 'error-boundary-fallback',
      style: 'padding: 20px; background: #fee; border: 1px solid #fcc; border-radius: 8px;',
    },
    [
      createElement('h3', { style: 'color: #c00; margin-bottom: 10px;' }, '出错了'),
      createElement('p', { style: 'color: #666; margin-bottom: 10px;' }, props.error.message),
      createElement('div', { style: 'display: flex; gap: 10px; margin-top: 10px;' }, [
        props.hasRetries &&
          createElement(
            'button',
            {
              style:
                'padding: 8px 16px; background: #667eea; color: white; border: none; border-radius: 4px; cursor: pointer;',
              onClick: () => props.retry(),
            },
            `重试 (${props.retryCount}/${props.maxRetries})`,
          ),
        createElement(
          'button',
          {
            style:
              'padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;',
            onClick: () => props.reset(),
          },
          '重置',
        ),
      ]),
      props.retryCount > 0 &&
        createElement(
          'p',
          { style: 'color: #999; font-size: 0.9em; margin-top: 10px;' },
          `已重试 ${props.retryCount} 次`,
        ),
    ],
  );
}

/** 错误边界组件状态 */
interface ErrorBoundaryState {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  resetKey: number;
  isRetrying: boolean;
}

function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

/**
 * 错误边界组件
 *
 * 修复说明：旧实现是一个普通函数组件，内部**没有任何捕获通道**（无 try/catch、
 * 未接入 onErrorCaptured），`state.error` 恒为 null，因此永远不会渲染 fallback，
 * 只会输出一个空的 `<error-boundary-wrapper>`。现在改为真正的组件实现：
 *   - 通过 onErrorCaptured 捕获子树错误（返回 false 阻止继续冒泡）
 *   - 用响应式 ref 驱动 fallback 渲染
 *   - 支持 fallback / fallbackRender / 具名 fallback 插槽 / 重试与重置
 *   - 错误同时进入全局 reporter 与 errorLogManager，便于上报与排查
 */
export const ErrorBoundary: ComponentOptions = {
  name: 'ErrorBoundary',
  props: {
    fallback: { type: Object },
    fallbackRender: { type: Function },
    onError: { type: Function },
    maxRetries: { type: Number, default: 3 },
    retryDelay: { type: Number, default: 0 },
    onRetry: { type: Function },
    onMaxRetriesReached: { type: Function },
  },
  setup(props: Record<string, unknown>) {
    const errorRef = ref<Error | null>(null);
    const errorInfoRef = ref<ErrorInfo | null>(null);
    const retryCountRef = ref(0);
    const resetKeyRef = ref(0);

    const maxRetries = (props.maxRetries as number | undefined) ?? 3;
    const retryDelay = (props.retryDelay as number | undefined) ?? 0;

    /** 仅清除错误状态（保留重试计数，用于"重试"语义） */
    const clearError = (): void => {
      errorRef.value = null;
      errorInfoRef.value = null;
      resetKeyRef.value += 1;
    };

    /** 完全重置（错误 + 重试计数，用于"重置"语义） */
    const reset = (): void => {
      clearError();
      retryCountRef.value = 0;
    };

    const retry = (): void => {
      if (retryCountRef.value < maxRetries) {
        retryCountRef.value += 1;
        (props.onRetry as ((n: number) => void) | undefined)?.(retryCountRef.value);
        if (retryDelay > 0) {
          setTimeout(clearError, retryDelay);
        } else {
          clearError();
        }
      } else if (errorRef.value) {
        (props.onMaxRetriesReached as ((e: Error) => void) | undefined)?.(errorRef.value);
      }
    };

    onErrorCaptured((err: unknown, _instance: unknown, info: string) => {
      const error = toError(err);
      const errorInfo: ErrorInfo = { componentStack: info, timestamp: new Date() };
      errorRef.value = error;
      errorInfoRef.value = errorInfo;
      // 注意：这里**不能**把 retryCount 归零，否则每次捕获都重置预算，
      // maxRetries 将永远无法触顶（重试次数变成无上限）。
      const state: ErrorBoundaryState = {
        error,
        errorInfo,
        retryCount: retryCountRef.value,
        resetKey: resetKeyRef.value,
        isRetrying: false,
      };

      // 上报：全局 reporter + 本地日志（供 DevTools / 排查使用）
      try {
        globalReporter.report(error, {
          componentStack: info,
          timestamp: errorInfo.timestamp,
          url: typeof location !== 'undefined' ? location.href : undefined,
        });
      } catch {
        // 上报失败不影响渲染降级
      }
      errorLogManager.addLog({
        id: generateErrorId(),
        timestamp: errorInfo.timestamp,
        error,
        errorInfo,
        context: { componentStack: info, timestamp: errorInfo.timestamp },
        retryCount: state.retryCount,
      });

      (props.onError as ((e: Error, info: ErrorInfo) => void) | undefined)?.(error, errorInfo);
      return false; // 阻止错误继续向上传播
    });

    const render: RenderFunction = (ctx): VNode => {
      const error = errorRef.value;
      const errorInfo = errorInfoRef.value;

      if (!error) {
        // 正常状态：渲染默认插槽（子树）
        const defaultSlot = ctx.$slots?.default;
        if (defaultSlot) {
          const result = defaultSlot();
          if (Array.isArray(result)) {
            if (result.length === 0) return createElement(Text, null);
            if (result.length === 1) return result[0] as VNode;
            return createElement(Fragment, null, result);
          }
          if (result) return result as VNode;
        }
        return createElement(Text, null);
      }

      const hasRetries = retryCountRef.value < maxRetries;
      const fallbackProps: FallbackProps = {
        error,
        errorInfo: errorInfo ?? { timestamp: new Date() },
        reset,
        retry,
        retryCount: retryCountRef.value,
        maxRetries,
        hasRetries,
      };

      // 1) 渲染函数式 fallback
      if (typeof props.fallbackRender === 'function') {
        return (props.fallbackRender as (e: Error, i: ErrorInfo, r: () => void) => VNode)(
          fallbackProps.error,
          fallbackProps.errorInfo,
          reset,
        );
      }

      // 2) 组件式 fallback（对象 / 函数组件）
      if (props.fallback) {
        return createElement(props.fallback, fallbackProps as unknown as Record<string, unknown>);
      }

      // 3) 具名 fallback 插槽
      const fallbackSlot = ctx.$slots?.fallback;
      if (fallbackSlot) {
        const result = fallbackSlot({ error }) as VNode | VNode[];
        if (Array.isArray(result)) {
          if (result.length === 1) return result[0] as VNode;
          return createElement(Fragment, null, result);
        }
        return result as VNode;
      }

      // 4) 默认错误 UI
      return DefaultErrorFallback(fallbackProps);
    };

    // 注意渲染函数契约：本框架只把 **setup 的返回值（函数）** 或 options.render
    // 接到 instance.render 上（见 component-setup.ts:221 与 vdom patch-component.ts:97）。
    // 若把 render 塞进返回的对象里，组件会被判定为"没有渲染函数"而渲染不出任何内容
    // —— @lytjs/component 自带的 ErrorBoundary 正是踩了这个坑（已同步修正）。
    return render;
  },
};

/** 错误边界钩子 - 在任意位置手动抛出错误，交给最近的 ErrorBoundary 处理 */
export function useErrorHandler(): (error: unknown) => never {
  return (error: unknown) => {
    throw toError(error);
  };
}

/**
 * 错误边界重置钩子
 *
 * 说明：重置能力绑定在具体边界实例上，请在 fallback 渲染函数里使用传入的 `reset`
 * （`fallbackRender(error, info, reset)`）。此钩子仅为兼容旧 API 保留，调用时给出明确提示。
 */
export function useErrorBoundaryReset(): () => void {
  return () => {
    console.warn(
      '[LytJS] useErrorBoundaryReset() 需要在 ErrorBoundary 内部使用；' +
        '请改用 fallbackRender(error, info, reset) 提供的 reset 参数。',
    );
  };
}

/** 导出默认 ErrorBoundary 组件 */
export default ErrorBoundary;
