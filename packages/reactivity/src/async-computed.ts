// src/async-computed.ts
// @lytjs/reactivity - 异步 computed

declare const __DEV__: boolean;

import { trackRefValue, triggerRefValue } from './ref';
import type { Ref } from './ref';
import { createDep } from './effect';
import type { Dep } from './effect';
import { effect, stop } from './effect';
import { unsafeCast } from '@lytjs/common-assertions';
import type { ReactiveEffectRunner } from './types';
import { warn } from '@lytjs/common-error';

// ==================== AsyncComputedRef 类型 ====================

/**
 * 异步计算属性引用
 * 扩展了标准 Ref，增加了 loading 和 error 状态
 */
export interface AsyncComputedRef<T = unknown> extends Ref<T | undefined> {
  /** 异步计算是否正在进行 */
  readonly loading: boolean;
  /** 上一次异步计算的错误（如果有） */
  readonly error: unknown;
}

// ==================== AsyncComputedRefImpl ====================

class AsyncComputedRefImpl<T> {
  private _value: T | undefined;
  private _loading: boolean = false;
  private _error: unknown = undefined;
  private _effect: ReactiveEffectRunner<void> | null = null;
  private _version = 0;

  public readonly __v_isRef = true;
  public dep: Dep = createDep();

  constructor(
    private readonly _getter: () => Promise<T>,
    initialValue?: T,
    lazy: boolean = false,
  ) {
    this._value = initialValue;

    if (!lazy) {
      // 非懒加载模式：使用 effect 追踪依赖，依赖变化时重新执行 getter
      this._effect = effect(() => {
        this._runGetter();
      });
    }
  }

  /**
   * 执行 getter 并处理 Promise 结果
   */
  private _runGetter(): void {
    // 标记为 loading
    this._loading = true;
    this._error = undefined;

    // FIX: P2-3 loading 状态变化同步触发通知。
    // 在设置 _loading = true 后立即调用 triggerRefValue，
    // 确保订阅者能感知到 loading 状态的变化（如显示 loading 指示器），
    // 而不是等到异步操作完成后才统一通知。
    triggerRefValue(this);

    // 递增版本号，用于竞态检测
    const currentVersion = ++this._version;

    // 调用 getter 获取 Promise
    const result = this._getter();
    // FIX: P1-06 getter 返回非 Promise 时包装为 Promise.resolve()，
    // 避免非 Promise 返回值导致 .then() 调用失败
    const promise = result instanceof Promise ? result : Promise.resolve(result);

    // 使用 Promise.then() 非阻塞处理
    promise.then(
      (value) => {
        if (currentVersion !== this._version) return; // 过期结果，忽略
        this._value = value;
        this._loading = false;
        this._error = undefined;
        // 触发 ref 更新
        triggerRefValue(this);
      },
      (err) => {
        if (currentVersion !== this._version) return; // 过期结果，忽略
        // FIX: P2-02 异步 computed 错误处理完善：在 DEV 模式下发出警告
        if (__DEV__) {
          console.warn('[lytjs/async-computed] Async computed error:', err);
        }
        this._error = err;
        this._loading = false;
        // 触发 ref 更新
        triggerRefValue(this);
      },
    );
  }

  /**
   * 手动触发执行（用于懒加载模式）
   */
  execute(): void {
    if (this._loading) return;
    this._runGetter();
  }

  get value(): T | undefined {
    trackRefValue(this);
    return this._value;
  }

  set value(_newVal: T | undefined) {
    if (__DEV__) {
      warn('Write operation failed: asyncComputed value is readonly');
    }
  }

  get loading(): boolean {
    return this._loading;
  }

  get error(): unknown {
    return this._error;
  }

  /**
   * 停止 effect 追踪
   */
  dispose(): void {
    this._version++; // 使所有 pending 的 promise 回调失效
    if (this._effect) {
      stop(this._effect);
      this._effect = null;
    }
    // FIX: P2-07 dispose 时清空错误和值，避免悬挂的异步回调更新已销毁的 computed
    this._error = null;
    this._value = undefined;
    // FIX: P1-2 REACTIVITY-NEW-03 - dispose 时通知订阅者，避免订阅者持有过期值
    triggerRefValue(this);
  }
}

// ==================== 公共 API ====================

/**
 * 创建异步计算属性
 * 当 getter 中的响应式依赖变化时，自动重新执行 getter
 *
 * @param getter 返回 Promise 的函数
 * @param initialValue 初始值（Promise pending 时的值）
 * @returns AsyncComputedRef
 */
export function asyncComputed<T>(getter: () => Promise<T>, initialValue?: T): AsyncComputedRef<T> {
  return unsafeCast<AsyncComputedRef<T>>(new AsyncComputedRefImpl<T>(getter, initialValue, false));
}

/**
 * 创建异步状态（懒加载模式）
 * factory 只执行一次，适合数据请求场景
 *
 * @param factory 返回 Promise 的函数
 * @param initialValue 初始值
 * @returns AsyncComputedRef
 */
export function useAsyncState<T>(factory: () => Promise<T>, initialValue?: T): AsyncComputedRef<T> {
  const impl = new AsyncComputedRefImpl<T>(factory, initialValue, true);

  // 立即执行一次
  impl.execute();

  return unsafeCast<AsyncComputedRef<T>>(impl);
}
