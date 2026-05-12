/**
 * @lytjs/vdom - transition
 * Vue 3 风格 Transition 组件支持
 * 提供 CSS/JS transition 钩子用于 enter、leave 和 appear 动画
 *
 * 泛型化重构：所有函数均支持通过 RendererHost<HN, HE> 接口进行平台无关调用。
 * 当 host 参数为 undefined 时，回退到直接 DOM 操作（向后兼容）。
 *
 * 集成 @lytjs/common-transition-engine 作为底层过渡引擎。
 */

import type { RendererHost, TransitionDurationInfo } from '@lytjs/host-contract';
import { parseDuration } from '@lytjs/common-string';
import { TransitionEngine } from '@lytjs/common-transition-engine';

// ============================================================
// TransitionProps
// ============================================================

/**
 * 过渡属性（泛型版本）。
 * @template HE - 宿主元素类型
 */
export interface TransitionProps<HE = unknown> {
  name?: string;
  appear?: boolean;
  mode?: 'in-out' | 'out-in' | 'default';
  enterFromClass?: string;
  enterActiveClass?: string;
  enterToClass?: string;
  leaveFromClass?: string;
  leaveActiveClass?: string;
  leaveToClass?: string;
  onBeforeEnter?: (el: HE) => void;
  onEnter?: (el: HE, done: () => void) => void;
  onAfterEnter?: (el: HE) => void;
  onEnterCancelled?: (el: HE) => void;
  onBeforeLeave?: (el: HE) => void;
  onLeave?: (el: HE, done: () => void) => void;
  onAfterLeave?: (el: HE) => void;
  onLeaveCancelled?: (el: HE) => void;
}

/**
 * @deprecated 使用 TransitionProps<HE> 代替。
 * 保留此类型别名以确保向后兼容。
 */
export type LegacyTransitionProps = TransitionProps<Element>;

// ============================================================
// 内部 transition 状态
// ============================================================

export interface TransitionState {
  /** transition 是否正在进行 */
  isLeaving: boolean;
  /** 元素是否已插入 DOM */
  isInserted: boolean;
  /** 待执行的 leave 回调（用于 mode: out-in） */
  pendingLeaveCallback: (() => void) | null;
  /** 待执行的 enter 回调（用于 mode: in-out） */
  pendingEnterCallback: (() => void) | null;
}

// ============================================================
// 内部：transition 清理 WeakMap
// ============================================================

// FIX: P2-18 使用复合 key 机制避免同一元素上不同过渡的 cleanup 冲突。
// transitionCleanupMap: 存储每个 cleanup symbol 对应的清理函数
const transitionCleanupMap = new Map<symbol, () => void>();
// elementCleanupKeys: 追踪每个元素关联的所有 cleanup symbol，用于 cancelTransition
const elementCleanupKeys = new WeakMap<object, Set<symbol>>();

// ============================================================
// 全局 transition 前缀配置
// ============================================================

// FIX: P0-3 将 globalTransitionPrefix 和 setTransitionPrefix 移到文件顶部（模块顶层）
// FIX: P1-7 导出 globalTransitionPrefix，供 transition-group.ts 使用
export let globalTransitionPrefix = 'v';

export function setTransitionPrefix(prefix: string): void {
  globalTransitionPrefix = prefix;
}

// ============================================================
// TransitionEngine 实例管理
// ============================================================

/**
 * TransitionEngine 实例缓存（按 host 实例缓存）。
 * key: RendererHost 实例的 WeakMap key
 * value: TransitionEngine 实例
 */
const engineCache = new WeakMap<RendererHost<any, any>, TransitionEngine<any, any>>();

/**
 * 获取或创建指定 host 的 TransitionEngine 实例。
 * @param host - RendererHost 实例
 * @returns TransitionEngine 实例
 */
function getOrCreateEngine<HN extends object, HE extends HN>(
  host: RendererHost<HN, HE>,
): TransitionEngine<HN, HE> {
  let engine = engineCache.get(host);
  if (!engine) {
    engine = new TransitionEngine<HN, HE>(host);
    engineCache.set(host, engine);
  }
  return engine as TransitionEngine<HN, HE>;
}

