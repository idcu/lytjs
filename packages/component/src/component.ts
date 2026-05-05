// src/component.ts
// Core component instance management

import { reactive, computed, watch } from '@lytjs/reactivity';
import { nextTick } from '@lytjs/common-scheduler';
import { isFunction, isObject, hasOwn, NOOP, EMPTY_OBJ, isPromise } from '@lytjs/common-is';
import { warn } from '@lytjs/common-error';
import type {
  ComponentOptions,
  ComponentInternalInstance,
  ComponentPublicInstance,
  SetupContext,
  InternalSlots,
  AppContext,
  RenderFunction,
} from './types';

// FIX: P1-9 COMPONENT-NEW-03 - provide/inject 类型推断增强
// InjectionKey 是一个 Symbol 类型，用于在 provide/inject 之间建立类型安全的关联。
// 使用方式：
//   const key = Symbol() as InjectionKey<string>;
//   provide(key, 'hello');
//   const value = inject(key); // 类型为 string | undefined
//
// 改进点：
// 1. 使用泛型约束确保类型推断准确性
// 2. 支持默认值类型推断
// 3. 支持工厂函数类型推断
export interface InjectionKey<T> extends Symbol {
  __injectKey?: T;
}

/**
 * Provide 选项接口
 * 用于类型安全的 provide 调用
 */
export interface ProvideOptions<T = unknown> {
  key: InjectionKey<T> | string | symbol;
  value: T;
}

/**
 * Inject 选项接口（改进版）
 * 支持更精确的类型推断
 */
export interface InjectOptions<T = unknown> {
  /** If true, treat defaultValue as a factory function that will be called to produce the default value */
  factory?: boolean;
  /** Look up the value from a specific ancestor key instead of the injected key */
  from?: InjectionKey<T> | string | symbol;
  /** If true, only look up the value from the current instance's own provides (no ancestor lookup) */
  local?: boolean;
}
import type { VNode } from '@lytjs/common-vnode';

type SetupResult = RenderFunction | Record<string, unknown> | void;
import { normalizePropsOptions, resolvePropValue } from './props';
import { normalizeEmitsOptions, emit } from './emit';
import { initSlots } from './slots';
import { setCurrentInstance, getCurrentInstance, callCreatedHook, handleError } from './lifecycle';

// ==================== UID counter ====================

// 异步 setup 超时时间（毫秒）
const ASYNC_SETUP_TIMEOUT = 30000;

// 注意：uid 使用自增整数，在 JavaScript 中 Number.MAX_SAFE_INTEGER 为 2^53 - 1。
// 在实际应用中达到此上限的概率极低（需创建约 9 * 10^15 个组件实例），
// 因此此处不做溢出检查。如确实需要，可考虑使用 BigInt 或周期性重置。
let uid = 0;

// ==================== accessCache 常量 ====================

/**
 * PublicInstanceProxy 属性访问缓存位掩码。
 * 每个公共属性对应一个唯一的位，用于在 accessCache 数组中标记
 * 该属性首次被访问时的查找结果，避免后续重复遍历 setupState/data/props。
 *
 * 位值设计：
 *   0       - 未缓存（需要首次查找）
 *   1       - $ 属性（$data, $props, $el, $emit 等）
 *   2       - setupState
 *   4       - data
 *   8       - props
 *   16      - globalProperties
 *   32      - ctx（公共实例自身属性）
 */
export const enum PublicInstanceProxyAccessCache {
  /** 未缓存 */
  NONE = 0,
  /** 其他（无法归类到具体来源） */
  OTHER = 1,
  /** 来自 setupState */
  SETUP_STATE = 2,
  /** 来自 data */
  DATA = 4,
  /** 来自 props */
  PROPS = 8,
  /** 来自 globalProperties */
  GLOBAL_PROPERTIES = 16,
  /** 来自 ctx（公共实例自身属性，如 $data, $el 等） */
  CONTEXT = 32,
}

/**
 * 公共属性名到 accessCache 位掩码的映射。
 * 用于快速判断一个 key 是否是 Vue 内置公共属性（$data, $props 等）。
 */
export const PUBLIC_PROPERTIES_MAP: Record<string, number> = {
  '$': 1,
  '$el': 2,
  '$data': 4,
  '$props': 8,
  '$attrs': 16,
  '$slots': 32,
  '$refs': 64,
  '$parent': 128,
  '$root': 256,
  '$emit': 512,
  '$options': 1024,
  '$forceUpdate': 2048,
  '$nextTick': 4096,
  '$watch': 8192,
};

// FIX: P2-15 setup 上下文 WeakMap 缓存：
// 缓存 createSetupContext 的结果，避免每次调用 runSetup 时重新创建
const setupContextCache = new WeakMap<ComponentInternalInstance, SetupContext>();

// ==================== createComponentInstance ====================

