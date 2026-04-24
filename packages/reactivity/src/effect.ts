/**
 * Lyt.js 响应式系统 — 副作用系统（Effect）
 *
 * 核心机制：
 * 1. 依赖收集（track）：当读取响应式属性时，记录当前正在执行的副作用
 * 2. 触发更新（trigger）：当修改响应式属性时，通知所有依赖该属性的副作用重新执行
 *
 * 数据结构：
 *   targetMap: WeakMap<target, Map<key, Set<ReactiveEffect>>>
 *   - 第一层 WeakMap：以目标对象为 key，value 是该对象所有属性的依赖映射
 *   - 第二层 Map：以属性名为 key，value 是依赖该属性的所有副作用集合
 *   - 第三层 Set：存储具体的 ReactiveEffect 实例（自动去重）
 */

import { queueJob } from '@lytjs/common';

// ======================== 类型定义 ========================

/** 副作用函数类型 */
export type EffectFn = () => any;

/** trigger 触发类型 */
export type TriggerOpTypes = 'add' | 'delete' | 'set';

/** effect 选项 */
export interface ReactiveEffectOptions {
  /** 调度器函数：自定义副作用的执行时机 */
  scheduler?: (effect: ReactiveEffect) => void;
  /** 副作用执行前的回调 */
  beforeRun?: () => void;
  /** 副作用执行后的回调 */
  afterRun?: () => void;
  /** 是否在首次运行时就停止（用于 computed） */
  lazy?: boolean;
  /** 是否允许在 stop 后重新激活 */
  allowRecurse?: boolean;
  /** 副作用唯一标识（用于调试和排序） */
  id?: number;
}

// ======================== 全局状态 ========================

/**
 * 当前正在运行的副作用
 * 在依赖收集时使用，用于将副作用与响应式属性关联
 */
export let activeEffect: ReactiveEffect | null = null;

/**
 * 副作用栈
 * 用于处理嵌套副作用场景（effect 内部又调用了 effect）
 * 栈顶始终是当前正在执行的副作用
 */
const effectStack: ReactiveEffect[] = [];

/**
 * effect 自增 ID，用于排序和调试
 */
let effectIdCounter = 0;

// ======================== 依赖存储 ========================

/**
 * 全局依赖映射表
 * WeakMap 保证当目标对象被垃圾回收时，对应的依赖映射也会被自动清除
 */
const targetMap = new WeakMap<object, Map<any, Set<ReactiveEffect>>>();

// ======================== ReactiveEffect 类 ========================

/**
 * 响应式副作用类
 * 封装一个副作用函数，管理其依赖关系和执行生命周期
 */
export class ReactiveEffect {
  /** 副作用函数 */
  fn: EffectFn;

  /** 调度器（可选） */
  scheduler?: (effect: ReactiveEffect) => void;

  /** 副作用执行前的回调 */
  beforeRun?: () => void;

  /** 副作用执行后的回调 */
  afterRun?: () => void;

  /** 是否惰性执行（首次不自动执行） */
  lazy?: boolean;

  /** 是否允许递归 */
  allowRecurse?: boolean;

  /** 副作用唯一 ID */
  id: number;

  /** 是否处于活跃状态 */
  active: boolean = true;

  /**
   * 该副作用依赖的所有 dep 集合
   * 用于在 stop 时从所有 dep 中移除自身
   * 每个 dep 是一个 Set<ReactiveEffect>
   */
  deps: Set<Set<ReactiveEffect>> = new Set();

  constructor(fn: EffectFn, options: ReactiveEffectOptions = {}) {
    this.fn = fn;
    this.scheduler = options.scheduler;
    this.beforeRun = options.beforeRun;
    this.afterRun = options.afterRun;
    this.lazy = options.lazy;
    this.id = effectIdCounter++;
  }