// ============================================================
// 内部辅助函数（DOM 回退用）
// ============================================================

/**
 * 获取 CSS 属性值为字符串数组（处理逗号分隔的值）。
 */
function getStylePropAsArray(styles: CSSStyleDeclaration, prop: string): string[] {
  const value = styles.getPropertyValue(prop);
  if (!value) return [];
  return value.split(',').map((v) => v.trim());
}

/**
 * DOM 回退：获取过渡信息。
 */
export function getTransitionInfoDOM(
  el: Element,
  _type: 'enter' | 'leave',
): TransitionDurationInfo {
  const styles = getComputedStyle(el);
  const transitionDelays = getStylePropAsArray(styles, 'transitionDelay');
  const transitionDurations = getStylePropAsArray(styles, 'transitionDuration');
  const animationDelays = getStylePropAsArray(styles, 'animationDelay');
  const animationDurations = getStylePropAsArray(styles, 'animationDuration');

  const hasTransition =
    transitionDurations.some((d) => d !== '0s') || transitionDelays.some((d) => d !== '0s');
  const hasAnimation =
    animationDurations.some((d) => d !== '0s') || animationDelays.some((d) => d !== '0s');

  let duration = 0;

  if (hasTransition) {
    const maxDuration = Math.max(
      ...transitionDurations.map(
        (d, i) => parseDuration(d) + parseDuration(transitionDelays[i] ?? '0s'),
      ),
    );
    duration = Math.max(duration, maxDuration);
  }

  if (hasAnimation) {
    const maxDuration = Math.max(
      ...animationDurations.map(
        (d, i) => parseDuration(d) + parseDuration(animationDelays[i] ?? '0s'),
      ),
    );
    duration = Math.max(duration, maxDuration);
  }

  return { duration, hasTransition, hasAnimation };
}

// ============================================================
// 解析 transition 类名
// ============================================================

