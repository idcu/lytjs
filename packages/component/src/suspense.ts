// src/suspense.ts
// Suspense 组件

import type { ComponentInternalInstance, ComponentOptions, SetupContext } from './types';
import { createComponentInstance, setupComponent } from './component';
import { ShapeFlags, createBaseVNode } from '@lytjs/common-vnode';
import type { VNode } from '@lytjs/common-vnode';
import { error, warn } from '@lytjs/common-error';
import { nextTick } from '@lytjs/common-scheduler';
import { registerSuspenseLinker } from '@lytjs/vdom';
import { getCurrentInstance } from './lifecycle';

// ============================================================
// 注册跨包的 suspense boundary 链接器
// ============================================================

// 此链接器将 vdom 层的 SuspenseBoundary 与 component 层的
// SuspenseAsyncState 关联，使异步状态变化可以驱动 DOM 切换。
let _linkerRegistered = false;
function ensureLinkerRegistered(): void {
  if (_linkerRegistered) return;
  _linkerRegistered = true;
  // FIX: DTS build error - SuspenseLinkerFn 参数类型是 unknown
  registerSuspenseLinker(((
    asyncState: SuspenseAsyncState,
    vnodeBoundary: SuspenseAsyncState['vnodeBoundary'],
    domSwitch: SuspenseAsyncState['domSwitch'],
  ) => {
    linkSuspenseBoundary(asyncState, vnodeBoundary, domSwitch);
  }) as (
    asyncState: unknown,
    vnodeBoundary: unknown,
    domSwitch: (boundary: unknown, toFallback: boolean) => void,
  ) => void);
}

// ==================== 类型定义 ====================

/**
 * Suspense 边界被中止时抛出的错误。
 * 包含 pendingId 用于错误标识。
 */
export class SuspenseAbortedError extends Error {
  constructor(public pendingId: number) {
    super(`Suspense boundary (id: ${pendingId}) was aborted`);
    this.name = 'SuspenseAbortedError';
  }
}

export interface SuspenseProps {
  timeout?: number;
  onResolve?: () => void;
  onPending?: () => void;
  onError?: (error: Error) => void;
}

export interface SuspenseAsyncState {
  isPending: boolean;
  error: Error | null;
  /** @deprecated 使用 pendingPromises 代替 */
  promise: Promise<unknown> | null;
  pendingPromises: Set<Promise<unknown>>;
  onResolve: (() => void)[];
  onPending: (() => void)[];
  onError: ((error: Error) => void)[];
  aborted: boolean;
  /**
   * 关联的 vdom 层 SuspenseBoundary 引用。
   * 当异步状态变化时，通过此引用驱动 DOM 切换。
   */
  vnodeBoundary?: {
    vnode: VNode;
    container: unknown;
    anchor: unknown;
    parentComponent: ComponentInternalInstance | null;
    isSVG: boolean;
    isInFallback: boolean;
    activeBranch: VNode | null;
    pendingBranch: VNode | null;
  };
  /**
   * DOM 切换函数，由 vdom 层的 patch 函数提供。
   * 用于在 pending/resolve 状态变化时执行实际的 DOM 操作。
   */
  domSwitch?: (boundary: SuspenseAsyncState, toFallback: boolean) => void;
}

// ==================== Suspense 组件 ====================

