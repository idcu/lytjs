// src/component-setup.ts
// 组件实例创建、setup 和 props 初始化

import { isFunction, isObject, hasOwn, NOOP, EMPTY_OBJ, isPromise } from '@lytjs/common-is';
import { warn } from '@lytjs/common-error';
import type {
  ComponentOptions,
  ComponentInternalInstance,
  ComponentPublicInstance,
  SetupContext,
  InternalSlots,
  RenderFunction,
} from './types';
import type { VNode } from '@lytjs/common-vnode';
import { normalizePropsOptions, resolvePropValue } from './props';
import { normalizeEmitsOptions, emit } from './emit';
import { initSlots } from './slots';
import { setCurrentInstance, handleError } from './lifecycle';
import { createAppContext, mergeOptions } from './component-options';
import { finishComponentSetup } from './component-init';

type SetupResult = RenderFunction | Record<string, unknown> | void;

// ==================== UID counter ====================

// 异步 setup 超时时间（毫秒）
const ASYNC_SETUP_TIMEOUT = 30000;

// 注意：uid 使用自增整数，在 JavaScript 中 Number.MAX_SAFE_INTEGER 为 2^53 - 1。
// 在实际应用中达到此上限的概率极低（需创建约 9 * 10^15 个组件实例），
// 因此此处不做溢出检查。如确实需要，可考虑使用 BigInt 或周期性重置。
let uid = 0;

// FIX: P2-15 setup 上下文 WeakMap 缓存：
// 缓存 createSetupContext 的结果，避免每次调用 runSetup 时重新创建
const setupContextCache = new WeakMap<ComponentInternalInstance, SetupContext>();

// ==================== createComponentInstance ====================

/**
 * 从 vnode 创建组件内部实例。
 *
 * 错误处理：实例创建包裹在 try-catch 中，防止
 * 组件初始化期间的未捕获异常导致应用崩溃。
 * 错误会传播到最近的 ErrorBoundary。
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
    // 合并 extends 和 mixins
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
      root: null as unknown as ComponentInternalInstance,
      appContext,
      attrs: {},
      accessCache: null as Record<string, number> | null,
    };

    // 创建绑定到此实例的 emit 函数
    instance.emit = (event: string, ...args: unknown[]) => emit(instance, event, ...args);

    // FIX: P1-4 在 instance 声明完成后赋值 root，避免在 const 初始化前引用自身
    instance.root = parent ? parent.root : instance;

    return instance;
  } catch (err) {
    // 记录错误用于调试
    if (__DEV__) {
      warn(
        `Failed to create component instance: ${(err as Error).message}`,
      );
    }
    // 通过 handleError 将错误传播到 ErrorBoundary
    handleError(err as Error, parent, 'createComponentInstance');
    // 重新抛出，让调用者处理失败
    throw err;
  }
}

// ==================== setupComponent ====================

/**
 * 设置组件实例：运行 setup、初始化 props、初始化 slots。
 */
export function setupComponent(instance: ComponentInternalInstance): void {
  const vnode = instance.vnode;
  if (!vnode) return;

  const { children } = vnode;
  const props = (vnode.props as Record<string, unknown> | null) ?? null;

  // 初始化 props
  initProps(instance, props);

  // 初始化 slots
  initSlots(instance, children);

  // 设置组件
  const setupResult = runSetup(instance);

  if (isPromise(setupResult)) {
    // 异步 setup - 标记 vnode 为异步
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
 * 运行 setup 函数（如果已定义）。
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
    // 设置空操作渲染函数，防止静默空渲染
    instance.render = () => null as unknown as VNode;
    return undefined;
  } finally {
    setCurrentInstance(null);
  }
}

/**
 * 处理 setup 函数的返回结果。
 */
function handleSetupResult(instance: ComponentInternalInstance, setupResult: SetupResult): void {
  if (isFunction(setupResult)) {
    // Setup 返回了渲染函数
    instance.render = setupResult as RenderFunction;
  } else if (isObject(setupResult) && setupResult !== null) {
    // Setup 返回了状态对象
    instance.setupState = setupResult as Record<string, unknown>;
  }

  // 完成组件 setup
  finishComponentSetup(instance);
}

// ==================== initProps ====================

/**
 * 初始化并验证组件实例的 props。
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

  // 处理声明的 props
  for (const key in propsOptions) {
    if (hasOwn(propsOptions, key)) {
      const value = rawProps[key];
      props[key] = resolvePropValue(propsOptions[key]!, value, instance, key);
    }
  }

  // 收集 attrs（未声明的 props）
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
 * 创建传递给 setup 函数的 setup 上下文对象。
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
