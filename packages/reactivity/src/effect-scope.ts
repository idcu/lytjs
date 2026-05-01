// src/effect-scope.ts
// Vue 3 风格的 effectScope API
// 用于批量管理响应式副作用的创建和销毁

import type { EffectScopeEntry } from "./effect-scope-registrar";

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
 * @param detached - 是否脱离父 scope。默认 false，即嵌套 scope 会被父 scope 管理。
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
export function effectScope(detached?: boolean): EffectScope {
  const scope: EffectScope = {
    active: true,
    effects: [],
    cleanups: [],
    parent: activeEffectScope,
    detached: !!detached,

    run(fn) {
      if (!this.active) return;
      const prevScope = activeEffectScope;
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
          console.error("[LytJS] Error stopping effect in scope:", e);
        }
      }
      for (const cleanup of this.cleanups) {
        try {
          cleanup();
        } catch (e) {
          console.error("[LytJS] Error running cleanup in scope:", e);
        }
      }
      this.effects.length = 0;
      this.cleanups.length = 0;
    },
  } as EffectScope;

  if (!scope.detached && activeEffectScope) {
    activeEffectScope.effects.push(scope as any);
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
    console.warn(
      "[LytJS] onScopeDispose() was called when there was no active effect scope to be associated with.",
    );
  }
}
