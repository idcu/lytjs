// src/effect.ts
// 响应式副作用系统核心

import { ITERATE_KEY } from './constants';
import type { ReactiveEffectRunner } from './types';
import { warn, error } from '@lytjs/common-error';

// ==================== 全局状态 ====================

let activeEffect: ReactiveEffect | undefined;
let _trackDepth = 0;
const targetMap = new WeakMap<object, Map<string | symbol, Dep>>();
let shouldTrack = true;
const trackStack: boolean[] = [];

// 只读访问器，防止外部修改内部状态
export function getActiveEffect(): ReactiveEffect | undefined {
  return activeEffect;
}
export function getShouldTrack(): boolean {
  return shouldTrack;
}

// effectScope 支持：从 effect-scope 导入 activeEffectScope getter
import { getActiveEffectScope } from './effect-scope';

// ==================== Dep ====================

export type Dep = Set<ReactiveEffect>;

export const createDep = (): Dep => {
  return new Set() as Dep;
};

// ==================== Track / Trigger ====================

/**
 * Maximum depth for nested trigger() calls to prevent infinite reactivity loops.
 * When triggerDepth exceeds this limit, further triggers are silently dropped
 * and a warning is emitted in DEV mode.
 */
const MAX_TRIGGER_DEPTH = 100;
let triggerDepth = 0;

export function track(target: object, _type: string, key: string | symbol) {
  if (!shouldTrack || activeEffect === undefined) return;

  let depsMap = targetMap.get(target);
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()));
  }

  let dep = depsMap.get(key);
  if (!dep) {
    depsMap.set(key, (dep = createDep()));
  }

  trackEffect(dep);

  // 调试：触发 onTrack
  if (__DEV__ && activeEffect.onTrack) {
    activeEffect.onTrack({
      target,
      type: _type,
      key,
    });
  }
}

export function trackEffect(dep: Dep) {
  if (!shouldTrack || activeEffect === undefined) return;
  if (!dep.has(activeEffect)) {
    dep.add(activeEffect);
    activeEffect.deps.push(dep);
  }
}

export function trigger(
  target: object,
  type: string,
  key?: string | symbol,
  _newValue?: unknown,
  _oldValue?: unknown,
) {
  const depsMap = targetMap.get(target);
  if (!depsMap) return;

  const deps: (Dep | undefined)[] = [];

  if (type === 'clear') {
    deps.push(...depsMap.values());
  } else {
    if (key !== undefined) {
      deps.push(depsMap.get(key));
    }

    if (type === 'add') {
      if (Array.isArray(target)) {
        deps.push(depsMap.get('length'));
      } else {
        deps.push(depsMap.get(ITERATE_KEY));
      }
    } else if (type === 'delete') {
      if (!Array.isArray(target)) {
        deps.push(depsMap.get(ITERATE_KEY));
      }
    } else if (type === 'set') {
      if (Array.isArray(target) && isIntegerKey(key)) {
        deps.push(depsMap.get('length'));
      }
    }
  }

  const effects: ReactiveEffect[] = [];
  for (const dep of deps) {
    if (dep) {
      for (const effect of dep) {
        effects.push(effect);
      }
    }
  }

  // 去重：同一个 effect 可能同时存在于多个 dep 中
  triggerEffects([...new Set(effects)]);
}

export function triggerEffects(effects: ReactiveEffect[]) {
  if (triggerDepth > MAX_TRIGGER_DEPTH) {
    if (__DEV__) {
      warn('Maximum trigger depth exceeded. Possible infinite reactivity loop detected.');
      error(
        `Maximum trigger depth (${MAX_TRIGGER_DEPTH}) exceeded in triggerEffects. Possible infinite reactivity loop detected. triggerDepth=${triggerDepth}`,
      );
    }
    return;
  }
  triggerDepth++;
  try {
    for (const effect of effects) {
      if (effect.computed) {
        triggerEffect(effect);
      }
    }
    for (const effect of effects) {
      if (!effect.computed) {
        triggerEffect(effect);
      }
    }
  } finally {
    triggerDepth--;
  }
}

function triggerEffect(effect: ReactiveEffect) {
  if (effect !== activeEffect || effect.allowRecurse) {
    if (effect.scheduler) {
      effect.scheduler();
    } else {
      effect.run();
    }
  }
}

// ==================== ReactiveEffect ====================

export class ReactiveEffect<T = unknown> {
  active = true;
  deps: Dep[] = [];
  parent: ReactiveEffect | undefined = undefined;
  computed?: boolean;
  allowRecurse?: boolean;
  onStop?: () => void;
  onTrack?: (event: { target: object; key: string | symbol; type: string }) => void;
  onTrigger?: (event: {
    target: object;
    key: string | symbol;
    type: string;
    newValue?: unknown;
    oldValue?: unknown;
  }) => void;
  // 运行前清理（onEffectCleanup 注册的）
  _cleanups: Array<() => void> = [];

  constructor(
    public fn: () => T,
    public scheduler?: (...args: unknown[]) => unknown,
  ) {
    // 自动注册到当前活跃的 effectScope
    const scope = getActiveEffectScope();
    if (scope && scope.active) {
      scope.effects.push(this);
    }
  }

  run(): T | undefined {
    if (!this.active) {
      return undefined;
    }

    // 在重新执行前调用 cleanup
    if (this._cleanups.length > 0) {
      for (let i = 0; i < this._cleanups.length; i++) {
        this._cleanups[i]!();
      }
      this._cleanups.length = 0;
    }

    const prevShouldTrack = shouldTrack;
    try {
      this.parent = activeEffect;
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      activeEffect = this;
      shouldTrack = true;
      _trackDepth++;

      return this.fn();
    } finally {
      _trackDepth--;
      activeEffect = this.parent;
      shouldTrack = prevShouldTrack;
      this.parent = undefined;
    }
  }

