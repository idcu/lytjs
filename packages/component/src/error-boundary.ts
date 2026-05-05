// src/error-boundary.ts
// ErrorBoundary component for catching and handling errors in child components

import type { ComponentOptions, RenderFunction } from './types';
import { onErrorCaptured, onMounted, onUnmounted } from './lifecycle';
import { ref } from '@lytjs/reactivity';
import { createVNode } from '@lytjs/vdom';
import { Text, Fragment } from '@lytjs/common-vnode';
import type { VNode } from '@lytjs/common-vnode';

// FIX: P1-11 RUNTIME-NEW-01 - 异步错误捕获改进
// 全局 Promise 错误处理状态
interface PromiseErrorState {
  handler: (event: PromiseRejectionEvent) => void;
  isActive: boolean;
}

const promiseErrorState: PromiseErrorState = {
  handler: () => {},
  isActive: false,
};

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
    // 添加 Promise.reject 监听
    onMounted(() => {
      if ((props as unknown as { capturePromiseRejections?: boolean }).capturePromiseRejections && typeof window !== 'undefined') {
        promiseErrorState.handler = (event: PromiseRejectionEvent) => {
          const err = event.reason instanceof Error
            ? event.reason
            : new Error(String(event.reason));
          error.value = err;
          hasError.value = true;
          (props as unknown as ErrorBoundaryProps).onError?.(err, 'unhandledrejection');
          // 阻止默认处理（控制台报错）
          event.preventDefault();
        };

        window.addEventListener('unhandledrejection', promiseErrorState.handler);
        promiseErrorState.isActive = true;
      }
    });

    onUnmounted(() => {
      if (promiseErrorState.isActive && typeof window !== 'undefined') {
        window.removeEventListener('unhandledrejection', promiseErrorState.handler);
        promiseErrorState.isActive = false;
      }
    });

    const render: RenderFunction = (ctx): VNode => {
      if (hasError.value) {
        // Error state: render fallback slot if provided, otherwise render default error message
        const fallbackSlot = ctx.$slots.fallback;
        if (fallbackSlot) {
          const result = fallbackSlot({ error: error.value });
          if (Array.isArray(result) && result.length > 0) {
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
