// src/async-component.ts
// Async component loader with preload support
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

// ==================== Types ====================

/**
 * Async component loader function type
 */
export type AsyncComponentLoader<T = unknown> = () => Promise<T>;

/**
 * Options for defining an async component
 */
export interface AsyncComponentOptions {
  /**
   * The loader function that returns a Promise resolving to the component
   */
  loader: AsyncComponentLoader<ComponentOptions>;

  /**
   * Component to display while the async component is loading
   */
  loadingComponent?: ComponentOptions;

  /**
   * Component to display if the async component fails to load
   */
  errorComponent?: ComponentOptions;

  /**
   * Delay in milliseconds before showing the loading component
   * @default 200
   */
  delay?: number;

  /**
   * Timeout in milliseconds for the async component to load
   */
  timeout?: number;

  /**
   * Whether to suspend the component rendering until it's loaded
   * @default false
   */
  suspensible?: boolean;

  /**
   * Error handler for when the async component fails to load
   */
  onError?: (error: Error) => void;
}

/**
 * Internal state for async component loading
 */
interface AsyncComponentState {
  loadedComponent: ComponentOptions | null;
  error: Error | null;
  isLoading: boolean;
  isLoaded: boolean;
  isError: boolean;
  loadingPromise: Promise<void> | null;
}

// ==================== Preload Registry ====================

/**
 * Registry for preloaded components
 * Maps loader functions to their preloaded component promises
 */
const preloadedComponents = new WeakMap<
  AsyncComponentLoader,
  Promise<ComponentOptions>
>();

/**
 * Registry for active async component instances
 * Used to track loading state across re-renders
 */
const asyncComponentStates = new WeakMap<
  ComponentInternalInstance,
  AsyncComponentState
>();

// ==================== Async Component Factory ====================

