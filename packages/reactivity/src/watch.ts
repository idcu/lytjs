/**
 * Lyt.js 响应式系统 — 侦听器（Watch）
 *
 * watch 和 watchEffect 用于观察响应式数据的变化并执行副作用。
 *
 * watch:
 *   - 显式指定侦听源（ref/reactive/getter/数组）
 *   - 回调接收新值和旧值
 *   - 默认懒执行（不会立即执行回调）
 *
 * watchEffect:
 *   - 自动收集依赖（不需要显式指定源）
 *   - 立即执行一次
 *   - 回调不接收参数
 *
 * nextTick:
 *   - 在下一个微任务中执行回调
 *   - 等待 DOM 更新后执行
 */

import {
  ReactiveEffect,
  EffectFn,
  activeEffect,
} from './effect';
import { isRef, Ref, unref } from './ref';
import { isReactive, toRaw } from './reactive';
import { queueJob, nextTick as schedulerNextTick, isObject } from '@lytjs/common';

// ======================== 类型定义 ========================

/** watch 回调函数类型 */
export type WatchCallback<T = any, O = T> = (
  newValue: T,
  oldValue: O,
  onCleanup: (cleanupFn: () => void) => void
) => void;

/** watch 源类型：可以是 ref、reactive 对象、getter 函数或它们的数组 */
export type WatchSource<T = any> =
  | Ref<T>
  | (() => T)
  | {
      [key: string]: any;
    };

/** watch 选项 */
export interface WatchOptions {
  /** 是否立即执行回调（默认 false） */
  immediate?: boolean;
  /** 是否深度侦听（默认 true，对 reactive 对象自动开启） */
  deep?: boolean;
  /** 是否在组件卸载时自动停止（预留） */
  flush?: 'pre' | 'post' | 'sync';
}

/** watchEffect 选项 */
export interface WatchEffectOptions {
  /** 副作用执行前的回调 */
  onTrack?: (event: any) => void;
  /** 副作用触发时的回调 */
  onTrigger?: (event: any) => void;
  /** 刷新时机 */
  flush?: 'pre' | 'post' | 'sync';
}

/** watch 停止句柄 */
export type WatchStopHandle = () => void;

// ======================== 内部工具 ========================

/**
 * 遍历对象的所有属性（包括嵌套）
 * 用于深度侦听时递归读取所有属性以收集依赖
 */
function traverse(value: any, depth: number = Infinity, seen?: Set<any>): any {
  if (!isObject(value) || depth <= 0) {
    return value;
  }

  // 使用 Set 防止循环引用导致无限递归
  if (!seen) {
    seen = new Set();
  }
  if (seen.has(value)) {
    return value;
  }
  seen.add(value);

  // 如果是 Ref，解包后继续遍历
  if (isRef(value)) {
    traverse(value.value, depth - 1, seen);
  }
  // 如果是数组，遍历每个元素
  else if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      traverse(value[i], depth - 1, seen);
    }
  }
  // 如果是普通对象，遍历每个属性
  else {
    for (const key of Object.keys(value)) {
      traverse((value as any)[key], depth - 1, seen);
    }
  }

  return value;
}

/**
 * 将侦听源规范化为 getter 函数
 * 支持的源类型：ref、reactive 对象、getter 函数、数组
 *
 * @param source - 侦听源
 * @returns getter 函数
 */
function normalizeSource(source: WatchSource): () => any {
  // 如果是 Ref，返回读取 .value 的 getter
  if (isRef(source)) {
    return () => (source as Ref).value;
  }

  // 如果是 reactive 对象，返回遍历整个对象的 getter（深度依赖收集）
  if (isReactive(source)) {
    return () => traverse(source);
  }

  // 如果是 getter 函数，直接返回
  if (typeof source === 'function') {
    return source as () => any;
  }

  // 其他情况：返回遍历对象的 getter
  return () => traverse(source);
}

// ======================== 公共 API ========================

/**
 * 侦听一个或多个响应式数据源，并在数据变化时执行回调
 *
 * @param source - 侦听源（ref / reactive / getter / 数组）
 * @param cb - 变化时的回调函数，接收 (newValue, oldValue, onCleanup)
 * @param options - 配置选项
 * @returns 停止侦听的函数
 *
 * @example
 * ```ts
 * // 侦听 ref
 * const count = ref(0)
 * const stop = watch(count, (newVal, oldVal) => {
 *   console.log(`count: ${oldVal} -> ${newVal}`)
 * })
 * count.value++  // 输出: count: 0 -> 1
 * stop()  // 停止侦听
 *
 * // 侦听 getter
 * watch(
 *   () => state.count + state.name,
 *   (newVal, oldVal) => console.log(newVal, oldVal)
 * )
 *
 * // 侦听多个源
 * watch([count, name], ([newCount, newName], [oldCount, oldName]) => {
 *   console.log(newCount, newName)
 * })
 *
 * // 立即执行
 * watch(count, (val) => console.log(val), { immediate: true })
 * ```
 */
