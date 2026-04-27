/**
 * Lyt.js defineAsyncComponent - 异步组件定义
 *
 * 定义异步加载的组件，支持加载状态、错误处理、超时和重试。
 * 可配合 Suspense 组件使用（suspensible 模式）。
 * 纯原生实现，零外部依赖。
 */

import {
  defineComponent,
  type ComponentDefine,
  type ComponentOptions,
} from '../define-component';

// ============================================================
// 类型定义
// ============================================================

/** 异步组件配置选项 */
export interface AsyncComponentOptions {
  /** 异步加载函数，返回 Promise<ComponentDefine | ComponentOptions> */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  loader: () => Promise<any>;
  /** 加载中显示的组件 */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  loadingComponent?: any;
  /** 加载失败显示的组件 */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  errorComponent?: any;
  /** 延迟显示 loading 的时间(ms)，默认 200 */
  delay?: number;
  /** 超时时间(ms)，超时后显示 errorComponent */
  timeout?: number;
  /** 错误回调 */
  onError?: (error: Error, retry: () => void, fail: () => void) => void;
  /** 是否配合 Suspense 使用，默认 true */
  suspensible?: boolean;
  /** 重试次数上限，默认 3 */
  retryCount?: number;
}

/** 异步组件内部状态 */
interface AsyncComponentState {
  /** 加载状态：pending / loading / resolved / error / timeout */
  status: 'pending' | 'loading' | 'resolved' | 'error' | 'timeout';
  /** 加载完成的组件定义 */
  resolvedComponent: ComponentDefine | null;
  /** 加载失败的错误 */
  error: Error | null;
  /** 是否正在重试 */
  isRetrying: boolean;
  /** 已重试次数 */
  retryAttempts: number;
  /** loading 延迟定时器 ID */
  loadingDelayId: number | null;
  /** 超时定时器 ID */
  timeoutId: number | null;
  /** 加载 Promise（供 Suspense 使用） */
  loadPromise: Promise<ComponentDefine> | null;
}

// ============================================================
// 工具函数
// ============================================================

/**
 * 判断值是否为函数
 */
function isFunction(val: unknown): val is Function {
  return typeof val === 'function';
}

/**
 * 判断值是否为普通对象
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isPlainObject(val: unknown): val is Record<string, any> {
  return val !== null && typeof val === 'object' && !Array.isArray(val);
}

/**
 * 标准化加载结果为 ComponentDefine
 *
 * loader 可能返回 ComponentDefine、ComponentOptions 或其他格式，
 * 此函数将其统一转换为 ComponentDefine。
 *
 * @param loaded - loader 返回的值
 * @returns 标准化后的 ComponentDefine
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeAsyncComponent(loaded: any): ComponentDefine {
  // 已经是 ComponentDefine
  if (loaded && loaded._isComponentDefine) {
    return loaded;
  }

  // 是 ComponentOptions
  if (isPlainObject(loaded) && !isFunction(loaded)) {
    return defineComponent(loaded as ComponentOptions);
  }

  // 是函数（可能是 defineComponent 的返回值或函数组件）
  if (isFunction(loaded)) {
    // 如果函数有 _isComponentDefine 标记
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((loaded as any)._isComponentDefine) {
      return loaded;
    }
    // 包装为函数组件
    return defineComponent({
      render(h, instance) {
        return loaded(instance.props, { slots: instance.slots, emit: instance.emit });
      },
    });
  }

  // 其他情况：包装为简单组件
  console.warn('[Lyt AsyncComponent] loader 返回了无效的组件类型:', typeof loaded);
  return defineComponent({
    render() {
      return null;
    },
  });
}

// ============================================================
// defineAsyncComponent 实现
// ============================================================

/**
 * 定义异步组件
 *
 * 返回一个包装组件，首次渲染时调用 loader 异步加载真实组件。
 * 加载过程中可显示 loadingComponent，加载失败显示 errorComponent。
 *
 * @param options - 异步组件配置选项，或直接传入 loader 函数
 * @returns 异步组件定义（ComponentDefine）
 *
 * @example
 * ```ts
 * // 简单用法：传入 loader 函数
 * const AsyncComp = defineAsyncComponent(() => import('./MyComponent'));
 *
 * // 完整配置
 * const AsyncComp = defineAsyncComponent({
 *   loader: () => import('./MyComponent'),
 *   loadingComponent: LoadingSpinner,
 *   errorComponent: ErrorDisplay,
 *   delay: 200,          // 200ms 后才显示 loading
 *   timeout: 10000,      // 10s 超时
 *   onError(error, retry, fail) {
 *     if (error.message.includes('network')) {
 *       retry();         // 网络错误时重试
 *     } else {
 *       fail();          // 其他错误直接失败
 *     }
 *   },
 *   suspensible: true,   // 配合 Suspense 使用
 * });
 * ```
 */