/**
 * Create a component internal instance from a vnode.
 *
 * Error handling: wraps instance creation in try-catch to prevent
 * uncaught exceptions during component initialization from crashing
 * the application. Errors are propagated to the nearest ErrorBoundary.
 */
export function createComponentInstance(
  vnode: VNode,
  parent: ComponentInternalInstance | null,
): ComponentInternalInstance {
  // FIX: P1-17 在类型转换前验证 vnode.type 是否为有效组件类型
  const rawType = vnode.type;
  if (
    rawType === null ||
    rawType === undefined ||
    typeof rawType === 'string' ||
    typeof rawType === 'number' ||
    typeof rawType === 'boolean' ||
    typeof rawType === 'symbol'
  ) {
    throw new Error(
      `[lytjs/component] createComponentInstance: invalid vnode.type "${String(rawType)}". ` +
      `Expected a component options object or function.`,
    );
  }

  const type = vnode.type as ComponentOptions;

  try {
    // Merge extends and mixins
    const mergedOptions = mergeOptions(type);

    const appContext = parent ? parent.appContext : createAppContext();

    const instance: ComponentInternalInstance = {
      uid: uid++,
      type: mergedOptions,
      vnode,
      subTree: null,
      props: EMPTY_OBJ,
      slots: {} as InternalSlots,
      ctx: {} as ComponentPublicInstance,
      setupState: {},
      data: {},
      propsOptions: normalizePropsOptions(mergedOptions.props),
      emitsOptions: normalizeEmitsOptions(mergedOptions.emits),
      emit: NOOP as (event: string, ...args: unknown[]) => void,
      isMounted: false,
      isUnmounted: false,
      isDeactivated: false,
      isKeepingAlive: false,
      refs: {},
      lifecycle: {
        beforeMount: new Set(),
        mounted: new Set(),
        beforeUpdate: new Set(),
        updated: new Set(),
        beforeUnmount: new Set(),
        unmounted: new Set(),
      },
      provides: parent ? parent.provides : (Object.create(null) as Record<string | symbol, unknown>),
      parent,
      root: parent ? parent.root : (null as unknown as ComponentInternalInstance),
      appContext,
      attrs: {},
      accessCache: null as Record<string, number> | null,
    };

    // Set root to self if no parent
    if (!parent) {
      instance.root = instance;
    }

    // Create emit function bound to this instance
    instance.emit = (event: string, ...args: unknown[]) => emit(instance, event, ...args);

    return instance;
  } catch (err) {
    // Log error for debugging
    if (__DEV__) {
      warn(
        `Failed to create component instance: ${(err as Error).message}`,
      );
    }
    // Propagate error to ErrorBoundary via handleError
    handleError(err as Error, parent, 'createComponentInstance');
    // Re-throw to let the caller handle the failure
    throw err;
  }
}

// ==================== setupComponent ====================

/**
 * Set up a component instance: run setup, init props, init slots.
 */
export function setupComponent(instance: ComponentInternalInstance): void {
  const vnode = instance.vnode;
  if (!vnode) return;

  const { children } = vnode;
  const props = (vnode.props as Record<string, unknown> | null) ?? null;

  // Init props
  initProps(instance, props);

  // Init slots
  initSlots(instance, children);

  // Set up the component
  const setupResult = runSetup(instance);

  if (isPromise(setupResult)) {
    // Async setup - mark vnode as async
    vnode.isAsyncPlaceholder = true;
    // FIX: P1-15 异步 setup 超时定时器在组件卸载时清理，
    // 避免组件卸载后定时器仍然触发导致内存泄漏和无效操作
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timedSetupResult = Promise.race([
      setupResult,
      new Promise<SetupResult>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error('Async component setup timed out')),
          ASYNC_SETUP_TIMEOUT,
        );
      }),
    ]);
    timedSetupResult
      .then((resolvedResult) => {
        // 清理超时定时器
        if (timeoutId !== undefined) {
          clearTimeout(timeoutId);
          timeoutId = undefined;
        }
        if (instance.isUnmounted) return;
        handleSetupResult(instance, resolvedResult as SetupResult);
        vnode.isAsyncPlaceholder = false;
      })
      .catch((err: Error) => {
        // FIX: P1-15 清理超时定时器
        if (timeoutId !== undefined) {
          clearTimeout(timeoutId);
          timeoutId = undefined;
        }
        vnode.isAsyncPlaceholder = false;
        handleError(err, instance, 'setup function');
      });
  } else {
    handleSetupResult(instance, setupResult);
  }
}

/**
 * Run the setup function if defined.
 */
function runSetup(instance: ComponentInternalInstance): SetupResult {
  const { setup } = instance.type;

  if (!setup) return undefined;

  setCurrentInstance(instance);

  try {
    const setupContext = createSetupContext(instance);
    const result = setup(instance.props, setupContext);
    return result;
  } catch (err) {
    handleError(err as Error, instance, 'setup function');
    // Set a no-op render to prevent silent empty rendering
    instance.render = () => null as unknown as VNode;
    return undefined;
  } finally {
    setCurrentInstance(null);
  }
}

