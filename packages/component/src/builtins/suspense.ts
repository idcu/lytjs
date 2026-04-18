/**
 * Lyt.js Suspense 内置异步依赖等待组件
 *
 * 等待异步子组件加载完成后再显示真实内容，
 * 加载过程中显示 fallback 占位内容。
 * 支持多个异步子组件（全部完成后才切换），
 * 支持超时处理和事件回调。
 * 纯原生实现，零外部依赖。
 */

import {
  defineComponent,
  type ComponentDefine,
} from '../define-component';

// ============================================================
// 类型定义
// ============================================================

/** Suspense 组件的 Props 接口 */
export interface SuspenseProps {
  /** 异步加载时显示的占位内容 */
  fallback?: any;
  /** 超时时间(ms)，超时后显示 fallback */
  timeout?: number;
  /** 等待开始回调 */
  onPending?: () => void;
  /** 异步组件全部加载完成回调 */
  onResolve?: () => void;
  /** 显示 fallback 回调 */
  onFallback?: () => void;
}

/** 异步子组件的加载状态 */
interface AsyncDependency {
  /** 异步组件的唯一标识 */
  key: string;
  /** 是否已加载完成 */
  isResolved: boolean;
  /** 是否加载失败 */
  isRejected: boolean;
  /** 加载失败的错误 */
  error?: Error;
  /** 完成回调 */
  resolve: () => void;
  /** 失败回调 */
  reject: (error: Error) => void;
}

