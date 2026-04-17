/**
 * Lyt.js 响应式系统 — 计算属性（Computed）
 *
 * 计算属性是基于响应式依赖进行缓存的派生值。
 * 只有当依赖发生变化时才会重新计算，否则返回缓存值。
 *
 * 核心机制：
 * 1. dirty 标记：标记计算值是否过期
 * 2. 惰性求值：只有在访问 .value 时才计算
 * 3. 缓存：dirty 为 false 时直接返回缓存值
 * 4. 依赖传播：当计算属性的值变化时，通知依赖它的副作用
 *
 * 实现原理：
 * - 内部维护一个 ReactiveEffect，getter 作为副作用函数
 * - 当 getter 中的响应式数据变化时，将 dirty 设为 true
 * - 当访问 .value 且 dirty 为 true 时，重新执行 getter
 */

import {
  ReactiveEffect,
  track,
  trigger,
  activeEffect,
  EffectFn,
} from './effect';
import { Ref, isRef, refSymbol } from './ref';

// ======================== 类型定义 ========================

/** 计算属性的 getter 函数 */
export type ComputedGetter<T = any> = () => T;

/** 计算属性的 setter 函数 */
export type ComputedSetter<T = any> = (value: T) => void;

/** computed 选项（支持 getter 或 getter+setter） */
export interface WritableComputedOptions<T = any> {
  get: ComputedGetter<T>;
  set: ComputedSetter<T>;
}

/** ComputedRef 接口（只读） */
export interface ComputedRef<T = any> extends Ref<T> {
  /** 只读标记 */
  readonly value: T;
}

/** WritableComputedRef 接口（可写） */
export interface WritableComputedRef<T = any> extends Ref<T> {
  value: T;
}

// ======================== ComputedRefImpl 类 ========================

/**
 * 计算属性的内部实现类
 *
 * @template T - 计算值的类型
 */
class ComputedRefImpl<T> {
  /** 缓存的计算值 */
  private _value: T;

  /** dirty 标记：true 表示需要重新计算 */
  private _dirty: boolean = true;

  /** 内部副作用（getter 作为副作用函数） */
  private _effect: ReactiveEffect;

  /** setter 函数（可选） */
  private _setter?: ComputedSetter<T>;

  /** Ref 标记 */
  public __v_isRef = true;

  /** 依赖该计算属性的副作用集合 */
  public deps: Set<ReactiveEffect> = new Set();

  constructor(
    getter: ComputedGetter<T>,
    setter?: ComputedSetter<T>
  ) {
    this._setter = setter;

    // 创建内部副作用
    // - scheduler：当依赖变化时，不立即重新计算，而是标记 dirty
    // - lazy：首次不自动执行，等访问 .value 时再计算
    this._effect = new ReactiveEffect(getter, {
      scheduler: () => {
        // 依赖变化时，标记为 dirty
        if (!this._dirty) {
          this._dirty = true;

          // 触发依赖该计算属性的副作用
          this.triggerDep();
        }
      },
      lazy: true,
    });

    // 初始值为 undefined（惰性求值）
    this._value = undefined as any;
  }

  /**
   * 获取计算值
   * 如果 dirty 为 true，重新执行 getter
   * 同时进行依赖收集
   */
  get value(): T {
    // 依赖收集：让外部副作用依赖这个计算属性
    track(this, 'value');

    // 将当前 activeEffect 加入本计算属性的 deps 集合
    // 这样当上游依赖变化时，triggerDep 能正确通知下游
    if (activeEffect && !this.deps.has(activeEffect)) {
      this.deps.add(activeEffect);
      // 同时将 this.deps 加入 activeEffect.deps，以便 cleanupEffect 时清理
      activeEffect.deps.add(this.deps);
    }

    // 如果 dirty，重新计算
    if (this._dirty) {
      this._value = this._effect.run();
      this._dirty = false;
    }

    return this._value;
  }

  /**
   * 设置计算值
   * 只有提供了 setter 的计算属性才能设置
   */
  set value(newValue: T) {
    if (this._setter) {
      this._setter(newValue);
    } else {
      console.warn('Computed value is readonly.');
    }
  }

  /**
   * 触发依赖该计算属性的所有副作用
   */
  private triggerDep(): void {
    for (const effect of this.deps) {
      if (effect.scheduler) {
        effect.scheduler(effect);
      } else {
        effect.run();
      }
    }
  }
}

// ======================== 公共 API ========================

/**
 * 创建一个计算属性
 *
 * 支持两种用法：
 * 1. 传入 getter 函数：创建只读计算属性
 * 2. 传入 { get, set } 对象：创建可写计算属性
 *
 * @param getterOrOptions - getter 函数或 { get, set } 选项对象
 * @returns 计算属性 Ref
 *
 * @example
 * ```ts
 * const count = ref(1)
 * const double = computed(() => count.value * 2)
 * console.log(double.value)  // 2
 * count.value = 5
 * console.log(double.value)  // 10（自动重新计算）
 *
 * // 可写计算属性
 * const firstName = ref('Lyt')
 * const lastName = ref('JS')
 * const fullName = computed({
 *   get: () => firstName.value + ' ' + lastName.value,
 *   set: (val) => {
 *     const [first, last] = val.split(' ')
 *     firstName.value = first
 *     lastName.value = last
 *   }
 * })
 * fullName.value = 'Hello World'  // firstName = 'Hello', lastName = 'World'
 * ```
 */
export function computed<T = any>(
  getterOrOptions: ComputedGetter<T> | WritableComputedOptions<T>
): ComputedRef<T> | WritableComputedRef<T> {
  let getter: ComputedGetter<T>;
  let setter: ComputedSetter<T> | undefined;

  // 判断传入的是 getter 函数还是选项对象
  if (typeof getterOrOptions === 'function') {
    // 只读计算属性
    getter = getterOrOptions;
    setter = undefined;
  } else {
    // 可写计算属性
    getter = getterOrOptions.get;
    setter = getterOrOptions.set;
  }

  // 创建计算属性实例
  const cRef = new ComputedRefImpl(getter, setter);

  return cRef as any;
}
