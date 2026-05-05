/**
 * @lytjs/reactivity - batch.ts
 * FIX: P2-4 REACTIVITY-NEW-05 - 批量操作 API
 * 
 * 提供 batchScope 函数，支持嵌套批量操作和自动提交。
 * 允许在批量作用域内执行多个响应式操作，只在作用域结束时统一触发更新。
 */

import { batch, batchAsync, untrack } from './effect';

// ============================================================
// Types
// ============================================================

/** 批量作用域配置选项 */
export interface BatchScopeOptions {
  /** 是否异步提交（默认 false） */
  async?: boolean;
  /** 作用域名称（用于调试） */
  name?: string;
  /** 错误处理回调 */
  onError?: (error: unknown) => void;
}

/** 批量作用域上下文 */
export interface BatchScopeContext {
  /** 当前嵌套深度 */
  depth: number;
  /** 作用域名称 */
  name: string;
  /** 是否已提交 */
  committed: boolean;
  /** 是否已取消 */
  cancelled: boolean;
}

/** 批量操作回调 */
export type BatchScopeCallback<T> = (ctx: BatchScopeContext) => T;

// ============================================================
// Internal State
// ============================================================

/** 当前活跃的批量作用域栈 */
const scopeStack: BatchScopeContext[] = [];

/** 全局批量深度计数器 */
let globalBatchDepth = 0;

/** 最大嵌套深度限制 */
const MAX_NESTING_DEPTH = 100;

/** 待提交的回调队列（用于异步模式） */
const pendingCallbacks = new Set<() => void>();

/** 是否正在刷新队列 */
let isFlushing = false;

// ============================================================
// Core API
// ============================================================

/**
 * 创建批量作用域并执行回调函数。
 * 在作用域内所有响应式操作会被批量收集，只在作用域结束时统一触发更新。
 * 
 * 支持嵌套调用：嵌套的 batchScope 会继承外层的批量状态，
 * 只有最外层作用域结束时才会真正提交所有更新。
 * 
 * @example
 * ```typescript
 * batchScope((ctx) => {
 *   signal1.set(1);
 *   signal2.set(2);
 *   // 此时不会触发更新
 *   
 *   batchScope((innerCtx) => {
 *     signal3.set(3);
 *     // 嵌套作用域，仍然不会触发更新
 *   });
 * });
 * // 所有更新在这里统一触发
 * ```
 * 
 * @param callback - 在批量作用域内执行的回调函数
 * @param options - 批量作用域配置选项
 * @returns 回调函数的返回值
 */
export function batchScope<T>(
  callback: BatchScopeCallback<T>,
  options: BatchScopeOptions = {}
): T {
  const { async = false, name = 'batchScope', onError } = options;

  // 检查嵌套深度限制
  if (globalBatchDepth >= MAX_NESTING_DEPTH) {
    const error = new Error(
      `[lytjs/reactivity] Maximum batchScope nesting depth (${MAX_NESTING_DEPTH}) exceeded. ` +
      `This may indicate an infinite loop.`
    );
    if (onError) {
      onError(error);
      return undefined as T;
    }
    throw error;
  }

  // 创建作用域上下文
  const ctx: BatchScopeContext = {
    depth: globalBatchDepth,
    name,
    committed: false,
    cancelled: false,
  };

  // 推入作用域栈
  scopeStack.push(ctx);
  globalBatchDepth++;

  try {
    if (async) {
      // 异步模式：使用 batchAsync
      let result: T;
      batchAsync(() => {
        result = callback(ctx);
      }).then(() => {
        ctx.committed = true;
      }).catch((error) => {
        if (onError) {
          onError(error);
        } else {
          throw error;
        }
      });
      return result!;
    } else {
      // 同步模式：使用 batch
      let result: T;
      batch(() => {
        result = callback(ctx);
      });
      ctx.committed = true;
      return result!;
    }
  } catch (error) {
    if (onError) {
      onError(error);
      return undefined as T;
    }
    throw error;
  } finally {
    // 弹出作用域栈
    scopeStack.pop();
    globalBatchDepth--;
  }
}

