// src/composition.ts
// @lytjs/core-vnode - Composition API 辅助函数
// FIX: DTS build error - 声明 __DEV__ 全局变量
declare const __DEV__: boolean;

import { getCurrentInstance } from '@lytjs/component';
import { computed } from '@lytjs/reactivity';
import { warnOnce } from '@lytjs/common-error';
import type { WritableComputedRef } from '@lytjs/reactivity';
import type { InternalSlots } from './types';

/**
 * 获取当前组件的 slots
 */
export function useSlots(): InternalSlots {
  const instance = getCurrentInstance();
  if (!instance) {
    if (__DEV__) {
      warnOnce('useSlots() called without an active component instance.');
    }
    return {} as InternalSlots;
  }
  return instance.slots || ({} as InternalSlots);
}

/**
 * 获取当前组件的 attrs
 */
export function useAttrs(): Record<string, unknown> {
  const instance = getCurrentInstance();
  if (!instance) {
    if (__DEV__) {
      warnOnce('useAttrs() was called outside of setup().');
    }
    return {};
  }
  return instance.attrs || {};
}

/**
 * 双向绑定辅助（v-model 的 composition API 版本）
 */
export function useModel<T>(
  props: Record<string, T | undefined>,
  key: string,
): WritableComputedRef<T> {
  const instance = getCurrentInstance();
  if (!instance) {
    return computed<T>({
      get() {
        return undefined as T;
      },
      set() {
        // no-op when outside setup
      },
    });
  }

  return computed<T>({
    get() {
      return props[key] as T;
    },
    set(newValue: T) {
      instance.emit(`update:${key}`, newValue);
    },
  });
}
