// src/watch.ts
// 侦听器
// 复用 @lytjs/common-is: isFunction, isObject, isArray, hasChanged, NOOP
// 复用 @lytjs/common-scheduler: nextTick

import {
  isFunction,
  isObject,
  isArray,
  hasChanged,
  NOOP,
} from "@lytjs/common-is";
import { isRef } from "./ref";
import { isReactive } from "./reactive";
import { ReactiveEffect } from "./effect";
import { nextTick } from "@lytjs/common-scheduler";
import type {
  WatchSource,
  WatchCallback,
  WatchOptions,
  WatchEffectOptions,
  WatchHandle,
  OnCleanup,
} from "./types";

// ==================== Scheduler 队列 ====================

let flushIndex = 0;
const pendingPreFlushCbs: (Function | undefined)[] = [];
const pendingPostFlushCbs: (Function | undefined)[] = [];
const queuedPreCbs = new Set<Function>();
const queuedPostCbs = new Set<Function>();

function queuePreFlushCb(cb: Function) {
  queueCb(cb, pendingPreFlushCbs);
}

function queuePostFlushCb(cb: Function) {
  queueCb(cb, pendingPostFlushCbs);
}

function queueCb(cb: Function, queue: (Function | undefined)[]) {
  const queuedSet = queue === pendingPreFlushCbs ? queuedPreCbs : queuedPostCbs;
  if (!queuedSet.has(cb)) {
    queuedSet.add(cb);
    queue.push(cb);
    queueFlush();
  }
}

function queueFlush() {
  if (!isFlushing && !isFlushPending) {
    isFlushPending = true;
    nextTick(flushJobs);
  }
}

let isFlushing = false;
let isFlushPending = false;

function flushJobs() {
  isFlushing = true;
  isFlushPending = false;

  let iterations = 0;
  const MAX_ITERATIONS = 100;

  // 循环处理：执行期间新增的回调也会被处理
  while (
    (pendingPreFlushCbs.length > 0 || pendingPostFlushCbs.length > 0) &&
    iterations < MAX_ITERATIONS
  ) {
    iterations++;

    // 执行 pre 队列
    flushIndex = 0;
    const preLen = pendingPreFlushCbs.length;
    for (flushIndex = 0; flushIndex < preLen; flushIndex++) {
      const cb = pendingPreFlushCbs[flushIndex];
      if (cb) {
        pendingPreFlushCbs[flushIndex] = undefined;
        cb();
      }
    }
    pendingPreFlushCbs.length = 0;
    queuedPreCbs.clear();

    // 执行 post 队列
    flushIndex = 0;
    const postLen = pendingPostFlushCbs.length;
    for (flushIndex = 0; flushIndex < postLen; flushIndex++) {
      const cb = pendingPostFlushCbs[flushIndex];
      if (cb) {
        pendingPostFlushCbs[flushIndex] = undefined;
        cb();
      }
    }
    pendingPostFlushCbs.length = 0;
    queuedPostCbs.clear();
  }

  if (iterations >= MAX_ITERATIONS) {
    const msg =
      `[lytjs/reactivity] flushJobs exceeded ${MAX_ITERATIONS} iterations. ` +
      `Possible infinite update loop detected.`;
    if (__DEV__) {
      console.warn(msg);
    } else {
      console.error(msg);
    }
  }

  isFlushing = false;
}

// ==================== 数据源规范化 ====================

function getSource(source: WatchSource<unknown>): () => unknown {
  if (isRef(source)) return () => source.value;
  if (isReactive(source)) return () => traverse(source);
  if (isFunction(source)) return source;
  return NOOP;
}

function traverse(value: unknown, seen: Set<unknown> = new Set()): unknown {
  if (!isObject(value) || seen.has(value)) return value;
  seen.add(value);
  if (isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      traverse(value[i], seen);
    }
  } else if (value instanceof Map) {
    value.forEach((_, key) => {
      traverse(value.get(key), seen);
    });
  } else if (value instanceof Set) {
    value.forEach((v) => traverse(v, seen));
  } else {
    for (const key of Object.keys(value as object)) {
      traverse((value as any)[key], seen);
    }
  }
  return value;
}

// ==================== Watch 实现 ====================

