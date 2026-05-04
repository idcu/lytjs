// src/composition.ts
// @lytjs/core - Composition API 辅助函数

import { getCurrentInstance, onMounted } from '@lytjs/component';
import { computed, shallowRef } from '@lytjs/reactivity';
import { warnOnce } from '@lytjs/common-error';
import type { WritableComputedRef, Ref } from '@lytjs/reactivity';
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

/**
 * 获取模板引用的 ref。
 * 通过 key 从组件实例的 refs 中获取对应的 DOM 元素或组件实例。
 * Vue 3.5+ 新增组合式 API。
 */
export function useTemplateRef<T = any>(key: string): Ref<T | null> {
  const instance = getCurrentInstance();
  const ref = shallowRef<T | null>(null);

  if (instance) {
    onMounted(() => {
      ref.value = (instance.refs as Record<string, T | null>)[key] || null;
    });
  } else if (__DEV__) {
    warnOnce('useTemplateRef() was called outside of setup().');
  }

  return ref;
}
