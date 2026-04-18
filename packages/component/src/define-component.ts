/**
 * Lyt.js 组件定义系统
 *
 * 提供组件定义（defineComponent）、内部实例创建与初始化能力。
 * 支持有状态组件（选项式）和函数组件两种模式。
 * 基于 @lytjs/reactivity 响应式系统实现 computed 和 watch。
 */

import {
  shallowReactive,
  computed as reactiveComputed,
  watch as reactiveWatch,
  nextTick,
  type WatchStopHandle,
} from '@lytjs/reactivity';

import {
  computed as signalComputed,
  effect as signalEffect,
} from '@lytjs/reactivity/signal';

import {
  createSignalState,
  createSignalStateProxy,
  patchSignalState,
  type SignalState,
} from './signal-state';

import {
  normalizePropsOptions,
  initProps,
  type NormalizedProps,
  type PropOptions,
  type PropType,
} from './props';

import {
  emit,
  normalizeEmits,
  type NormalizedEmitsOptions,
  type EmitsOptions,
} from './emit';

import {
  LifecycleHook,
  callLifecycleHook,
  setCurrentInstance,
  currentInstance,
  type LifecycleInstance,
  type LifecycleHookCallback,
} from './lifecycle';

import {
  initSlots,
  type Slots,
  type SlotChildren,
} from './slots';

import {
  runSetup,
  type SetupFunction,
} from './composition-api';

// ============================================================
// 类型定义
// ============================================================

/** 组件渲染函数类型 */
export type RenderFunction = (h: CreateElement, instance: ComponentInternalInstance) => any;

/** 简易 createElement 函数类型 */
export type CreateElement = (tag: string | Function, props?: Record<string, any>, children?: any[]) => any;

/** 计算属性定义 */
export interface ComputedOptions {
  [key: string]: (() => any) | {
    /** 计算属性的 getter */
    get: () => any;
    /** 计算属性的 setter（可选） */
    set?: (value: any) => void;
  };
}

/** 侦听器选项 */
export interface WatchOptions {
  [key: string]: {
    /** 要侦听的状态/props 路径 */
    handler: (newValue: any, oldValue: any) => void;
    /** 是否立即执行 */
    immediate?: boolean;
    /** 是否深度侦听 */
    deep?: boolean;
  };
}

/** 响应式模式 */
export type ReactivityMode = 'proxy' | 'signal';

/** 组件选项（选项式 API） */
export interface ComponentOptions {
  /** 组件名称 */
  name?: string;
  /** Props 声明 */
  props?: string[] | Record<string, PropOptions | PropType | PropType[]> | any;
  /** 组件内部状态（响应式数据） */
  state?: () => Record<string, any>;
  /** 计算属性 */
  computed?: ComputedOptions;
  /** 侦听器 */
  watch?: WatchOptions;
  /** 方法 */
  methods?: Record<string, (...args: any[]) => any>;
  /** 模板字符串 */
  template?: string;
  /** 渲染函数（优先于 template） */
  render?: RenderFunction;
  /** 初始化函数（setup 阶段调用） */
  init?: (this: ComponentPublicInstance, props: Record<string, any>, state: Record<string, any>) => void | Record<string, any>;
  /** Composition API setup 函数 */
  setup?: SetupFunction;
  /** Emits 声明 */
  emits?: EmitsOptions;
  /** 默认插槽内容（由父组件传入） */
  slots?: SlotChildren;
  /** 响应式模式：'proxy'（默认，基于 Proxy）或 'signal'（基于 Signal） */
  reactivityMode?: ReactivityMode;
  /** 组件样式字符串 */
  styles?: string;
}

/** 函数组件类型 */
export type FunctionalComponent = (props: Record<string, any>, context: { slots: Slots; emit: EmitFunction }) => any;

/** emit 函数类型 */
export type EmitFunction = (event: string, ...args: any[]) => boolean;