export function defineAsyncComponent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options: AsyncComponentOptions | (() => Promise<any>)
): ComponentDefine {
  // 如果传入的是函数，包装为 AsyncComponentOptions
  let resolvedOptions: AsyncComponentOptions;
  if (isFunction(options)) {
    resolvedOptions = {
      loader: options,
    };
  } else {
    resolvedOptions = options;
  }

  const {
    loader,
    loadingComponent,
    errorComponent,
    delay = 200,
    timeout,
    onError,
    suspensible = true,
    retryCount = 3,
  } = resolvedOptions;

  // 创建异步组件内部状态
  const asyncState: AsyncComponentState = {
    status: 'pending',
    resolvedComponent: null,
    error: null,
    isRetrying: false,
    retryAttempts: 0,
    loadingDelayId: null,
    timeoutId: null,
    loadPromise: null,
  };

  /**
   * 执行加载
   *
   * 调用 loader 函数加载组件，处理成功、失败和超时。
   *
   * @returns 加载 Promise
   */
  function load(): Promise<ComponentDefine> {
    // 如果已经在加载中或已完成，返回已有的 Promise
    if (asyncState.loadPromise) {
      return asyncState.loadPromise;
    }

    // 标记为加载中
    asyncState.status = 'loading';
    asyncState.isRetrying = false;

    // 创建加载 Promise
    const loadPromise = loader()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((loaded: any) => {
        // 加载成功
        asyncState.status = 'resolved';
        asyncState.resolvedComponent = normalizeAsyncComponent(loaded);
        asyncState.error = null;

        // 清除定时器
        clearTimers();

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return asyncState.resolvedComponent!;
      })
      .catch((error: Error) => {
        // 加载失败
        asyncState.error = error;

        // 如果有 onError 回调，尝试重试
        if (onError && asyncState.retryAttempts < retryCount) {
          asyncState.retryAttempts++;
          asyncState.isRetrying = true;
          asyncState.loadPromise = null; // 重置 Promise，允许重试

          // 调用 onError，提供 retry 和 fail 选项
          onError(
            error,
            // retry：重新加载
            () => {
              load();
            },
            // fail：标记为失败
            () => {
              asyncState.status = 'error';
              clearTimers();
            }
          );

          // 返回一个永远不会 resolve 的 Promise（等待重试）
          return new Promise<ComponentDefine>(() => {});
        }

        // 超过重试次数或没有 onError，标记为失败
        asyncState.status = 'error';
        clearTimers();

        throw error;
      });

    asyncState.loadPromise = loadPromise;

    // 设置超时
    if (timeout && timeout > 0) {
      asyncState.timeoutId = window.setTimeout(() => {
        if (asyncState.status === 'loading' || asyncState.status === 'pending') {
          asyncState.status = 'timeout';
          asyncState.error = new Error(
            `[Lyt AsyncComponent] 加载超时 (${timeout}ms)`
          );
          clearTimers();
        }
      }, timeout) as unknown as number;
    }

    return loadPromise;
  }

  /**
   * 清除所有定时器
   */
  function clearTimers(): void {
    if (asyncState.loadingDelayId !== null) {
      window.clearTimeout(asyncState.loadingDelayId);
      asyncState.loadingDelayId = null;
    }
    if (asyncState.timeoutId !== null) {
      window.clearTimeout(asyncState.timeoutId);
      asyncState.timeoutId = null;
    }
  }

  // 创建异步组件包装对象（暴露给 Suspense/SSR 的标记）
  const asyncComponentWrapper = defineComponent({
    name: 'AsyncComponent',

    state(): AsyncComponentState {
      return { ...asyncState };
    },

    init(props, state) {
      // 复制异步状态到组件 state
      Object.assign(state, asyncState);
    },

    render(h, instance) {
      const state = instance.state as AsyncComponentState;

      // 如果已经加载完成，渲染真实组件
      if (state.status === 'resolved' && state.resolvedComponent) {
        // 将真实组件的信息附加到 VNode 上
        const resolvedDef = state.resolvedComponent;
        return {
          tag: resolvedDef,
          __asyncResolved: true,
          __asyncComponent: resolvedDef,
        };
      }

      // 如果加载失败且有 errorComponent，渲染错误组件
      if (
        (state.status === 'error' || state.status === 'timeout') &&
        errorComponent
      ) {
        return {
          tag: errorComponent,
          __asyncError: true,
          __asyncErrorInfo: {
            error: state.error,
            retry: () => {
              asyncState.status = 'pending';
              asyncState.loadPromise = null;
              load();
            },
            isTimeout: state.status === 'timeout',
          },
        };
      }

      // 如果正在加载中
      if (state.status === 'loading' || state.status === 'pending') {
        // 如果配合 Suspense 使用，挂载异步标记
        if (suspensible) {
          // 启动加载（如果尚未开始）
          if (!asyncState.loadPromise) {
            load();
          }

          // 返回带有 Suspense 标记的 VNode
          return {
            __suspense: true,
            __asyncPromise: asyncState.loadPromise,
            __asyncSetup: true,
            _isAsyncComponent: true,
          };
        }

        // 不配合 Suspense：自行管理加载状态
        // 启动加载
        if (!asyncState.loadPromise) {
          load();
        }

        // 如果有 loadingComponent 且已超过延迟时间
        if (loadingComponent) {
          // 使用延迟显示 loading
          if (delay > 0 && asyncState.loadingDelayId === null) {
            asyncState.loadingDelayId = window.setTimeout(() => {
              // 延迟时间过后，触发重新渲染以显示 loading
              if (
                instance.renderProxy &&
                instance.renderProxy.$forceUpdate
              ) {
                instance.renderProxy.$forceUpdate();
              }
            }, delay) as unknown as number;
          }

          // 检查是否已超过延迟时间
          if (delay <= 0 || asyncState.loadingDelayId === null) {
            return {
              tag: loadingComponent,
              __asyncLoading: true,
            };
          }
        }

        // 没有 loadingComponent 或还在延迟中，返回空
        return null;
      }

      // 重试中
      if (state.isRetrying) {
        if (loadingComponent) {
          return {
            tag: loadingComponent,
            __asyncRetrying: true,
          };
        }
        return null;
      }

      // 默认返回空
      return null;
    },
  });

  // 在组件定义上暴露异步标记，供 Suspense 和 SSR 流式渲染识别
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (asyncComponentWrapper as any)._isAsyncComponent = true;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (asyncComponentWrapper as any).__asyncSetup = true;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (asyncComponentWrapper as any).__suspense = true;

  // 暴露内部状态和加载方法（供 SSR 和测试使用）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (asyncComponentWrapper as any)._asyncState = asyncState;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (asyncComponentWrapper as any)._load = load;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (asyncComponentWrapper as any)._clearTimers = clearTimers;

  return asyncComponentWrapper;
}
