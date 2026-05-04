// @lytjs/runtime-convergence - transition-engine
// 过渡引擎：平台无关的过渡动画状态机，所有 DOM 操作通过 RendererHost 执行

import type { RendererHost, TransitionDurationInfo } from '@lytjs/host-contract';
import type {
  TransitionProps,
  TransitionState,
  FLIPRecord,
  ResolvedTransitionClasses,
  TransitionEngineOptions,
} from './types';

// ============================================================
// 常量
// ============================================================

declare const __DEV__: boolean;

/** 默认配置 */
const DEFAULT_OPTIONS: Required<TransitionEngineOptions> = {
  defaultName: 'v',
  timeout: 5000,
  enableFLIP: true,
};

/** 过渡清理函数映射 */
const transitionCleanupMap = new WeakMap<object, (() => void) | null>();

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
  private stateMap = new WeakMap<HE, TransitionState>();

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
  getState(el: HE): TransitionState {
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
      if (info.hasTransition || info.hasAnimation) {
        if (info.duration > 0) {
          this.host.setTimeout(
            () => this.finishEnter(el, classes, props),
            info.duration + 50,
          );
        } else {
          this.waitForTransitionEnd(el, info, () => this.finishEnter(el, classes, props));
        }
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
    if (!state || state.cancelled) return;

    this.host.removeClass(el, classes.active);
    this.host.removeClass(el, classes.to);

    if (props.onAfterEnter) {
      props.onAfterEnter(el);
    }

    state.phase = 'idle';
    state.doneCallback = null;

    // 清理
    transitionCleanupMap.delete(el);
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
      if (info.hasTransition || info.hasAnimation) {
        if (info.duration > 0) {
          this.host.setTimeout(
            () => this.finishLeave(el, classes, props),
            info.duration + 50,
          );
        } else {
          this.waitForTransitionEnd(el, info, () => this.finishLeave(el, classes, props));
        }
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
    if (!state || state.cancelled) return;

    this.host.removeClass(el, classes.active);
    this.host.removeClass(el, classes.to);

    if (props.onAfterLeave) {
      props.onAfterLeave(el);
    }

    state.phase = 'idle';
    state.doneCallback = null;

    transitionCleanupMap.delete(el);
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

    state.cancelled = true;

    // 调用取消回调
    // 注意：此处无法直接调用 onEnterCancelled / onLeaveCancelled，
    // 因为不持有 props 引用。由上层组件负责处理。

    // 执行清理函数
    const cleanup = transitionCleanupMap.get(el);
    if (cleanup) {
      cleanup();
      transitionCleanupMap.delete(el);
    }

    state.phase = 'idle';
    state.doneCallback = null;
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
    this.host.setStyle(record.el, 'transform', `translate(${record.invert.x}px, ${record.invert.y}px)`);
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
  private waitForTransitionEnd(
    el: HE,
    info: TransitionDurationInfo,
    done: () => void,
  ): void {
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
      // 通过 HostEvent 接口检查事件目标
      const hostEvent = event as { target: unknown; type: string };
      if (hostEvent.target !== el) return;

      this.host.clearTimeout(timer);
      finish();
    };

    // 通过 host 添加事件监听
    const disposeTransition = this.host.addEventListener(el, 'transitionend', onEnd as never);
    const disposeAnimation = this.host.addEventListener(el, 'animationend', onEnd as never);

    // 存储清理函数
    transitionCleanupMap.set(el, () => {
      this.host.clearTimeout(timer);
      disposeTransition();
      disposeAnimation();
    });
  }

  // ==========================================================
  // 清理
  // ==========================================================

  /**
   * 销毁过渡引擎，清理所有内部状态。
   */
  dispose(): void {
    this.stateMap = new WeakMap<HE, TransitionState>();
  }
}
