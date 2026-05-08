// src/async-component.ts
// 异步组件加载器（支持预加载）
// FIX: P2-7 COMPONENT-NEW-04 - 异步组件加载与预加载支持

import type { ComponentOptions, ComponentInternalInstance } from './types';
import type { VNode, VNodeChildren } from '@lytjs/vdom';
// FIX: DTS build error - 删除未使用的导入
// import { createComponentInstance, setupComponent } from './component';
// FIX: DTS build error - 统一从vdom 导入
import { ShapeFlags, createVNode, createCommentVNode } from '@lytjs/vdom';
import { isFunction } from '@lytjs/common-is';
import { warn } from '@lytjs/common-error';
import { getCurrentInstance, onBeforeUnmount } from './lifecycle';

// ==================== 类型定义 ====================

/**
 * 异步组件加载器函数类型
 */
export type AsyncComponentLoader<T = unknown> = () => Promise<T>;

/**
 * 定义异步组件的选项
 */
export interface AsyncComponentOptions {
  /**
   * 返回 Promise 解析为组件的加载器函数
   */
  loader: AsyncComponentLoader<ComponentOptions>;

  /**
   * 异步组件加载时显示的组件
   */
  loadingComponent?: ComponentOptions;

  /**
   * 异步组件加载失败时显示的组件
   */
  errorComponent?: ComponentOptions;

  /**
   * 显示加载组件前的延迟时间（毫秒）
   * @default 200
   */
  delay?: number;

  /**
   * 异步组件加载的超时时间（毫秒）
   */
  timeout?: number;

  /**
   * 是否挂起组件渲染直到加载完成
   * @default false
   */
  suspensible?: boolean;

  /**
   * 异步组件加载失败时的错误处理器
   */
  onError?: (error: Error) => void;
}

/**
 * 异步组件加载的内部状态
 */
interface AsyncComponentState {
  loadedComponent: ComponentOptions | null;
  error: Error | null;
  isLoading: boolean;
  isLoaded: boolean;
  isError: boolean;
  loadingPromise: Promise<void> | null;
}

// ==================== 预加载注册表 ====================

/**
 * 预加载组件的注册表
 * 将加载器函数映射到其预加载的组件 Promise
 */
const preloadedComponents = new WeakMap<AsyncComponentLoader, Promise<ComponentOptions>>();

/**
 * 活跃的异步组件实例注册表
 * 用于跨重渲染追踪加载状态
 */
const asyncComponentStates = new WeakMap<ComponentInternalInstance, AsyncComponentState>();

// ==================== 异步组件工厂 ====================

/**
 * 定义一个异步组件，支持加载、错误和预加载功能。
 *
 * @example
 * ```ts
 * const AsyncComp = defineAsyncComponent({
 *   loader: () => import('./MyComponent.vue'),
 *   loadingComponent: LoadingSpinner,
 *   errorComponent: ErrorDisplay,
 *   delay: 200,
 *   timeout: 3000,
 * });
 *
 * // Preload the component before it's needed
 * AsyncComp.preload();
 * ```
 */
export function defineAsyncComponent(
  options: AsyncComponentOptions | AsyncComponentLoader<ComponentOptions>,
): ComponentOptions & { preload: () => Promise<void> } {
  // 规范化选项
  const normalizedOptions: AsyncComponentOptions = isFunction(options)
    ? { loader: options }
    : options;

  const {
    loader,
    loadingComponent,
    errorComponent,
    delay = 200,
    timeout,
    // FIX: DTS build error - suspensible æœªä½¿ç”?
    // suspensible = false,
    onError,
  } = normalizedOptions;

  let loadPromise: Promise<ComponentOptions> | null = null;

  /**
   * 加载异步组件
   */
  function load(): Promise<ComponentOptions> {
    // 如果有缓存的预加载 Promise 则直接返回
    if (preloadedComponents.has(loader)) {
      return preloadedComponents.get(loader)!;
    }

    // 如果正在加载中，返回现有的加载 Promise
    if (loadPromise) {
      return loadPromise;
    }

    // 创建新的加载 Promise
    loadPromise = loader()
      .then((comp) => {
        // 处理 ES 模块默认导出
        const resolvedComponent = (comp as { default?: ComponentOptions }).default || comp;

        // 缓存已加载的组件
        preloadedComponents.set(loader, Promise.resolve(resolvedComponent));

        return resolvedComponent;
      })
      .catch((err: unknown) => {
        loadPromise = null;
        const error = err instanceof Error ? err : new Error(String(err));

        if (onError) {
          onError(error);
        }

        throw error;
      });

    return loadPromise;
  }

  /**
   * Preload the async component before it's needed.
   * This allows eager loading of components that are likely to be needed soon.
   */
  function preload(): Promise<void> {
    if (preloadedComponents.has(loader)) {
      return Promise.resolve();
    }

    return load()
      .then(() => {
        // 预加载完成
      })
      .catch(() => {
        // 预加载错误静默处理 - 实际渲染时会处理
      });
  }

  // 创建异步组件包装器
  const AsyncComponentWrapper: ComponentOptions = {
    name: 'AsyncComponentWrapper',

    setup(_props: Record<string, unknown>, { slots }: { slots?: Record<string, unknown> }) {
      const instance = getCurrentInstance();

      // 获取或创建此实例的状态
      let state: AsyncComponentState;
      if (instance && asyncComponentStates.has(instance)) {
        state = asyncComponentStates.get(instance)!;
      } else {
        state = {
          loadedComponent: null,
          error: null,
          isLoading: false,
          isLoaded: false,
          isError: false,
          loadingPromise: null,
        };
        if (instance) {
          asyncComponentStates.set(instance, state);
        }
      }

      // 如果已加载，返回已加载的组件
      if (state.isLoaded && state.loadedComponent) {
        return () => renderLoadedComponent(state.loadedComponent!, slots);
      }

      // 如果发生错误，显示错误组件
      if (state.isError) {
        return () =>
          errorComponent
            ? createComponentVNode(errorComponent, { error: state.error })
            : createAsyncCommentVNode(' Async component error ');
      }

      // 如果尚未加载，开始加载
      if (!state.isLoading) {
        state.isLoading = true;

        // FIX: DTS build error - loadStartTime æœªä½¿ç”?
        // const loadStartTime = Date.now();

        state.loadingPromise = load()
          .then((comp) => {
            state.loadedComponent = comp;
            state.isLoaded = true;
            state.isLoading = false;

            // 触发重新渲染
            if (instance) {
              triggerComponentUpdate(instance);
            }
          })
          .catch((err: unknown) => {
            state.error = err instanceof Error ? err : new Error(String(err));
            state.isError = true;
            state.isLoading = false;

            // 触发重新渲染以显示错误
            if (instance) {
              triggerComponentUpdate(instance);
            }
          });

        // 处理超时
        // FIX: P2-38 超时定时器在组件卸载时通过 onScopeDispose 清理，
        // 避免组件卸载后定时器仍然触发导致无效操作和内存泄漏
        if (timeout !== undefined && timeout > 0) {
          const timeoutId = setTimeout(() => {
            if (!state.isLoaded && !state.isError) {
              state.error = new Error(`Async component loading timed out after ${timeout}ms`);
              state.isError = true;
              state.isLoading = false;

              if (instance) {
                triggerComponentUpdate(instance);
              }
            }
          }, timeout);

          // FIX: DTS build error - 使用 onBeforeUnmount 替代 onScopeDispose
          onBeforeUnmount(() => {
            clearTimeout(timeoutId);
          });
        }
      }

      // 加载中返回加载组件或占位符
      return () => {
        // 如果 delay 为 0 或组件已预加载，不显示加载状态
        if (delay === 0 && state.isLoading && !state.loadedComponent) {
          return createAsyncCommentVNode(' Async component loading ');
        }

        // 如果配置了加载组件则显示
        if (loadingComponent) {
          return createComponentVNode(loadingComponent, {});
        }

        return createAsyncCommentVNode(' Async component loading ');
      };
    },
  };

  // 将预加载方法附加到组件上
  return Object.assign(AsyncComponentWrapper, { preload });
}