/** 组件公共实例（对外暴露给用户的接口） */
export interface ComponentPublicInstance {
  /** 组件名称 */
  $name?: string;
  /** 组件 props（只读） */
  $props: Record<string, any>;
  /** 组件内部状态 */
  $state: Record<string, any>;
  /** 组件插槽 */
  $slots: Slots;
  /** 组件是否已挂载 */
  $isMounted: boolean;
  /** 触发事件 */
  $emit: EmitFunction;
  /** 强制更新 */
  $forceUpdate: () => void;
  /** 卸载组件 */
  $unmount: () => void;
  /** 设置状态 */
  $setState: (partial: Record<string, any>) => void;
}

/** 组件内部实例（框架内部使用） */
export interface ComponentInternalInstance extends LifecycleInstance {
  /** 组件类型标记 */
  _isComponent: true;
  /** 组件定义选项 */
  type: ComponentOptions;
  /** 组件名称 */
  name?: string;
  /** 标准化后的 props 选项 */
  propsOptions: NormalizedProps;
  /** 标准化后的 emits 选项 */
  emitsOptions?: NormalizedEmitsOptions;
  /** 组件 props */
  props: Record<string, any>;
  /** 组件内部状态（proxy 模式为 shallowReactive，signal 模式为 SignalStateProxy） */
  state: Record<string, any>;
  /** Signal 模式下的原始 Signal 状态（仅 signal 模式存在） */
  _signalState?: SignalState;
  /** setup 返回的状态（合并到 renderProxy） */
  setupState: Record<string, any>;
  /** 计算属性缓存（使用 @lytjs/reactivity 的 ComputedRef） */
  computedRefs: Record<string, { value: any } | (() => any)>;
  /** 渲染代理（公共实例，用户通过 this 访问） */
  renderProxy: ComponentPublicInstance;
  /** 渲染结果子树 */
  subTree: any;
  /** 是否已挂载 */
  isMounted: boolean;
  /** 是否已卸载 */
  isUnmounted: boolean;
  /** 组件插槽 */
  slots: Slots;
  /** watch 停止句柄列表（用于卸载时清理） */
  watchStopHandles: WatchStopHandle[];
  /** emit 函数的绑定引用 */
  emit: EmitFunction;
  /** 更新回调（由渲染器设置） */
  update?: () => void;
  /** Composition API 生命周期钩子 */
  _lifecycleHooks?: Record<string, Function[]>;
}

/** defineComponent 的返回类型 */
export interface ComponentDefine {
  /** 组件名称 */
  name?: string;
  /** 组件选项 */
  options: ComponentOptions;
  /** 标记为组件定义 */
  _isComponentDefine: true;
  /** 允许挂载静态方法 */
  [key: string]: any;
}

// ============================================================
// 内部工具
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
function isPlainObject(val: unknown): val is Record<string, any> {
  return val !== null && typeof val === 'object' && !Array.isArray(val);
}

/**
 * 浅合并两个对象
 */
function mergeObjects(target: Record<string, any>, source: Record<string, any>): void {
  const keys = Object.keys(source);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    target[key] = source[key];
  }
}

// ============================================================
// 核心函数
// ============================================================

/**
 * 定义组件（选项式 API）
 *
 * 接收组件选项对象，返回标准化的组件定义。
 * 支持的选项：
 * - name: 组件名称
 * - props: 属性声明（数组或对象形式）
 * - state: 响应式数据工厂函数
 * - computed: 计算属性
 * - watch: 侦听器
 * - methods: 方法
 * - template: 模板字符串
 * - render: 渲染函数
 * - init: 初始化函数
 * - emits: 事件声明
 * - slots: 默认插槽
 *
 * @param options - 组件选项
 * @returns 组件定义对象
 *
 * @example
 * ```ts
 * const MyComponent = defineComponent({
 *   name: 'MyComponent',
 *   props: {
 *     title: { type: String, default: 'Hello' },
 *     count: { type: Number, required: true }
 *   },
 *   state() {
 *     return { inner: 0 };
 *   },
 *   methods: {
 *     increment() {
 *       this.$setState({ inner: this.$state.inner + 1 });
 *     }
 *   },
 *   init(props, state) {
 *     console.log('组件初始化', props.title);
 *   }
 * });
 * ```
 */