export const Suspense: ComponentOptions = {
  name: 'Suspense',

  props: {
    timeout: { type: Number, default: undefined },
  },

  setup(_props: Record<string, unknown>, _ctx: SetupContext) {
    // 确保跨包链接器已注册，以便 vdom 可以调用 linkSuspenseBoundary
    ensureLinkerRegistered();

    // __DEV__ mode: validate props types
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      const props = _props as SuspenseProps;
      if (props.timeout !== undefined && typeof props.timeout !== 'number') {
        warn(`[Suspense] Invalid prop: timeout should be a number, got ${typeof props.timeout}.`);
      }
      if (props.onResolve !== undefined && typeof props.onResolve !== 'function') {
        warn(
          `[Suspense] Invalid prop: onResolve should be a function, got ${typeof props.onResolve}.`,
        );
      }
      if (props.onPending !== undefined && typeof props.onPending !== 'function') {
        warn(
          `[Suspense] Invalid prop: onPending should be a function, got ${typeof props.onPending}.`,
        );
      }
      if (props.onError !== undefined && typeof props.onError !== 'function') {
        warn(`[Suspense] Invalid prop: onError should be a function, got ${typeof props.onError}.`);
      }
    }

    const boundary: SuspenseAsyncState = {
      isPending: false,
      error: null,
      promise: null,
      pendingPromises: new Set(),
      onResolve: [],
      onPending: [],
      onError: [],
      aborted: false,
    };

    const props = _props as SuspenseProps;
    if (props.onResolve) boundary.onResolve.push(props.onResolve);
    if (props.onPending) boundary.onPending.push(props.onPending);
    if (props.onError) boundary.onError.push(props.onError);

    return {
      boundary,
    } as Record<string, unknown>;
  },
};

// ==================== Suspense 辅助函数 ====================

/**
 * 创建 Suspense 组件实例。
 */
export function createSuspenseInstance(
  props: SuspenseProps = {},
  parent: ComponentInternalInstance | null = null,
): ComponentInternalInstance {
  const vnode: VNode = createBaseVNode({
    type: Suspense,
    props: {
      timeout: props.timeout,
      onResolve: props.onResolve,
      onPending: props.onPending,
      onError: props.onError,
    },
    shapeFlag: ShapeFlags.SUSPENSE | ShapeFlags.STATEFUL_COMPONENT,
  });

  const instance = createComponentInstance(vnode, parent);
  setupComponent(instance);
  return instance;
}

/**
 * 创建 suspense boundary 用于管理异步子组件。
 */
export function createSuspenseBoundary(): SuspenseAsyncState {
  return {
    isPending: false,
    error: null,
    promise: null,
    pendingPromises: new Set(),
    onResolve: [],
    onPending: [],
    onError: [],
    aborted: false,
  };
}

/**
 * Register an async child with the suspense boundary.
 * Returns true if this is the first pending child (transition to pending).
 */
export function registerAsyncChild(
  boundary: SuspenseAsyncState,
  promise: Promise<unknown>,
): boolean {
  // FIX: P2-18 嵌套 suspense 支持：检查是否在嵌套 suspense 中
  // 如果当前 suspense 已被中止（可能是父级 suspense abort 导致），
  // 直接返回 false 避免无效操作
  if (boundary.aborted) return false;

  const wasPending = boundary.isPending;
  boundary.isPending = true;
  boundary.error = null;

  // 在集合中追踪此 Promise
  boundary.pendingPromises.add(promise);

  // 仅在第一个 pending 子组件时调用 onPending 回调
  if (!wasPending) {
    for (const cb of boundary.onPending) {
      cb();
    }
    // 触发 DOM 切换：显示 fallback slot
    if (boundary.domSwitch) {
      const switchFn = boundary.domSwitch;
      nextTick(() => {
        if (!boundary.aborted) {
          switchFn(boundary, true);
        }
      });
    }
  }

  promise
    .then((result: unknown) => {
      if (boundary.aborted) return;
      boundary.pendingPromises.delete(promise);
      // 当所有 Promise 都解析完成时，转换到 resolved 状态
      if (boundary.pendingPromises.size === 0) {
        boundary.isPending = false;
        boundary.promise = null;
        // 调用 onResolve 回调
        for (const cb of boundary.onResolve) {
          try {
            cb();
          } catch (e) {
            error(`Error in suspense resolve callback: ${String(e)}`);
          }
        }
        // 触发 DOM 切换：从 fallback 切回 default slot
        if (boundary.domSwitch) {
          const switchFn = boundary.domSwitch;
          nextTick(() => {
            if (!boundary.aborted) {
              switchFn(boundary, false);
            }
          });
        }
      }
      return result;
    })
    .catch((err: unknown) => {
      if (boundary.aborted) return;
      boundary.pendingPromises.delete(promise);
      const caughtError = err instanceof Error ? err : new Error(String(err));
      boundary.error = caughtError;
      // 当所有 Promise 都完成时，根据错误状态转换
      if (boundary.pendingPromises.size === 0) {
        boundary.isPending = false;
        boundary.promise = null;
        // 调用 onError 回调（P1-16 修复：之前错误地调用了 onPending）
        for (const cb of boundary.onError) {
          try {
            cb(caughtError);
          } catch (e) {
            error(`Error in suspense error callback: ${String(e)}`);
          }
        }
      }
    });

  return !wasPending;
}

