// src/watch.ts
// 侦听器
// 复用 @lytjs/common-is: isFunction, isObject, isArray, hasChanged, NOOP
// 复用 @lytjs/common-scheduler: nextTick, queuePreFlushCb, queuePostFlushCb

import {
  isFunction,
  isObject,
  isArray,
  hasChanged,
  NOOP,
} from "@lytjs/common-is";
import { warn, error } from "@lytjs/common-error";
import { isRef } from "./ref";
import { isReactive } from "./reactive";
import { ReactiveEffect } from "./effect";
import { queuePreFlushCb, queuePostFlushCb } from "@lytjs/common-scheduler";
import type {
  WatchSource,
  WatchCallback,
  WatchOptions,
  WatchEffectOptions,
  WatchHandle,
  OnCleanup,
} from "./types";

// ==================== 数据源规范化 ====================

function getSource(source: WatchSource<unknown>): () => unknown {
  if (isRef(source)) return () => source.value;
  if (isReactive(source as object)) return () => traverse(source);
  if (typeof source === "function") return source as () => unknown;
  if (__DEV__) {
    warn(
      `Invalid watch source: ${JSON.stringify(source)}. A watch source must be a ref, reactive object, or getter function.`,
    );
  }
  return NOOP;
}

// seen 参数改为可选，允许外部传入已有 Set 以实现复用
const MAX_TRAVERSE_DEPTH = 100;

function traverse(value: unknown, seen?: Set<unknown>, depth = 0): unknown {
  const _seen = seen ?? new Set();
  if (!isObject(value) || _seen.has(value)) return value;
  if (depth > MAX_TRAVERSE_DEPTH) {
    if (__DEV__) {
      warn(`traverse exceeded maximum depth (${MAX_TRAVERSE_DEPTH}).`);
    }
    return value;
  }
  _seen.add(value);
  if (isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      traverse(value[i], _seen, depth + 1);
    }
  } else if (value instanceof Map) {
    value.forEach((_, key) => {
      traverse(value.get(key), _seen, depth + 1);
    });
  } else if (value instanceof Set) {
    value.forEach((v) => traverse(v, _seen, depth + 1));
  } else {
    for (const key of Object.keys(value as object)) {
      traverse((value as Record<string, unknown>)[key], _seen, depth + 1);
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

  let getter: () => unknown;
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

  let oldValue: unknown = isMultiSource
    ? new Array((source as WatchSource<T>[]).length).fill(undefined)
    : undefined;

  const cleanupFns: Array<() => void> = [];
  let isStopped = false;

  const onCleanup: OnCleanup = (fn: () => void) => {
    cleanupFns.push(fn);
  };

  const job: () => void = () => {
    if (!watcher.active || isStopped) return;
    if (cb) {
      let newValue: unknown;
      try {
        newValue = watcher.run();
      } catch (e) {
        error(`Error in watch getter: ${e}`);
        throw e;
      }
      if (
        deep ||
        forceTrigger ||
        (isMultiSource
          ? (newValue as unknown[]).some((v, i) =>
              hasChanged(v, (oldValue as unknown[])[i]),
            )
          : hasChanged(newValue, oldValue))
      ) {
        if (cleanupFns.length > 0) {
          cleanupFns.forEach((f) => f());
          cleanupFns.length = 0;
        }
        cb(newValue as T, oldValue as T, onCleanup);
        oldValue = newValue;
        if (once) {
          isStopped = true;
          watcher.stop();
        }
      }
    } else {
      try {
        watcher.run();
      } catch (e) {
        error(`Error in watch effect run: ${e}`);
        throw e;
      }
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
    ? (...args: unknown[]) => rawScheduler(job, ...args)
    : rawScheduler;

  const watcher = new ReactiveEffect(
    getter,
    scheduler as (...args: unknown[]) => unknown,
  );

  watcher.onStop = () => {
    if (cleanupFns.length > 0) {
      for (let i = cleanupFns.length - 1; i >= 0; i--) {
        cleanupFns[i]!();
      }
      cleanupFns.length = 0;
    }
  };

  if (__DEV__) {
    watcher.onTrack = onTrack as typeof watcher.onTrack;
    watcher.onTrigger = onTrigger as typeof watcher.onTrigger;
  }

  if (immediate) {
    job();
  } else {
    oldValue = watcher.run();
  }

  return () => {
    isStopped = true;
    watcher.stop();
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

  const cleanupFns: Array<() => void> = [];

  const onCleanup: OnCleanup = (fn: () => void) => {
    cleanupFns.push(fn);
  };

  const getter = () => {
    if (cleanupFns.length > 0) {
      cleanupFns.forEach((f) => f());
      cleanupFns.length = 0;
    }
    source(onCleanup);
  };

  const schedulerFn: (...args: unknown[]) => unknown =
    flush === "sync"
      ? () => currentEffect.run()
      : () => {
          if (flush === "post") {
            queuePostFlushCb(() => currentEffect.run());
          } else {
            queuePreFlushCb(() => currentEffect.run());
          }
        };

  const currentEffect: ReactiveEffect = new ReactiveEffect(getter, schedulerFn);

  currentEffect.onStop = () => {
    if (cleanupFns.length > 0) {
      for (let i = cleanupFns.length - 1; i >= 0; i--) {
        cleanupFns[i]!();
      }
      cleanupFns.length = 0;
    }
  };

  if (__DEV__) {
    currentEffect.onTrack = onTrack as typeof currentEffect.onTrack;
    currentEffect.onTrigger = onTrigger as typeof currentEffect.onTrigger;
  }

  currentEffect.run();

  return () => currentEffect.stop();
}