/** Suspense 内部状态 */
interface SuspenseState {
  /** 是否正在等待异步依赖 */
  isPending: boolean;
  /** 是否已超时 */
  isTimedOut: boolean;
  /** 是否已显示 fallback */
  isShowingFallback: boolean;
  /** 异步依赖列表 */
  dependencies: Map<string, AsyncDependency>;
  /** 超时定时器 ID */
  timeoutId: number | null;
  /** 是否已挂载 */
  mounted: boolean;
  /** 待处理的异步后代数量 */
  pendingDescendants: number;
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
function isPlainObject(val: unknown): val is Record<string, any> {
  return val !== null && typeof val === 'object' && !Array.isArray(val);
}

/**
 * 判断子组件是否为异步组件
 *
 * 异步组件通过 `__asyncSetup` 或 `__suspense` 标记来识别。
 *
 * @param vnode - 子组件 VNode
 * @returns 是否为异步组件
 */
function isAsyncComponent(vnode: any): boolean {
  if (!vnode || typeof vnode !== 'object') return false;

  // 检查异步组件标记
  if (vnode.__asyncSetup) return true;
  if (vnode.__suspense) return true;

  // 检查组件类型上的异步标记
  const type = vnode.type;
  if (type && (type.__asyncSetup || type.__suspense || type._isAsyncComponent)) {
    return true;
  }

  // 检查 setup 函数返回 Promise
  if (type && type.options && isFunction(type.options.setup)) {
    const setupResult = type.options.setup;
    // 注意：这里不实际调用 setup，只检查标记
    if ((setupResult as any).__isAsync) return true;
  }

  return false;
}

/**
 * 获取异步组件的加载 Promise
 *
 * @param vnode - 异步组件 VNode
 * @returns 加载 Promise，如果不是异步组件则返回 null
 */
function getAsyncPromise(vnode: any): Promise<any> | null {
  if (!vnode) return null;

  // 直接挂载的 Promise
  if (vnode.__asyncPromise) return vnode.__asyncPromise;

  // 组件类型上的 Promise
  const type = vnode.type;
  if (type && type.__asyncPromise) return type.__asyncPromise;

  // Suspense 标记中的 Promise
  if (vnode.__suspense && vnode.__suspense.promise) {
    return vnode.__suspense.promise;
  }

  return null;
}

// ============================================================
// Suspense 组件实现
// ============================================================

/**
 * Suspense 内置异步依赖等待组件
 *
 * 等待所有异步子组件加载完成后再显示真实内容。
 * 加载过程中显示 fallback 占位内容。
 *
 * 工作流程：
 * 1. 检测子组件是否为异步组件
 * 2. 如果有异步组件，显示 fallback
 * 3. 等待所有异步组件加载完成
 * 4. 全部完成后切换为真实内容
 * 5. 如果超时，显示 fallback 并触发超时处理
 *
 * @example
 * ```ts
 * // 基本用法
 * <suspense :fallback="LoadingSpinner">
 *   <async-component />
 * </suspense>
 *
 * // 带超时
 * <suspense :fallback="LoadingSpinner" :timeout="3000" :onResolve="handleLoaded">
 *   <async-component />
 * </suspense>
 * ```
 */
export const Suspense: ComponentDefine = defineComponent({
  name: 'Suspense',

  props: {
    fallback: { type: [Object, Function, Array], default: null },
    timeout: { type: Number, default: undefined },
    onPending: { type: Function, default: undefined },
    onResolve: { type: Function, default: undefined },
    onFallback: { type: Function, default: undefined },
  },

  state(): SuspenseState {
    return {
      isPending: false,
      isTimedOut: false,
      isShowingFallback: false,
      dependencies: new Map(),
      timeoutId: null,
      mounted: false,
      pendingDescendants: 0,
    };
  },

  init(props, state) {
    state.isPending = false;
    state.isTimedOut = false;
    state.isShowingFallback = false;
    state.dependencies = new Map();
    state.timeoutId = null;
    state.mounted = false;
    state.pendingDescendants = 0;
  },

  render(h, instance) {
    const props = instance.props as unknown as SuspenseProps;
    const state = instance.state;
    const slots = instance.slots;

    // 获取默认插槽内容（子组件）
    const children = slots.default ? slots.default() : null;
    const rawChildren: any[] = Array.isArray(children)
      ? children
      : children !== null && children !== undefined ? [children] : [];

    // 获取 fallback 插槽内容（优先使用 fallback 插槽，其次使用 props.fallback）
    const fallbackSlot = slots.fallback ? slots.fallback() : null;
    const fallbackContent = fallbackSlot !== null && fallbackSlot !== undefined
      ? (Array.isArray(fallbackSlot) ? fallbackSlot[0] : fallbackSlot)
      : props.fallback;

    // 检测异步子组件
    const asyncChildren: any[] = [];
    const syncChildren: any[] = [];

    for (let i = 0; i < rawChildren.length; i++) {
      const child = rawChildren[i];
      if (isAsyncComponent(child)) {
        asyncChildren.push(child);
      } else {
        syncChildren.push(child);
      }
    }

    // 如果没有异步子组件，直接渲染子内容
    if (asyncChildren.length === 0) {
      // 清理之前的 pending 状态
      if (state.isPending) {
        state.isPending = false;
        state.isShowingFallback = false;
        state.pendingDescendants = 0;
        clearPendingState(state as SuspenseState, props);
      }
      return rawChildren.length === 1 ? rawChildren[0] : rawChildren;
    }

    // 有异步子组件，进入 pending 状态
    if (!state.isPending) {
      state.isPending = true;
      state.isTimedOut = false;
      state.pendingDescendants = asyncChildren.length;

      // 触发 onPending 回调
      if (isFunction(props.onPending)) {
        props.onPending();
      }

      // 设置超时定时器
      if (props.timeout && props.timeout > 0) {
        state.timeoutId = window.setTimeout(() => {
          if (state.isPending) {
            state.isTimedOut = true;
            // 超时后显示 fallback
            if (!state.isShowingFallback) {
              state.isShowingFallback = true;
              if (isFunction(props.onFallback)) {
                props.onFallback();
              }
            }
          }
        }, props.timeout) as unknown as number;
      }
    }

    // 收集异步依赖
    let allResolved = true;
    const promises: Promise<void>[] = [];

    for (let i = 0; i < asyncChildren.length; i++) {
      const child = asyncChildren[i];
      const key = child.key || `__async_${i}`;

      // 检查是否已经有对应的依赖记录
      const existingDep = state.dependencies.get(key);
      if (existingDep && existingDep.isResolved) {
        // 已完成，加入同步渲染列表
        syncChildren.push(child);
        continue;
      }

      // 未完成，标记为未全部完成
      allResolved = false;

      // 获取异步 Promise
      const promise = getAsyncPromise(child);
      if (promise) {
        const depPromise = new Promise<void>((resolve, reject) => {
          promise
            .then(() => {
              const dep = state.dependencies.get(key);
              if (dep) {
                dep.isResolved = true;
              }
              // 减少待处理异步后代数量
              state.pendingDescendants = Math.max(0, state.pendingDescendants - 1);
              resolve();
            })
            .catch((error: Error) => {
              const dep = state.dependencies.get(key);
              if (dep) {
                dep.isRejected = true;
                dep.error = error;
              }
              // 减少待处理异步后代数量
              state.pendingDescendants = Math.max(0, state.pendingDescendants - 1);
              reject(error);
            });
        });

        // 记录依赖
        if (!state.dependencies.has(key)) {
          state.dependencies.set(key, {
            key,
            isResolved: false,
            isRejected: false,
            resolve: () => {},
            reject: () => {},
          });
        }

        promises.push(depPromise);
      }
    }

    // 如果所有异步组件都已完成，渲染真实内容
    if (allResolved) {
      state.isPending = false;
      state.isShowingFallback = false;
      state.pendingDescendants = 0;
      clearPendingState(state as SuspenseState, props);

      // 触发 onResolve 回调
      if (isFunction(props.onResolve)) {
        props.onResolve();
      }

      return rawChildren.length === 1 ? rawChildren[0] : rawChildren;
    }

    // 有未完成的异步组件，等待它们完成
    if (promises.length > 0) {
      Promise.all(promises)
        .then(() => {
          // 所有异步组件加载完成
          state.isPending = false;
          state.isShowingFallback = false;
          state.pendingDescendants = 0;
          clearPendingState(state as SuspenseState, props);

          // 触发 onResolve 回调
          if (isFunction(props.onResolve)) {
            props.onResolve();
          }

          // 通知组件重新渲染
          if (instance.renderProxy && instance.renderProxy.$forceUpdate) {
            instance.renderProxy.$forceUpdate();
          }
        })
        .catch((error: Error) => {
          // 加载失败，也清除 pending 状态
          state.isPending = false;
          state.isShowingFallback = false;
          state.pendingDescendants = 0;
          clearPendingState(state as SuspenseState, props);

          console.error('[Lyt Suspense] 异步组件加载失败:', error);
        });
    }

    // 显示 fallback
    state.isShowingFallback = true;

    if (isFunction(props.onFallback)) {
      props.onFallback();
    }

    // 返回 fallback 内容（优先使用 fallback 插槽）
    if (fallbackContent !== null && fallbackContent !== undefined) {
      return fallbackContent;
    }

    // 如果没有 fallback，返回空
    return null;
  },
});

// ============================================================
// 辅助函数
// ============================================================

/**
 * 清理 pending 状态
 *
 * 清除超时定时器，重置状态。
 *
 * @param state - Suspense 内部状态
 * @param props - Suspense props
 */
function clearPendingState(state: SuspenseState, props: SuspenseProps): void {
  // 清除超时定时器
  if (state.timeoutId !== null) {
    window.clearTimeout(state.timeoutId);
    state.timeoutId = null;
  }

  // 清理已完成的依赖记录
  state.dependencies.forEach((dep, key) => {
    if (dep.isResolved || dep.isRejected) {
      state.dependencies.delete(key);
    }
  });
}