/**
 * 创建异步批量作用域。
 * 与 batchScope 类似，但支持 async/await。
 * 
 * @example
 * ```typescript
 * await batchScopeAsync(async (ctx) => {
 *   signal1.set(1);
 *   await someAsyncOperation();
 *   signal2.set(2);
 * });
 * ```
 * 
 * @param callback - 异步回调函数
 * @param options - 批量作用域配置选项
 * @returns Promise，在批量作用域完成时 resolve
 */
export async function batchScopeAsync<T>(
  callback: BatchScopeCallback<Promise<T> | T>,
  options: BatchScopeOptions = {}
): Promise<T> {
  const { name = 'batchScopeAsync', onError } = options;

  // 检查嵌套深度限制
  if (globalBatchDepth >= MAX_NESTING_DEPTH) {
    const error = new Error(
      `[lytjs/reactivity] Maximum batchScope nesting depth (${MAX_NESTING_DEPTH}) exceeded.`
    );
    if (onError) {
      onError(error);
      return Promise.resolve(undefined as T);
    }
    return Promise.reject(error);
  }

  // 创建作用域上下文
  const ctx: BatchScopeContext = {
    depth: globalBatchDepth,
    name,
    committed: false,
    cancelled: false,
  };

  // 推入作用域栈
  scopeStack.push(ctx);
  globalBatchDepth++;

  try {
    const result = await batchAsync(async () => {
      return await callback(ctx);
    });
    ctx.committed = true;
    return result;
  } catch (error) {
    if (onError) {
      onError(error);
      return undefined as T;
    }
    throw error;
  } finally {
    // 弹出作用域栈
    scopeStack.pop();
    globalBatchDepth--;
  }
}

/**
 * 在批量作用域内执行无追踪操作。
 * 函数内读取 signal 不会建立依赖关系。
 * 
 * @param fn - 要执行的函数
 * @returns 函数的返回值
 */
export function batchScopeUntrack<T>(fn: () => T): T {
  return untrack(fn);
}

// ============================================================
// Utility Functions
// ============================================================

/**
 * 获取当前批量作用域深度。
 * 0 表示不在任何批量作用域内。
 */
export function getBatchScopeDepth(): number {
  return globalBatchDepth;
}

/**
 * 获取当前活跃的批量作用域信息。
 * 返回当前作用域栈的只读副本。
 */
export function getCurrentBatchScopeStack(): ReadonlyArray<BatchScopeContext> {
  return [...scopeStack];
}

/**
 * 检查当前是否在批量作用域内。
 */
export function isInBatchScope(): boolean {
  return globalBatchDepth > 0;
}

/**
 * 等待所有待处理的批量操作完成（异步模式）。
 * 返回一个 Promise，在所有异步批量操作完成后 resolve。
 */
export function flushBatchScopes(): Promise<void> {
  if (!isFlushing && pendingCallbacks.size > 0) {
    isFlushing = true;
    return new Promise((resolve) => {
      Promise.resolve().then(() => {
        const callbacks = Array.from(pendingCallbacks);
        pendingCallbacks.clear();
        callbacks.forEach(cb => {
          try {
            cb();
          } catch (e) {
            // 忽略单个回调的错误
          }
        });
        isFlushing = false;
        resolve();
      });
    });
  }
  return Promise.resolve();
}

// ============================================================
// Internal API (for testing)
// ============================================================

/** @internal 重置批量作用域全局状态（仅用于测试） */
export function _resetBatchScopeState(): void {
  scopeStack.length = 0;
  globalBatchDepth = 0;
  pendingCallbacks.clear();
  isFlushing = false;
}

/** @internal 获取待处理回调数量（仅用于测试） */
export function _getPendingCallbacksCount(): number {
  return pendingCallbacks.size;
}
