// src/define-component.ts
// @lytjs/core - 组件定义

import type {
  Component,
  AsyncComponentLoader,
  AsyncComponentOptions,
} from "./types";
import type { ComponentOptions } from "./types";
import { defineComponent as _defineComponent } from "@lytjs/component";
import { shallowRef, ref } from "@lytjs/reactivity";

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

  const retry = () => {
    retries++;
    loadedComponent.value = undefined;
    error.value = undefined;
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

  // 超时处理
  if (timeout != null) {
    setTimeout(() => {
      if (!loadedComponent.value && !error.value) {
        error.value = new Error(
          `[lytjs/core] AsyncComponent timed out after ${timeout}ms.`,
        );
        loading.value = false;
      }
    }, timeout);
  }

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

      return instance;
    },
    render() {
      if (loadedComponent.value) {
        return loadedComponent.value;
      }
      if (error.value && errorComponent) {
        return errorComponent;
      }
      if (loading.value && loadingComponent) {
        return loadingComponent;
      }
      return null;
    },
  };

  return comp as Component;
}
