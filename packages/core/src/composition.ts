// src/composition.ts
// @lytjs/core - Composition API 辅助函数

import { getCurrentInstance } from "@lytjs/component";
import { computed } from "@lytjs/reactivity";
import type { WritableComputedRef } from "@lytjs/reactivity";
import type { InternalSlots } from "./types";

/**
 * 获取当前组件的 slots
 */
export function useSlots(): InternalSlots {
  const instance = getCurrentInstance();
  if (!instance) {
    if (__DEV__) {
      console.warn("[LytJS] useSlots() was called outside of setup().");
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
      console.warn("[LytJS] useAttrs() was called outside of setup().");
    }
    return {};
  }
  return instance.attrs || {};
}

/**
 * 双向绑定辅助（v-model 的 composition API 版本）
 */
export function useModel<T = unknown>(
  props: Record<string, unknown>,
  key: string,
): WritableComputedRef<T> {
  const instance = getCurrentInstance();
  if (!instance) {
    return computed({
      get() {
        return undefined as T;
      },
      set() {
        // no-op when outside setup
      },
    }) as WritableComputedRef<T>;
  }

  return computed({
    get() {
      return props[key] as T;
    },
    set(newValue: T) {
      instance.emit(`update:${key}`, newValue);
    },
  }) as WritableComputedRef<T>;
}