/**
 * Handle the result of the setup function.
 */
function handleSetupResult(instance: ComponentInternalInstance, setupResult: SetupResult): void {
  if (isFunction(setupResult)) {
    // Setup returned a render function
    instance.render = setupResult as RenderFunction;
  } else if (isObject(setupResult) && setupResult !== null) {
    // Setup returned a state object
    instance.setupState = setupResult as Record<string, unknown>;
  }

  // Finish component setup
  finishComponentSetup(instance);
}

// ==================== normalizeWatchHandler ====================

/**
 * Normalize a raw watch handler to a bound function.
 * Supports function, string (method name), and object { handler } forms.
 */
function normalizeWatchHandler(
  raw: unknown,
  methods: Record<string, Function> | undefined,
  proxy: ComponentPublicInstance,
): Function | null {
  if (typeof raw === 'function') {
    return raw.bind(proxy);
  }
  if (typeof raw === 'string') {
    if (methods && hasOwn(methods, raw)) {
      return methods[raw]!.bind(proxy);
    }
    if (__DEV__) {
      warn(`Invalid watch handler "${raw}". No matching method found.`);
    }
    return null;
  }
  if (raw !== null && typeof raw === 'object' && typeof (raw as Record<string, unknown>).handler !== 'undefined') {
    return normalizeWatchHandler((raw as Record<string, unknown>).handler, methods, proxy);
  }
  if (__DEV__) {
    warn(`Invalid watch handler. Expected a function, method name string, or { handler } object.`);
  }
  return null;
}

/**
 * Finish component setup: handle data, methods, computed, render.
 *
 * Error handling: wraps the entire setup process in try-catch to
 * gracefully handle errors during data/methods/computed/watch initialization.
 * Errors are propagated to the nearest ErrorBoundary.
 */