function resolveTransitionClasses<HE>(
  props: TransitionProps<HE>,
  type: 'enter' | 'leave',
): { from: string; active: string; to: string } {
  // FIX: P0-3 使用 globalTransitionPrefix 替代硬编码的 'v'
  const name = props.name ?? globalTransitionPrefix;

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

// ============================================================
// 辅助函数：nextFrame
// ============================================================

/**
 * 调度回调在下一个动画帧运行。
 * 使用双重 rAF 确保浏览器有机会绘制。
 *
 * 当传入 host 时，通过 host.nextFrame 执行（平台无关）。
 * 当不传 host 时，直接使用 requestAnimationFrame（DOM 回退）。
 *
 * @param hostOrFn - RendererHost 实例或回调函数（向后兼容）
 * @param fn - 当第一个参数为 host 时，此为回调函数
 */
export function nextFrame<HN, HE extends HN>(host: RendererHost<HN, HE>, fn: () => void): void;
export function nextFrame(fn: () => void): void;
export function nextFrame<HN, HE extends HN>(
  hostOrFn: RendererHost<HN, HE> | (() => void),
  fn?: () => void,
): void {
  if (typeof hostOrFn === 'function') {
    // 向后兼容：直接使用 requestAnimationFrame
    requestAnimationFrame(() => {
      requestAnimationFrame(hostOrFn);
    });
  } else {
    // 泛型版本：通过 host 调用
    hostOrFn.nextFrame(fn!);
  }
}

// ============================================================
// 辅助函数：addTransitionClass / removeTransitionClass
// ============================================================

/**
 * 为元素添加 CSS 类用于 transition。
 *
 * @param hostOrEl - RendererHost 实例或 DOM Element（向后兼容）
 * @param elOrCls - 当第一个参数为 host 时，此为元素；否则为 CSS 类名
 * @param cls - 当第一个参数为 host 时，此为 CSS 类名
 */
export function addTransitionClass<HN, HE extends HN>(
  host: RendererHost<HN, HE>,
  el: HE,
  cls: string,
): void;
export function addTransitionClass(el: Element, cls: string): void;
export function addTransitionClass<HN, HE extends HN>(
  hostOrEl: RendererHost<HN, HE> | Element,
  elOrCls: HE | string,
  cls?: string,
): void {
  if (typeof elOrCls === 'string') {
    // 向后兼容：(el: Element, cls: string)
    (hostOrEl as Element).classList.add(elOrCls);
  } else {
    // 泛型版本：(host, el, cls)
    (hostOrEl as RendererHost<HN, HE>).addClass(elOrCls, cls!);
  }
}

/**
 * 从元素移除 CSS 类用于 transition。
 *
 * @param hostOrEl - RendererHost 实例或 DOM Element（向后兼容）
 * @param elOrCls - 当第一个参数为 host 时，此为元素；否则为 CSS 类名
 * @param cls - 当第一个参数为 host 时，此为 CSS 类名
 */
export function removeTransitionClass<HN, HE extends HN>(
  host: RendererHost<HN, HE>,
  el: HE,
  cls: string,
): void;
export function removeTransitionClass(el: Element, cls: string): void;
export function removeTransitionClass<HN, HE extends HN>(
  hostOrEl: RendererHost<HN, HE> | Element,
  elOrCls: HE | string,
  cls?: string,
): void {
  if (typeof elOrCls === 'string') {
    // 向后兼容：(el: Element, cls: string)
    (hostOrEl as Element).classList.remove(elOrCls);
  } else {
    // 泛型版本：(host, el, cls)
    (hostOrEl as RendererHost<HN, HE>).removeClass(elOrCls, cls!);
  }
}

// ============================================================
// 辅助函数：getTransitionInfo
// ============================================================

/**
 * 从元素的计算样式获取 transition 持续时间信息。
 * 同时检查 CSS transition 和 animation。
 *
 * @param hostOrEl - RendererHost 实例或 DOM Element（向后兼容）
 * @param elOrType - 当第一个参数为 host 时，此为元素；否则为过渡类型
 * @param type - 当第一个参数为 host 时，此为过渡类型
 */
export function getTransitionInfo<HN, HE extends HN>(
  host: RendererHost<HN, HE>,
  el: HE,
  type: 'enter' | 'leave',
): TransitionDurationInfo;
export function getTransitionInfo(el: Element, type: 'enter' | 'leave'): TransitionDurationInfo;
export function getTransitionInfo<HN, HE extends HN>(
  hostOrEl: RendererHost<HN, HE> | Element,
  elOrType: HE | 'enter' | 'leave',
  type?: 'enter' | 'leave',
): TransitionDurationInfo {
  if (typeof elOrType === 'string') {
    // 向后兼容：(el: Element, type: 'enter' | 'leave')
    return getTransitionInfoDOM(hostOrEl as Element, elOrType as 'enter' | 'leave');
  } else {
    // 泛型版本：(host, el, type)
    const info = (hostOrEl as RendererHost<HN, HE>).getTransitionInfo(elOrType, type!);
    return {
      duration: info.duration,
      hasTransition: info.hasTransition,
      hasAnimation: info.hasAnimation,
    };
  }
}

// ============================================================
// 辅助函数：hasCSSTransition
// ============================================================

/**
 * 检查元素是否定义了 CSS transition 或 animation
 * for the given transition name and type (enter/leave).
 *
 * @param hostOrEl - RendererHost 实例或 DOM Element（向后兼容）
 * @param elOrName - 当第一个参数为 host 时，此为元素；否则为过渡名称
 * @param nameOrType - 当第一个参数为 host 时，此为过渡名称；否则为过渡类型
 * @param type - 当第一个参数为 host 时，此为过渡类型
 */
export function hasCSSTransition<HN, HE extends HN>(
  host: RendererHost<HN, HE>,
  el: HE,
  name: string | undefined,
  type: 'enter' | 'leave',
): boolean;
export function hasCSSTransition(
  el: Element,
  name: string | undefined,
  type: 'enter' | 'leave',
): boolean;
export function hasCSSTransition<HN, HE extends HN>(
  hostOrEl: RendererHost<HN, HE> | Element,
  elOrName: HE | string | undefined,
  nameOrType?: string | undefined | 'enter' | 'leave',
  type?: 'enter' | 'leave',
): boolean {
  if (typeof elOrName === 'string' || elOrName === undefined) {
    // 向后兼容：(el: Element, name: string | undefined, type: 'enter' | 'leave')
    const el = hostOrEl as Element;
    const name = elOrName as string | undefined;
    const t = nameOrType as 'enter' | 'leave';

    if (!name) {
      const info = getTransitionInfoDOM(el, t);
      return info.hasTransition || info.hasAnimation;
    }

    const fromClass = t === 'enter' ? `${name}-from` : `${name}-leave-from`;
    const activeClass = t === 'enter' ? `${name}-enter-active` : `${name}-leave-active`;
    const toClass = t === 'enter' ? `${name}-enter-to` : `${name}-leave-to`;

    const hasFromClass = el.classList.contains(fromClass);
    const hasActiveClass = el.classList.contains(activeClass);
    const hasToClass = el.classList.contains(toClass);

    if (hasActiveClass) {
      const info = getTransitionInfoDOM(el, t);
      return info.hasTransition || info.hasAnimation;
    }

    return hasFromClass || hasActiveClass || hasToClass;
  } else {
    // 泛型版本：(host, el, name, type)
    const host = hostOrEl as RendererHost<HN, HE>;
    const el = elOrName as HE;
    const name = nameOrType as string | undefined;
    const t = type!;

    if (!name) {
      const info = host.getTransitionInfo(el, t);
      return info.hasTransition || info.hasAnimation;
    }

    const fromClass = t === 'enter' ? `${name}-from` : `${name}-leave-from`;
    const activeClass = t === 'enter' ? `${name}-enter-active` : `${name}-leave-active`;
    const toClass = t === 'enter' ? `${name}-enter-to` : `${name}-leave-to`;

    const hasFromClass = host.hasClass(el, fromClass);
    const hasActiveClass = host.hasClass(el, activeClass);
    const hasToClass = host.hasClass(el, toClass);

    if (hasActiveClass) {
      const info = host.getTransitionInfo(el, t);
      return info.hasTransition || info.hasAnimation;
    }

    return hasFromClass || hasActiveClass || hasToClass;
  }
}

// ============================================================
// Enter transition
// ============================================================

/**
 * 在给定元素上执行 enter transition。
 * 同时支持 CSS transition 和 JS 钩子。
 *
 * @param hostOrEl - RendererHost 实例或 DOM Element（向后兼容）
 * @param elOrProps - 当第一个参数为 host 时，此为元素；否则为过渡属性
 * @param propsOrDone - 当第一个参数为 host 时，此为过渡属性；否则为完成回调
 * @param done - 当第一个参数为 host 时，此为完成回调
 */
export function performEnterTransition<HN, HE extends HN>(
  host: RendererHost<HN, HE>,
  el: HE,
  props: TransitionProps<HE>,
  done: () => void,
): void;
export function performEnterTransition(
  el: Element,
  props: TransitionProps<Element>,
  done: () => void,
): void;
export function performEnterTransition<HN, HE extends HN>(
  hostOrEl: RendererHost<HN, HE> | Element,
  elOrProps: HE | TransitionProps<Element>,
  propsOrDone?: TransitionProps<HE> | (() => void),
  done?: () => void,
): void {
  // FIX: P1-11 使用 __isRendererHost 标识符号替代鸭子类型检测，
  // 与 P0-03 的 patch.ts 检测逻辑保持一致
  // FIX: DTS build error - 先转换为 unknown 再转换为 Record
  const isHost =
    hostOrEl !== null &&
    typeof hostOrEl === 'object' &&
    '__isRendererHost' in (hostOrEl as unknown as Record<string, unknown>) &&
    (hostOrEl as unknown as Record<string, unknown>).__isRendererHost === true;

  if (isHost) {
    // 泛型版本：(host, el, props, done)
    // 使用 TransitionEngine 执行过渡
    const host = hostOrEl as RendererHost<HN, HE>;
    const el = elOrProps as HE;
    const props = propsOrDone as TransitionProps<HE>;
    const doneFn = done!;

    const engine = getOrCreateEngine(host);
    engine.performEnter(el, props, doneFn);
  } else {
    // 向后兼容：(el: Element, props: TransitionProps<Element>, done: () => void)
    const el = hostOrEl as Element;
    const props = elOrProps as TransitionProps<Element>;
    const doneFn = propsOrDone as () => void;

    const classes = resolveTransitionClasses(props, 'enter');

    if (props.onBeforeEnter) {
      props.onBeforeEnter(el);
    }

    el.classList.add(classes.from);
    el.classList.add(classes.active);
    void el.getBoundingClientRect();
    el.classList.remove(classes.from);
    el.classList.add(classes.to);

    if (props.onEnter) {
      props.onEnter(el, () => {
        el.classList.remove(classes.active);
        el.classList.remove(classes.to);
        if (props.onAfterEnter) props.onAfterEnter(el);
        doneFn();
      });
    } else {
      const info = getTransitionInfoDOM(el, 'enter');
      if (info.hasTransition || info.hasAnimation) {
        let timer: ReturnType<typeof setTimeout> | undefined;
        let cleanupKey: symbol | undefined;
        const cleanupFn = () => {
          if (timer !== undefined) {
            clearTimeout(timer);
          }
        };
        const finish = () => {
          // 执行清理
          if (cleanupKey) {
            cleanupFn();
            transitionCleanupMap.delete(cleanupKey);
            const keys = elementCleanupKeys.get(el as object);
            keys?.delete(cleanupKey);
          }
          el.classList.remove(classes.active);
          el.classList.remove(classes.to);
          if (props.onAfterEnter) props.onAfterEnter(el);
          doneFn();
        };
        if (info.duration > 0) {
          // FIX: 存储定时器以便后续清理
          cleanupKey = Symbol('transition-cleanup-enter-timeout-dom');
          transitionCleanupMap.set(cleanupKey, cleanupFn);
          let keys = elementCleanupKeys.get(el as object);
          if (!keys) {
            keys = new Set();
            elementCleanupKeys.set(el as object, keys);
          }
          keys.add(cleanupKey);
          timer = setTimeout(finish, info.duration + 50);
        } else {
          waitForTransitionEndDOM(el, info, finish);
        }
      } else {
        el.classList.remove(classes.active);
        el.classList.remove(classes.to);
        if (props.onAfterEnter) props.onAfterEnter(el);
        doneFn();
      }
    }
  }
}

// ============================================================
// Leave transition
// ============================================================

/**
 * 在给定元素上执行 leave transition。
 * 同时支持 CSS transition 和 JS 钩子。
 *
 * @param hostOrEl - RendererHost 实例或 DOM Element（向后兼容）
 * @param elOrProps - 当第一个参数为 host 时，此为元素；否则为过渡属性
 * @param propsOrDone - 当第一个参数为 host 时，此为过渡属性；否则为完成回调
 * @param done - 当第一个参数为 host 时，此为完成回调
 */
export function performLeaveTransition<HN, HE extends HN>(
  host: RendererHost<HN, HE>,
  el: HE,
  props: TransitionProps<HE>,
  done: () => void,
): void;
export function performLeaveTransition(
  el: Element,
  props: TransitionProps<Element>,
  done: () => void,
): void;
// FIX: P0-3 修复 performLeaveTransition 函数签名被模块级代码打断的问题
// 已移除插入在重载签名和实现签名之间的模块级代码（globalTransitionPrefix 和 setTransitionPrefix）
export function performLeaveTransition<HN, HE extends HN>(
  hostOrEl: RendererHost<HN, HE> | Element,
  elOrProps: HE | TransitionProps<Element>,
  propsOrDone?: TransitionProps<HE> | (() => void),
  done?: () => void,
): void {
  // FIX: P1-11 使用 __isRendererHost 标识符号替代鸭子类型检测
  // FIX: DTS build error - 先转换为 unknown 再转换为 Record
  const isHost =
    hostOrEl !== null &&
    typeof hostOrEl === 'object' &&
    '__isRendererHost' in (hostOrEl as unknown as Record<string, unknown>) &&
    (hostOrEl as unknown as Record<string, unknown>).__isRendererHost === true;

  if (isHost) {
    // 泛型版本：(host, el, props, done)
    // 使用 TransitionEngine 执行过渡
    const host = hostOrEl as RendererHost<HN, HE>;
    const el = elOrProps as HE;
    const props = propsOrDone as TransitionProps<HE>;
    const doneFn = done!;

    const engine = getOrCreateEngine(host);
    engine.performLeave(el, props, doneFn);
  } else {
    // 向后兼容：(el: Element, props: TransitionProps<Element>, done: () => void)
    const el = hostOrEl as Element;
    const props = elOrProps as TransitionProps<Element>;
    const doneFn = propsOrDone as () => void;

    const classes = resolveTransitionClasses(props, 'leave');

    if (props.onBeforeLeave) {
      props.onBeforeLeave(el);
    }

    el.classList.add(classes.from);
    el.classList.add(classes.active);
    void el.getBoundingClientRect();
    el.classList.remove(classes.from);
    el.classList.add(classes.to);

    if (props.onLeave) {
      props.onLeave(el, () => {
        el.classList.remove(classes.active);
        el.classList.remove(classes.to);
        if (props.onAfterLeave) props.onAfterLeave(el);
        doneFn();
      });
    } else {
      const info = getTransitionInfoDOM(el, 'leave');
      if (info.hasTransition || info.hasAnimation) {
        let timer: ReturnType<typeof setTimeout> | undefined;
        let cleanupKey: symbol | undefined;
        const cleanupFn = () => {
          if (timer !== undefined) {
            clearTimeout(timer);
          }
        };
        const finish = () => {
          // 执行清理
          if (cleanupKey) {
            cleanupFn();
            transitionCleanupMap.delete(cleanupKey);
            const keys = elementCleanupKeys.get(el as object);
            keys?.delete(cleanupKey);
          }
          el.classList.remove(classes.active);
          el.classList.remove(classes.to);
          if (props.onAfterLeave) props.onAfterLeave(el);
          doneFn();
        };
        if (info.duration > 0) {
          // FIX: 存储定时器以便后续清理
          cleanupKey = Symbol('transition-cleanup-leave-timeout-dom');
          transitionCleanupMap.set(cleanupKey, cleanupFn);
          let keys = elementCleanupKeys.get(el as object);
          if (!keys) {
            keys = new Set();
            elementCleanupKeys.set(el as object, keys);
          }
          keys.add(cleanupKey);
          timer = setTimeout(finish, info.duration + 50);
        } else {
          waitForTransitionEndDOM(el, info, finish);
        }
      } else {
        el.classList.remove(classes.active);
        el.classList.remove(classes.to);
        if (props.onAfterLeave) props.onAfterLeave(el);
        doneFn();
      }
    }
  }
}

// ============================================================
// 等待 transition/animation 结束（泛型版本）
// ============================================================

/**
 * 等待元素上的 CSS transitionend 或 animationend 事件。
 * 如果未检测到事件则回退到超时。
 */
function waitForTransitionEnd<HN, HE extends HN>(
  host: RendererHost<HN, HE>,
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
  const timeout = info.duration > 0 ? info.duration + 50 : 3000;
  const timer = host.setTimeout(finish, timeout);

  // 创建事件处理函数
  const onEnd = (event: unknown) => {
    const hostEvent = event as { target: unknown; type: string };
    if (hostEvent.target !== el) return;

    host.clearTimeout(timer);
    finish();
  };

  // 通过 host 添加事件监听
  const disposeTransition = host.addEventListener(el, 'transitionend', onEnd as never);
  const disposeAnimation = host.addEventListener(el, 'animationend', onEnd as never);

  // 存储清理函数
  // FIX: P2-18 使用复合 key 避免同一元素上不同过渡的 cleanup 冲突。
  // 当同一元素快速触发多次过渡（如 enter -> leave）时，使用 el 作为唯一 key
  // 会导致后注册的 cleanup 覆盖前一个。改为使用 Symbol 作为唯一标识，
  // 确保每次过渡都有独立的 cleanup 函数。
  const cleanupKey = Symbol('transition-cleanup');
  const cleanupFn = () => {
    host.clearTimeout(timer);
    disposeTransition();
    disposeAnimation();
  };
  transitionCleanupMap.set(cleanupKey, cleanupFn);

  // 追踪元素与 cleanup key 的关联，供 cancelTransition 使用
  let keys = elementCleanupKeys.get(el as object);
  if (!keys) {
    keys = new Set();
    elementCleanupKeys.set(el as object, keys);
  }
  keys.add(cleanupKey);

  // FIX: P2-18 正常完成后清理 transitionCleanupMap 条目，避免内存泄漏
  const originalFinish = finish;
  const wrappedFinish = () => {
    cleanupFn();
    transitionCleanupMap.delete(cleanupKey);
    keys?.delete(cleanupKey);
    originalFinish();
  };
  // 替换 done 回调以确保清理
  done = wrappedFinish;
}

/**
 * DOM 回退：等待过渡/动画结束。
 */
export function waitForTransitionEndDOM(
  el: Element,
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

  const timeout = info.duration > 0 ? info.duration + 50 : 3000;
  const timer = setTimeout(finish, timeout);

  // FIX: P0-6 修复 DOM 回退版变量声明顺序问题
  // 将 pendingAnimations 声明移到 onEnd 之前，避免 onEnd 引用尚未声明的变量
  const animations = getStylePropAsArray(getComputedStyle(el), 'animationName');
  const pendingAnimations = new Set(animations);

  const onEnd = (event: Event) => {
    if (event.target !== el) return;

    if (event.type === 'animationend') {
      const animationName = (event as AnimationEvent).animationName;
      pendingAnimations.delete(animationName);
      if (pendingAnimations.size > 0) return;
    }

    clearTimeout(timer);
    finish();
  };

  el.addEventListener('transitionend', onEnd);
  el.addEventListener('animationend', onEnd);

  // FIX: P2-18 DOM 回退版也使用复合 key 机制
  const cleanupKey = Symbol('transition-cleanup-dom');
  const cleanupFn = () => {
    clearTimeout(timer);
    el.removeEventListener('transitionend', onEnd);
    el.removeEventListener('animationend', onEnd);
  };
  transitionCleanupMap.set(cleanupKey, cleanupFn);

  let keys = elementCleanupKeys.get(el as object);
  if (!keys) {
    keys = new Set();
    elementCleanupKeys.set(el as object, keys);
  }
  keys.add(cleanupKey);

  // FIX: P2-18 正常完成后清理 transitionCleanupMap 条目，避免内存泄漏
  const originalDone = done;
  const wrappedDone = () => {
    cleanupFn();
    transitionCleanupMap.delete(cleanupKey);
    keys?.delete(cleanupKey);
    originalDone();
  };
  // 替换 done 回调以确保清理
  done = wrappedDone;
}

// ============================================================
// 取消 transition
// ============================================================

/**
 * 取消给定元素上正在进行的 transition。
 *
 * @param hostOrEl - RendererHost 实例或 DOM Element（向后兼容）
 * @param el - 当第一个参数为 host 时，此为宿主元素
 */
export function cancelTransition<HN, HE extends HN>(host: RendererHost<HN, HE>, el: HE): void;
export function cancelTransition(el: Element): void;
export function cancelTransition<HN, HE extends HN>(
  hostOrEl: RendererHost<HN, HE> | Element,
  el?: HE,
): void {
  // 确定实际元素引用
  const target = el ?? (hostOrEl as unknown as object);

  // FIX: P2-18 使用复合 key 机制取消过渡。
  // 通过 elementCleanupKeys 查找元素关联的所有 cleanup key，
  // 逐个执行清理并删除，确保同一元素上的多个过渡都能被正确取消。
  const keys = elementCleanupKeys.get(target);
  if (keys) {
    for (const key of keys) {
      const cleanup = transitionCleanupMap.get(key);
      if (cleanup) {
        cleanup();
        transitionCleanupMap.delete(key);
      }
    }
    keys.clear();
    elementCleanupKeys.delete(target);
  }
}

// ============================================================
// 创建 transition 状态
// ============================================================

/**
 * 创建新的 transition 状态对象用于跟踪 transition 生命周期。
 */
export function createTransitionState(): TransitionState {
  return {
    isLeaving: false,
    isInserted: false,
    pendingLeaveCallback: null,
    pendingEnterCallback: null,
  };
}
