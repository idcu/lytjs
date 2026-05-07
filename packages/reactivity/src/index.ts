// src/index.ts
// @lytjs/reactivity 主入口 - re-export 所有公共 API

export {
  // reactive
  reactive,
  shallowReactive,
  readonly,
  shallowReadonly,
  isReactive,
  isReadonly,
  isProxy,
  toRaw,
  markRaw,
} from './reactive';

export {
  // ref
  ref,
  shallowRef,
  triggerRef,
  isRef,
  unref,
  toRef,
  toRefs,
  toValue,
  customRef,
} from './ref';

export {
  // computed
  computed,
  setSSRMode,
} from './computed';

// scope and async sub-path entries are available at:
//   @lytjs/reactivity/scope   - effectScope, getCurrentScope, onScopeDispose
//   @lytjs/reactivity/async   - asyncComputed, useAsyncState

export {
  // watch
  watch,
  watchEffect,
  watchPostEffect,
  watchSyncEffect,
} from './watch';

export {
  // effect
  effect,
  stop,
  pauseTracking,
  enableTracking,
  resetTracking,
  batch,
  batchAsync,
  untrack,
  onEffectCleanup,
  // 首次渲染优化
  withFirstRenderOptimization,
  shouldSkipTracking,
  getSkippedTrackingCount,
  resetSkippedTrackingCount,
} from './effect';

// FIX: P2-4 批量操作 API
export {
  batchScope,
  batchScopeAsync,
  batchScopeUntrack,
  getBatchScopeDepth,
  getCurrentBatchScopeStack,
  isInBatchScope,
  flushBatchScopes,
} from './batch';

export type {
  BatchScopeOptions,
  BatchScopeContext,
  BatchScopeCallback,
} from './batch';

export {
  // signal
  signal,
  computed as signalComputed,
  computedSignal,
  writableComputedSignal,
  readonlySignal,
  set,
  update,
  valueOf,
  // signal batch/untrack
  signalBatch,
  signalUntrack,
} from './signal';

export type {
  Ref,
  ShallowRef,
  ComputedRef,
  WritableComputedRef,
  ReactiveEffectRunner,
  /** 响应式信号类型，表示一个可读的响应式值 */
  Signal,
  /** 计算信号类型，表示一个只读的计算响应式值 */
  ComputedSignal,
  /** 可写计算信号类型，表示一个可读写的计算响应式值 */
  WritableComputedSignal,
  /** 可写信号类型，表示一个可读写的响应式值 */
  WritableSignal,
  /** 只读信号类型 */
  ReadonlySignal,
  /** 订阅者回调类型 */
  Subscriber,
  WatchOptions,
  WatchEffectOptions,
  WatchSource,
  WatchCallback,
  WatchHandle,
  ComputedGetter,
  ComputedSetter,
  WritableComputedOptions,
  ReactiveEffectOptions,
  DebuggerEvent,
  UnwrapRef,
  UnwrapNestedRefs,
  DeepReadonly,
  ToRefs,
  ReactiveObject,
} from './types';

export {
  RefSymbol,
  ShallowRefSymbol,
  ComputedRefSymbol,
  ReactiveSymbol,
  ReadonlySymbol,
} from './constants';

// ============================================================
// FIX: P2-3 调试工具支持 - DevTools 集成
// ============================================================

/** DevTools 信号依赖信息 */
export interface DevToolsSignalInfo {
  id: string;
  name: string;
  value: unknown;
  dependencies: string[];
  dependents: string[];
}

/** DevTools effect 信息 */
export interface DevToolsEffectInfo {
  id: string;
  name: string;
  active: boolean;
  dependencies: string[];
}

/** LytJS DevTools 全局对象接口 */
export interface LytJSDevTools {
  /** 版本号 */
  version: string;
  /** 获取所有信号信息 */
  getSignals: () => DevToolsSignalInfo[];
  /** 获取所有 effect 信息 */
  getEffects: () => DevToolsEffectInfo[];
  /** 监听信号变化 */
  onSignalChange: (callback: (signalId: string, value: unknown) => void) => () => void;
  /** 监听 effect 执行 */
  onEffectRun: (callback: (effectId: string) => void) => () => void;
  /** 启用/禁用调试 */
  setEnabled: (enabled: boolean) => void;
  /** 当前是否启用 */
  isEnabled: () => boolean;
}

