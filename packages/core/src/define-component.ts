// src/define-component.ts
// @lytjs/core - 组件定义

import type {
  ComponentOptions,
  Component,
  AsyncComponentLoader,
  AsyncComponentOptions,
} from "./types";

/**
 * 定义组件（类型标记 + 直接返回 options）
 */
export function defineComponent(options: ComponentOptions): Component {
  return options as Component;
}

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

  let resolvedComponent: Component | undefined;
  let error: Error | undefined;
  let retries = 0;

  const retry = () => {
    retries++;
    resolvedComponent = undefined;
    error = undefined;
    return load();
  };

  const load = (): Promise<Component> => {
    return loader()
      .then((comp) => {
        resolvedComponent = comp;
        error = undefined;
        return comp;
      })
      .catch((err) => {
        error = err;
        if (onError) {
          return new Promise<any>((resolve, reject) => {
            onError(err, () => resolve(retry()), reject, retries);
          });
        }
        throw err;
      });
  };

  // 预加载
  load();

  const comp: ComponentOptions = {
    name: "AsyncComponent",
    setup() {
      const instance = {
        resolved: resolvedComponent,
        loading: loadingComponent,
        error: errorComponent,
        delay,
        timeout,
      };

      return instance;
    },
    render() {
      if (resolvedComponent) {
        return resolvedComponent;
      }
      if (error && errorComponent) {
        return errorComponent;
      }
      if (loadingComponent) {
        return loadingComponent;
      }
      return null;
    },
  };

  return comp as Component;
}
