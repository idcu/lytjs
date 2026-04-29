// src/composition.ts
// @lytjs/core - Composition API 辅助函数

import { getCurrentInstance } from '@lytjs/component';
import type { InternalSlots } from './types';

/**
 * 获取当前组件的 slots
 */
export function useSlots(): InternalSlots {
  const instance = getCurrentInstance();
  if (!instance) {
    return {} as InternalSlots;
  }
  return instance.slots || ({} as InternalSlots);
}

/**
 * 获取当前组件的 attrs
 */
export function useAttrs(): Record<string, any> {
  const instance = getCurrentInstance();
  if (!instance) {
    return {};
  }
  return instance.attrs || {};
}

/**
 * 双向绑定辅助（v-model 的 composition API 版本）
 */
export function useModel(props: any, key: string) {
  const instance = getCurrentInstance();
  if (!instance) {
    return { value: undefined };
  }

  return {
    get value() {
      return props[key];
    },
    set value(newValue: any) {
      instance.emit(`update:${key}`, newValue);
    },
  };
}
