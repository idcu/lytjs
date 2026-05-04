// src/composition.ts
// @lytjs/core - Composition API 辅助函数

import { getCurrentInstance, onMounted } from '@lytjs/component';
import { computed, shallowRef, watch, watchEffect } from '@lytjs/reactivity';
import { onScopeDispose } from '@lytjs/reactivity/scope';
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
 * defineModel 运行时实现。
 * Vue 3.4+ 新增的编译器宏，在 lytjs 中以运行时函数形式提供。
 *
 * 用法：
 *   const modelValue = defineModel()                    // 默认 'modelValue'
 *   const title = defineModel('title')                  // 命名 model
 *   const count = defineModel('count', { default: 0 })  // 带默认值
 *
 * 返回一个 WritableComputedRef，读取时返回 prop 值，写入时触发 update 事件。
 */
export function defineModel<T = any>(
  name?: string,
  options?: { default?: T; required?: boolean; type?: unknown },
): WritableComputedRef<T> {
  const instance = getCurrentInstance();
  const modelName = name ?? 'modelValue';

  if (!instance) {
    if (__DEV__) {
      warnOnce('defineModel() was called outside of setup().');
    }
    return computed<T>({
      get() {
        return options?.default as T;
      },
      set() {
        // no-op when outside setup
      },
    });
  }

  // 从 instance.props 中读取 model 值
  const props = instance.props as Record<string, T | undefined>;

  return computed<T>({
    get() {
      const value = props[modelName];
      if (value === undefined) {
        return options?.default as T;
      }
      return value;
    },
    set(newValue: T) {
      instance.emit(`update:${modelName}`, newValue);
    },
  });
}

/**
 * 获取模板引用的 ref。
 * 通过 key 从组件实例的 refs 中获取对应的 DOM 元素或组件实例。
 * 使用 watch 持续追踪 refs 变化，确保响应式同步。
 * Vue 3.5+ 新增组合式 API。
 */
export function useTemplateRef<T = any>(key: string): Ref<T | null> {
  const instance = getCurrentInstance();
  const ref = shallowRef<T | null>(null);

  if (instance) {
    // 使用 watch 持续追踪 instance.refs[key] 的变化，
    // 支持 v-if 等动态绑定场景下 ref 的响应式更新。
    const stop = watch(
      () => (instance.refs as Record<string, T | null>)[key] ?? null,
      (newVal) => {
        ref.value = newVal;
      },
      { immediate: true, flush: 'post' },
    );
    onScopeDispose(stop);
  } else if (__DEV__) {
    warnOnce('useTemplateRef() was called outside of setup().');
  }

  return ref;
}

// ==================== useId ====================

let globalIdCounter = 0;

/**
 * 生成应用范围内唯一的 ID。
 * Vue 3.5 新增的组合式 API，用于生成可预测的唯一标识符，
 * 特别适用于无障碍属性（aria-*)和表单元素关联。
 *
 * 每个组件实例会获得一个基于组件 uid 的 ID 前缀，
 * 确保同一组件在不同位置渲染时产生不同的 ID。
 */
export function useId(): Ref<string> {
  const instance = getCurrentInstance();
  const id = shallowRef('');

  if (instance) {
    // 使用组件 uid 作为前缀，确保组件级别的唯一性
    const prefix = `lyt-${instance.uid}`;
    // 在组件内递增，支持同一组件多次调用 useId
    const idMap = (instance as unknown as Record<string, unknown>).__idMap as
      | Map<string, number>
      | undefined;
    if (!idMap) {
      (instance as unknown as Record<string, unknown>).__idMap = new Map<string, number>();
    }
    const map = (instance as unknown as Record<string, unknown>).__idMap as Map<string, number>;
    const counter = (map.get('useId') ?? 0) + 1;
    map.set('useId', counter);
    id.value = `${prefix}-${counter}`;
  } else {
    // 降级：使用全局计数器
    id.value = `lyt-${++globalIdCounter}`;
  }

  return id;
}

// ==================== useCssModule / useCssVars ====================

/**
 * 获取单文件组件中 CSS Modules 的类名映射。
 * 在 SFC 中，`<style module>` 块会被编译为 CSS Modules，
 * useCssModule 返回一个包含局部类名到全局类名映射的对象。
 *
 * @param name - CSS Modules 的名称，默认为 '$style'
 */
export function useCssModule(name = '$style'): Record<string, string> {
  const instance = getCurrentInstance();
  if (!instance) {
    if (__DEV__) {
      warnOnce('useCssModule() was called outside of setup().');
    }
    return {};
  }

  // CSS Modules 的类名映射存储在 instance 的 cssModules 中
  const cssModules = (instance as unknown as Record<string, unknown>).cssModules as
    | Record<string, Record<string, string>>
    | undefined;
  return cssModules?.[name] ?? {};
}

/**
 * 在组件实例上设置 CSS 自定义属性（CSS Variables）。
 * 提供响应式的方式来管理 CSS 变量。
 *
 * @param vars - 一个函数，返回包含 CSS 变量键值对的对象
 *
 * 用法：
 *   useCssVars(() => ({
 *     color: themeColor.value,
 *     fontSize: size.value + 'px',
 *   }))
 */
export function useCssVars(vars: () => Record<string, string>): void {
  const instance = getCurrentInstance();
  if (!instance) {
    if (__DEV__) {
      warnOnce('useCssVars() was called outside of setup().');
    }
    return;
  }

  // 在 mounted 和 updated 时将 CSS 变量设置到组件根元素上
  const updateStyle = (): void => {
    const el = instance.vnode?.el as HTMLElement | null;
    if (!el) return;

    const varsObj = vars();
    for (const [key, value] of Object.entries(varsObj)) {
      const cssVar = key.startsWith('--') ? key : `--${key}`;
      el.style.setProperty(cssVar, value);
    }
  };

  onMounted(updateStyle);

  // 使用 watchEffect 自动追踪 vars() 中的响应式依赖
  const stop = watchEffect(updateStyle);
  onScopeDispose(stop);
}
