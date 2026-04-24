/**
 * Lyt.js 生命周期系统
 *
 * 提供组件生命周期钩子的注册、管理与调用能力。
 * 支持 onInit / onMounted / onBeforeUpdate / onUpdated / onBeforeUnmount / onUnmounted。
 * 包含当前实例管理（currentInstance / setCurrentInstance），
 * 可在 setup 阶段自动收集生命周期钩子。
 * 纯原生实现，零外部依赖。
 */

// ============================================================
// 类型定义
// ============================================================

/** 生命周期钩子名称枚举 */
export enum LifecycleHook {
  /** 初始化阶段（组件实例创建后，props/state 初始化完成） */
  INIT = 'init',
  /** 挂载完成（组件首次渲染到 DOM 后） */
  MOUNTED = 'mounted',
  /** 更新前（响应式数据变化后，DOM 更新前） */
  BEFORE_UPDATE = 'beforeUpdate',
  /** 更新完成（DOM 更新后） */
  UPDATED = 'updated',
  /** 卸载前（组件从 DOM 移除前） */
  BEFORE_UNMOUNT = 'beforeUnmount',
  /** 卸载完成（组件从 DOM 移除后） */
  UNMOUNTED = 'unmounted',
}

/** 生命周期钩子回调函数类型 */
export type LifecycleHookCallback = (...args: any[]) => void;

/** 组件实例所需的最小生命周期接口 */
export interface LifecycleInstance {
  /** 生命周期钩子注册表：hookName → 回调函数数组 */
  [LifecycleHook.INIT]?: LifecycleHookCallback[];
  [LifecycleHook.MOUNTED]?: LifecycleHookCallback[];
  [LifecycleHook.BEFORE_UPDATE]?: LifecycleHookCallback[];
  [LifecycleHook.UPDATED]?: LifecycleHookCallback[];
  [LifecycleHook.BEFORE_UNMOUNT]?: LifecycleHookCallback[];
  [LifecycleHook.UNMOUNTED]?: LifecycleHookCallback[];
}

/** 当前正在初始化的组件实例 */
export let currentInstance: LifecycleInstance | null = null;

// ============================================================
// 内部工具
// ============================================================

/**
 * 判断值是否为函数
 */
function isFunction(val: unknown): val is Function {
  return typeof val === 'function';
}

// ============================================================
// 核心函数
// ============================================================

/**
 * 设置当前正在初始化的组件实例
 *
 * 在组件 setup 阶段调用，使生命周期钩子能自动注册到正确的实例。
 *
 * @param instance - 组件实例，传 null 表示退出 setup 上下文
 * @returns 之前的当前实例（用于嵌套场景恢复）
 */
export function setCurrentInstance(
  instance: LifecycleInstance | null
): LifecycleInstance | null {
  const prevInstance = currentInstance;
  currentInstance = instance;
  return prevInstance;
}

/**
 * 创建生命周期钩子注册函数
 *
 * 返回一个函数，调用该函数即可注册对应生命周期的回调。
 * 如果当前有 activeInstance，回调注册到该实例；
 * 否则注册到指定的 target 实例。
 *
 * @param hook - 生命周期钩子名称
 * @returns 钩子注册函数
 *
 * @example
 * ```ts
 * const onMounted = createLifecycleHook(LifecycleHook.MOUNTED);
 *
 * // 在 setup 中使用
 * onMounted(() => {
 *   console.log('组件已挂载');
 * });
 * ```
 */
export function createLifecycleHook(
  hook: LifecycleHook
): (callback: LifecycleHookCallback, target?: LifecycleInstance) => void {
  return function registerHook(
    callback: LifecycleHookCallback,
    target?: LifecycleInstance
  ): void {
    if (!isFunction(callback)) {
      console.warn(`[Lyt Lifecycle] 生命周期钩子必须是一个函数，收到: ${typeof callback}`);
      return;
    }

    // 优先使用传入的 target，其次使用当前实例
    const instance = target || currentInstance;

    if (!instance) {
      console.warn(
        `[Lyt Lifecycle] 无法注册 ${hook} 钩子：没有当前组件实例。` +
          `请确保在 setup 或组件初始化阶段调用。`
      );
      return;
    }

    // 初始化钩子数组
    if (!instance[hook]) {
      instance[hook] = [];
    }

    // 注册回调
    instance[hook]!.push(callback);
  };
}

/**
 * 调用组件的生命周期钩子
 *
 * 按注册顺序依次执行指定生命周期名称下的所有回调。
 * 如果某个回调抛出异常，会捕获并警告，但不影响后续回调执行。
 *
 * @param instance - 组件实例
 * @param hook - 要调用的生命周期钩子名称
 * @param args - 传递给回调函数的参数
 */
export function callLifecycleHook(
  instance: LifecycleInstance,
  hook: LifecycleHook,
  ...args: any[]
): void {
  const callbacks = instance[hook];

  if (!callbacks || callbacks.length === 0) {
    return;
  }

  for (let i = 0; i < callbacks.length; i++) {
    try {
      callbacks[i](...args);
    } catch (err) {
      console.error(
        `[Lyt Lifecycle] ${hook} 钩子执行出错（第 ${i + 1} 个回调）:`,
        err
      );
    }
  }
}

// ============================================================
// 预置钩子注册函数
// ============================================================

/** 注册初始化钩子 */
export const onInit = createLifecycleHook(LifecycleHook.INIT);

/** 注册挂载完成钩子 */
export const onMounted = createLifecycleHook(LifecycleHook.MOUNTED);

/** 注册更新前钩子 */
export const onBeforeUpdate = createLifecycleHook(LifecycleHook.BEFORE_UPDATE);

/** 注册更新完成钩子 */
export const onUpdated = createLifecycleHook(LifecycleHook.UPDATED);

/** 注册卸载前钩子 */
export const onBeforeUnmount = createLifecycleHook(LifecycleHook.BEFORE_UNMOUNT);

/** 注册卸载完成钩子 */
export const onUnmounted = createLifecycleHook(LifecycleHook.UNMOUNTED);
