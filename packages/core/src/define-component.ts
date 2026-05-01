// src/define-component.ts
// @lytjs/core - 组件定义

import type {
  Component,
  AsyncComponentLoader,
  AsyncComponentOptions,
  VNode,
} from "./types";
import type { ComponentOptions } from "./types";
import {
  defineComponent as _defineComponent,
  onBeforeUnmount,
} from "@lytjs/component";
import { shallowRef, ref } from "@lytjs/reactivity";
import { warn } from "@lytjs/common-error";
import { h } from "./h";

/**
 * 定义组件（re-export from @lytjs/component）
 *
 * 权威实现在 @lytjs/component 中，此处统一返回类型为 ComponentOptions。
 * 由于 Component = ComponentOptions | (() => any)，
 * 返回 ComponentOptions 是 Component 的子集，完全兼容。
 */
export const defineComponent: (options: ComponentOptions) => ComponentOptions =
  _defineComponent;

/**
 * 定义异步组件
 */
export function defineAsyncComponent(
  source: AsyncComponentLoader | AsyncComponentOptions,
): Component {
  if (typeof source === "function") {
    source = { loader: source };
  }

  const {
    loader,
    loadingComponent,
    errorComponent,
    delay = 200,
    timeout,
    onError,
  } = source;

  const loadedComponent = shallowRef<Component | undefined>(undefined);
  const error = ref<Error | undefined>(undefined);
  const loading = ref(false);
  let retries = 0;
  let showLoading = false;
  let delayTimer: ReturnType<typeof setTimeout> | null = null;

  const MAX_RETRIES = 3;
  const retry = () => {
    if (retries >= MAX_RETRIES) {
      if (__DEV__) {
        warn(`AsyncComponent: max retries (${MAX_RETRIES}) exceeded.`);
      }
      error.value = new Error(
        `[lytjs/core] AsyncComponent: max retries (${MAX_RETRIES}) exceeded.`,
      );
      return;
    }
    retries++;
    loadedComponent.value = undefined;
    error.value = undefined;
    startTimeout();
    return load();
  };

  const load = (): Promise<Component> => {
    loading.value = true;
    showLoading = false;
    if (delayTimer) clearTimeout(delayTimer);
    delayTimer = setTimeout(() => {
      showLoading = true;
    }, delay);
    return loader()
      .then((comp) => {
        loadedComponent.value = comp;
        error.value = undefined;
        loading.value = false;
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
      .catch((err) => {
        error.value = err;
        loading.value = false;
        if (onError) {
          return new Promise<Component>((resolve, reject) => {
            let settled = false;
            const ON_ERROR_TIMEOUT = 30000; // 30 秒超时保护
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
        throw err;
      });
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
        error.value = new Error(
          `[lytjs/core] AsyncComponent timed out after ${timeout}ms.`,
        );
        loading.value = false;
      }
    }, timeout);
  };
  startTimeout();

  // 延迟加载：在组件首次渲染时触发，而非立即加载
  // load();

  const comp: ComponentOptions = {
    name: "AsyncComponent",
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
      });

      return instance;
    },
    render(): VNode | null {
      // 首次渲染时触发加载
      if (!loadedComponent.value && !error.value && !loading.value) {
        load();
      }
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