export function defineComponent(options: ComponentOptions): ComponentDefine {
  return {
    name: options.name,
    options: options,
    _isComponentDefine: true,
  };
}

/**
 * 创建组件内部实例
 *
 * 根据组件定义创建内部实例对象，但不执行初始化。
 *
 * @param component - 组件定义
 * @returns 组件内部实例
 */
export function createComponentInstance(
  component: ComponentDefine
): ComponentInternalInstance {
  const options = component.options;

  // 标准化 props 和 emits
  const propsOptions = normalizePropsOptions(options.props);
  const emitsOptions = normalizeEmits(options.emits);

  // 创建内部实例
  const instance: ComponentInternalInstance = {
    _isComponent: true,
    type: options,
    name: component.name || options.name,
    propsOptions,
    emitsOptions,
    props: {},
    state: {},
    setupState: {},
    computedRefs: {},
    subTree: null,
    isMounted: false,
    isUnmounted: false,
    slots: {},
    watchStopHandles: [],
    renderProxy: null as any,
    emit: null as any,
  };

  // 绑定 emit 函数到实例
  instance.emit = (event: string, ...args: any[]) => {
    return emit(instance, event, ...args);
  };

  // 创建渲染代理（公共实例）
  instance.renderProxy = createRenderProxy(instance);

  return instance;
}

/**
 * 创建渲染代理（公共实例）
 *
 * 代理对象提供 $props、$state、$slots、$emit 等公共接口，
 * 同时将 props、state、setupState、methods 的属性直接暴露。
 *
 * @param instance - 组件内部实例
 * @returns 渲染代理对象
 */
function createRenderProxy(
  instance: ComponentInternalInstance
): ComponentPublicInstance {
  const proxy: ComponentPublicInstance = {
    get $name() {
      return instance.name;
    },
    get $props() {
      return instance.props;
    },
    get $state() {
      return instance.state;
    },
    get $slots() {
      return instance.slots;
    },
    get $isMounted() {
      return instance.isMounted;
    },
    $emit: instance.emit,
    $forceUpdate() {
      // 触发组件更新（由渲染器的 update 回调处理）
      if (instance.update) {
        instance.update();
      }
    },
    $unmount() {
      unmountComponent(instance);
    },
    $setState(partial: Record<string, any>) {
      if (instance._signalState) {
        // Signal 模式：通过 patchSignalState 更新
        patchSignalState(instance._signalState, partial);
      } else {
        // Proxy 模式：直接合并
        mergeObjects(instance.state, partial);
      }
      // 触发组件更新
      if (instance.update) {
        instance.update();
      }
    },
  };

  return proxy;
}

/**
 * 初始化组件
 *
 * 根据组件类型执行不同的初始化流程：
 * - 有状态组件（ComponentOptions）→ setupStatefulComponent
 * - 函数组件（Function）→ setupFunctionComponent
 *
 * @param instance - 组件内部实例
 * @param rawProps - 父组件传入的原始 props
 * @param children - 父组件传入的子节点 / 插槽
 */
export function setupComponent(
  instance: ComponentInternalInstance,
  rawProps?: Record<string, any> | null,
  children?: SlotChildren | null
): void {
  // 1. 初始化 props
  initProps(instance, rawProps || null);

  // 2. 初始化插槽
  initSlots(instance, children || null);

  const type = instance.type;

  // 3. 判断组件类型并初始化
  if (isFunction(type) && !(type as any)._isComponentDefine) {
    // 函数组件
    setupFunctionComponent(instance);
  } else {
    // 有状态组件（选项式）
    setupStatefulComponent(instance);
  }
}

/**
 * 有状态组件初始化
 *
 * 初始化流程：
 * 1. 设置当前实例上下文
 * 2. 初始化 state（调用 state 工厂函数）
 * 3. 初始化 computed（标记为脏）
 * 4. 初始化 methods（绑定到 renderProxy）
 * 5. 调用 init 函数（用户自定义初始化逻辑）
 * 6. 将 methods 和 setupState 合并到 renderProxy
 * 7. 调用 onInit 生命周期钩子
 * 8. 恢复之前的实例上下文
 *
 * @param instance - 组件内部实例
 */