  /**
   * 执行副作用函数
   * - 将自身压入 effectStack 并设为 activeEffect
   * - 执行前清理旧依赖（每次执行重新收集依赖）
   * - 执行完毕后弹出栈
   *
   * @returns 副作用函数的返回值
   */
  run(): any {
    // 如果副作用已被停止，直接执行原始函数（不收集依赖）
    if (!this.active) {
      return this.fn();
    }

    // 如果当前副作用已在栈中，说明发生了递归，直接执行（防止无限循环）
    if (effectStack.includes(this)) {
      return this.fn();
    }

    try {
      // 执行前回调
      this.beforeRun?.();

      // 将自身压入栈，设为全局活跃副作用
      effectStack.push(this);
      activeEffect = this;

      // 清理旧依赖，重新收集
      cleanupEffect(this);

      // 执行副作用函数，在执行过程中会触发 track 收集依赖
      return this.fn();
    } finally {
      // 执行后回调
      this.afterRun?.();

      // 弹出栈，恢复上一个活跃副作用
      effectStack.pop();
      activeEffect = effectStack[effectStack.length - 1] || null;
    }
  }

  /**
   * 停止该副作用
   * - 从所有依赖集合中移除自身
   * - 标记为非活跃状态
   */
  stop(): void {
    if (this.active) {
      // 从所有 dep 中移除自身
      cleanupEffect(this);
      // 如果有自定义的 onStop 回调，执行它
      if (this.onStop) {
        this.onStop();
      }
      this.active = false;
    }
  }

  /** 停止时的回调（可由外部设置） */
  onStop?: () => void;
}

// ======================== 依赖追踪控制 ========================

/**
 * 是否应该进行依赖收集
 * 当 shouldTrack 为 false 时，track() 会直接返回，不收集依赖
 */
let shouldTrack = true;

/**
 * 追踪状态栈
 * 用于嵌套暂停/恢复追踪的场景
 */
const trackStack: boolean[] = [];

/**
 * 暂停依赖收集
 * 将当前 shouldTrack 状态压入栈中，并设置为 false
 */
export function pauseTracking(): void {
  trackStack.push(shouldTrack);
  shouldTrack = false;
}

/**
 * 恢复依赖收集
 * 从栈中弹出上一次的 shouldTrack 状态
 */
export function resetTracking(): void {
  const last = trackStack.pop();
  shouldTrack = last === undefined ? true : last;
}

// ======================== 依赖收集 ========================

/**
 * 清理副作用的旧依赖
 * 在每次副作用执行前调用，确保依赖是最新的
 *
 * @param effect - 要清理的副作用
 */
function cleanupEffect(effect: ReactiveEffect): void {
  const { deps } = effect;
  // 遍历该副作用的所有 dep 集合
  for (const dep of deps) {
    // 从每个 dep 中移除该副作用
    dep.delete(effect);
  }
  // 清空 deps 数组（下次执行时会重新填充）
  deps.clear();
}

/**
 * 依赖收集
 * 当响应式对象的属性被读取时调用
 * 将当前活跃的副作用（activeEffect）添加到对应属性的依赖集合中
 *
 * @param target - 被读取的目标对象
 * @param key - 被读取的属性名
 */
export function track(target: object, key: unknown): void {
  // 如果暂停了依赖收集，直接返回
  if (!shouldTrack) return;

  // 如果没有活跃的副作用，不需要收集
  if (!activeEffect) return;

  // 获取或创建 target 对应的依赖映射
  let depsMap = targetMap.get(target);
  if (!depsMap) {
    depsMap = new Map();
    targetMap.set(target, depsMap);
  }

  // 获取或创建 key 对应的依赖集合
  let dep = depsMap.get(key);
  if (!dep) {
    dep = new Set();
    depsMap.set(key, dep);
  }

  // 将当前副作用添加到依赖集合中
  if (!dep.has(activeEffect)) {
    dep.add(activeEffect);
    // 同时将 dep 添加到副作用的 deps 中（用于后续清理）
    activeEffect.deps.add(dep);
  }
}

// ======================== 触发更新 ========================