export function watch<T, Immediate extends Readonly<boolean> = false>(
  source: WatchSource<T> | WatchSource<T>[],
  cb: WatchCallback<T>,
  options?: WatchOptions<Immediate>,
): WatchHandle {
  const {
    immediate,
    deep,
    flush = "pre",
    once,
    onTrack,
    onTrigger,
    scheduler: userScheduler,
  } = options || {};

  let getter: () => any;
  let forceTrigger = false;
  let isMultiSource = false;

  if (isArray(source)) {
    isMultiSource = true;
    forceTrigger = source.some((s) => isReactive(s));
    getter = () =>
      source.map((s) => {
        if (isRef(s)) return s.value;
        if (isReactive(s)) return traverse(s);
        if (isFunction(s)) return s();
        return undefined;
      });
  } else {
    getter = getSource(source as WatchSource<T>);
  }

  if (deep) {
    const baseGetter = getter;
    getter = () => traverse(baseGetter());
  }

  let oldValue: any = isMultiSource
    ? new Array((source as WatchSource<T>[]).length).fill(undefined)
    : undefined;

  let cleanup: (() => void) | undefined;
  let isStopped = false;

  const onCleanup: OnCleanup = (fn: () => void) => {
    cleanup = effect.onStop = () => {
      fn();
    };
  };

  const job: () => void = () => {
    if (!effect.active || isStopped) return;
    if (cb) {
      const newValue = effect.run();
      if (
        deep ||
        forceTrigger ||
        (isMultiSource
          ? (newValue as any[]).some((v, i) =>
              hasChanged(v, (oldValue as any[])[i]),
            )
          : hasChanged(newValue, oldValue))
      ) {
        if (cleanup) cleanup();
        const args = isMultiSource
          ? ([newValue, oldValue] as [any, any])
          : ([newValue, oldValue] as [any, any]);
        cb(...args, onCleanup);
        oldValue = newValue;
        if (once) {
          isStopped = true;
          effect.stop();
        }
      }
    } else {
      effect.run();
    }
  };

  const rawScheduler =
    userScheduler ||
    (flush === "sync"
      ? job
      : () => {
          if (flush === "post") {
            queuePostFlushCb(job);
          } else {
            queuePreFlushCb(job);
          }
        });

  // 包装 scheduler，确保传 job 参数给用户自定义 scheduler
  const scheduler = userScheduler
    ? (...args: any[]) => rawScheduler(job, ...args)
    : rawScheduler;

  const effect = new ReactiveEffect(getter, scheduler as any);

  if (__DEV__) {
    effect.onTrack = onTrack;
    effect.onTrigger = onTrigger;
  }

  if (immediate) {
    job();
  } else {
    oldValue = effect.run();
  }

  return () => {
    isStopped = true;
    effect.stop();
  };
}

// ==================== WatchEffect 实现 ====================

export function watchEffect(
  effectFn: (onCleanup: OnCleanup) => void,
  options?: WatchEffectOptions,
): WatchHandle {
  return doWatchEffect(effectFn, options);
}

export function watchPostEffect(
  effectFn: (onCleanup: OnCleanup) => void,
  options?: WatchEffectOptions,
): WatchHandle {
  return doWatchEffect(effectFn, { ...options, flush: "post" });
}

export function watchSyncEffect(
  effectFn: (onCleanup: OnCleanup) => void,
  options?: WatchEffectOptions,
): WatchHandle {
  return doWatchEffect(effectFn, { ...options, flush: "sync" });
}

function doWatchEffect(
  source: (onCleanup: OnCleanup) => void,
  options: WatchEffectOptions = {},
): WatchHandle {
  const { flush = "pre", onTrack, onTrigger } = options;

  let cleanup: (() => void) | undefined;

  const onCleanup: OnCleanup = (fn: () => void) => {
    cleanup = currentEffect.onStop = () => {
      fn();
    };
  };

  const getter = () => {
    if (cleanup) cleanup();
    source(onCleanup);
  };

  let currentEffect: ReactiveEffect;

  const schedulerFn: (...args: any[]) => any =
    flush === "sync"
      ? () => currentEffect.run()
      : () => {
          if (flush === "post") {
            queuePostFlushCb(() => currentEffect.run());
          } else {
            queuePreFlushCb(() => currentEffect.run());
          }
        };

  currentEffect = new ReactiveEffect(getter, schedulerFn);

  if (__DEV__) {
    currentEffect.onTrack = onTrack;
    currentEffect.onTrigger = onTrigger;
  }

  currentEffect.run();

  return () => currentEffect.stop();
}