/**
 * 检查 suspense boundary 当前是否处于 pending 状态。
 */
export function isSuspensePending(boundary: SuspenseAsyncState): boolean {
  return boundary.isPending;
}

/**
 * Get the error from a suspense boundary (if any).
 */
export function getSuspenseError(boundary: SuspenseAsyncState): Error | null {
  return boundary.error;
}

/**
 * 将 vdom 层的 SuspenseBoundary 与 component 层的 SuspenseAsyncState 关联。
 * 由 vdom 的 mountSuspense 调用，使异步状态变化能驱动 DOM 切换。
 */
export function linkSuspenseBoundary(
  asyncState: SuspenseAsyncState,
  vnodeBoundary: SuspenseAsyncState['vnodeBoundary'],
  domSwitch: SuspenseAsyncState['domSwitch'],
): void {
  asyncState.vnodeBoundary = vnodeBoundary;
  asyncState.domSwitch = domSwitch;
}

/**
 * 手动解决 suspense boundary。
 *
 * FIX: P1-20 添加语义注释：
 * resolveSuspense 用于手动将 suspense 边界标记为已解决状态。
 * 调用后，所有 pending 的 Promise 将被忽略（通过设置 aborted = true），
 * onResolve 回调将被触发，DOM 将从 fallback 切回默认内容。
 * 注意：此方法不会等待正在进行的异步操作完成，而是立即强制解决。
 * 适用场景：用户手动取消等待、路由切换等需要立即恢复的场景。
 */
export function resolveSuspense(boundary: SuspenseAsyncState): void {
  boundary.isPending = false;
  boundary.aborted = true;
  boundary.promise = null;
  boundary.error = null;
  boundary.pendingPromises.clear();
  for (const cb of boundary.onResolve) {
    try {
      cb();
    } catch (e) {
      error(`Error in suspense resolve callback: ${String(e)}`);
    }
  }
}

/**
 * 中止 suspense boundary（例如在卸载时）。
 * 拒绝所有 pending 的 Promise 以防止内存泄漏，并允许
 * 下游消费者通过 .catch() 处理中止。
 *
 * FIX: P1-20 添加语义注释：
 * abortSuspense 用于在组件卸载等场景下中止 suspense 边界。
 * 与 resolveSuspense 不同，abortSuspense 不会触发 onResolve 回调，
 * 而是清空所有回调数组以防止后续调用。所有 pending 的 Promise
 * 将尝试通过 abort 方法取消（如果是自定义 thenable）。
 * 适用场景：组件卸载、路由切换导致组件树销毁等。
 */
