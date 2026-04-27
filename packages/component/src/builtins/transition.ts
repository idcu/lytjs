/**
 * Lyt.js Transition 内置过渡组件
 *
 * 控制 Vue 风格的进入/离开过渡效果。
 * 支持 CSS 类名模式和 JS 钩子模式，支持 appear 首次挂载过渡，
 * 支持 mode 过渡模式（in-out / out-in）。
 * 纯原生实现，零外部依赖。
 */

import {
  defineComponent,
  type ComponentDefine,
  type ComponentOptions,
} from '../define-component';

// ============================================================
// 类型定义
// ============================================================

/** Transition 组件的 Props 接口 */
export interface TransitionProps {
  /** CSS 类名前缀，如 "fade" → fade-enter-active/fade-leave-active */
  name?: string;
  /** 初始渲染时是否应用过渡 */
  appear?: boolean;
  /** 过渡模式：'in-out' 先进入再离开，'out-in' 先离开再进入 */
  mode?: 'in-out' | 'out-in' | 'default';
  /** 过渡持续时间(ms)，用于超时回退 */
  duration?: number;
  /** 进入起始类名 */
  enterFromClass?: string;
  /** 进入激活类名 */
  enterActiveClass?: string;
  /** 进入结束类名 */
  enterToClass?: string;
  /** 离开起始类名 */
  leaveFromClass?: string;
  /** 离开激活类名 */
  leaveActiveClass?: string;
  /** 离开结束类名 */
  leaveToClass?: string;
  /** 进入前钩子 */
  onBeforeEnter?: (el: any) => void;
  /** 进入钩子（需调用 done 表示完成） */
  onEnter?: (el: any, done: () => void) => void;
  /** 进入完成钩子 */
  onAfterEnter?: (el: any) => void;
  /** 进入取消钩子 */
  onEnterCancelled?: (el: any) => void;
  /** 离开前钩子 */
  onBeforeLeave?: (el: any) => void;
  /** 离开钩子（需调用 done 表示完成） */
  onLeave?: (el: any, done: () => void) => void;
  /** 离开完成钩子 */
  onAfterLeave?: (el: any) => void;
  /** 离开取消钩子 */
  onLeaveCancelled?: (el: any) => void;
}

/** 过渡信息 */
interface TransitionInfo {
  /** 过渡类型：transition 或 animation */
  type: string | null;
  /** 过渡属性数量 */
  propCount: number;
  /** 过渡结束时间(ms) */
  timeout: number;
  /** 是否有过渡属性 */
  hasTransform: boolean;
}

// ============================================================
// 工具函数
// ============================================================

/**
 * 判断值是否为函数
 */
function isFunction(val: unknown): val is Function {
  return typeof val === 'function';
}

/**
 * 判断值是否为普通对象
 */
function isPlainObject(val: unknown): val is Record<string, any> {
  return val !== null && typeof val === 'object' && !Array.isArray(val);
}

/**
 * 下一帧工具函数
 *
 * 使用 requestAnimationFrame 双帧确保浏览器完成重排。
 * 第一帧：浏览器将 pending 的样式变更应用到 DOM
 * 第二帧：确保样式已生效，可以安全地添加下一组类名
 *
 * @param fn - 在下一帧执行的回调函数
 */
export function nextFrame(fn: () => void): void {
  requestAnimationFrame(() => {
    requestAnimationFrame(fn);
  });
}

/**
 * 给元素添加过渡类名
 *
 * @param el - 目标 DOM 元素
 * @param cls - 要添加的 CSS 类名
 */
export function addTransitionClass(el: Element, cls: string): void {
  if (cls && el) {
    el.classList.add(cls);
  }
}

/**
 * 移除元素的过渡类名
 *
 * @param el - 目标 DOM 元素
 * @param cls - 要移除的 CSS 类名
 */
export function removeTransitionClass(el: Element, cls: string): void {
  if (cls && el) {
    el.classList.remove(cls);
  }
}

/**
 * 获取元素的过渡属性信息
 *
 * 检测元素上 transition-duration 和 animation-duration，
 * 返回最长的持续时间作为过渡结束时间。
 *
 * @param el - 目标 DOM 元素
 * @param expectedType - 期望的过渡类型（'transition' 或 'animation'），不指定则自动检测
 * @returns 过渡信息对象
 */