export function setupStatefulComponent(
  instance: ComponentInternalInstance
): void {
  const { type: options } = instance;
  const isSignalMode = options.reactivityMode === 'signal';

  // 1. 设置当前实例
  const prevInstance = setCurrentInstance(instance);

  try {
    // 2. 执行 Composition API setup（在 state 之前，使 setup 可以访问 props）
    if (isFunction(options.setup)) {
      const setupCtx = {
        attrs: instance.props,
        slots: instance.slots,
        emit: instance.emit,
      };
      const setupResult = runSetup(options.setup, instance, instance.props, setupCtx);

      if (isFunction(setupResult)) {
        // setup 返回函数 → 作为 render 函数
        options.render = setupResult as RenderFunction;
      } else if (isPlainObject(setupResult)) {
        // setup 返回对象 → 合并到 setupState
        instance.setupState = { ...setupResult };
        // 将 setupState 属性暴露到 renderProxy
        const setupKeys = Object.keys(setupResult);
        for (let i = 0; i < setupKeys.length; i++) {
          Object.defineProperty(instance.renderProxy, setupKeys[i], {
            get() {
              return instance.setupState[setupKeys[i]];
            },
            set(val: any) {
              instance.setupState[setupKeys[i]] = val;
            },
            enumerable: true,
          });
        }
      }
    }

    // 3. 初始化 state
    if (isFunction(options.state)) {
      const initialState = options.state();
      if (isPlainObject(initialState)) {
        if (isSignalMode) {
          // Signal 模式：使用 createSignalState + createSignalStateProxy
          const rawSignalState = createSignalState(initialState);
          instance._signalState = rawSignalState;
          instance.state = createSignalStateProxy(rawSignalState);
        } else {
          // Proxy 模式（默认）：使用 shallowReactive
          instance.state = shallowReactive({ ...initialState });
        }
      }
    }

    // 4. 初始化 computed
    if (options.computed) {
      const computedKeys = Object.keys(options.computed);
      for (let i = 0; i < computedKeys.length; i++) {
        const key = computedKeys[i];
        const computedOpt = options.computed![key];

        // 支持两种格式：
        //   方法简写: { double() { return this.count * 2 } }
        //   对象格式: { double: { get() { ... }, set(v) { ... } } }
        const getter = typeof computedOpt === 'function'
          ? () => computedOpt.call(instance.renderProxy)
          : () => computedOpt.get.call(instance.renderProxy);
        const setter = typeof computedOpt === 'function'
          ? undefined
          : (val: any) => computedOpt.set!.call(instance.renderProxy, val);

        let c: any;
        if (isSignalMode) {
          // Signal 模式：使用 signal computed
          c = signalComputed(getter);
        } else {
          // Proxy 模式：使用 reactive computed
          if (setter) {
            c = reactiveComputed({ get: getter, set: setter });
          } else {
            c = reactiveComputed(getter);
          }
        }

        instance.computedRefs[key] = c;
      }
    }

    // 5. 初始化 methods
    const methods = options.methods;
    if (isPlainObject(methods)) {
      const methodKeys = Object.keys(methods);
      for (let i = 0; i < methodKeys.length; i++) {
        const key = methodKeys[i];
        const method = methods[key];
        if (isFunction(method)) {
          // 将方法绑定到 renderProxy，使 this 指向公共实例
          (instance.renderProxy as any)[key] = method.bind(instance.renderProxy);
        }
      }
    }

    // 6. 调用 init 函数
    if (isFunction(options.init)) {
      const setupResult = options.init.call(
        instance.renderProxy,
        instance.props,
        instance.state
      );

      // 如果 init 返回了对象，合并到 setupState
      if (isPlainObject(setupResult)) {
        instance.setupState = { ...instance.setupState, ...setupResult };
        // 将 setupState 属性暴露到 renderProxy
        const setupKeys = Object.keys(setupResult);
        for (let i = 0; i < setupKeys.length; i++) {
          Object.defineProperty(instance.renderProxy, setupKeys[i], {
            get() {
              return instance.setupState[setupKeys[i]];
            },
            set(val: any) {
              instance.setupState[setupKeys[i]] = val;
            },
            enumerable: true,
          });
        }
      }
    }

    // 7. 将 state 属性暴露到 renderProxy
    const stateKeys = Object.keys(instance.state);
    for (let i = 0; i < stateKeys.length; i++) {
      const key = stateKeys[i];
      Object.defineProperty(instance.renderProxy, key, {
        get() {
          return instance.state[key];
        },
        set(val: any) {
          instance.state[key] = val;
        },
        enumerable: true,
      });
    }

    // 8. 将 computed 属性暴露到 renderProxy
    if (options.computed) {
      const computedKeys = Object.keys(options.computed);
      for (let i = 0; i < computedKeys.length; i++) {
        const key = computedKeys[i];
        const computedRef = instance.computedRefs[key];

        if (isSignalMode) {
          // Signal 模式：computed 是 ComputedSignal，调用即获取值
          Object.defineProperty(instance.renderProxy, key, {
            get() {
              return (computedRef as () => any)();  // ComputedSignal: 调用获取值
            },
            enumerable: true,
          });
        } else {
          // Proxy 模式：computed 是 ComputedRef，通过 .value 获取值
          Object.defineProperty(instance.renderProxy, key, {
            get() {
              return (computedRef as { value: any }).value;
            },
            set(val: any) {
              (computedRef as { value: any }).value = val;
            },
            enumerable: true,
          });
        }
      }
    }

    // 9. 初始化侦听器
    if (options.watch) {
      const watchKeys = Object.keys(options.watch);
      for (let i = 0; i < watchKeys.length; i++) {
        const key = watchKeys[i];
        const watchOpt = options.watch![key];

        // 获取要侦听的源（从 state 或 props 中读取）
        const getSource = () => {
          const stateVal = (instance.state as any)[key];
          if (stateVal !== undefined) return stateVal;
          const propVal = instance.props[key];
          if (propVal !== undefined) return propVal;
          return (instance.renderProxy as any)[key];
        };

        if (isSignalMode) {
          // Signal 模式：使用 signalEffect
          const dispose = signalEffect((onCleanup) => {
            const currentValue = getSource();
            watchOpt.handler.call(instance.renderProxy, currentValue, undefined);
          });
          instance.watchStopHandles.push(dispose);
        } else {
          // Proxy 模式：使用 reactiveWatch
          const stopHandle = reactiveWatch(
            getSource,
            (newValue, oldValue) => {
              watchOpt.handler.call(instance.renderProxy, newValue, oldValue);
            },
            {
              immediate: !!watchOpt.immediate,
              deep: !!watchOpt.deep,
            }
          );
          instance.watchStopHandles.push(stopHandle);
        }
      }
    }

    // 10. 调用 onInit 生命周期钩子
    callLifecycleHook(instance, LifecycleHook.INIT);

  } finally {
    // 11. 恢复之前的实例上下文
    setCurrentInstance(prevInstance);
  }
}

