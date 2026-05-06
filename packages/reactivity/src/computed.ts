// src/computed.ts
// 计算属性
// 复用 @lytjs/common-is: isFunction, hasChanged

import { isFunction } from '@lytjs/common-is';
import { warn } from '@lytjs/common-error';
import { ReactiveEffect, createDep } from './effect';
import type { Dep } from './effect';
import { trackRefValue, triggerRefValue } from './ref';
import type {
  ComputedRef,
  WritableComputedRef,
  ComputedGetter,
  ComputedSetter,
  WritableComputedOptions,
} from './types';
import { ComputedRefSymbol } from './constants';

// ==================== ComputedRefImpl ====================

// FIX: P1-L6 计算属性循环依赖未检测 - 添加循环依赖检测
const MAX_COMPUTED_DEPTH = 100;
let computedDepth = 0;
const computedStack = new Set<ComputedRefImpl<unknown>>();

class ComputedRefImpl<T> {
  // 使用 Dep 类型替代 Set<any>，提供更精确的类型约束
  public dep: Dep = createDep();
  private _value!: T;
  private _dirty = true;
  private _initialized = false;
  public readonly [ComputedRefSymbol] = true;
  public readonly __v_isRef = true;
  public readonly __v_isComputed = true as const;
  public readonly effect: ReactiveEffect<T>;

  // FIX: P2-6 计算属性缓存清理相关属性
  private _cacheCleanupTimer: ReturnType<typeof setTimeout> | null = null;
  private static readonly CACHE_CLEANUP_DELAY = 60000; // 60秒后清理缓存

  constructor(
    getter: ComputedGetter<T>,
    private readonly _setter: ComputedSetter<T> | undefined,
    isSSR: boolean,
  ) {
    this.effect = new ReactiveEffect(getter, () => {
      if (!this._dirty) {
        this._dirty = true;
        triggerRefValue(this);
      }
      // FIX: P2-6 重置缓存清理定时器
      this._resetCacheCleanupTimer();
    });
    this.effect.computed = true;

    if (isSSR) {
      try {
        this._value = getter();
        this._dirty = false;
      } catch (e) {
        // SSR 模式下 getter 异常不应阻塞渲染流程，
        // 标记为 dirty 以便后续访问时重试
        this._dirty = true;
        if (__DEV__) {
          warn(`Computed getter threw during SSR initialization: ${e}`);
        }
      }
    }
  }

  // FIX: P2-6 重置缓存清理定时器
  private _resetCacheCleanupTimer(): void {
    // 清除现有的定时器
    if (this._cacheCleanupTimer) {
      clearTimeout(this._cacheCleanupTimer);
    }
    // 设置新的定时器，在指定时间后清理缓存
    this._cacheCleanupTimer = setTimeout(() => {
      // 如果 effect 已停止，清理缓存值以释放内存
      if (!this.effect.active) {
        this._cleanupCache();
      }
    }, ComputedRefImpl.CACHE_CLEANUP_DELAY);
  }

  // FIX: P2-6 清理缓存值
  private _cleanupCache(): void {
    if (!this.effect.active) {
      // 清除缓存值，释放内存
      this._value = undefined as unknown as T;
      this._initialized = false;
      this._dirty = true;
      if (__DEV__) {
        console.log('[lytjs/reactivity] Computed cache cleaned up after inactivity');
      }
    }
  }

  // FIX: P2-6 手动清理缓存的公共方法
  /**
   * 手动清理计算属性的缓存值。
   * 在组件卸载时调用此方法可以释放内存。
   */
  cleanupCache(): void {
    if (this._cacheCleanupTimer) {
      clearTimeout(this._cacheCleanupTimer);
      this._cacheCleanupTimer = null;
    }
    this._cleanupCache();
  }

  get value(): T {
    trackRefValue(this);
    if (this._dirty) {
      if (this.effect.active) {
        // FIX: P1-L6 计算属性循环依赖未检测 - 检测循环依赖
        if (computedStack.has(this as ComputedRefImpl<unknown>)) {
          throw new Error(
            `Circular dependency detected in computed property. ` +
            `A computed property is indirectly referencing itself, causing an infinite loop.`
          );
        }
        computedDepth++;
        if (computedDepth > MAX_COMPUTED_DEPTH) {
          computedDepth--;
          throw new Error(
            `Maximum computed depth exceeded (${MAX_COMPUTED_DEPTH}). ` +
            `Possible infinite loop in computed properties.`
          );
        }
        computedStack.add(this as ComputedRefImpl<unknown>);

        try {
          const value = this.effect.run();

          // FIX: P1-02 effect.run() 返回 undefined 时不覆盖缓存，
          // 避免 getter 返回 undefined 被误认为是有效值而覆盖之前的有效缓存
          // FIX: P1-3 移除 || this._dirty 条件（在 _dirty 块内恒为 true），
          // 仅在 value !== undefined 时覆盖缓存
          // FIX: P2-25 缓存未命中处理优化：即使返回 undefined 也标记为已计算，
          // 避免重复执行 effect.run()，但保留 _initialized 状态不变
          if (value !== undefined) {
            this._value = value as T;
            this._initialized = true;
          }
          // FIX: P2-25 无论 value 是否为 undefined，都标记为 clean 以避免重复计算
          this._dirty = false;
        } catch (e) {
          // FIX: P2-25 缓存未命中处理优化：异常时如果已有缓存值，保持 clean 状态
          // 避免在异常场景下重复触发 effect.run()
          if (this._initialized) {
            // Already had a cached value; mark as clean so next access returns cached value
            this._dirty = false;
          }
          throw e;
        } finally {
          computedStack.delete(this as ComputedRefImpl<unknown>);
          computedDepth--;
        }
      } else if (__DEV__) {
        warn(
          'Computed value was accessed after its effect was stopped. Returning last cached value.',
        );
      }
    }
    return this._value;
  }

  set value(newValue: T) {
    if (this._setter) {
      this._setter(newValue);
    } else if (__DEV__) {
      warn('Write operation failed: computed value is readonly');
    }
  }
}

// ==================== SSR 模式管理 ====================

// FIX: P1-3 REACTIVITY-NEW-04 - _isSSR 是模块级可变状态
// 限制说明：此状态在模块级别共享，多实例/测试场景下可能产生状态泄漏。
// 建议：在 SSR 场景中使用独立的模块实例，或通过上下文参数传递 SSR 状态。
let _isSSR = false;

/**
 * 设置 SSR 模式。
 * 在 SSR 环境中调用 setSSRMode(true) 可让 computed 在创建时立即求值，
 * 避免在服务端渲染时因懒求值导致的不一致问题。
 *
 * 注意：此设置为模块级全局状态，多实例/测试场景下可能产生状态泄漏。
 * 如需隔离，请确保不同环境使用独立的模块加载上下文。
 */
export function setSSRMode(isSSR: boolean): void {
  _isSSR = isSSR;
}

// ==================== 公共 API ====================

export function computed<T>(
  getterOrOptions: ComputedGetter<T> | WritableComputedOptions<T>,
): ComputedRef<T> | WritableComputedRef<T> {
  let getter: ComputedGetter<T>;
  let setter: ComputedSetter<T> | undefined;

  if (isFunction(getterOrOptions)) {
    getter = getterOrOptions;
    setter = __DEV__ ? () => warn('Write operation failed: computed value is readonly') : undefined;
  } else {
    getter = getterOrOptions.get;
    setter = getterOrOptions.set;
  }

  return new ComputedRefImpl(getter, setter, _isSSR) as ComputedRef<T> | WritableComputedRef<T>;
}
