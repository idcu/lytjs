// src/computed.ts
// 计算属性
// 复用 @lytjs/common-is: isFunction, hasChanged

import { isFunction } from "@lytjs/common-is";
import { warn } from "@lytjs/common-error";
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
  private _initialized = false;
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
        try {
          const value = this.effect.run();

          this._value = value as T;
          this._dirty = false;
          this._initialized = true;
        } catch (e) {
          if (this._initialized) {
            // Already had a cached value; mark as clean so next access returns cached value
            this._dirty = false;
          }
          throw e;
        }
      } else if (__DEV__) {
        warn(
          "Computed value was accessed after its effect was stopped. Returning last cached value.",
        );
      }
    }
    return this._value;
  }

  set value(newValue: T) {
    if (this._setter) {
      this._setter(newValue);
    } else if (__DEV__) {
      warn("Write operation failed: computed value is readonly");
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
      ? () => warn("Write operation failed: computed value is readonly")
      : undefined;
  } else {
    getter = getterOrOptions.get;
    setter = getterOrOptions.set;
  }

  return new ComputedRefImpl(getter, setter, false) as
    | ComputedRef<T>
    | WritableComputedRef<T>;
}