export function getTransitionInfo(
  el: Element,
  expectedType?: string
): TransitionInfo {
  const styles = (window as any).getComputedStyle(el);
  const transitionDelays: string[] = (styles.transitionDelay || '').split(', ');
  const transitionDurations: string[] = (styles.transitionDuration || '').split(', ');
  const transitionTimeout = getTimeout(transitionDelays, transitionDurations);

  const animationDelays: string[] = (styles.animationDelay || '').split(', ');
  const animationDurations: string[] = (styles.animationDuration || '').split(', ');
  const animationTimeout = getTimeout(animationDelays, animationDurations);

  let type: string | null = null;
  let timeout = 0;
  let propCount = 0;

  // 根据期望类型或超时时间决定使用哪种过渡
  if (expectedType === 'transition') {
    if (transitionTimeout > 0) {
      type = 'transition';
      timeout = transitionTimeout;
      propCount = transitionDurations.length;
    }
  } else if (expectedType === 'animation') {
    if (animationTimeout > 0) {
      type = 'animation';
      timeout = animationTimeout;
      propCount = animationDurations.length;
    }
  } else {
    timeout = Math.max(transitionTimeout, animationTimeout);
    type = timeout > 0
      ? (transitionTimeout > animationTimeout ? 'transition' : 'animation')
      : null;
    propCount = type === 'transition'
      ? transitionDurations.length
      : animationDurations.length;
  }

  return {
    type,
    timeout,
    propCount,
    hasTransform:
      type === 'transition' &&
      (styles.transform as string || styles.webkitTransform as string) !== undefined,
  };
}

/**
 * 从延迟和持续时间数组中计算总超时时间
 *
 * @param delays - 延迟时间数组（如 ["0s", "0.2s"]）
 * @param durations - 持续时间数组（如 ["0.3s", "0.2s"]）
 * @returns 最长的延迟+持续时间(ms)
 */
function getTimeout(delays: string[], durations: string[]): number {
  while (delays.length < durations.length) {
    delays.push(delays[0] || '0s');
  }

  let maxTimeout = 0;
  for (let i = 0; i < delays.length; i++) {
    const delay = toMs(delays[i]);
    const duration = toMs(durations[i]);
    const total = delay + duration;
    if (total > maxTimeout) {
      maxTimeout = total;
    }
  }

  return maxTimeout;
}

/**
 * 将 CSS 时间字符串转换为毫秒数
 *
 * @param s - CSS 时间字符串（如 "0.3s"、"300ms"）
 * @returns 毫秒数
 */
function toMs(s: string): number {
  if (s === '') return 0;
  const match = s.match(/^([\d.]+)(ms|s)$/);
  if (!match) return 0;
  return parseFloat(match[1]) * (match[2] === 's' ? 1000 : 1);
}

/**
 * 等待过渡/动画结束
 *
 * 监听 transitionend / animationend 事件，或超时后强制完成。
 * 处理了多属性过渡的情况（需要等待所有属性完成）。
 *
 * @param el - 目标 DOM 元素
 * @param expectedType - 期望的过渡类型
 * @param timeout - 超时时间(ms)
 * @param cb - 过渡完成回调
 */
export function whenTransitionEnds(
  el: Element,
  expectedType: string | undefined,
  timeout: number,
  cb: () => void
): void {
  const info = getTransitionInfo(el, expectedType);
  const resolvedType = expectedType || info.type || 'transition';
  const resolvedTimeout = Math.max(info.timeout, timeout);

  let called = false;

  const onEnd = (event: Event) => {
    // 过滤非目标类型的事件
    if (event.target !== el) return;
    if (resolvedType !== 'transition' && (event as TransitionEvent).propertyName !== undefined) {
      // 对于 animation 类型，忽略 transitionend 事件
      if ((event as TransitionEvent).type === 'transitionend') return;
    }
    if (called) return;
    called = true;

    // 移除事件监听
    el.removeEventListener('transitionend', onEnd);
    el.removeEventListener('animationend', onEnd);
    cb();
  };

  // 监听过渡结束事件
  el.addEventListener('transitionend', onEnd);
  el.addEventListener('animationend', onEnd);

  // 超时回退：确保即使事件未触发也能完成过渡
  if (resolvedTimeout > 0) {
    setTimeout(() => {
      if (!called) {
        called = true;
        el.removeEventListener('transitionend', onEnd);
        el.removeEventListener('animationend', onEnd);
        cb();
      }
    }, resolvedTimeout + 16); // 加 16ms 容差
  }
}

// ============================================================
// Transition 组件实现
// ============================================================