  stop(): void {
    if (this.active) {
      cleanupEffect(this);
      if (this._cleanups.length > 0) {
        for (let i = 0; i < this._cleanups.length; i++) {
          this._cleanups[i]!();
        }
        this._cleanups.length = 0;
      }
      if (this.onStop) this.onStop();
      this.active = false;
    }
  }
}

function cleanupEffect(effect: ReactiveEffect) {
  const { deps } = effect;
  for (let i = 0; i < deps.length; i++) {
    deps[i]!.delete(effect);
  }
  deps.length = 0;
}

// ==================== 公共 API ====================

// Function overloads for effect()
// Non-lazy effect: fn returns void, preventing accidental return value usage
export function effect(
  fn: () => void,
  options?: {
    lazy?: false;
    scheduler?: (...args: unknown[]) => unknown;
    allowRecurse?: boolean;
    onStop?: () => void;
    onTrack?: (event: { target: object; key: string | symbol; type: string }) => void;
    onTrigger?: (event: {
      target: object;
      key: string | symbol;
      type: string;
      newValue?: unknown;
      oldValue?: unknown;
    }) => void;
  },
): ReactiveEffectRunner<void>;

// Lazy effect: preserves generic return value type (used by computed etc.)
export function effect<T>(
  fn: () => T,
  options: {
    lazy: true;
    scheduler?: (...args: unknown[]) => unknown;
    allowRecurse?: boolean;
    onStop?: () => void;
    onTrack?: (event: { target: object; key: string | symbol; type: string }) => void;
    onTrigger?: (event: {
      target: object;
      key: string | symbol;
      type: string;
      newValue?: unknown;
      oldValue?: unknown;
    }) => void;
  },
): ReactiveEffectRunner<T>;

// Unified implementation signature
export function effect<T = unknown>(
  fn: () => T,
  options?: {
    lazy?: boolean;
    scheduler?: (...args: unknown[]) => unknown;
    allowRecurse?: boolean;
    onStop?: () => void;
    onTrack?: (event: { target: object; key: string | symbol; type: string }) => void;
    onTrigger?: (event: {
      target: object;
      key: string | symbol;
      type: string;
      newValue?: unknown;
      oldValue?: unknown;
    }) => void;
  },
): ReactiveEffectRunner<T> {
  const _effect = new ReactiveEffect(fn);
  if (options) {
    // 仅提取已知合法选项，防止覆盖内部属性（如 fn、active）
    _effect.scheduler = options.scheduler;
    _effect.allowRecurse = options.allowRecurse;
    _effect.onStop = options.onStop;
    _effect.onTrack = options.onTrack;
    _effect.onTrigger = options.onTrigger;
  }
  if (!options || !options.lazy) {
    _effect.run();
  }
  const runner = _effect.run.bind(_effect) as ReactiveEffectRunner<T>;
  runner.effect = _effect;
  return runner;
}

export function stop(runner: ReactiveEffectRunner): void {
  runner.effect.stop();
}

export function pauseTracking(): void {
  trackStack.push(shouldTrack);
  shouldTrack = false;
}

export function enableTracking(): void {
  trackStack.push(shouldTrack);
  shouldTrack = true;
}

export function resetTracking(): void {
  const last = trackStack.pop();
  shouldTrack = last === undefined ? true : last;
}

export function batch(fn: () => void): void {
  const stackLength = trackStack.length;
  pauseTracking();
  try {
    fn();
  } finally {
    // 恢复到 batch 调用前的 stack 长度，确保嵌套安全
    while (trackStack.length > stackLength) {
      trackStack.pop();
    }
    shouldTrack = trackStack.length > 0 ? trackStack[trackStack.length - 1]! : true;
  }
}

/**
 * batchAsync - like batch but supports async functions.
 * Pauses tracking during fn execution (including after await),
 * and restores tracking state when fn completes (or throws).
 * Returns a Promise.
 */
export function batchAsync(fn: () => void | Promise<void>): Promise<void> {
  const stackLength = trackStack.length;
  pauseTracking();
  const restoreTracking = () => {
    while (trackStack.length > stackLength) {
      trackStack.pop();
    }
    shouldTrack = trackStack.length > 0 ? trackStack[trackStack.length - 1]! : true;
  };
  try {
    const result = fn();
    if (result && typeof result === 'object' && 'then' in result) {
      return (result as Promise<void>).finally(restoreTracking);
    }
    // 同步路径：立即恢复 tracking 状态
    restoreTracking();
    return Promise.resolve();
  } catch (e) {
    restoreTracking();
    return Promise.reject(e);
  }
}

/**
 * untrack - execute fn without tracking dependencies.
 * Semantically different from batch: untrack means "run but don't track".
 * Returns the return value of fn.
 */
export function untrack<T>(fn: () => T): T {
  const stackLength = trackStack.length;
  pauseTracking();
  try {
    return fn();
  } finally {
    while (trackStack.length > stackLength) {
      trackStack.pop();
    }
    shouldTrack = trackStack.length > 0 ? trackStack[trackStack.length - 1]! : true;
  }
}

export function onEffectCleanup(fn: () => void, failSilently = false): void {
  if (activeEffect === undefined) {
    if (!failSilently && __DEV__) {
      warn('onEffectCleanup() was called when there was no active effect to associate with.');
    }
    return;
  }
  activeEffect._cleanups.push(fn);
}

// ==================== 辅助 ====================

export function isIntegerKey(key: unknown): boolean {
  return (
    typeof key === 'string' &&
    key !== 'NaN' &&
    key[0] !== '-' &&
    '' + parseInt(key, 10) === key &&
    Number.isSafeInteger(Number(key))
  );
}
