// src/effect.ts
// 响应式副作用系统核心

import { ITERATE_KEY } from './constants';
import type { ReactiveEffectRunner } from './types';
import { warn, error } from '@lytjs/common-error';
import { _isSignalUntracked } from './signal';
import { getActiveEffectScope } from './effect-scope';
import { REACTIVITY_MAX_TRIGGER_DEPTH } from '@lytjs/common-constants';

// ==================== 全局状态 ====================

let activeEffect: ReactiveEffect | undefined;
let _trackDepth = 0;
const targetMap = new WeakMap<object, Map<string | symbol, Dep>>();
let shouldTrack = true;
const trackStack: boolean[] = [];

// ==================== 首次渲染优化 ====================

/** 标记当前是否处于首次渲染优化期间 */
let isFirstRenderPass = false;

/** 记录被跳过的追踪次数（用于调试和测试验证） */
let skippedTrackingCount = 0;

/**
 * 包裹首次渲染过程，期间禁用响应式依赖收集。
 * 支持嵌套调用：如果外层已经处于首次渲染优化期间，
 * 内层调用不会提前重置标志位。
 */
export function withFirstRenderOptimization<T>(fn: () => T): T {
  const wasFirstRender = isFirstRenderPass;
  isFirstRenderPass = true;
  try {
    return fn();
  } finally {
    if (!wasFirstRender) {
      isFirstRenderPass = false;
    }
  }
}

/**
 * 检查当前是否应跳过响应式依赖收集。
 * 在 withFirstRenderOptimization 执行期间返回 true。
 */
export function shouldSkipTracking(): boolean {
  return isFirstRenderPass;
}

/**
 * 获取被跳过的追踪次数（用于调试和测试）。
 */
export function getSkippedTrackingCount(): number {
  return skippedTrackingCount;
}

/**
 * 重置被跳过的追踪计数（用于测试）。
 */
export function resetSkippedTrackingCount(): void {
  skippedTrackingCount = 0;
}

// 只读访问器，防止外部修改内部状态
export function getActiveEffect(): ReactiveEffect | undefined {
  return activeEffect;
}
export function getShouldTrack(): boolean {
  return shouldTrack;
}

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
let triggerDepth = 0;

/**
 * Maximum depth for nested trigger() calls to prevent infinite reactivity loops.
 * When triggerDepth exceeds this limit, further triggers are silently dropped
 * and a warning is emitted in DEV mode.
 */
let triggerDepth = 0;

export function track(target: object, _type: string, key: string | symbol) {
  if (!shouldTrack || activeEffect === undefined) return;
  // signal untrack 桥接：signalUntrack 期间跳过 effect 系统的依赖收集
  if (_isSignalUntracked()) return;

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
  // 首次渲染优化：跳过依赖收集
  if (shouldSkipTracking()) {
    skippedTrackingCount++;
    return;
  }
  // FIX: P1-01 移除重复的 shouldTrack/activeEffect 检查，
  // 这些检查已在调用方 track() 中完成，此处只需关注 dep 操作
  // FIX: P0-5 添加防御性检查，避免非空断言在公共 API 调用时不安全
  if (activeEffect && !dep.has(activeEffect)) {
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
  if (triggerDepth > REACTIVITY_MAX_TRIGGER_DEPTH) {
    // FIX: P2-1 triggerDepth 超限时改为 warn + 静默丢弃，与 Vue 3 行为一致。
    // 之前直接 throw Error 过于激进，会导致整个响应式链断裂。
    // 改为仅发出警告并丢弃后续 trigger，避免因单个无限循环导致整个应用崩溃。
    if (__DEV__) {
      warn(
        `[lytjs/reactivity] Maximum trigger depth (${REACTIVITY_MAX_TRIGGER_DEPTH}) exceeded. ` +
        `Possible infinite reactivity loop detected. Further triggers are silently dropped. ` +
        `triggerDepth=${triggerDepth}`,
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