export function finishComponentSetup(instance: ComponentInternalInstance): void {
  const { type } = instance;

  // Step 1: Create public instance proxy
  try {
    instance.ctx = createComponentPublicInstance(instance);
  } catch (err) {
    if (__DEV__) {
      warn(
        `Failed to create public instance proxy for ${(type as Record<string, unknown>).name || '(anonymous)'}: ${(err as Error).message}`,
      );
    }
    handleError(err as Error, instance, 'finishComponentSetup (createComponentPublicInstance)');
    instance.render = () => null as unknown as VNode;
    return;
  }

  // Step 2: Init data
  try {
    if (type.data) {
      const data = type.data.call(instance.ctx) ?? {};
      instance.data = reactive(data);
    }
  } catch (err) {
    if (__DEV__) {
      warn(
        `Failed to initialize data for ${(type as Record<string, unknown>).name || '(anonymous)'}: ${(err as Error).message}`,
      );
    }
    handleError(err as Error, instance, 'finishComponentSetup (data initialization)');
    instance.render = () => null as unknown as VNode;
    return;
  }

  // Props conflict detection: create keys set once for reuse
  const __DEV__propsKeys = __DEV__ && instance.props ? new Set(Object.keys(instance.props)) : null;

  // Check data vs props conflict
  if (__DEV__propsKeys && instance.data) {
    for (const key of Object.keys(instance.data)) {
      if (__DEV__propsKeys.has(key)) {
        warn(`Data property "${key}" is already defined as a prop. Use default value in props instead.`);
      }
    }
  }

  const proxy = instance.ctx;

  // Step 3: Init methods
  try {
    if (type.methods) {
      for (const key in type.methods) {
        if (hasOwn(type.methods, key)) {
          const method = type.methods[key]!;
          if (__DEV__ && typeof method !== 'function') {
            warn(`Method "${key}" has type "${typeof method}" in component ${(type as Record<string, unknown>).name || '(anonymous)'}. Expected a function.`);
            continue;
          }
          instance.ctx[key as keyof ComponentPublicInstance] = method.bind(proxy) as never;
        }
      }
      // Check methods vs props conflict
      if (__DEV__propsKeys) {
        for (const key of Object.keys(type.methods)) {
          if (__DEV__propsKeys.has(key)) {
            warn(`Method "${key}" is already defined as a prop.`);
          }
        }
      }
    }
  } catch (err) {
    if (__DEV__) {
      warn(
        `Failed to initialize methods for ${(type as Record<string, unknown>).name || '(anonymous)'}: ${(err as Error).message}`,
      );
    }
    handleError(err as Error, instance, 'finishComponentSetup (methods initialization)');
    instance.render = () => null as unknown as VNode;
    return;
  }

  // Step 4: Init computed
  try {
    if (type.computed) {
      for (const key in type.computed) {
        if (hasOwn(type.computed, key)) {
          const opt = type.computed[key];
          let c;
          if (typeof opt === 'function') {
            // 函数形式 - 只有 getter
            c = computed(() => opt.call(proxy));
          } else if (opt && typeof opt === 'object') {
            // getter/setter 对象形式
            const { get, set } = opt as { get?: Function; set?: Function };
            if (__DEV__) {
              if (typeof get !== 'function') {
                warn(`Computed property "${key}" has no getter in component ${(type as Record<string, unknown>).name || '(anonymous)'}.`);
                continue;
              }
              if (set !== undefined && typeof set !== 'function') {
                warn(`Computed property "${key}" setter is not a function in component ${(type as Record<string, unknown>).name || '(anonymous)'}.`);
              }
            }
            c = computed({
              get: get ? () => get.call(proxy) : (() => undefined),
              set: set ? (v: unknown) => set.call(proxy, v) : undefined,
            } as Parameters<typeof computed>[0]);
          } else if (__DEV__) {
            warn(`Computed property "${key}" is not a function or object in component ${(type as Record<string, unknown>).name || '(anonymous)'}.`);
            continue;
          }
          if (__DEV__ && type.methods && hasOwn(type.methods, key)) {
            warn(`Computed property "${key}" conflicts with a method of the same name in component ${(type as Record<string, unknown>).name || '(anonymous)'}. The method will be overwritten.`);
          }
          instance.ctx[key as keyof ComponentPublicInstance] = c as never;
        }
      }
      // Check computed vs props conflict
      if (__DEV__propsKeys) {
        for (const key of Object.keys(type.computed)) {
          if (__DEV__propsKeys.has(key)) {
            warn(`Computed property "${key}" is already defined as a prop.`);
          }
        }
      }
    }
  } catch (err) {
    if (__DEV__) {
      warn(
        `Failed to initialize computed for ${(type as Record<string, unknown>).name || '(anonymous)'}: ${(err as Error).message}`,
      );
    }
    handleError(err as Error, instance, 'finishComponentSetup (computed initialization)');
    instance.render = () => null as unknown as VNode;
    return;
  }

  // Step 5: Init watch
  try {
    if (type.watch) {
      for (const key in type.watch) {
        if (hasOwn(type.watch, key)) {
          const raw = type.watch[key];
          // 标准化为 handler 数组
          const handlers: Function[] = [];
          if (Array.isArray(raw)) {
            for (const h of raw) {
              const normalized = normalizeWatchHandler(h, type.methods, proxy);
              if (normalized) handlers.push(normalized);
            }
          } else {
            const h = normalizeWatchHandler(raw, type.methods, proxy);
            if (h) handlers.push(h);
          }
          // 提取选项（仅对象形式）
          let options: { immediate?: boolean; deep?: boolean; flush?: 'pre' | 'post' | 'sync' } = {};
          if (!Array.isArray(raw) && raw !== null && typeof raw === 'object' && typeof (raw as Record<string, unknown>).handler !== 'undefined') {
            const watchObj = raw as Record<string, unknown>;
            if (typeof watchObj.immediate === 'boolean') options.immediate = watchObj.immediate;
            if (typeof watchObj.deep === 'boolean') options.deep = watchObj.deep;
            if (typeof watchObj.flush === 'string') options.flush = watchObj.flush as 'pre' | 'post' | 'sync';
          }
          for (const handler of handlers) {
            watch(() => proxy[key as keyof ComponentPublicInstance], handler as (...args: unknown[]) => void, options);
          }
        }
      }
    }
  } catch (err) {
    if (__DEV__) {
      warn(
        `Failed to initialize watch for ${(type as Record<string, unknown>).name || '(anonymous)'}: ${(err as Error).message}`,
      );
    }
    handleError(err as Error, instance, 'finishComponentSetup (watch initialization)');
    instance.render = () => null as unknown as VNode;
    return;
  }

  // Step 6: Call created hooks and register render tracking hooks
  try {
    callCreatedHook(instance);

    // Register Options API renderTracked/renderTriggered hooks
    if (type.renderTracked) {
      if (!instance.renderTrackedHooks) {
        instance.renderTrackedHooks = [];
      }
      instance.renderTrackedHooks.push(type.renderTracked.bind(proxy));
    }
    if (type.renderTriggered) {
      if (!instance.renderTriggeredHooks) {
        instance.renderTriggeredHooks = [];
      }
      instance.renderTriggeredHooks.push(type.renderTriggered.bind(proxy));
    }
  } catch (err) {
    if (__DEV__) {
      warn(
        `Failed during lifecycle hooks for ${(type as Record<string, unknown>).name || '(anonymous)'}: ${(err as Error).message}`,
      );
    }
    handleError(err as Error, instance, 'finishComponentSetup (lifecycle hooks)');
    instance.render = () => null as unknown as VNode;
    return;
  }

  // Step 7: Set up render function
  try {
    if (!instance.render) {
      if (type.render) {
        instance.render = type.render.bind(instance.ctx);
      }
    }
  } catch (err) {
    if (__DEV__) {
      warn(
        `Failed to set up render for ${(type as Record<string, unknown>).name || '(anonymous)'}: ${(err as Error).message}`,
      );
    }
    handleError(err as Error, instance, 'finishComponentSetup (render setup)');
    instance.render = () => null as unknown as VNode;
  }
}

