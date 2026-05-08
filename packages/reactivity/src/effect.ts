// src/effect.ts
// 响应式副作用系统核心

import { ITERATE_KEY } from './constants';
import type { ReactiveEffectRunner } from './types';
import { warn } from '@lytjs/common-error';
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

/**
 * 获取当前活跃的 ReactiveEffect 实例。
 * 在 effect 执行期间返回当前正在运行的 effect，否则返回 undefined。
 *
 * @returns 当前活跃的 effect，如果没有则返回 undefined
 */
export function getActiveEffect(): ReactiveEffect | undefined {
  return activeEffect;
}

/**
 * 获取当前是否应该进行依赖追踪。
 * 可通过 pauseTracking/enableTracking 控制。
 *
 * @returns 是否应该进行依赖追踪
 */
export function getShouldTrack(): boolean {
  return shouldTrack;
}

// ==================== Dep ====================

/**
 * 依赖集合类型，存储订阅某个响应式属性的所有 ReactiveEffect。
 */
export type Dep = Set<ReactiveEffect>;

/**
 * 创建一个新的 Dep（依赖集合）。
 *
 * @returns 新的空 Dep 实例
 */
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
 * 追踪响应式属性的依赖关系。
 * 当响应式属性被读取时调用，将当前活跃的 effect 记录为该属性的依赖。
 *
 * @param target - 被追踪的响应式对象
 * @param _type - 追踪操作类型（如 'get'、'has'、'iterate'）
 * @param key - 被追踪的属性键
 */
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

/**
 * 将当前活跃的 effect 添加到指定的依赖集合中。
 * 在首次渲染优化期间会跳过依赖收集。
 *
 * @param dep - 目标依赖集合
 */
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

/**
 * 触发响应式属性的依赖更新。
 * 当响应式属性被修改时调用，通知所有依赖该属性的 effect 重新执行。
 *
 * 根据操作类型（add/delete/set/clear）会触发不同的依赖集合：
 * - `add`：触发属性本身 + ITERATE_KEY（或数组 length）
 * - `delete`：触发属性本身 + ITERATE_KEY
 * - `set`：触发属性本身 + 数组 length（如果是整数键）
 * - `clear`：触发所有属性的依赖
 *
 * @param target - 被修改的响应式对象
 * @param type - 触发操作类型（'set' | 'add' | 'delete' | 'clear'）
 * @param key - 被修改的属性键
 * @param _newValue - 新值（可选，用于调试）
 * @param _oldValue - 旧值（可选，用于调试）
 */
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

/**
 * 执行一组 effect 的触发。
 * 优先执行 computed effect，再执行普通 effect。
 * 内置递归深度限制，超过最大深度时静默丢弃并发出警告。
 *
 * @param effects - 需要触发的 ReactiveEffect 数组
 */
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

/**
 * 响应式副作用类。
 * 封装一个副作用函数，支持依赖自动收集、调度执行和手动停止。
 *
 * 创建时会自动注册到当前活跃的 effectScope 中。
 *
 * @typeParam T - 副作用函数的返回值类型
 *
 * @example
 * ```ts
 * const eff = new ReactiveEffect(() => {
 *   console.log(state.count);
 * });
 * eff.run(); // 执行副作用，同时收集依赖
 * eff.stop(); // 停止副作用，清理所有依赖
 * ```
 */
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

/**
 * 创建一个响应式副作用并立即执行。
 *
 * 副作用函数会在执行期间自动追踪所使用的响应式属性，
 * 当这些属性发生变化时，副作用会重新执行。
 *
 * @param fn - 副作用函数，返回 void
 * @param options - 配置选项
 * @param options.lazy - 是否延迟执行（false 时立即执行）
 * @param options.scheduler - 自定义调度器，替代默认的立即执行行为
 * @param options.allowRecurse - 是否允许副作用递归触发自身
 * @param options.onStop - 副作用停止时的回调
 * @param options.onTrack - 依赖被追踪时的调试回调
 * @param options.onTrigger - 依赖被触发时的调试回调
 * @returns 副作用运行器，可调用 run() 手动执行或 stop() 停止
 */
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

// 统一实现签名
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

/**
 * 停止一个响应式副作用。
 * 清理所有依赖关系，并调用 onStop 回调。
 *
 * @param runner - 由 effect() 返回的副作用运行器
 */
export function stop(runner: ReactiveEffectRunner): void {
  runner.effect.stop();
}

/**
 * 暂停依赖追踪。
 * 调用后，响应式属性的读取不会建立依赖关系。
 * 可通过 resetTracking() 恢复。
 */
export function pauseTracking(): void {
  trackStack.push(shouldTrack);
  shouldTrack = false;
}

/**
 * 启用依赖追踪。
 * 将当前追踪状态压入栈中并设为 true。
 * 可通过 resetTracking() 恢复到之前的状态。
 */
export function enableTracking(): void {
  trackStack.push(shouldTrack);
  shouldTrack = true;
}

/**
 * 重置依赖追踪状态到上一次暂停/启用之前的状态。
 * 从追踪栈中弹出最近的状态并恢复。
 */
export function resetTracking(): void {
  const last = trackStack.pop();
  shouldTrack = last === undefined ? true : last;
}

/**
 * 批量执行函数，期间暂停依赖追踪。
 * 与 signalBatch 不同，batch 侧重于暂停追踪而非延迟通知。
 * 支持嵌套调用，内层 batch 不会提前恢复追踪状态。
 *
 * @param fn - 需要批量执行的函数
 *
 * @example
 * ```ts
 * batch(() => {
 *   state.a = 1; // 不会触发依赖更新
 *   state.b = 2; // 不会触发依赖更新
 * }); // 函数结束后恢复追踪
 * ```
 */
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

/**
 * 在当前活跃的 effect 上注册一个清理回调。
 * 该回调会在 effect 重新执行前或停止时被调用，用于清理副作用资源。
 *
 * @param fn - 清理回调函数
 * @param failSilently - 当没有活跃 effect 时是否静默失败（默认 false，开发模式下会发出警告）
 *
 * @example
 * ```ts
 * effect(() => {
 *   const timer = setInterval(() => console.log('tick'), 1000);
 *   onEffectCleanup(() => clearInterval(timer));
 * });
 * ```
 */
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

/**
 * 检查给定的键是否为有效的整数键。
 * 用于判断数组索引是否为合法的整数值。
 *
 * @param key - 需要检查的键值
 * @returns 如果是有效的整数键返回 true，否则返回 false
 */
export function isIntegerKey(key: unknown): boolean {
  return (
    typeof key === 'string' &&
    key !== 'NaN' &&
    key[0] !== '-' &&
    '' + parseInt(key, 10) === key &&
    Number.isSafeInteger(Number(key))
  );
}