/**
 * 触发依赖更新
 * 当响应式对象的属性被修改时调用
 * 通知所有依赖该属性的副作用重新执行
 *
 * @param target - 被修改的目标对象
 * @param key - 被修改的属性名
 * @param type - 操作类型：'set'（修改）、'add'（新增）、'delete'（删除）
 * @param newValue - 新值（可选，用于某些特殊场景）
 */
export function trigger(
  target: object,
  key: unknown,
  type: TriggerOpTypes,
  newValue?: any
): void {
  // 获取 target 对应的依赖映射
  const depsMap = targetMap.get(target);
  if (!depsMap) return;

  // 收集需要触发的副作用（先收集再执行，避免执行过程中修改集合导致问题）
  const effectsToRun: Set<ReactiveEffect> = new Set();

  /**
   * 将指定 dep 中的副作用添加到待执行集合
   * 排除当前正在运行的副作用（防止自触发无限循环）
   */
  const addEffects = (dep: Set<ReactiveEffect> | undefined) => {
    if (!dep) return;
    for (const effect of dep) {
      // 如果当前副作用允许递归，或者不是当前正在执行的副作用，则加入队列
      if (effect !== activeEffect || effect.allowRecurse) {
        effectsToRun.add(effect);
      }
    }
  };

  // 1. 触发具体 key 的依赖
  addEffects(depsMap.get(key));

  // 2. 如果是 add 或 delete 操作，还需要触发迭代器相关的依赖
  //    （因为 for...in 循环和 Object.keys 等依赖的是 ITERATE_KEY）
  if (type === 'add' || type === 'delete') {
    addEffects(depsMap.get(ITERATE_KEY));
  }

  // 3. 如果是数组且 key 是 length，需要触发所有 >= newLength 的索引依赖
  if (type === 'set' && Array.isArray(target)) {
    const length = depsMap.get('length');
    if (length && typeof key === 'number' && key < (target as any[]).length) {
      addEffects(length);
    }
  }

  // 依次触发所有需要执行的副作用
  for (const effect of effectsToRun) {
    if (effect.scheduler) {
      // 如果有调度器，通过调度器执行（通常是加入队列延迟执行）
      effect.scheduler(effect);
    } else {
      // 否则直接执行
      effect.run();
    }
  }
}

/**
 * 迭代器依赖的 key
 * 当对象新增或删除属性时，需要触发依赖 ITERATE_KEY 的副作用
 * （例如 for...in 循环、Object.keys() 等）
 */
export const ITERATE_KEY = Symbol('iterate');

// ======================== 公共 API ========================

/**
 * 创建响应式副作用
 *
 * @param fn - 副作用函数
 * @param options - 配置选项
 * @returns 副作用对象（ReactiveEffect 实例）
 *
 * @example
 * ```ts
 * const obj = reactive({ count: 0 })
 * const runner = effect(() => {
 *   console.log(obj.count)
 * })
 * obj.count++ // 自动触发副作用重新执行
 * runner.effect.stop() // 停止副作用
 * ```
 */
export function effect(
  fn: EffectFn,
  options: ReactiveEffectOptions = {}
): { effect: ReactiveEffect; (): any } {
  // 创建 ReactiveEffect 实例
  const _effect = new ReactiveEffect(fn, options);

  // 如果不是惰性的，立即执行一次
  if (!options.lazy) {
    _effect.run();
  }

  // 返回一个可调用的 runner，同时挂载 effect 引用
  const runner = _effect.run.bind(_effect) as any;
  runner.effect = _effect;
  runner.stop = () => _effect.stop();

  return runner;
}

/**
 * 停止一个副作用
 *
 * @param runner - effect() 返回的 runner 对象
 */
export function stop(runner: any): void {
  runner?.effect?.stop();
}

/**
 * 获取当前 targetMap 的引用（用于调试）
 * @internal
 */
export function getTargetMap(): WeakMap<object, Map<any, Set<ReactiveEffect>>> {
  return targetMap;
}