/**
 * 函数组件初始化
 *
 * 函数组件没有内部状态，直接将 props 和 slots 传递给渲染函数。
 *
 * @param instance - 组件内部实例
 */
export function setupFunctionComponent(
  instance: ComponentInternalInstance
): void {
  const fn = instance.type as unknown as FunctionalComponent;

  // 创建渲染上下文
  const context = {
    slots: instance.slots,
    emit: instance.emit,
  };

  // 执行函数组件获取渲染结果
  const subTree = fn(instance.props, context);
  instance.subTree = subTree;
}

/**
 * 调用 Composition API 注册的生命周期钩子
 *
 * 从实例的 _lifecycleHooks 中取出对应钩子并按顺序执行。
 *
 * @param instance - 组件内部实例
 * @param hookName - 钩子名称（mounted / unmounted / updated / beforeMount / beforeUnmount）
 */
function callCompositionLifecycleHook(instance: any, hookName: string): void {
  const hooks = instance._lifecycleHooks;
  if (!hooks || !hooks[hookName]) return;
  const callbacks = hooks[hookName];
  for (let i = 0; i < callbacks.length; i++) {
    try {
      callbacks[i]();
    } catch (err) {
      console.error(
        `[Lyt Composition API] ${hookName} 钩子执行出错（第 ${i + 1} 个回调）:`,
        err
      );
    }
  }
}