// ==================== initProps ====================

/**
 * Initialize and validate props on a component instance.
 */
export function initProps(
  instance: ComponentInternalInstance,
  rawProps: Record<string, unknown> | null,
): void {
  const propsOptions = instance.propsOptions;
  const props: Record<string, unknown> = {};

  if (!rawProps) {
    instance.props = props;
    return;
  }

  // Process declared props
  for (const key in propsOptions) {
    if (hasOwn(propsOptions, key)) {
      const value = rawProps[key];
      props[key] = resolvePropValue(propsOptions[key]!, value, instance, key);
    }
  }

  // Collect attrs (non-declared props)
  const attrs: Record<string, unknown> = {};
  for (const key in rawProps) {
    if (hasOwn(rawProps, key) && !hasOwn(propsOptions, key)) {
      attrs[key] = rawProps[key];
    }
  }

  instance.props = props;
  instance.attrs = attrs;
}

// ==================== createSetupContext ====================

/**
 * Create the setup context object passed to the setup function.
 * FIX: P1-9 添加缓存逻辑，避免每次调用 runSetup 时重新创建 setupContext
 */
export function createSetupContext(instance: ComponentInternalInstance): SetupContext {
  // 检查缓存中是否已有该实例的 setupContext
  const cached = setupContextCache.get(instance);
  if (cached) {
    return cached;
  }

  const context: SetupContext = {
    attrs: instance.attrs,
    slots: instance.slots,
    emit: instance.emit,
    expose(exposed?: Record<string, unknown>) {
      if (!exposed) {
        instance.exposed = null;
        return;
      }
      // 公共属性白名单：这些属性始终可访问，不应被 expose 覆盖
      const publicApiKeys = new Set([
        '$data',
        '$props',
        '$el',
        '$emit',
        '$forceUpdate',
        '$nextTick',
        '$slots',
        '$refs',
        '$options',
      ]);
      // 过滤危险 key，防止原型污染
      const safeExposed: Record<string, unknown> = {};
      for (const key of Object.keys(exposed)) {
        if (key !== '__proto__' && key !== 'constructor' && !publicApiKeys.has(key)) {
          safeExposed[key] = exposed[key];
        }
      }
      instance.exposed = safeExposed;
    },
  };

  // 缓存 setupContext
  setupContextCache.set(instance, context);
  return context;
}

// ==================== createComponentPublicInstance ====================

/**
 * Create the public instance proxy ($data, $props, $el, etc.).
 * Uses a Proxy so that Options API `this` correctly resolves properties
 * from setupState, data, props, and public instance fields ($el, $emit, etc.).
 */
