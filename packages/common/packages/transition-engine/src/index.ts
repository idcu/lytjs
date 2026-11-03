// @lytjs/common-transition-engine
// 过渡引擎：平台无关的过渡动画状态机，所有 DOM 操作通过 RendererHost 执行

declare const __DEV__: boolean;

import type {
  RendererHost,
  TransitionDurationInfo,
  HostEvent,
  HostEventHandler,
} from '@lytjs/host-contract';
import type { HostRect } from '@lytjs/host-contract';

// ============================================================
// 类型定义
// ============================================================

export interface TransitionProps<T = unknown> {
  name?: string;
  appear?: boolean;
  enterFromClass?: string;
  enterActiveClass?: string;
  enterToClass?: string;
  leaveFromClass?: string;
  leaveActiveClass?: string;
  leaveToClass?: string;
  onBeforeEnter?: (el: T) => void;
  onEnter?: (el: T, done: () => void) => void;
  onAfterEnter?: (el: T) => void;
  onEnterCancelled?: (el: T) => void;
  onBeforeLeave?: (el: T) => void;
  onLeave?: (el: T, done: () => void) => void;
  onAfterLeave?: (el: T) => void;
  onLeaveCancelled?: (el: T) => void;
}

/**
 * 过渡状态（运行时收敛层）。
 * 与 @lytjs/vdom/transition 中的 TransitionState 不同，
 * 此版本用于运行时收敛层的过渡控制。
 */
export interface RuntimeTransitionState {
  /** 当前过渡阶段 */
  phase: 'idle' | 'entering' | 'leaving';
  /** 是否已取消 */
  cancelled: boolean;
  /** 过渡完成回调 */
  doneCallback: (() => void) | null;
  /** FIX: P0-10 存储过渡属性引用，用于 cancelTransition 时调用取消钩子 */
  // FIX: DTS build error - 使用 unknown 避免类型不兼容
  props?: unknown;
}

/**
 * FLIP 动画的四个阶段记录。
 */
export interface FLIPRecord<HE> {
  /** 目标元素 */
  el: HE;
  /** First: 初始位置 */
  first: HostRect;
  /** Last: 最终位置 */
  last: HostRect;
  /** Invert: 偏移量 */
  invert: { x: number; y: number };
  /** Play: 播放回调 */
  play: (() => void) | null;
}

/**
 * 过渡类名解析结果。
 */
export interface ResolvedTransitionClasses {
  /** 起始类名 */
  from: string;
  /** 激活类名 */
  active: string;
  /** 结束类名 */
  to: string;
}

/**
 * 过渡引擎配置项。
 */
export interface TransitionEngineOptions {
  /** 默认过渡名称（默认 'v'） */
  defaultName?: string;
  /** 过渡超时时间（ms，默认 5000） */
  timeout?: number;
  /** 是否启用 FLIP 动画（默认 true） */
  enableFLIP?: boolean;
}

// ============================================================
// 常量
// ============================================================

/** 默认配置 */
const DEFAULT_OPTIONS: Required<TransitionEngineOptions> = {
  defaultName: 'v',
  timeout: 5000,
  enableFLIP: true,
};

/**
 * 过渡清理函数映射（**实例级**）。
 *
 * ⚠️ 2026-11-03：此前是**模块级** WeakMap —— 两个引擎实例操作同一个元素时
 *   （测试、多根渲染、Teleport 目标共享）会互相覆盖清理函数，
 *   取消/完成时只清掉后注册的那一份，前一份的定时器与监听永久残留。
 *   现在挂到实例上，`dispose()` 也能统一清理。
 */

// ============================================================
// TransitionEngine
// ============================================================

/**
 * 过渡引擎。
 *
 * 平台无关的过渡动画状态机，所有 DOM 操作通过 RendererHost 执行。
 * 包含 enter/leave 过渡逻辑和 FLIP 动画逻辑。
 *
 * @template HN - 宿主节点类型
 * @template HE - 宿主元素类型
 */
export class TransitionEngine<HN extends object = object, HE extends HN = HN> {
  /** RendererHost 实例 */
  private host: RendererHost<HN, HE>;