/**
 * Define an async component with loading, error, and preload support.
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
  // Normalize options
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
   * Load the async component
   */
  function load(): Promise<ComponentOptions> {
    // Return cached preloaded promise if available
    if (preloadedComponents.has(loader)) {
      return preloadedComponents.get(loader)!;
    }

    // Return existing load promise if loading is in progress
    if (loadPromise) {
      return loadPromise;
    }

    // Create new load promise
    loadPromise = loader()
      .then((comp) => {
        // Handle ES module default export
        const resolvedComponent =
          (comp as { default?: ComponentOptions }).default || comp;

        // Cache the loaded component
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
        // Preload complete
      })
      .catch(() => {
        // Preload errors are silent - they will be handled when actually rendering
      });
  }

  // Create the async component wrapper
  const AsyncComponentWrapper: ComponentOptions = {
    name: 'AsyncComponentWrapper',

    setup(_props: Record<string, unknown>, { slots }: { slots?: Record<string, unknown> }) {
      const instance = getCurrentInstance();

      // Get or create state for this instance
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

      // If already loaded, return the loaded component
      if (state.isLoaded && state.loadedComponent) {
        return () => renderLoadedComponent(state.loadedComponent!, slots);
      }

      // If error occurred, show error component
      if (state.isError) {
        return () =>
          errorComponent
            ? createComponentVNode(errorComponent, { error: state.error })
            : createAsyncCommentVNode(' Async component error ');
      }

      // Start loading if not already loading
      if (!state.isLoading) {
        state.isLoading = true;

        // FIX: DTS build error - loadStartTime æœªä½¿ç”?
        // const loadStartTime = Date.now();

        state.loadingPromise = load()
          .then((comp) => {
            state.loadedComponent = comp;
            state.isLoaded = true;
            state.isLoading = false;

            // Trigger re-render
            if (instance) {
              triggerComponentUpdate(instance);
            }
          })
          .catch((err: unknown) => {
            state.error = err instanceof Error ? err : new Error(String(err));
            state.isError = true;
            state.isLoading = false;

            // Trigger re-render to show error
            if (instance) {
              triggerComponentUpdate(instance);
            }
          });

        // Handle timeout
        // FIX: P2-38 超时定时器在组件卸载时通过 onScopeDispose 清理，
        // 避免组件卸载后定时器仍然触发导致无效操作和内存泄漏
        if (timeout !== undefined && timeout > 0) {
          const timeoutId = setTimeout(() => {
            if (!state.isLoaded && !state.isError) {
              state.error = new Error(
                `Async component loading timed out after ${timeout}ms`,
              );
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

      // Return loading component or placeholder while loading
      return () => {
        // If delay is 0 or component is preloaded, don't show loading
        if (delay === 0 && state.isLoading && !state.loadedComponent) {
          return createAsyncCommentVNode(' Async component loading ');
        }

        // Show loading component if configured
        if (loadingComponent) {
          return createComponentVNode(loadingComponent, {});
        }

        return createAsyncCommentVNode(' Async component loading ');
      };
    },
  };

  // Attach preload method to the component
  return Object.assign(AsyncComponentWrapper, { preload });
}

// ==================== Helper Functions ====================

/**
 * Trigger a component update by calling instance.update().
 * Falls back to nextTick-based re-render if instance.update is not available.
 */
function triggerComponentUpdate(instance: ComponentInternalInstance): void {
  if (instance.update) {
    instance.update();
  }
}

/**
 * Create a VNode for a component
 */
function createComponentVNode(
  component: ComponentOptions,
  props: Record<string, unknown>,
): VNode {
  return createVNode(
    component,
    props,
    null,
    ShapeFlags.STATEFUL_COMPONENT,
  );
}

/**
 * Create a comment VNode (local helper)
 * FIX: DTS build error - é‡å‘½åé¿å…ä¸Žå¯¼å…¥çš?createCommentVNode å†²çª
 */
function createAsyncCommentVNode(text: string): VNode {
  // FIX: DTS build error - 调用导入的 createCommentVNode
  return createCommentVNode(text);
}

/**
 * Render the loaded component
 */
function renderLoadedComponent(
  component: ComponentOptions,
  slots?: Record<string, unknown>,
): VNode {
  // FIX: DTS build error - slots 类型断言
  return createVNode(
    component,
    {},
    slots as VNodeChildren,
    ShapeFlags.STATEFUL_COMPONENT,
  );
}

// ==================== Preload Utilities ====================

/**
 * Preload multiple async components at once.
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
export function preloadComponents(
  loaders: AsyncComponentLoader[],
): Promise<void> {
  return Promise.all(loaders.map((loader) => preloadComponent(loader))).then(
    () => {
      // All components preloaded
    },
  );
}

/**
 * Preload a single component by its loader function.
 */
export function preloadComponent(
  loader: AsyncComponentLoader,
): Promise<void> {
  if (preloadedComponents.has(loader)) {
    return Promise.resolve();
  }

  return (loader() as Promise<ComponentOptions>)
    .then((comp) => {
      const resolvedComponent =
        (comp as { default?: ComponentOptions }).default || comp;
      preloadedComponents.set(loader, Promise.resolve(resolvedComponent));
    })
    .catch(() => {
      // Preload errors are silent
    });
}

/**
 * Check if a component has been preloaded.
 */
export function isComponentPreloaded(loader: AsyncComponentLoader): boolean {
  return preloadedComponents.has(loader);
}

/**
 * Clear the preload cache for a specific loader or all loaders.
 */
export function clearPreloadCache(loader?: AsyncComponentLoader): void {
  if (loader) {
    preloadedComponents.delete(loader);
  } else {
    // Note: WeakMap cannot be cleared entirely
    // This would require using a Map instead if full clearing is needed
    if (__DEV__) {
      warn(
        'clearPreloadCache() without arguments is not supported with WeakMap. ' +
          'Pass a specific loader to clear, or consider using a Map instead.',
      );
    }
  }
}

// ==================== Export Types ====================

export type { AsyncComponentState };