/**
 * 挂载组件
 *
 * 调用渲染函数生成子树，标记为已挂载，触发 onMounted 钩子。
 *
 * @param instance - 组件内部实例
 * @param h - createElement 函数（可选，用于渲染函数）
 */
export function mountComponent(
  instance: ComponentInternalInstance,
  h?: CreateElement
): void {
  if (instance.isMounted) {
    return;
  }

  // 触发 Composition API onBeforeMount 钩子
  callCompositionLifecycleHook(instance, 'beforeMount');

  // 如果有渲染函数，执行渲染
  const { type: options } = instance;
  if (isFunction(options.render) && h) {
    instance.subTree = options.render(h, instance);
  }

  // 标记为已挂载
  instance.isMounted = true;

  // 触发 onMounted 生命周期钩子（Options API）
  callLifecycleHook(instance, LifecycleHook.MOUNTED);

  // 触发 Composition API onMounted 钩子
  callCompositionLifecycleHook(instance, 'mounted');
}

/**
 * 更新组件
 *
 * 触发 beforeUpdate → 重新渲染 → updated 生命周期。
 *
 * @param instance - 组件内部实例
 * @param h - createElement 函数
 * @param newProps - 新的 props（可选）
 */
export function updateComponent(
  instance: ComponentInternalInstance,
  h?: CreateElement,
  newProps?: Record<string, any>
): void {
  if (instance.isUnmounted) {
    return;
  }

  // 更新 props
  if (newProps) {
    initProps(instance, newProps);
  }

  // 触发 beforeUpdate（Options API）
  callLifecycleHook(instance, LifecycleHook.BEFORE_UPDATE);

  // 触发 Composition API onUpdated 钩子（beforeUpdate 阶段暂无对应，updated 在渲染后）
  // 重新渲染
  const { type: options } = instance;
  if (isFunction(options.render) && h) {
    instance.subTree = options.render(h, instance);
  }

  // 触发 updated（Options API）
  callLifecycleHook(instance, LifecycleHook.UPDATED);

  // 触发 Composition API onUpdated 钩子
  callCompositionLifecycleHook(instance, 'updated');
}

/**
 * 卸载组件
 *
 * 触发 beforeUnmount → 标记已卸载 → unmounted 生命周期。
 *
 * @param instance - 组件内部实例
 */
export function unmountComponent(
  instance: ComponentInternalInstance
): void {
  if (instance.isUnmounted) {
    return;
  }

  // 触发 beforeUnmount（Options API）
  callLifecycleHook(instance, LifecycleHook.BEFORE_UNMOUNT);

  // 触发 Composition API onBeforeUnmount 钩子
  callCompositionLifecycleHook(instance, 'beforeUnmount');

  // 标记为已卸载
  instance.isUnmounted = true;
  instance.isMounted = false;
  instance.subTree = null;

  // 清空侦听器
  for (const stop of instance.watchStopHandles) {
    stop();
  }
  instance.watchStopHandles = [];

  // 触发 unmounted（Options API）
  callLifecycleHook(instance, LifecycleHook.UNMOUNTED);

  // 触发 Composition API onUnmounted 钩子
  callCompositionLifecycleHook(instance, 'unmounted');

  // 清空生命周期钩子
  const hookKeys = [
    LifecycleHook.INIT,
    LifecycleHook.MOUNTED,
    LifecycleHook.BEFORE_UPDATE,
    LifecycleHook.UPDATED,
    LifecycleHook.BEFORE_UNMOUNT,
    LifecycleHook.UNMOUNTED,
  ];
  for (let i = 0; i < hookKeys.length; i++) {
    instance[hookKeys[i]] = undefined;
  }

  // 清空 Composition API 生命周期钩子
  instance._lifecycleHooks = undefined;
}
