// src/computed.ts
// 计算属性
// 复用 @lytjs/common-is: isFunction, hasChanged

import { isFunction } from "@lytjs/common-is";
import { ReactiveEffect, createDep } from "./effect";
import type { Dep } from "./effect";
import { trackRefValue, triggerRefValue } from "./ref";
import type {
  ComputedRef,
  WritableComputedRef,
  ComputedGetter,
  ComputedSetter,
  WritableComputedOptions,
} from "./types";
import { ComputedRefSymbol } from "./constants";

// ==================== ComputedRefImpl ====================

class ComputedRefImpl<T> {
  // 使用 Dep 类型替代 Set<any>，提供更精确的类型约束
  public dep: Dep = createDep();
  private _value!: T;
  private _dirty = true;
  public readonly [ComputedRefSymbol] = true;
  public readonly __v_isRef = true;
  public readonly __v_isComputed = true as const;
  public readonly effect: ReactiveEffect<T>;

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
    });

    if (isSSR) {
      this._value = getter();
      this._dirty = false;
    }
  }

  get value(): T {
    trackRefValue(this);
    if (this._dirty) {
      if (this.effect.active) {
        const value = this.effect.run();
         
        this._value = value!;
        this._dirty = false;
      } else if (__DEV__) {
        console.warn(
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
      console.warn("Write operation failed: computed value is readonly");
    }
  }
}

// ==================== 公共 API ====================

export function computed<T>(
  getterOrOptions: ComputedGetter<T> | WritableComputedOptions<T>,
): ComputedRef<T> | WritableComputedRef<T> {
  let getter: ComputedGetter<T>;
  let setter: ComputedSetter<T> | undefined;

  if (isFunction(getterOrOptions)) {
    getter = getterOrOptions;
    setter = __DEV__
      ? () => console.warn("Write operation failed: computed value is readonly")
      : undefined;
  } else {
    getter = getterOrOptions.get;
    setter = getterOrOptions.set;
  }

  return new ComputedRefImpl(getter, setter, false) as ComputedRef<T> | WritableComputedRef<T>;
}