export function createComponentPublicInstance(
  instance: ComponentInternalInstance,
): ComponentPublicInstance {
  // 初始化 accessCache（惰性创建）
  if (!instance.accessCache) {
    instance.accessCache = Object.create(null) as Record<string, number>;
  }

  const PublicInstanceProxyHandlers: ProxyHandler<ComponentPublicInstance> = {
    get(target: ComponentPublicInstance, key: string | symbol): unknown {
      // Symbol.key 无法缓存，直接走原始逻辑
      if (typeof key === 'symbol') {
        if (key in target) {
          const res = (target as unknown as Record<string | symbol, unknown>)[key];
          if (typeof res === 'function' && key !== Symbol.toPrimitive && key !== Symbol.iterator) {
            return res.bind(target);
          }
          return res;
        }
        return undefined;
      }

      // 尝试从 accessCache 获取缓存结果
      const cachedValue = instance.accessCache![key];
      if (cachedValue !== undefined) {
        switch (cachedValue) {
          case PublicInstanceProxyAccessCache.CONTEXT: {
            const res = (target as unknown as Record<string | symbol, unknown>)[key];
            if (typeof res === 'function' && key !== '$emit') {
              return res.bind(target);
            }
            return res;
          }
          case PublicInstanceProxyAccessCache.OTHER:
            return undefined;
          case PublicInstanceProxyAccessCache.SETUP_STATE:
            return instance.setupState[key];
          case PublicInstanceProxyAccessCache.DATA:
            return instance.data[key];
          case PublicInstanceProxyAccessCache.PROPS:
            return instance.props[key];
          case PublicInstanceProxyAccessCache.GLOBAL_PROPERTIES: {
            const globalProperties = instance.appContext?.config?.globalProperties as
              | Record<string, unknown>
              | undefined;
            return globalProperties ? globalProperties[key] : undefined;
          }
        }
      }

      // 1. Public properties ($data, $props, $el, $emit, etc.)
      if (key in target) {
        const res = (target as unknown as Record<string | symbol, unknown>)[key];
        // Bind functions to the proxy so `this` works correctly
        if (typeof res === 'function' && key !== '$emit') {
          return res.bind(target);
        }
        // 缓存查找结果
        instance.accessCache![key] = PublicInstanceProxyAccessCache.CONTEXT;
        return res;
      }

      // 2. globalProperties
      const globalProperties = instance.appContext?.config?.globalProperties as
        | Record<string, unknown>
        | undefined;
      if (globalProperties && hasOwn(globalProperties, key)) {
        instance.accessCache![key] = PublicInstanceProxyAccessCache.GLOBAL_PROPERTIES;
        return globalProperties[key as string];
      }

      // 3. setupState
      if (hasOwn(instance.setupState, key)) {
        instance.accessCache![key] = PublicInstanceProxyAccessCache.SETUP_STATE;
        return instance.setupState[key as string];
      }

      // 4. data
      if (hasOwn(instance.data, key)) {
        instance.accessCache![key] = PublicInstanceProxyAccessCache.DATA;
        return instance.data[key as string];
      }

      // 5. props
      if (hasOwn(instance.props, key)) {
        instance.accessCache![key] = PublicInstanceProxyAccessCache.PROPS;
        return instance.props[key as string];
      }

      // 未找到，缓存为 OTHER 以避免重复查找
      instance.accessCache![key] = PublicInstanceProxyAccessCache.OTHER;
      return undefined;
    },

    set(_target: ComponentPublicInstance, key: string | symbol, value: unknown): boolean {
      // FIX: P1-16 完善 Symbol key 处理：Symbol key 不应被写入 setupState/data，
      // 应直接设置到 target 上（与 get handler 的 Symbol 处理保持一致）
      if (typeof key === 'symbol') {
        if (key === Symbol.toPrimitive || key === Symbol.iterator) {
          return false; // 不允许覆盖内置 Symbol
        }
        (_target as unknown as Record<string | symbol, unknown>)[key] = value;
        return true;
      }

      // 1. setupState
      if (hasOwn(instance.setupState, key)) {
        instance.setupState[key as string] = value;
        return true;
      }

      // 2. data
      if (hasOwn(instance.data, key)) {
        instance.data[key as string] = value;
        return true;
      }

      // FIX: P0-05 未找到属性时，在 DEV 模式下发出警告并返回 false，
      // 避免静默吞没写入导致调试困难
      // FIX: P2-10 注意：生产模式下此操作静默返回 false，不抛出错误。
      // 这是有意的设计，以避免在生产环境中因意外的属性写入导致应用崩溃。
      if (__DEV__) {
        warn(
          `Component public instance has no property "${String(key)}". ` +
            `This set operation was silently ignored.`,
        );
      }
      return false;
    },

    has(_target: ComponentPublicInstance, key: string | symbol): boolean {
      // Symbol key 无法使用 accessCache
      if (typeof key === 'symbol') {
        return (
          key in instance.setupState ||
          key in instance.data ||
          key in instance.props ||
          key in _target
        );
      }

      // 尝试从 accessCache 获取缓存结果
      const cachedValue = instance.accessCache![key];
      if (cachedValue !== undefined) {
        // 缓存值为 OTHER 表示未找到
        return cachedValue !== PublicInstanceProxyAccessCache.OTHER;
      }

      const globalProperties = instance.appContext?.config?.globalProperties as
        | Record<string, unknown>
        | undefined;
      const found =
        key in instance.setupState ||
        key in instance.data ||
        key in instance.props ||
        (globalProperties ? key in globalProperties : false) ||
        key in _target;

      // 缓存 has 结果
      instance.accessCache![key] = found
        ? PublicInstanceProxyAccessCache.CONTEXT
        : PublicInstanceProxyAccessCache.OTHER;

      return found;
    },
  };

  const ctx: ComponentPublicInstance = {
    get $data() {
      return instance.data;
    },
    get $props() {
      return instance.props;
    },
    get $el() {
      return (instance.vnode?.el as Element) ?? null;
    },
    get $options() {
      return instance.type as unknown as Record<string, unknown>;
    },
    get $refs() {
      return instance.refs as Record<string, Element | ComponentPublicInstance | null>;
    },
    get $slots() {
      return instance.slots;
    },
    $emit: instance.emit,
    $forceUpdate: () => {
      if (instance.update) {
        instance.update();
      } else if (instance.isMounted && instance.render && !instance.isUnmounted) {
        // 回退路径：已挂载但 instance.update 不可用（非标准渲染器场景）。
        // 标记需要重新渲染，在下一个 tick 中执行 render 并通过
        // instance.subTree 引用替换触发渲染器的更新机制。
        nextTick(() => {
          if (instance.isUnmounted) return;
          const prevTree = instance.subTree;
          const nextTree = instance.render!(instance.ctx as Parameters<typeof instance.render>[0]);
          if (nextTree) {
            instance.subTree = nextTree;
            // 将旧 subTree 标记为需要卸载，新 subTree 标记为需要挂载。
            // 渲染器在下次调度时会检测到 subTree 变化并执行 patch。
            nextTree.el = prevTree?.el ?? null;
          }
        });
      }
    },
    $nextTick: () => nextTick(),
  };

  return new Proxy(ctx, PublicInstanceProxyHandlers);
}

