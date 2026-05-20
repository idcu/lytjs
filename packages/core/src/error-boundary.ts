/**
 * @lytjs/core - 错误边界组件
 *
 * 提供强大的错误处理和恢复机制
 */

import type { VNode } from '@lytjs/vdom';
import { createVNode } from '@lytjs/vdom';

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
  fallback?: any;
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
function createElement(type: any, props: any, ...children: any[]): VNode {
  return createVNode(type, props, children);
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

/** 错误边界组件实现 */
export function ErrorBoundary(props: ErrorBoundaryProps): VNode {
  const maxRetries = props.maxRetries ?? 3;
  const retryDelay = props.retryDelay ?? 1000;

  const state: ErrorBoundaryState = {
    error: null,
    errorInfo: null,
    retryCount: 0,
    resetKey: 0,
    isRetrying: false,
  };

  const reset = () => {
    state.error = null;
    state.errorInfo = null;
    state.retryCount = 0;
    state.isRetrying = false;
    state.resetKey++;
  };

  const retry = () => {
    if (state.retryCount < maxRetries) {
      state.isRetrying = true;

      if (props.onRetry) {
        props.onRetry(state.retryCount + 1);
      }

      setTimeout(() => {
        reset();
      }, retryDelay);
    } else {
      if (props.onMaxRetriesReached && state.error) {
        props.onMaxRetriesReached(state.error);
      }
    }
  };

  const getFallback = (): VNode => {
    const hasRetries = state.retryCount < maxRetries;

    if (props.fallback) {
      return createElement(props.fallback, {
        error: state.error!,
        errorInfo: state.errorInfo!,
        reset,
        retry,
        retryCount: state.retryCount,
        maxRetries,
        hasRetries,
      } as FallbackProps);
    }

    if (props.fallbackRender) {
      return props.fallbackRender(state.error!, state.errorInfo!, reset);
    }

    return DefaultErrorFallback({
      error: state.error!,
      errorInfo: state.errorInfo!,
      reset,
      retry,
      retryCount: state.retryCount,
      maxRetries,
      hasRetries,
    });
  };

  if (state.error) {
    return createElement(
      'error-boundary-wrapper',
      { 'data-error': 'true', key: `reset-${state.resetKey}` },
      [getFallback()],
    );
  }

  return createElement(
    'error-boundary-wrapper',
    {
      'data-error': 'false',
      key: `reset-${state.resetKey}`,
    },
    null,
  );
}

/** 错误边界钩子 - 用于手动触发错误 */
export function useErrorHandler(): (error: Error) => void {
  return (error: Error) => {
    throw error;
  };
}

/** 错误边界重置钩子 */
export function useErrorBoundaryReset(): () => void {
  return () => {
    console.warn('useErrorBoundaryReset should be used within ErrorBoundary');
  };
}

/** 导出默认 ErrorBoundary 组件 */
export default ErrorBoundary;