/**
 * Transition 组件识别的 prop 键列表
 *
 * 用于框架在处理 Transition 组件时，识别哪些属性是 Transition 专有的，
 * 不应传递给子组件。
 */
export const TransitionPropsKeys: string[] = [
  'name',
  'appear',
  'mode',
  'duration',
  'enterFromClass',
  'enterActiveClass',
  'enterToClass',
  'leaveFromClass',
  'leaveActiveClass',
  'leaveToClass',
  'onBeforeEnter',
  'onEnter',
  'onAfterEnter',
  'onEnterCancelled',
  'onBeforeLeave',
  'onLeave',
  'onAfterLeave',
  'onLeaveCancelled',
];

/**
 * 执行进入过渡
 *
 * 流程：
 * 1. 调用 onBeforeEnter 钩子
 * 2. 添加 enter-from 类名
 * 3. 下一帧：移除 enter-from，添加 enter-to 和 enter-active
 * 4. 等待过渡完成
 * 5. 移除 enter-active 和 enter-to
 * 6. 调用 onAfterEnter 钩子
 *
 * @param el - 目标 DOM 元素
 * @param props - Transition 组件的 props
 */
function _performEnter(el: Element, props: TransitionProps): void {
  const {
    name = '',
    enterFromClass = name ? `${name}-enter-from` : '',
    enterActiveClass = name ? `${name}-enter-active` : '',
    enterToClass = name ? `${name}-enter-to` : '',
    onBeforeEnter,
    onEnter,
    onAfterEnter,
    duration,
  } = props;

  // 1. 调用进入前钩子
  if (isFunction(onBeforeEnter)) {
    onBeforeEnter(el);
  }

  // 2. 添加 enter-from 和 enter-active 类名
  addTransitionClass(el, enterFromClass);
  addTransitionClass(el, enterActiveClass);

  // 3. 下一帧开始过渡
  nextFrame(() => {
    // 移除 enter-from，添加 enter-to
    removeTransitionClass(el, enterFromClass);
    addTransitionClass(el, enterToClass);

    // 4. 等待过渡完成
    if (isFunction(onEnter)) {
      // JS 钩子模式：由用户控制何时调用 done
      onEnter(el, () => {
        finishEnter(el);
      });
    } else {
      // CSS 类名模式：自动检测过渡结束
      const resolvedDuration = duration || 0;
      whenTransitionEnds(el, undefined, resolvedDuration, () => {
        finishEnter(el);
      });
    }
  });

  /**
   * 完成进入过渡
   */
  function finishEnter(el: Element): void {
    removeTransitionClass(el, enterActiveClass);
    removeTransitionClass(el, enterToClass);

    if (isFunction(onAfterEnter)) {
      onAfterEnter(el);
    }
  }
}

/**
 * 执行离开过渡
 *
 * 流程：
 * 1. 调用 onBeforeLeave 钩子
 * 2. 添加 leave-from 和 leave-active 类名
 * 3. 下一帧：移除 leave-from，添加 leave-to
 * 4. 等待过渡完成
 * 5. 移除 leave-active 和 leave-to
 * 6. 调用 onAfterLeave 钩子
 *
 * @param el - 目标 DOM 元素
 * @param props - Transition 组件的 props
 * @param done - 过渡完成回调
 */
function _performLeave(el: Element, props: TransitionProps, done: () => void): void {
  const {
    name = '',
    leaveFromClass = name ? `${name}-leave-from` : '',
    leaveActiveClass = name ? `${name}-leave-active` : '',
    leaveToClass = name ? `${name}-leave-to` : '',
    onBeforeLeave,
    onLeave,
    onAfterLeave,
    duration,
  } = props;

  // 1. 调用离开前钩子
  if (isFunction(onBeforeLeave)) {
    onBeforeLeave(el);
  }

  // 2. 添加 leave-from 和 leave-active 类名
  addTransitionClass(el, leaveFromClass);
  addTransitionClass(el, leaveActiveClass);

  // 3. 下一帧开始过渡
  nextFrame(() => {
    // 移除 leave-from，添加 leave-to
    removeTransitionClass(el, leaveFromClass);
    addTransitionClass(el, leaveToClass);

    // 4. 等待过渡完成
    let finishCalled = false;

    const finishLeave = () => {
      if (finishCalled) return;
      finishCalled = true;

      removeTransitionClass(el, leaveActiveClass);
      removeTransitionClass(el, leaveToClass);

      if (isFunction(onAfterLeave)) {
        onAfterLeave(el);
      }

      done();
    };

    if (isFunction(onLeave)) {
      // JS 钩子模式：由用户控制何时调用 done
      onLeave(el, finishLeave);
    } else {
      // CSS 类名模式：自动检测过渡结束
      const resolvedDuration = duration || 0;
      whenTransitionEnds(el, undefined, resolvedDuration, finishLeave);
    }
  });
}

