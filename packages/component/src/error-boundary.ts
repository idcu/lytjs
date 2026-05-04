// src/error-boundary.ts
// ErrorBoundary component for catching and handling errors in child components

import type { ComponentOptions, RenderFunction } from './types';
import { onErrorCaptured } from './lifecycle';
import { ref } from '@lytjs/reactivity';
import { createVNode } from '@lytjs/vdom';
import { Text } from '@lytjs/common-vnode';
import type { VNode } from '@lytjs/common-vnode';

export interface ErrorBoundaryProps {
  onError?: (error: Error, info: string) => void;
  fallback?: ComponentOptions;
}

export const ErrorBoundary: ComponentOptions = {
  name: 'ErrorBoundary',
  props: {
    onError: { type: Function },
    fallback: { type: Object },
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

    const render: RenderFunction = (ctx): VNode => {
      if (hasError.value) {
        // Error state: render fallback slot if provided, otherwise render default error message
        const fallbackSlot = ctx.$slots.fallback;
        if (fallbackSlot) {
          const result = fallbackSlot({ error: error.value });
          if (Array.isArray(result) && result.length > 0) {
            return result[0] as VNode;
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
          return result[0] as VNode;
        }
      }

      return createVNode(Text, null, '');
    };

    return { error, hasError, render };
  },
};
