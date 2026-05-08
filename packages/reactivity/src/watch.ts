// src/watch.ts
// 侦听器
// 复用 @lytjs/common-is: isFunction, isObject, isArray, hasChanged, NOOP
// 复用 @lytjs/common-scheduler: nextTick, queuePreFlushCb, queuePostFlushCb

import { isFunction, isObject, isArray, hasChanged, NOOP } from '@lytjs/common-is';
import { warn, error } from '@lytjs/common-error';
import { isRef } from './ref';
import { isReactive } from './reactive';
import { ReactiveEffect } from './effect';
import { queuePreFlushCb, queuePostFlushCb } from '@lytjs/common-scheduler';
import type {
  WatchSource,
  WatchCallbackWithImmediate,
  WatchOptions,
  WatchEffectOptions,
  WatchHandle,
  OnCleanup,
} from './types';
import type { Ref } from './ref';

// ==================== 数据源规范化 ====================

function getSource(source: WatchSource<unknown>): () => unknown {
  // FIX: P2-34 使用类型守卫替代类型断言
  // FIX: DTS build error - isRef 返回 RefLike，需要类型断言为 Ref
  if (isRef(source)) return () => (source as Ref<unknown>).value;
  // FIX: P2-35 添加类型守卫确保 source 是对象后再检查 isReactive
  if (isObject(source) && isReactive(source)) return () => traverse(source);
  if (typeof source === 'function') return source as () => unknown;
  // FIX: P2-4 DEV 模式下对无效 source 抛出错误，而非静默返回 NOOP
  if (__DEV__) {
    throw new Error(
      `Invalid watch source: ${JSON.stringify(source)}. A watch source must be a ref, reactive object, or getter function.`,
    );
  }
  return NOOP;
}

// seen 参数改为可选，允许外部传入已有 Set 以实现复用
const MAX_TRAVERSE_DEPTH = 100;

/**
 * 深度遍历响应式对象的所有属性以触发依赖收集。
 * 使用迭代实现（栈代替递归），避免深层对象导致的栈溢出。
 */
function traverse(value: unknown, seen?: Set<unknown>, depth = 0): unknown {
  const _seen = seen ?? new Set();
  if (!isObject(value) || _seen.has(value)) return value;

  // 使用显式栈进行迭代遍历，避免递归栈溢出
  const stack: Array<{ value: unknown; depth: number }> = [{ value, depth }];

  while (stack.length > 0) {
    const current = stack.pop()!;
    const { value: val, depth: d } = current;

    if (!isObject(val) || _seen.has(val)) continue;
    if (d > MAX_TRAVERSE_DEPTH) {
      if (__DEV__) {
        warn(`traverse exceeded maximum depth (${MAX_TRAVERSE_DEPTH}).`);
      }
      continue;
    }
    _seen.add(val);

    if (isArray(val)) {
      // 反向压栈以保持原始顺序
      for (let i = val.length - 1; i >= 0; i--) {
        stack.push({ value: val[i]!, depth: d + 1 });
      }
    } else if (val instanceof Map) {
      val.forEach((v, key) => {
        stack.push({ value: v, depth: d + 1 });
        // 如果 key 是对象，也遍历它
        if (isObject(key)) {
          stack.push({ value: key, depth: d + 1 });
        }
      });
    } else if (val instanceof Set) {
      val.forEach((v) => {
        stack.push({ value: v, depth: d + 1 });
      });
    } else {
      const keys = Object.keys(val as object);
      for (let i = keys.length - 1; i >= 0; i--) {
        stack.push({
          value: (val as Record<string, unknown>)[keys[i]!]!,
          depth: d + 1,
        });
      }
    }
  }

  return value;
}

// ==================== Watch 实现 ====================

/**
 * 侦听一个或多个响应式数据源，并在数据变化时执行回调。
 *
 * @param source - 要侦听的数据源，可以是 ref、reactive 对象、getter 函数，或它们的数组
 * @param cb - 数据变化时的回调函数
 * @param options - 侦听选项
 * @returns 停止侦听的句柄函数
 *
 * @remarks
 * 关于 scheduler 参数签名：
 * watch 的 scheduler 与 ReactiveEffect 的 scheduler 参数签名不同。
 * - ReactiveEffect.scheduler: () => void（无参数，由 effect 系统内部调用）
 * - watch scheduler: (job: () => void, ...args: unknown[]) => unknown
 *   其中 job 是 watch 内部封装的变更检测+回调执行函数。
 *   当用户提供 scheduler 时，watch 会将 job 作为第一个参数传入，
 *   用户可以在 scheduler 中决定何时执行 job（如节流、防抖等）。
 */