/**
 * Transition 内置过渡组件
 *
 * 控制单个子元素的进入/离开过渡效果。
 * 必须只有一个子元素作为内容。
 *
 * @example
 * ```ts
 * // CSS 类名模式
 * const FadeTransition = Transition;
 * // 使用时传入 name="fade"，CSS 中定义 .fade-enter-active, .fade-leave-active 等
 *
 * // JS 钩子模式
 * <transition
 *   :onBeforeEnter="el => el.style.opacity = '0'"
 *   :onEnter="(el, done) => { el.style.transition = 'opacity 0.3s'; el.style.opacity = '1'; done(); }"
 *   :onLeave="(el, done) => { el.style.transition = 'opacity 0.3s'; el.style.opacity = '0'; done(); }"
 * />
 * ```
 */
export const Transition: ComponentDefine = defineComponent({
  name: 'Transition',

  props: {
    name: { type: String, default: '' },
    appear: { type: Boolean, default: false },
    mode: { type: String, default: 'default' },
    duration: { type: Number, default: undefined },
    enterFromClass: { type: String, default: undefined },
    enterActiveClass: { type: String, default: undefined },
    enterToClass: { type: String, default: undefined },
    leaveFromClass: { type: String, default: undefined },
    leaveActiveClass: { type: String, default: undefined },
    leaveToClass: { type: String, default: undefined },
  },

  state() {
    return {
      /** 是否正在过渡中 */
      isTransitioning: false,
      /** 当前显示的子元素 key（用于 mode 切换） */
      currentKey: null as string | null,
      /** 是否已首次挂载（用于 appear 判断） */
      hasAppeared: false,
      /** 旧子元素引用（用于 mode 切换时暂存） */
      oldChild: null as any,
      /** 新子元素引用（用于 mode 切换时暂存） */
      newChild: null as any,
    };
  },

  init(props, state) {
    // 标记未首次挂载
    state.hasAppeared = false;
    state.isTransitioning = false;
  },

  render(h, instance) {
    const props = instance.props as unknown as TransitionProps;
    const state = instance.state;
    const slots = instance.slots;

    // 获取默认插槽内容（子元素）
    const children = slots.default ? slots.default() : null;

    // 过滤非 VNode 的子节点
    const rawChild = Array.isArray(children) ? children[0] : children;

    if (!rawChild) {
      return null;
    }

    // 检查子元素 key 是否变化（用于判断是否需要过渡）
    const childKey = rawChild.key || '';
    const hasChanged = state.currentKey !== null && state.currentKey !== childKey;

    // appear 模式：首次挂载时也应用进入过渡
    if (!state.hasAppeared && props.appear) {
      state.hasAppeared = true;
      // 标记需要进入过渡
      (rawChild as any).__transition_appear = true;
    }

    // 更新当前 key
    state.currentKey = childKey;

    // 处理 mode 过渡模式
    if (hasChanged && props.mode !== 'default') {
      // mode 处理在 DOM 操作层面完成
      // 这里标记过渡状态
      state.isTransitioning = true;
    }

    // 克隆子元素，附加过渡相关属性
    const clonedChild = rawChild;
    if (clonedChild && typeof clonedChild === 'object') {
      // 将过渡 props 附加到子元素上，供渲染器使用
      (clonedChild as any).__transition = {
        name: props.name,
        appear: props.appear,
        mode: props.mode,
        duration: props.duration,
        enterFromClass: props.enterFromClass,
        enterActiveClass: props.enterActiveClass,
        enterToClass: props.enterToClass,
        leaveFromClass: props.leaveFromClass,
        leaveActiveClass: props.leaveActiveClass,
        leaveToClass: props.leaveToClass,
        onBeforeEnter: props.onBeforeEnter,
        onEnter: props.onEnter,
        onAfterEnter: props.onAfterEnter,
        onEnterCancelled: props.onEnterCancelled,
        onBeforeLeave: props.onBeforeLeave,
        onLeave: props.onLeave,
        onAfterLeave: props.onAfterLeave,
        onLeaveCancelled: props.onLeaveCancelled,
      };
    }

    return clonedChild;
  },
});