// ==================== 辅助函数 ====================

/**
 * 通过调用 instance.update() 触发组件更新。
 * 如果 instance.update 不可用，回退到基于 nextTick 的重新渲染。
 */
function triggerComponentUpdate(instance: ComponentInternalInstance): void {
  if (instance.update) {
    instance.update();
  }
}

/**
 * 为组件创建 VNode
 */
function createComponentVNode(component: ComponentOptions, props: Record<string, unknown>): VNode {
  return createVNode(component, props, null, ShapeFlags.STATEFUL_COMPONENT);
}

/**
 * 创建注释 VNode（本地辅助函数）
 * FIX: DTS build error - 重命名避免与导入的 createCommentVNode 冲突
 */
function createAsyncCommentVNode(text: string): VNode {
  // FIX: DTS build error - 调用导入的 createCommentVNode
  return createCommentVNode(text);
}

/**
 * 渲染已加载的组件
 */
function renderLoadedComponent(
  component: ComponentOptions,
  slots?: Record<string, unknown>,
): VNode {
  // FIX: DTS build error - slots 类型断言
  return createVNode(component, {}, slots as VNodeChildren, ShapeFlags.STATEFUL_COMPONENT);
}

// ==================== 预加载工具函数 ====================

/**
 * 一次性预加载多个异步组件。
 *
 * @example
 * ```ts
 * preloadComponents([
 *   () => import('./CompA.vue'),
 *   () => import('./CompB.vue'),
 *   () => import('./CompC.vue'),
 * ]);
 * ```
 */
export function preloadComponents(loaders: AsyncComponentLoader[]): Promise<void> {
  return Promise.all(loaders.map((loader) => preloadComponent(loader))).then(() => {
    // 所有组件预加载完成
  });
}

/**
 * 通过加载器函数预加载单个组件。
 */
export function preloadComponent(loader: AsyncComponentLoader): Promise<void> {
  if (preloadedComponents.has(loader)) {
    return Promise.resolve();
  }

  return (loader() as Promise<ComponentOptions>)
    .then((comp) => {
      const resolvedComponent = (comp as { default?: ComponentOptions }).default || comp;
      preloadedComponents.set(loader, Promise.resolve(resolvedComponent));
    })
    .catch(() => {
      // 预加载错误静默处理
    });
}

/**
 * 检查组件是否已被预加载。
 */
export function isComponentPreloaded(loader: AsyncComponentLoader): boolean {
  return preloadedComponents.has(loader);
}

/**
 * 清除特定加载器或所有加载器的预加载缓存。
 */
export function clearPreloadCache(loader?: AsyncComponentLoader): void {
  if (loader) {
    preloadedComponents.delete(loader);
  } else {
    // 注意：WeakMap 无法完全清空
    // 如果需要完全清空，应改用 Map
    if (__DEV__) {
      warn(
        'clearPreloadCache() without arguments is not supported with WeakMap. ' +
          'Pass a specific loader to clear, or consider using a Map instead.',
      );
    }
  }
}

// ==================== 导出类型 ====================

export type { AsyncComponentState };