// ==================== defineComponent ====================

/**
 * defineComponent is an identity function that returns the options.
 * It provides TypeScript type inference for component options.
 */
export function defineComponent(options: ComponentOptions): ComponentOptions {
  return options;
}

// ==================== defineFunctionalComponent ====================

/**
 * Define a functional component.
 * A functional component has no instance, no lifecycle hooks, and no reactive state.
 * It receives props and returns a render function directly.
 *
 * FIX: P1-22 使用精确类型替代 Record<string, any>，
 * render 参数明确为返回 VNode 的函数，props 参数使用 Record<string, unknown>
 */
export function defineFunctionalComponent(
  render: (props: Record<string, unknown>) => VNode | VNode[] | null,
  props?: Record<string, unknown>,
): ComponentOptions {
  // FIX: P2-11 减少类型断言层级，将 render 包装为 setup 返回的函数
  const setupFn = (): VNode => {
    // 函数式组件的 setup 在渲染时调用，此时 props 已通过上下文传递
    // 这里返回一个包装函数，实际渲染时由渲染器调用并传入 props
    return null as unknown as VNode;
  };
  // 将原始 render 函数附加到 setupFn 上，供渲染器使用
  (setupFn as unknown as { _render: typeof render })._render = render;

  return {
    name: 'FunctionalComponent',
    props: props ?? {},
    setup: setupFn as unknown as () => VNode,
    // 标记为函数式组件
    __isFunctional: true,
  } as ComponentOptions;
}

// ==================== mergeOptions ====================

/**
 * Merge component options with extends and mixins.
 * Uses path tracking to provide detailed circular dependency warnings
 * that include the full merge chain with component names.
 */
function mergeOptions(
  options: ComponentOptions,
  seen = new WeakSet<ComponentOptions>(),
  path: ComponentOptions[] = [],
): ComponentOptions {
  if (seen.has(options)) {
    if (__DEV__) {
      // Build a human-readable cycle path using component names
      const cycleStart = path.indexOf(options);
      const cyclePath = path
        .slice(cycleStart)
        .map((opts, i) => {
          const name =
            (opts as Record<string, unknown>).name ||
            (opts as Record<string, unknown>).__name ||
            `anonymous#${i}`;
          return String(name);
        })
        .join(' -> ');
      warn(`Circular mixin/extends detected: ${cyclePath} -> (cycle). Skipping.`);
    }
    return { ...options };
  }
  seen.add(options);
  path.push(options);

  let merged: ComponentOptions = { ...options };

  // Apply extends first
  if (options.extends) {
    merged = mergeOptionsPair(mergeOptions(options.extends, seen, [...path]), merged);
  }

  // Then apply mixins
  if (options.mixins) {
    for (const mixin of options.mixins) {
      merged = mergeOptionsPair(merged, mergeOptions(mixin, seen, [...path]));
    }
  }

  return merged;
}

/**
 * Merge two ComponentOptions objects.
 */
