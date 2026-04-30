// src/define-component.ts
// @lytjs/core - 组件定义

import type {
  Component,
  AsyncComponentLoader,
  AsyncComponentOptions,
} from "./types";
import type { ComponentOptions } from "./types";
import { defineComponent as _defineComponent, onBeforeUnmount } from "@lytjs/component";
import { shallowRef, ref } from "@lytjs/reactivity";
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

  const MAX_RETRIES = 3;
  const retry = () => {
    if (retries >= MAX_RETRIES) {
      if (__DEV__) {
        console.warn(`AsyncComponent: max retries (${MAX_RETRIES}) exceeded.`);
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
    return loader()
      .then((comp) => {
        loadedComponent.value = comp;
        error.value = undefined;
        loading.value = false;
        return comp;
      })
      .catch((err) => {
        error.value = err;
        loading.value = false;
        if (onError) {
          return new Promise<any>((resolve, reject) => {
            onError(err, () => resolve(retry()), reject, retries);
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

  // 预加载
  load();

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
    render() {
      if (loadedComponent.value) {
        return h(loadedComponent.value);
      }
      if (error.value && errorComponent) {
        return h(errorComponent);
      }
      if (loading.value && loadingComponent) {
        return h(loadingComponent);
      }
      return null;
    },
  };

  return comp as Component;
}
