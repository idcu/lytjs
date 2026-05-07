// src/define-component.ts
// @lytjs/core - 组件定义

import type { Component, AsyncComponentLoader, AsyncComponentOptions, VNode } from './types';
import type { ComponentOptions } from './types';
import { defineComponent as _defineComponent, onBeforeUnmount } from '@lytjs/component';
import { shallowRef, ref } from '@lytjs/reactivity';
import { warn } from '@lytjs/common-error';
import { h } from './h';

/** onError 回调未响应时的默认超时时间（毫秒） */
const DEFAULT_ON_ERROR_TIMEOUT = 30000;

/**
 * 定义组件（re-export from @lytjs/component）
 *
 * 权威实现在 @lytjs/component 中，此处统一返回类型为 ComponentOptions。
 * 由于 Component = ComponentOptions | (() => any)，
 * 返回 ComponentOptions 是 Component 的子集，完全兼容。
 */
export const defineComponent: (options: ComponentOptions) => ComponentOptions = _defineComponent;

/**
 * 定义异步组件
 */
export function defineAsyncComponent(
  source: AsyncComponentLoader | AsyncComponentOptions,
): Component {
  if (typeof source === 'function') {
    source = { loader: source };
  }

  const { loader, loadingComponent, errorComponent, delay = 200, timeout, onError } = source;

  const loadedComponent = shallowRef<Component | undefined>(undefined);
  const error = ref<Error | undefined>(undefined);
  const loading = ref<boolean>(false);
  let retries = 0;
  let showLoading = false;
  let delayTimer: ReturnType<typeof setTimeout> | null = null;
  let loadingPromise: Promise<Component> | null = null;

  const MAX_RETRIES = 3;
  const retry = (): Promise<Component> | void => {
    if (retries >= MAX_RETRIES) {
      if (__DEV__) {
        warn(`AsyncComponent: max retries (${MAX_RETRIES}) exceeded.`);
      }
      error.value = new Error(
        `[lytjs/core] AsyncComponent: max retries (${MAX_RETRIES}) exceeded.`,
      );
      // FIX: P0-09 retry 耗尽后返回 Promise.reject，确保 Promise 链正确 settle，
      // 避免调用方永远等待一个不会 resolve/reject 的 Promise
      return Promise.reject(error.value);
    }
    retries++;
    loadedComponent.value = undefined;
    error.value = undefined;
    loadingPromise = null;
    startTimeout();
    return load();
  };

  const load = (): Promise<Component> => {
    // Prevent duplicate concurrent loads
    if (loadingPromise) return loadingPromise as Promise<Component>;

    loading.value = true;
    showLoading = false;
    if (delayTimer) clearTimeout(delayTimer);
    delayTimer = setTimeout(() => {
      showLoading = true;
    }, delay);
    return (loadingPromise = Promise.resolve(loader())
      .then((comp) => {
        // FIX: P2-v11-15 验证 loader() 返回值，确保是有效的组件定义
        // FIX: P2-batch2-9 添加括号明确运算符优先级，避免 && 和 || 混合使用时的歧义
        if (comp == null || (typeof comp !== 'object' && typeof comp !== 'function')) {
          throw new Error(
            `[lytjs/core] AsyncComponent: loader() returned an invalid component value: ${String(comp)}. ` +
            `Expected a component options object or function.`,
          );
        }
        loadedComponent.value = comp;
        error.value = undefined;
        loading.value = false;
        loadingPromise = null;
        if (delayTimer) {
          clearTimeout(delayTimer);
          delayTimer = null;
        }
        showLoading = false;
        // load 成功后清除 timeout，避免不必要的超时回调
        if (timeoutId !== null) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        return comp;
      })
      .catch((err): Promise<Component> => {
        error.value = err;
        loading.value = false;
        if (onError) {
          return new Promise<Component>((resolve, reject) => {
            let settled = false;
            const ON_ERROR_TIMEOUT = DEFAULT_ON_ERROR_TIMEOUT;
            const timer = setTimeout(() => {
              if (!settled) {
                settled = true;
                reject(
                  new Error(
                    `[lytjs/core] AsyncComponent: onError callback did not call retry() or reject() within ${ON_ERROR_TIMEOUT / 1000}s.`,
                  ),
                );
              }
            }, ON_ERROR_TIMEOUT);
            onError(
              err,
              () => {
                if (!settled) {
                  settled = true;
                  clearTimeout(timer);
                  const result = retry();
                  if (result) resolve(result);
                }
              },
              (reason?: unknown) => {
                if (!settled) {
                  settled = true;
                  clearTimeout(timer);
                  reject(reason ?? err);
                }
              },
              retries,
            );
          });
        }
        return Promise.reject(err);
      }));
  };

  // 超时处理：封装为函数以便 retry 时重新设置
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const startTimeout = () => {
    if (timeout == null) return;
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      if (!loadedComponent.value && !error.value) {
        error.value = new Error(`[lytjs/core] AsyncComponent timed out after ${timeout}ms.`);
        loading.value = false;
      }
    }, timeout);
  };
  startTimeout();

  // 延迟加载：在组件首次渲染时触发，而非立即加载
  // load();

  const comp: ComponentOptions = {
    name: 'AsyncComponent',
    setup() {
      const instance = {
        resolved: loadedComponent,
        loading,
        error,
        delay,
        timeout,
      };

      onBeforeUnmount(() => {
        if (timeoutId !== null) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        if (delayTimer !== null) {
          clearTimeout(delayTimer);
          delayTimer = null;
        }
      });

      // 在 setup 阶段触发加载，避免 render 中触发副作用
      if (!loadedComponent.value && !error.value && !loading.value) {
        load();
      }

      return instance;
    },
    render(): VNode | null {
      if (loadedComponent.value) {
        return h(loadedComponent.value);
      }
      if (error.value && errorComponent) {
        return h(errorComponent);
      }
      if (showLoading && loadingComponent) {
        return h(loadingComponent);
      }
      return null;
    },
  } as ComponentOptions;

  return comp as Component;
}
