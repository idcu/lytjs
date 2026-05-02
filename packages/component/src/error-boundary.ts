// src/error-boundary.ts
// ErrorBoundary component for catching and handling errors in child components

import type { ComponentOptions } from './types';
import { onErrorCaptured } from './lifecycle';
import { ref } from '@lytjs/reactivity';

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

    return { error, hasError };
  },
};