function mergeOptionsPair(parent: ComponentOptions, child: ComponentOptions): ComponentOptions {
  // 使用 Record<string, unknown> 作为中间类型以支持动态键访问，
  // 最终通过类型断言返回 ComponentOptions
  const merged: Record<string, unknown> = { ...parent };

  for (const key in child) {
    if (key === 'props' || key === 'emits' || key === 'inject') {
      const parentVal = (parent as Record<string, unknown>)[key];
      const childVal = (child as Record<string, unknown>)[key];
      if (parentVal && childVal) {
        merged[key] = { ...parentVal, ...childVal };
      } else if (childVal) {
        merged[key] = childVal;
      }
    } else if (key === 'data' || key === 'provide') {
      const parentVal = (parent as Record<string, unknown>)[key];
      const childVal = (child as Record<string, unknown>)[key];
      if (parentVal && childVal) {
        merged[key] = function (this: ComponentPublicInstance) {
          const parentData = isFunction(parentVal) ? parentVal.call(this) : parentVal;
          const childData = isFunction(childVal) ? childVal.call(this) : childVal;
          return {
            ...(parentData as Record<string, unknown>),
            ...(childData as Record<string, unknown>),
          };
        };
      } else if (childVal) {
        merged[key] = childVal;
      }
    } else if (key === 'computed' || key === 'methods' || key === 'watch') {
      const parentVal = (parent as Record<string, unknown>)[key];
      const childVal = (child as Record<string, unknown>)[key];
      if (parentVal && childVal) {
        merged[key] = { ...parentVal, ...childVal };
      } else if (childVal) {
        merged[key] = childVal;
      }
    } else if (
      key === 'beforeCreate' ||
      key === 'created' ||
      key === 'beforeMount' ||
      key === 'mounted' ||
      key === 'beforeUpdate' ||
      key === 'updated' ||
      key === 'beforeUnmount' ||
      key === 'unmounted'
    ) {
      const parentVal = (parent as Record<string, unknown>)[key];
      const childVal = (child as Record<string, unknown>)[key];
      if (parentVal && childVal) {
        merged[key] = function (this: ComponentPublicInstance) {
          (parentVal as (...args: unknown[]) => unknown).call(this);
          (childVal as (...args: unknown[]) => unknown).call(this);
        };
      } else if (childVal) {
        merged[key] = childVal;
      }
    } else if (key === 'mixins' || key === 'extends') {
      // Skip - already handled
    } else if (hasOwn(child, key)) {
      merged[key] = (child as Record<string, unknown>)[key];
    }
  }

  return merged as ComponentOptions;
}

// ==================== createAppContext ====================

/**
 * Create a base app context object.
 * Exported for @lytjs/core to extend with runtime fields.
 */
export function createAppContext(): AppContext {
  return {
    config: {},
    components: {},
    directives: {},
    mixins: [],
    provides: Object.create(null) as Record<string | symbol, unknown>,
  };
}

// ==================== provide / inject ====================

/**
 * Provide a value to descendant components.
 * FIX: P1-9 COMPONENT-NEW-03 - 改进类型定义，支持 InjectionKey 类型推断
 */
export function provide<T>(key: InjectionKey<T> | string | symbol, value: T): void {
  const instance = getCurrentInstance();
  if (instance) {
    // 首次 provide 时，如果当前 provides 与父级共享同一个引用，
    // 则创建以父级 provides 为原型的新对象，确保层级隔离
    if (instance.provides === (instance.parent?.provides ?? null)) {
      instance.provides = Object.create(
        instance.provides as Record<string | symbol, unknown>,
      ) as Record<string | symbol, unknown>;
    }
    // FIX: P0-4 修复 provide/inject symbol key 被转为 string 的问题，直接使用 key 而不进行类型断言
    instance.provides[key as string | symbol] = value;
  }
}

/**
 * Inject a value from ancestor components.
 * FIX: P1-9 COMPONENT-NEW-03 - 改进类型定义，支持更精确的类型推断
 *
 * Supported forms:
 * - `inject('key')` - basic lookup
 * - `inject('key', defaultValue)` - with default value
 * - `inject('key', () => createDefault(), { factory: true })` - factory function default
 * - `inject('key', undefined, { from: 'optionalSourceKey' })` - from modifier
 * - `inject('key', undefined, { local: true })` - local only (no ancestor lookup)
 * - `inject(injectionKey)` - with InjectionKey for type-safe lookup
 */
export function inject<T>(
  key: InjectionKey<T> | string | symbol,
  defaultValue?: T | (() => T),
  options?: InjectOptions<T>,
): T | undefined {
  const instance = getCurrentInstance();
  if (!instance) {
    // No instance context - return default
    return resolveDefault(defaultValue, options);
  }

  const lookupKey = options?.from ?? key;

  if (options?.local) {
    // local mode: only check current instance's own provides (not inherited from parent prototype)
    // If instance.provides is the same reference as parent.provides, the instance
    // has not called provide() yet, so there are no own provides to check.
    const provides = instance.provides as Record<string | symbol, unknown>;
    const hasOwnProvides = instance.parent
      ? provides !== instance.parent.provides
      : true;
    if (hasOwnProvides && hasOwn(provides, lookupKey as string)) {
      return provides[lookupKey as string] as T | undefined;
    }
    return resolveDefault(defaultValue, options);
  }

  // Walk up the parent chain
  let current: ComponentInternalInstance | null = instance.parent;
  while (current) {
    const provides = current.provides as Record<string | symbol, unknown>;
    if (lookupKey in provides) {
      return provides[lookupKey as string] as T | undefined;
    }
    current = current.parent;
  }

  return resolveDefault(defaultValue, options);
}

/**
 * Resolve the default value for inject, handling factory functions.
 */
function resolveDefault<T>(defaultValue: T | undefined, options?: InjectOptions): T | undefined {
  if (defaultValue === undefined) return undefined;
  if (options?.factory && typeof defaultValue === 'function') {
    return (defaultValue as unknown as () => T)();
  }
  return defaultValue;
}