export function watch<T, Immediate extends Readonly<boolean> = false>(
  source: WatchSource<T> | WatchSource<T>[],
  cb: WatchCallbackWithImmediate<T, Immediate>,
  options?: WatchOptions<Immediate>,
): WatchHandle {
  const {
    immediate,
    deep,
    flush = 'pre',
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
    // FIX: P1-04 完善 forceTrigger 逻辑：当多源中存在 reactive 对象时，
    // 即使 deep 为 false 也需要强制触发回调，因为 reactive 对象的属性变化
    // 不会改变对象引用本身，hasChanged 检测不到变化
    // FIX: P2-35 添加类型守卫确保 s 是对象后再检查 isReactive
    forceTrigger = source.some((s) => isObject(s) && isReactive(s));
    getter = () =>
      source.map((s) => {
        if (isRef(s)) return s.value;
        // FIX: P2-35 添加类型守卫
        if (isObject(s) && isReactive(s)) return traverse(s);
        if (isFunction(s)) return s();
        return undefined;
      });
  } else {
    getter = getSource(source as WatchSource<T>);
    // FIX: P1-04 单源 reactive 对象也需要设置 forceTrigger
    // FIX: P2-35 添加类型守卫
    if (isObject(source) && isReactive(source)) {
      forceTrigger = true;
    }
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
  let consecutiveErrors = 0;
  const MAX_CONSECUTIVE_ERRORS = 3;

  const onCleanup: OnCleanup = (fn: () => void) => {
    cleanupFns.push(fn);
  };

  const job: () => void = () => {
    if (!watcher.active || isStopped) return;
    if (cb) {
      let newValue: unknown;
      try {
        newValue = watcher.run();
        consecutiveErrors = 0;
      } catch (e) {
        consecutiveErrors++;
        if (consecutiveErrors <= MAX_CONSECUTIVE_ERRORS) {
          error(`Error in watch getter: ${e}`);
        }
        throw e;
      }
      if (
        deep ||
        forceTrigger ||
        (isMultiSource
          ? (newValue as unknown[]).some((v, i) => hasChanged(v, (oldValue as unknown[])[i]))
          : hasChanged(newValue, oldValue))
      ) {
        if (cleanupFns.length > 0) {
          cleanupFns.forEach((f) => f());
          cleanupFns.length = 0;
        }
        // FIX: P1-L7 watch 回调错误未捕获 - 添加 try-catch 捕获回调错误
        try {
          cb(
            newValue as T,
            oldValue as Immediate extends true ? undefined : T | undefined,
            onCleanup,
          );
          consecutiveErrors = 0;
        } catch (e) {
          consecutiveErrors++;
          if (consecutiveErrors <= MAX_CONSECUTIVE_ERRORS) {
            error(`Error in watch callback: ${e}`);
          }
          // 继续执行，不中断 watch 流程
        }
        oldValue = newValue;
        if (once) {
          isStopped = true;
          watcher.stop();
        }
      }
    } else {
      try {
        watcher.run();
        consecutiveErrors = 0;
      } catch (e) {
        consecutiveErrors++;
        if (consecutiveErrors <= MAX_CONSECUTIVE_ERRORS) {
          error(`Error in watch effect run: ${e}`);
        }
        throw e;
      }
    }
  };

  const rawScheduler =
    userScheduler ||
    (flush === 'sync'
      ? job
      : () => {
          if (flush === 'post') {
            queuePostFlushCb(job);
          } else {
            queuePreFlushCb(job);
          }
        });

  // 包装 scheduler，确保传 job 参数给用户自定义 scheduler
  // FIX: P2-5 添加 flush=sync 时的语义一致性说明：
  // 当 flush='sync' 且用户提供了自定义 scheduler 时，rawScheduler 已经是 job 本身
  // （因为三元表达式 `flush === 'sync' ? job : ...` 在 userScheduler 为 falsy 时生效）。
  // 但当 userScheduler 存在时，rawScheduler 始终是 userScheduler（三元表达式不生效），
  // 此时包装层将 job 作为第一个参数传给 userScheduler，这是正确的行为。
  // 因此无论 flush 模式如何，只要 userScheduler 存在，包装逻辑都是一致的。
  const scheduler = userScheduler
    ? (...args: unknown[]) => rawScheduler(job, ...args)
    : rawScheduler;

  const watcher = new ReactiveEffect(getter, scheduler as (...args: unknown[]) => unknown);

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

  // FIX: P2-04 immediate watch 旧值语义注释：
  // 如果 immediate 为 true，首次执行时 oldValue 为 undefined。
  // 这是预期行为：immediate 首次触发时没有"旧值"概念，
  // 与 Vue 3 的 watch API 行为一致。
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
  return doWatchEffect(effectFn, { ...options, flush: 'post' });
}

export function watchSyncEffect(
  effectFn: (onCleanup: OnCleanup) => void,
  options?: WatchEffectOptions,
): WatchHandle {
  return doWatchEffect(effectFn, { ...options, flush: 'sync' });
}

function doWatchEffect(
  source: (onCleanup: OnCleanup) => void,
  options: WatchEffectOptions = {},
): WatchHandle {
  const { flush = 'pre', onTrack, onTrigger } = options;

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
    flush === 'sync'
      ? () => currentEffect.run()
      : () => {
          if (flush === 'post') {
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
