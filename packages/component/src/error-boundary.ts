// src/error-boundary.ts
// ErrorBoundary component for catching and handling errors in child components

import type { ComponentOptions, RenderFunction } from './types';
import { onErrorCaptured, onMounted, onUnmounted } from './lifecycle';
import { ref } from '@lytjs/reactivity';
import { createVNode } from '@lytjs/vdom';
import { Text, Fragment } from '@lytjs/common-vnode';
import type { VNode } from '@lytjs/common-vnode';

// FIX: P1-11 RUNTIME-NEW-01 - 异步错误捕获改进
// FIX: P1-8 使用 Set 跟踪所有活跃的 ErrorBoundary 实例，
// 避免后挂载实例覆盖前一个的单例问题
interface ActiveErrorBoundary {
  handler: (event: PromiseRejectionEvent) => void;
}

const activeErrorBoundaries = new Set<ActiveErrorBoundary>();
let globalHandlerInstalled = false;

// FIX: P2-18 提取全局处理器函数，以便正确移除监听器
function globalUnhandledRejectionHandler(event: PromiseRejectionEvent): void {
  // 通知所有活跃的 ErrorBoundary 实例
  for (const eb of activeErrorBoundaries) {
    eb.handler(event);
  }
}

export interface ErrorBoundaryProps {
  onError?: (error: Error, info: string) => void;
  fallback?: ComponentOptions;
}

// FIX: P2-35 类型守卫：检查 props 是否为 ErrorBoundaryProps
type ErrorBoundaryPropsInternal = ErrorBoundaryProps & { capturePromiseRejections?: boolean };

function isErrorBoundaryProps(props: Record<string, unknown>): props is ErrorBoundaryPropsInternal {
  return props !== null && typeof props === 'object';
}

export const ErrorBoundary: ComponentOptions = {
  name: 'ErrorBoundary',
  props: {
    onError: { type: Function },
    fallback: { type: Object },
    /** 是否捕获异步 Promise 错误 */
    capturePromiseRejections: { type: Boolean, default: false },
  },
  setup(props: Record<string, unknown>) {
    const error = ref<Error | null>(null);
    const hasError = ref(false);

    // FIX: P2-35 使用类型守卫替代重复的类型断言
    const typedProps = isErrorBoundaryProps(props) ? props : {} as ErrorBoundaryPropsInternal;

    // 使用 onErrorCaptured 捕获子组件错误
    onErrorCaptured((err: Error, _instance: unknown, info: string) => {
      error.value = err;
      hasError.value = true;
      // FIX: P2-39 错误边界：添加更友好的错误处理
      typedProps.onError?.(err, info);
      return false; // 阻止错误继续传播
    });

    // FIX: P1-11 RUNTIME-NEW-01 - 改进异步错误捕获
    // FIX: P1-8 使用 Set 跟踪所有活跃实例，unhandledrejection 事件通知所有实例
    let currentBoundary: ActiveErrorBoundary | null = null;

    onMounted(() => {
      if (typedProps.capturePromiseRejections && typeof window !== 'undefined') {
        currentBoundary = {
          handler: (event: PromiseRejectionEvent) => {
            // FIX: P2-40 错误信息不友好：改进错误消息
            const err = event.reason instanceof Error
              ? event.reason
              : new Error(String(event.reason));
            error.value = err;
            hasError.value = true;
            // FIX: DTS build error - 类型断言
            (typedProps.onError as ((error: Error, info: string) => void) | undefined)?.(err, 'unhandledrejection');
          },
        };

        activeErrorBoundaries.add(currentBoundary);

        // 只安装一次全局 unhandledrejection 事件监听器
        if (!globalHandlerInstalled) {
          globalHandlerInstalled = true;
          window.addEventListener('unhandledrejection', globalUnhandledRejectionHandler);
        }
      }
    });

    onUnmounted(() => {
      if (currentBoundary) {
        activeErrorBoundaries.delete(currentBoundary);
        currentBoundary = null;
        // FIX: P2-18 当所有 ErrorBoundary 实例都被卸载时，移除全局监听器
        if (activeErrorBoundaries.size === 0 && globalHandlerInstalled) {
          globalHandlerInstalled = false;
          window.removeEventListener('unhandledrejection', globalUnhandledRejectionHandler);
        }
      }
    });

    const render: RenderFunction = (ctx): VNode => {
      if (hasError.value) {
        // Error state: render fallback slot if provided, otherwise render default error message
        const fallbackSlot = ctx.$slots.fallback;
        if (fallbackSlot) {
          const result = fallbackSlot({ error: error.value });
          // FIX: P2-28 处理 fallback slot 返回单个 VNode（非数组）的情况
          if (!Array.isArray(result)) {
            return result as VNode;
          }
          if (result.length > 0) {
            // Use Fragment to wrap multiple root nodes from slot
            if (result.length === 1) {
              return result[0] as VNode;
            }
            return createVNode(Fragment, null, result as VNode[]);
          }
        }
        // Default error UI
        return createVNode(Text, null, error.value ? `Error: ${error.value.message}` : 'An error occurred');
      }

      // Normal state: render default slot (children)
      const defaultSlot = ctx.$slots.default;
      if (defaultSlot) {
        const result = defaultSlot();
        if (Array.isArray(result) && result.length > 0) {
          // Use Fragment to wrap multiple root nodes from slot
          if (result.length === 1) {
            return result[0] as VNode;
          }
          return createVNode(Fragment, null, result as import('@lytjs/vdom').VNode[]);
        }
      }

      return createVNode(Text, null, '');
    };

    return { error, hasError, render };
  },
};
