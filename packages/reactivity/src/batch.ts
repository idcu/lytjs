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
// 内部状态
// ============================================================

/** 当前活跃的批量作用域栈 */
const scopeStack: BatchScopeContext[] = [];

/** 全局批量深度计数器 */
let globalBatchDepth = 0;

/** 最大嵌套深度限制 */
const MAX_NESTING_DEPTH = 100;

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
      // FIX: P2-1 避免不安全的 undefined as T，在 onError 回调处理后
      // 抛出错误以确保调用方知道操作失败（T 永远不会被返回）
      throw error;
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
      // FIX: P1-2 异步 batchScope 作用域栈提前弹出
      // 将 scopeStack.pop() 和 globalBatchDepth-- 移到 .then() 回调中，
      // 确保 batchAsync 的异步操作完成后再弹出作用域栈
      // FIX: P2-1 初始化 result 为 undefined 并添加运行时检查，避免非空断言
      let result: T | undefined;
      const promise = batchAsync(() => {
        result = callback(ctx);
      });
      promise.then(() => {
        ctx.committed = true;
        // 异步操作完成后再弹出作用域栈
        scopeStack.pop();
        globalBatchDepth--;
      }).catch((error) => {
        // 异步操作失败时也要弹出作用域栈
        scopeStack.pop();
        globalBatchDepth--;
        if (onError) {
          onError(error);
        } else {
          throw error;
        }
      });
      // FIX: P1-6 移除对 undefined 返回值的检查，void 函数合法返回 undefined
      return result as T;
    } else {
      // 同步模式：使用 batch
      // FIX: P2-1 初始化 result 为 undefined 并添加运行时检查，避免非空断言
      let result: T | undefined;
      batch(() => {
        result = callback(ctx);
      });
      ctx.committed = true;
      if (result === undefined) {
        throw new Error(
          '[lytjs/reactivity] batchScope sync mode: callback returned undefined.',
        );
      }
      return result;
    }
  } catch (error) {
    // 同步模式下的错误处理
    if (onError) {
      onError(error);
      // FIX: P2-1 避免不安全的 undefined as T
      throw error;
    }
    throw error;
  } finally {
    // 仅在同步模式下弹出作用域栈（异步模式在 .then() 中处理）
    if (!async) {
      scopeStack.pop();
      globalBatchDepth--;
    }
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
      // FIX: P2-1 避免不安全的 undefined as T
      return Promise.reject(error);
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
    // FIX: DTS build error - batchAsync 返回 Promise<void>，需要类型断言
    let result: T | undefined;
    await batchAsync(async () => {
      result = await callback(ctx);
    });
    ctx.committed = true;
    return result as T;
  } catch (error) {
    if (onError) {
      onError(error);
      // FIX: P2-1 避免不安全的 undefined as T
      throw error;
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
// 工具函数
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
 *
 * FIX: P2-2 flushBatchScopes 中 pendingCallbacks 始终为空（死代码）。
 * 原因：batchScope 的异步模式使用 batchAsync 而非 pendingCallbacks 注册回调，
 * 导致 pendingCallbacks 永远不会被填充。移除死代码，避免误导维护者。
 * 如需等待异步 batchScope 完成，应直接 await batchScopeAsync()。
 *
 * FIX: P2-batch1-7 保留原因：
 * 1. API 兼容性：此函数是公共 API 的一部分，直接删除会导致破坏性变更
 * 2. 未来扩展：可用于实现等待所有异步 batchScope 完成的功能
 * 3. 测试用途：提供一种同步刷新所有批量操作的方式（即使当前为空操作）
 * 4. 类型安全：返回 Promise<void> 与异步 API 签名保持一致
 *
 * @deprecated 当前实现为空操作，如需等待异步 batchScope 完成，请直接使用 await batchScopeAsync()
 */
export function flushBatchScopes(): Promise<void> {
  // FIX: P2-2 pendingCallbacks 在当前实现中始终为空（死代码已移除）。
  // 异步批量操作的完成通过 batchScopeAsync() 的 Promise 链保证。
  // 此函数保留为空操作以维持 API 兼容性，未来可用于等待所有异步 batchScope 完成。
  return Promise.resolve();
}

// ============================================================
// Internal API (for testing)
// ============================================================

/** @internal 重置批量作用域全局状态（仅用于测试） */
export function _resetBatchScopeState(): void {
  scopeStack.length = 0;
  globalBatchDepth = 0;
}

/** @internal 获取待处理回调数量（仅用于测试） */
// FIX: P2-3 pendingCallbacks 已移除，此函数始终返回 0
export function _getPendingCallbacksCount(): number {
  return 0;
}
