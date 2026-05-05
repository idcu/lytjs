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

export interface ErrorBoundaryProps {
  onError?: (error: Error, info: string) => void;
  fallback?: ComponentOptions;
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

    // 使用 onErrorCaptured 捕获子组件错误
    onErrorCaptured((err: Error, _instance: unknown, info: string) => {
      error.value = err;
      hasError.value = true;
      (props as unknown as ErrorBoundaryProps).onError?.(err, info);
      return false; // 阻止错误继续传播
    });

    // FIX: P1-11 RUNTIME-NEW-01 - 改进异步错误捕获
    // FIX: P1-8 使用 Set 跟踪所有活跃实例，unhandledrejection 事件通知所有实例
    let currentBoundary: ActiveErrorBoundary | null = null;

    onMounted(() => {
      if ((props as unknown as { capturePromiseRejections?: boolean }).capturePromiseRejections && typeof window !== 'undefined') {
        currentBoundary = {
          handler: (event: PromiseRejectionEvent) => {
            const err = event.reason instanceof Error
              ? event.reason
              : new Error(String(event.reason));
            error.value = err;
            hasError.value = true;
            (props as unknown as ErrorBoundaryProps).onError?.(err, 'unhandledrejection');
          },
        };

        activeErrorBoundaries.add(currentBoundary);

        // 只安装一次全局 unhandledrejection 事件监听器
        if (!globalHandlerInstalled) {
          globalHandlerInstalled = true;
          window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
            // 通知所有活跃的 ErrorBoundary 实例
            for (const eb of activeErrorBoundaries) {
              eb.handler(event);
            }
          });
        }
      }
    });

    onUnmounted(() => {
      if (currentBoundary) {
        activeErrorBoundaries.delete(currentBoundary);
        currentBoundary = null;
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
            return createVNode(Fragment, null, result);
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
          return createVNode(Fragment, null, result);
        }
      }

      return createVNode(Text, null, '');
    };

    return { error, hasError, render };
  },
};