export function watch<T = any>(
  source: WatchSource<T> | WatchSource<T>[],
  cb: WatchCallback<T>,
  options: WatchOptions = {}
): WatchStopHandle {
  // 处理数组源
  let getter: () => any;
  let isMultiSource = false;

  if (Array.isArray(source)) {
    isMultiSource = true;
    // 将数组中每个源规范化为 getter，然后合并为一个 getter
    const getters = source.map((s) => normalizeSource(s));
    getter = () => getters.map((g) => g());
  } else {
    getter = normalizeSource(source);
  }

  // 如果是 reactive 对象且没有显式设置 deep，默认深度侦听
  if (isReactive(source) && options.deep !== false) {
    options.deep = true;
  }

  // 旧值和新值
  let oldValue: any = isMultiSource ? [] : undefined;

  // 清理函数（用于处理异步竞态）
  let cleanupFn: (() => void) | undefined;

  // onCleanup 回调：允许用户注册清理函数
  const onCleanup = (fn: () => void) => {
    cleanupFn = fn;
  };

  // 创建内部副作用
  const job = () => {
    // 执行清理函数
    if (cleanupFn) {
      cleanupFn();
      cleanupFn = undefined;
    }

    // 执行 getter 获取新值
    const newValue = effect.run();

    // 比较新旧值
    if (
      isMultiSource
        ? newValue.some((v: any, i: number) => !Object.is(v, oldValue[i]))
        : !Object.is(newValue, oldValue) ||
          (options.deep && isObject(newValue))
    ) {
      // 调用回调
      cb(
        isMultiSource ? newValue : newValue,
        isMultiSource ? [...oldValue] : oldValue,
        onCleanup
      );

      // 更新旧值
      oldValue = isMultiSource ? [...newValue] : newValue;
    }
  };

  // 创建 ReactiveEffect
  const effect = new ReactiveEffect(getter, {
    lazy: true,
    scheduler: () => {
      // 使用调度器将 job 推入队列
      if (options.flush === 'sync') {
        job();
      } else {
        queueJob(job);
      }
    },
  });

  // 立即执行回调（如果配置了 immediate）
  if (options.immediate) {
    job();
  } else {
    // 首次执行 getter 以收集依赖
    oldValue = effect.run();
  }

  // 返回停止函数
  return () => {
    effect.stop();
  };
}

/**
 * 立即运行一个函数，同时响应式地追踪其依赖
 * 当依赖变化时自动重新执行
 *
 * @param fn - 要执行的副作用函数
 * @param options - 配置选项
 * @returns 停止侦听的函数
 *
 * @example
 * ```ts
 * const count = ref(0)
 * const stop = watchEffect(() => {
 *   console.log(`count is: ${count.value}`)
 * })
 * // 立即输出: count is: 0
 * count.value++  // 输出: count is: 1
 * stop()  // 停止侦听
 *
 * // 带清理函数
 * watchEffect((onCleanup) => {
 *   const timer = setInterval(() => console.log('tick'), 1000)
 *   onCleanup(() => clearInterval(timer))  // 依赖变化时清理
 * })
 * ```
 */
export function watchEffect(
  fn: (onCleanup: (cleanupFn: () => void) => void) => void,
  options: WatchEffectOptions = {}
): WatchStopHandle {
  // 清理函数
  let cleanupFn: (() => void) | undefined;

  // 包装用户函数，注入 onCleanup 参数
  const wrappedFn = () => {
    // 执行清理
    if (cleanupFn) {
      cleanupFn();
      cleanupFn = undefined;
    }
    // 执行用户函数
    fn((cleanup: () => void) => {
      cleanupFn = cleanup;
    });
  };

  // 创建副作用
  const effect = new ReactiveEffect(wrappedFn, {
    scheduler: () => {
      if (options.flush === 'sync') {
        wrappedFn();
      } else {
        queueJob(wrappedFn);
      }
    },
  });

  // 立即执行一次
  effect.run();

  // 返回停止函数
  return () => {
    effect.stop();
    if (cleanupFn) {
      cleanupFn();
      cleanupFn = undefined;
    }
  };
}

/**
 * 在下一个微任务中执行回调
 * 等待当前所有响应式更新完成后再执行
 *
 * @returns Promise
 *
 * @example
 * ```ts
 * await nextTick()
 * // 此时 DOM 已更新完毕
 *
 * nextTick().then(() => {
 *   console.log('更新完成')
 * })
 * ```
 */
export { schedulerNextTick as nextTick };