  /** 配置项 */
  private options: Required<TransitionEngineOptions>;

  /** 活跃的过渡状态映射（el → state） */
  private stateMap = new WeakMap<HE, RuntimeTransitionState>();

  /** 元素 → 清理函数（清定时器 + 摘监听） */
  private cleanupMap = new WeakMap<HE, () => void>();

  /** 所有尚未执行的清理函数（`dispose()` 时统一跑一遍） */
  private activeCleanups = new Set<() => void>();

  /**
   * 创建过渡引擎实例。
   * @param host - RendererHost 实例
   * @param options - 可选的配置项
   */
  constructor(host: RendererHost<HN, HE>, options?: TransitionEngineOptions) {
    this.host = host;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  // ==========================================================
  // 过渡状态管理
  // ==========================================================

  /**
   * 获取元素的过渡状态。
   * @param el - 宿主元素
   * @returns 过渡状态
   */
  getState(el: HE): RuntimeTransitionState {
    let state = this.stateMap.get(el);
    if (!state) {
      state = {
        phase: 'idle',
        cancelled: false,
        doneCallback: null,
      };
      this.stateMap.set(el, state);
    }
    return state;
  }

  /**
   * 检查元素是否正在进行过渡。
   * @param el - 宿主元素
   */
  isTransitioning(el: HE): boolean {
    const state = this.stateMap.get(el);
    return state !== undefined && state.phase !== 'idle';
  }

  // ==========================================================
  // Enter 过渡
  // ==========================================================

  /**
   * 执行进入过渡。
   *
   * @param el - 宿主元素
   * @param props - 过渡属性
   * @param done - 过渡完成回调
   */
  performEnter(el: HE, props: TransitionProps<HE>, done: () => void): void {
    // 取消可能存在的旧过渡
    this.cancelTransition(el);

    const state = this.getState(el);
    state.phase = 'entering';
    state.cancelled = false;
    state.doneCallback = done;
    // FIX: P0-10 存储 props 引用，用于 cancelTransition 时调用取消钩子
    state.props = props;

    const classes = this.resolveTransitionClasses(props, 'enter');

    // 调用 onBeforeEnter 钩子
    if (props.onBeforeEnter) {
      props.onBeforeEnter(el);
    }

    // 添加 enter-from 和 enter-active 类
    this.host.addClass(el, classes.from);
    this.host.addClass(el, classes.active);

    // 强制回流，确保浏览器记录初始状态
    this.host.forceReflow(el);

    // 移除 enter-from，添加 enter-to
    this.host.removeClass(el, classes.from);
    this.host.addClass(el, classes.to);

    // 检查是否有 JS enter 钩子
    if (props.onEnter) {
      props.onEnter(el, () => {
        this.finishEnter(el, classes, props);
      });
    } else {
      // CSS 过渡：等待 transitionend/animationend
      const info = this.host.getTransitionInfo(el, 'enter');
      if ((info.hasTransition || info.hasAnimation) && info.duration > 0) {
        // 以 transitionend/animationend 为准（真正的结束时刻），
        // 并用 duration + 50ms 兜底 —— 事件不触发时不会永久挂起。
        this.waitForTransitionEnd(el, info, () => this.finishEnter(el, classes, props));
      } else if (info.hasTransition || info.hasAnimation) {
        // ⚠️ 2026-11-03 修（P1）：有过渡声明但**时长为 0**（`transition: none`、
        //   `prefers-reduced-motion`、被样式覆盖成 0s）时，此前会走 waitForTransitionEnd，
        //   而 0 时长通常**不会**派发 transitionend ⇒ 等满 5 秒超时才完成，
        //   元素在这 5 秒里一直卡在「进入中」。
        //   没有可观测的动画 ⇒ 立即完成。
        this.finishEnter(el, classes, props);
      } else {
        // 无 CSS 过渡，立即完成
        this.finishEnter(el, classes, props);
      }
    }
  }

  /**
   * 完成进入过渡。
   */
  private finishEnter(
    el: HE,
    classes: ResolvedTransitionClasses,
    props: TransitionProps<HE>,
  ): void {
    const state = this.stateMap.get(el);
    // 幂等：已被取消 / 已收敛 / 定时器与事件双触发，都只允许收敛一次
    if (!state || state.cancelled || state.phase !== 'entering') return;

    this.clearCleanup(el);

    this.host.removeClass(el, classes.active);
    this.host.removeClass(el, classes.to);

    const done = state.doneCallback;
    state.phase = 'idle';
    state.doneCallback = null;
    // ⚠️ 2026-11-03：释放 props 引用 —— 否则元素存活期间一直持有整份 props
    //   （里面可能闭包了大对象），且 `getState()` 能读到过期配置。
    state.props = undefined;

    // ⚠️ 2026-11-03 修（P0）：此前 `onAfterEnter` 抛错会**阻断后面的 `done()`** ——
    //   调用方（渲染器）等不到过渡结束 ⇒ 元素永不移除、组件永远处于「进入中」，
    //   而控制台只有一条用户钩子的错。现在钩子错误被隔离，`done()` 一定执行。
    try {
      props.onAfterEnter?.(el);
    } catch (error) {
      this.reportHookError('onAfterEnter', error);
    }

    done?.();
  }

  // ==========================================================
  // Leave 过渡
  // ==========================================================

  /**
   * 执行离开过渡。
   *
   * @param el - 宿主元素
   * @param props - 过渡属性
   * @param done - 过渡完成回调
   */
  performLeave(el: HE, props: TransitionProps<HE>, done: () => void): void {
    // 取消可能存在的旧过渡
    this.cancelTransition(el);

    const state = this.getState(el);
    state.phase = 'leaving';
    state.cancelled = false;
    state.doneCallback = done;
    // FIX: P0-10 存储 props 引用，用于 cancelTransition 时调用取消钩子
    state.props = props;

    const classes = this.resolveTransitionClasses(props, 'leave');

    // 调用 onBeforeLeave 钩子
    if (props.onBeforeLeave) {
      props.onBeforeLeave(el);
    }

    // 添加 leave-from 和 leave-active 类
    this.host.addClass(el, classes.from);
    this.host.addClass(el, classes.active);

    // 强制回流
    this.host.forceReflow(el);

    // 移除 leave-from，添加 leave-to
    this.host.removeClass(el, classes.from);
    this.host.addClass(el, classes.to);

    // 检查是否有 JS leave 钩子
    if (props.onLeave) {
      props.onLeave(el, () => {
        this.finishLeave(el, classes, props);
      });
    } else {
      // CSS 过渡
      const info = this.host.getTransitionInfo(el, 'leave');
      if ((info.hasTransition || info.hasAnimation) && info.duration > 0) {
        this.waitForTransitionEnd(el, info, () => this.finishLeave(el, classes, props));
      } else if (info.hasTransition || info.hasAnimation) {
        // 同 performEnter：0 时长直接完成，不进 5 秒超时
        this.finishLeave(el, classes, props);
      } else {
        this.finishLeave(el, classes, props);
      }
    }
  }

  /**
   * 完成离开过渡。
   */
  private finishLeave(
    el: HE,
    classes: ResolvedTransitionClasses,
    props: TransitionProps<HE>,
  ): void {
    const state = this.stateMap.get(el);
    if (!state || state.cancelled || state.phase !== 'leaving') return;

    this.clearCleanup(el);

    this.host.removeClass(el, classes.active);
    this.host.removeClass(el, classes.to);

    const done = state.doneCallback;
    state.phase = 'idle';
    state.doneCallback = null;
    state.props = undefined;

    // 同 finishEnter：钩子抛错不能阻断 done()（否则离开的元素永不移除）
    try {
      props.onAfterLeave?.(el);
    } catch (error) {
      this.reportHookError('onAfterLeave', error);
    }

    done?.();
  }

  // ==========================================================
  // 取消过渡
  // ==========================================================

  /**
   * 取消元素上正在进行的过渡。
   *
   * @param el - 宿主元素
   */
  cancelTransition(el: HE): void {
    const state = this.stateMap.get(el);
    if (!state || state.phase === 'idle') return;

    const phase = state.phase;
    const props = (state.props ?? {}) as TransitionProps<HE>;

    state.cancelled = true;
    state.phase = 'idle';
    state.doneCallback = null;
    state.props = undefined;

    this.clearCleanup(el);

    // ⚠️ 2026-11-03 修（P1）：此前取消只把状态置 idle，**不移除过渡类** ——
    //   元素会永久带着 `v-enter-active` / `v-enter-to`（`transition: all .3s` 之类），
    //   之后任何样式变化都会触发一次「幽灵过渡」，视觉上停在进入中的样子。
    const classes = this.resolveTransitionClasses(props, phase === 'entering' ? 'enter' : 'leave');
    for (const cls of [classes.from, classes.active, classes.to]) {
      this.host.removeClass(el, cls);
    }

    try {
      if (phase === 'entering') props.onEnterCancelled?.(el);
      else props.onLeaveCancelled?.(el);
    } catch (error) {
      this.reportHookError(phase === 'entering' ? 'onEnterCancelled' : 'onLeaveCancelled', error);
    }
  }

  // ==========================================================
  // FLIP 动画
  // ==========================================================

  /**
   * 记录 FLIP 动画的 First 状态。
   *
   * @param el - 宿主元素
   * @returns FLIP 记录（含 First 阶段数据）
   */
  flipRecordFirst(el: HE): FLIPRecord<HE> {
    const first = this.host.getBoundingClientRect(el);
    return {
      el,
      first,
      last: { left: 0, top: 0, width: 0, height: 0, right: 0, bottom: 0 },
      invert: { x: 0, y: 0 },
      play: null,
    };
  }

  /**
   * 记录 FLIP 动画的 Last 状态并计算 Invert。
   *
   * @param record - FLIP 记录（含 First 阶段数据）
   * @returns 更新后的 FLIP 记录（含 Last 和 Invert 数据）
   */
  flipRecordLast(record: FLIPRecord<HE>): FLIPRecord<HE> {
    const last = this.host.getBoundingClientRect(record.el);
    const invertX = record.first.left - last.left;
    const invertY = record.first.top - last.top;

    return {
      ...record,
      last,
      invert: { x: invertX, y: invertY },
    };
  }

  /**
   * 执行 FLIP 动画的 Play 阶段。
   *
   * @param record - FLIP 记录（含 First、Last、Invert 数据）
   * @param duration - 动画时长（ms，默认 300）
   * @param easing - 缓动函数名（默认 'ease'）
   */
  flipPlay(record: FLIPRecord<HE>, duration?: number, easing?: string): void {
    if (!this.options.enableFLIP) return;

    const dur = duration ?? 300;
    const ease = easing ?? 'ease';

    // Invert: 应用反向偏移
    this.host.setStyle(
      record.el,
      'transform',
      `translate(${record.invert.x}px, ${record.invert.y}px)`,
    );
    this.host.setStyle(record.el, 'transition', 'none');

    // 强制回流
    this.host.forceReflow(record.el);

    // Play: 移除反向偏移，添加过渡
    this.host.setStyle(record.el, 'transition', `transform ${dur}ms ${ease}`);
    this.host.setStyle(record.el, 'transform', '');

    // 动画结束后清理
    this.host.setTimeout(() => {
      this.host.setStyle(record.el, 'transition', '');
      this.host.setStyle(record.el, 'transform', '');
    }, dur + 50);
  }

  /**
   * 执行完整的 FLIP 动画（First → Last → Invert → Play）。
   *
   * @param el - 宿主元素
   * @param updateFn - 在 First 和 Last 之间执行的更新函数（改变元素位置）
   * @param duration - 动画时长（ms，默认 300）
   * @param easing - 缓动函数名（默认 'ease'）
   */
  flip(el: HE, updateFn: () => void, duration?: number, easing?: string): void {
    if (!this.options.enableFLIP) {
      updateFn();
      return;
    }

    // First: 记录初始位置
    const record = this.flipRecordFirst(el);

    // 执行更新（改变元素位置）
    updateFn();

    // Last: 记录最终位置
    const updatedRecord = this.flipRecordLast(record);

    // Play: 执行动画
    this.flipPlay(updatedRecord, duration, easing);
  }

  // ==========================================================
  // 内部方法
  // ==========================================================

  /**
   * 解析过渡类名。
   */
  private resolveTransitionClasses(
    props: TransitionProps<HE>,
    type: 'enter' | 'leave',
  ): ResolvedTransitionClasses {
    const name = props.name ?? this.options.defaultName;

    if (type === 'enter') {
      return {
        from: props.enterFromClass ?? `${name}-enter-from`,
        active: props.enterActiveClass ?? `${name}-enter-active`,
        to: props.enterToClass ?? `${name}-enter-to`,
      };
    } else {
      return {
        from: props.leaveFromClass ?? `${name}-leave-from`,
        active: props.leaveActiveClass ?? `${name}-leave-active`,
        to: props.leaveToClass ?? `${name}-leave-to`,
      };
    }
  }

  /**
   * 等待 CSS 过渡/动画结束。
   *
   * 通过监听 transitionend/animationend 事件实现，
   * 超时后自动完成（防止事件未触发）。
   */
  private waitForTransitionEnd(el: HE, info: TransitionDurationInfo, done: () => void): void {
    let called = false;
    const finish = () => {
      if (!called) {
        called = true;
        done();
      }
    };

    // 安全超时
    const timeout = info.duration > 0 ? info.duration + 50 : this.options.timeout;
    const timer = this.host.setTimeout(finish, timeout);

    // 创建事件处理函数
    const onEnd = (event: unknown) => {
      if (event == null || typeof event !== 'object') return;
      const hostEvent = event as { target: unknown; type: string };
      // 只认元素自身的事件（子元素的 transitionend 会冒泡上来）
      if (hostEvent.target !== el) return;

      this.host.clearTimeout(timer);
      finish();
    };
    const hostEventHandler: HostEventHandler = (event: HostEvent) => onEnd(event);

    const disposeTransition = this.host.addEventListener(el, 'transitionend', hostEventHandler);
    const disposeAnimation = this.host.addEventListener(el, 'animationend', hostEventHandler);

    this.registerCleanup(el, () => {
      this.host.clearTimeout(timer);
      // 防御：宿主实现可能不返回 dispose（契约上应该返回），不能让清理函数抛错
      if (typeof disposeTransition === 'function') disposeTransition();
      if (typeof disposeAnimation === 'function') disposeAnimation();
    });
  }

  // ==========================================================
  // 清理
  // ==========================================================

  /** 注册「这个元素上还有未完成的定时器 / 监听」 */
  private registerCleanup(el: HE, cleanup: () => void): void {
    this.clearCleanup(el);
    this.cleanupMap.set(el, cleanup);
    this.activeCleanups.add(cleanup);
  }

  /** 执行并移除某元素的清理函数 */
  private clearCleanup(el: HE): void {
    const cleanup = this.cleanupMap.get(el);
    if (!cleanup) return;
    this.cleanupMap.delete(el);
    this.activeCleanups.delete(cleanup);
    cleanup();
  }

  /** 用户钩子抛错：留痕但不影响状态机收敛 */
  private reportHookError(hook: string, error: unknown): void {
    console.error(`[lytjs/transition] ${hook} 钩子抛错（已隔离，过渡继续收敛）:`, error);
  }

  // ==========================================================
  // 清理
  // ==========================================================

  /**
   * 销毁过渡引擎，清理所有内部状态。
   */
  dispose(): void {
    // ⚠️ 2026-11-03：此前只重置 stateMap —— 挂起的定时器仍会到点执行，
    //   元素上的 transitionend / animationend 监听也没摘（引擎已销毁却还在收事件）。
    for (const cleanup of [...this.activeCleanups]) {
      try {
        cleanup();
      } catch {
        /* 清理函数自身出错不影响其它清理 */
      }
    }
    this.activeCleanups.clear();
    this.cleanupMap = new WeakMap<HE, () => void>();
    this.stateMap = new WeakMap<HE, RuntimeTransitionState>();
  }
}
