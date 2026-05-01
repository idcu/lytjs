// src/effect-scope.ts
// Vue 3 风格的 effectScope API
// 用于批量管理响应式副作用的创建和销毁

import type { EffectScopeEntry } from "./effect-scope-registrar";
import { warn, error } from "@lytjs/common-error";

export interface EffectScope {
  /** 当前 scope 是否活跃 */
  active: boolean;
  /** scope 收集的 effects */
  effects: EffectScopeEntry[];
  /** scope 注册的清理回调 */
  cleanups: (() => void)[];
  /** 父 scope（嵌套时自动关联） */
  parent: EffectScope | undefined;
  /** 是否脱离父 scope（detached scope 不会被父 scope stop） */
  detached: boolean;
  /** 在 scope 上下文中执行 fn，期间创建的 effect 会被自动收集 */
  run<T>(fn: () => T): T | undefined;
  /** 停止 scope，清理所有收集的 effects 和 cleanups */
  stop(): void;
}

export interface EffectScopeOptions {
  detached?: boolean;
}

/** 当前活跃的 effectScope（唯一来源） */
let activeEffectScope: EffectScope | undefined;

/** 获取当前活跃的 effectScope */
export function getActiveEffectScope(): EffectScope | undefined {
  return activeEffectScope;
}

/** 设置当前活跃的 effectScope */
export function setActiveEffectScope(scope: EffectScope | undefined): void {
  activeEffectScope = scope;
}

/**
 * 创建一个 effect scope，用于批量管理响应式副作用。
 *
 * @param options - 配置选项。支持传入 boolean（兼容旧 API）或 EffectScopeOptions 对象。
 * @returns EffectScope 实例
 *
 * @example
 * ```ts
 * const scope = effectScope()
 * scope.run(() => {
 *   const count = ref(0)
 *   watch(count, () => console.log(count.value))
 * })
 * // 不再需要时一次性停止所有副作用
 * scope.stop()
 * ```
 */
export function effectScope(
  options?: boolean | EffectScopeOptions,
): EffectScope {
  const detached = typeof options === "boolean" ? options : options?.detached;
  const scope: EffectScope = {
    active: true,
    effects: [],
    cleanups: [],
    parent: activeEffectScope,
    detached: !!detached,

    run(fn) {
      if (!this.active) {
        if (__DEV__) {
          warn(`EffectScope is not active. Cannot run fn.`);
        }
        return;
      }
      const prevScope = activeEffectScope;
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      activeEffectScope = this;
      try {
        return fn();
      } finally {
        activeEffectScope = prevScope;
      }
    },

    stop() {
      if (!this.active) return;
      this.active = false;
      for (const effect of this.effects) {
        try {
          effect.stop();
        } catch (e) {
          error(`Error stopping effect in scope: ${String(e)}`);
        }
      }
      for (const cleanup of this.cleanups) {
        try {
          cleanup();
        } catch (e) {
          error(`Error running cleanup in scope: ${String(e)}`);
        }
      }
      this.effects.length = 0;
      this.cleanups.length = 0;
    },
  } as EffectScope;

  if (!scope.detached && activeEffectScope) {
    // 双重断言是必要的：EffectScope 对象字面量实现了 EffectScopeEntry 所需的
    // stop() 方法，但 TypeScript 无法自动推断对象字面量满足联合类型。
    // EffectScopeEntry = ReactiveEffect | EffectScope，此处 scope 是 EffectScope 实例。
    activeEffectScope.effects.push(scope as unknown as EffectScopeEntry);
  }

  return scope;
}

/**
 * 获取当前活跃的 effectScope。
 */
export function getCurrentScope(): EffectScope | undefined {
  return activeEffectScope;
}

/**
 * 在当前活跃的 effectScope 中注册一个清理回调。
 * 当 scope 被 stop 时，所有注册的回调会被执行。
 *
 * @param fn - 清理回调函数
 *
 * @example
 * ```ts
 * const scope = effectScope()
 * scope.run(() => {
 *   onScopeDispose(() => {
 *     console.log('scope disposed')
 *   })
 * })
 * scope.stop() // 输出: scope disposed
 * ```
 */
export function onScopeDispose(fn: () => void): void {
  if (activeEffectScope) {
    activeEffectScope.cleanups.push(fn);
  } else if (__DEV__) {
    warn(
      "onScopeDispose() was called when there was no active effect scope to be associated with.",
    );
  }
}