/** 调试工具全局对象 */
declare global {
  interface Window {
    __LYTJS_DEVTOOLS__?: LytJSDevTools;
  }
}

/** 信号变化监听器集合 */
const signalChangeListeners = new Set<(signalId: string, value: unknown) => void>();
/** effect 执行监听器集合 */
const effectRunListeners = new Set<(effectId: string) => void>();
/** 调试工具启用状态 */
let devToolsEnabled = false;

// FIX: P2-4 DevTools 通知批处理：使用 microtask 合并高频通知，
// 避免在短时间内大量信号变化时逐个触发监听器导致性能问题
let pendingSignalNotifications: Array<{ signalId: string; value: unknown }> | null = null;
let pendingEffectNotifications: Array<string> | null = null;
let devToolsFlushScheduled = false;

function scheduleDevToolsFlush(): void {
  if (devToolsFlushScheduled) return;
  devToolsFlushScheduled = true;
  queueMicrotask(flushDevToolsNotifications);
}

function flushDevToolsNotifications(): void {
  devToolsFlushScheduled = false;
  const signals = pendingSignalNotifications;
  const effects = pendingEffectNotifications;
  pendingSignalNotifications = null;
  pendingEffectNotifications = null;

  if (signals) {
    // 使用 Map 去重，同一 signalId 只保留最后一次值
    const deduplicated = new Map<string, unknown>();
    for (const { signalId, value } of signals) {
      deduplicated.set(signalId, value);
    }
    signalChangeListeners.forEach(cb => {
      try {
        for (const [signalId, value] of deduplicated) {
          cb(signalId, value);
        }
      } catch (_e) {
        // 忽略监听器错误
      }
    });
  }

  if (effects) {
    // 使用 Set 去重
    const deduplicated = new Set(effects);
    effectRunListeners.forEach(cb => {
      try {
        for (const effectId of deduplicated) {
          cb(effectId);
        }
      } catch (_e) {
        // 忽略监听器错误
      }
    });
  }
}

/**
 * 初始化 LytJS DevTools 全局对象
 * 在开发环境下自动挂载到 window.__LYTJS_DEVTOOLS__
 */
function initDevTools(): void {
  if (typeof window === 'undefined') return;
  
  const devTools: LytJSDevTools = {
    version: '0.9.9',
    getSignals: () => {
      // 返回信号信息（由具体实现填充）
      return [];
    },
    getEffects: () => {
      // 返回 effect 信息（由具体实现填充）
      return [];
    },
    onSignalChange: (callback) => {
      signalChangeListeners.add(callback);
      return () => signalChangeListeners.delete(callback);
    },
    onEffectRun: (callback) => {
      effectRunListeners.add(callback);
      return () => effectRunListeners.delete(callback);
    },
    setEnabled: (enabled) => {
      devToolsEnabled = enabled;
    },
    isEnabled: () => devToolsEnabled,
  };

  window.__LYTJS_DEVTOOLS__ = devTools;
}

/**
 * 通知 DevTools 信号变化
 * @internal
 * FIX: P2-4 使用批处理合并高频通知，减少监听器调用次数
 */
export function _notifyDevToolsSignalChange(signalId: string, value: unknown): void {
  if (!devToolsEnabled) return;
  if (!pendingSignalNotifications) {
    pendingSignalNotifications = [];
  }
  pendingSignalNotifications.push({ signalId, value });
  scheduleDevToolsFlush();
}

/**
 * 通知 DevTools effect 执行
 * @internal
 * FIX: P2-4 使用批处理合并高频通知，减少监听器调用次数
 */
export function _notifyDevToolsEffectRun(effectId: string): void {
  if (!devToolsEnabled) return;
  if (!pendingEffectNotifications) {
    pendingEffectNotifications = [];
  }
  pendingEffectNotifications.push(effectId);
  scheduleDevToolsFlush();
}

// 在开发环境下自动初始化
if (typeof __DEV__ !== 'undefined' && __DEV__) {
  initDevTools();
}