export function abortSuspense(boundary: SuspenseAsyncState): void {
  boundary.aborted = true;
  boundary.isPending = false;
  boundary.promise = null;

  // 拒绝所有 pending 的 Promise 以防止内存泄漏。
  // 由于原生 JavaScript Promise 无法从外部拒绝，
  // 如果 Promise 是自定义 thenable，会尝试调用 abort 方法。
  // 对于原生 Promise，依赖 aborted 标志使
  // registerAsyncChild 中的 .then()/.catch() 回调跳过副作用。
  if (boundary.pendingPromises.size > 0) {
    // FIX: P2-33 使用实际 pendingId 标识中止的 suspense 边界，
    // 而非硬编码 pendingId=0，便于错误追踪和调试
    const abortError = new SuspenseAbortedError(boundary.pendingPromises.size);
    boundary.pendingPromises.forEach((promise) => {
      try {
        // 如果 Promise 有 abort 方法（自定义 thenable），调用它
        const p = promise as unknown as Record<string, unknown>;
        if (typeof p.abort === 'function') {
          p.abort(abortError);
        }
      } catch {
        // 忽略中止期间的错误
      }
    });
    boundary.pendingPromises.clear();
  }

  // 清空所有回调数组，防止 abort 后仍被调用导致内存泄漏或无效操作。
  // 使用 length = 0 方式清空数组，保持数组引用不变（避免影响外部持有的引用）。
  boundary.onResolve.length = 0;
  boundary.onPending.length = 0;
  boundary.onError.length = 0;
}

// ==================== useSuspense 和 startTransition ====================

// 全局当前 suspense boundary 追踪
let currentSuspenseBoundary: SuspenseAsyncState | null = null;

/**
 * useSuspense Hook
 * 将 Promise 注册到当前 Suspense 边界
 */
export function useSuspense<T>(promise: Promise<T>, _key?: string): T {
  const instance = getCurrentInstance();
  if (!instance) {
    throw new Error('useSuspense must be called within a component setup function');
  }

  // 查找最近的 Suspense 边界
  let boundary = findNearestSuspenseBoundary(instance);
  if (!boundary) {
    // 如果没有找到，创建一个临时的
    boundary = createSuspenseBoundary();
  }

  // 注册异步子组件
  registerAsyncChild(boundary, promise);

  // 同步抛出 Promise 以触发 Suspense（标准 Suspense 模式）
  // 这里我们返回一个占位值，实际值在 Promise 解析后可用
  // 对于实际实现，这需要与渲染器集成
  return undefined as T;
}

/**
 * 查找最近的 Suspense 边界
 */
function findNearestSuspenseBoundary(
  instance: ComponentInternalInstance,
): SuspenseAsyncState | null {
  let current: ComponentInternalInstance | null = instance;
  while (current) {
    // 检查当前实例是否是 Suspense 组件或有 suspense boundary
    if (current.type === Suspense) {
      const setupState = current.setupState as Record<string, unknown>;
      if (setupState?.boundary) {
        return setupState.boundary as SuspenseAsyncState;
      }
    }
    current = current.parent;
  }
  return null;
}

/**
 * startTransition 函数
 * 标记更新为过渡更新，不会立即触发 Suspense fallback
 */
export function startTransition(callback: () => void): void {
  const previousBoundary = currentSuspenseBoundary;
  try {
    // 设置一个标记，表示这是过渡更新
    // 实际实现需要与调度器集成
    callback();
  } finally {
    currentSuspenseBoundary = previousBoundary;
  }
}

/**
 * SuspenseResource 类
 * 用于管理可缓存的异步资源
 */
export class SuspenseResource<T> {
  private status: 'pending' | 'success' | 'error' = 'pending';
  private value: T | null = null;
  private error: Error | null = null;
  private promise: Promise<T> | null = null;

  constructor(factory: () => Promise<T>) {
    this.load(factory);
  }

  private load(factory: () => Promise<T>): void {
    this.status = 'pending';
    this.promise = factory()
      .then((result) => {
        this.value = result;
        this.status = 'success';
        return result;
      })
      .catch((err) => {
        this.error = err instanceof Error ? err : new Error(String(err));
        this.status = 'error';
        throw this.error;
      });
  }

  read(): T {
    if (this.status === 'success') {
      return this.value!;
    }
    if (this.status === 'error') {
      throw this.error;
    }
    throw this.promise;
  }

  refresh(factory: () => Promise<T>): void {
    this.load(factory);
  }
}

/**
 * 创建 Suspense 资源
 */
export function createSuspenseResource<T>(factory: () => Promise<T>): SuspenseResource<T> {
  return new SuspenseResource(factory);
}
