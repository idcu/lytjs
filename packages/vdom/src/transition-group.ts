/**
 * @lytjs/vdom - transition-group
 * TransitionGroup component support using FLIP animation technique
 * Provides smooth list item transitions: enter, leave, and move
 *
 * 泛型化重构：所有函数均支持通过 RendererHost<HN, HE> 接口进行平台无关调用。
 * 当 host 参数为 undefined 时，回退到直接 DOM 操作（向后兼容）。
 */

import type { RendererHost, HostRect } from '@lytjs/host-contract';
import type { TransitionProps } from './transition';
import { getTransitionInfoDOM, waitForTransitionEndDOM, globalTransitionPrefix } from './transition';

// ============================================================
// TransitionGroupProps
// ============================================================

/**
 * TransitionGroup 过渡属性（泛型版本）。
 * @template HE - 宿主元素类型
 */
export interface TransitionGroupProps<HE = unknown> extends TransitionProps<HE> {
  /** Container tag name. If false/undefined, no container element is rendered. */
  tag?: string | false;
  /** Whether to also apply move transitions using FLIP technique */
  moveClass?: string;
}

/**
 * @deprecated 使用 TransitionGroupProps<HE> 代替。
 */
export type LegacyTransitionGroupProps = TransitionGroupProps<Element>;

// ============================================================
// FLIP animation state
// ============================================================

interface FLIPState {
  /** Map of element keys to their old positions (before DOM update) */
  oldPositions: Map<string, HostRect>;
  /** Map of element keys to their new positions (after DOM update) */
  newPositions: Map<string, HostRect>;
}

// ============================================================
// 内部辅助函数
// ============================================================

/**
 * FLIP 动画的位移阈值（像素）。
 * 当位移小于此值时，跳过动画以避免不必要的计算。
 */
const flipThreshold = 0.5;

/**
 * 对单个 DOM 元素应用 FLIP 动画。
 * FIX: P2-7 提取共享的 DOM FLIP 逻辑为独立函数，避免代码重复。
 *
 * @param child - 目标 DOM 元素
 * @param oldRect - 元素旧位置
 * @param moveClass - 移动动画类名
 * @returns 是否成功应用动画
 */
// FIX: DTS build error - 使用 HostRect 替代 DOMRect
function applyFLIPToDOMElement(
  child: Element,
  oldRect: { left: number; top: number },
  moveClass: string,
): boolean {
  const newRect = child.getBoundingClientRect();
  const dx = oldRect.left - newRect.left;
  const dy = oldRect.top - newRect.top;

  // FIX: P2-13 使用 flipThreshold 替代硬编码的 0 检查
  if (Math.abs(dx) < flipThreshold && Math.abs(dy) < flipThreshold) return false;

  (child as HTMLElement).style.transform = `translate(${dx}px, ${dy}px)`;
  (child as HTMLElement).style.transition = 'none';
  void (child as HTMLElement).offsetHeight;
  (child as HTMLElement).style.transform = '';
  (child as HTMLElement).style.transition = '';

  child.classList.add(moveClass);

  const styles = getComputedStyle(child);
  const transitionDurations = styles.getPropertyValue('transitionDuration').split(',').map(v => v.trim());
  const hasTransition = transitionDurations.some(d => d !== '0s');

  if (!hasTransition) {
    child.classList.remove(moveClass);
    return false;
  }

  // FIX: P1-12 调整声明顺序，将 cleanup 引用 onMoveEnd 的问题修复
  const onMoveEnd = (event: Event) => {
    if (event.target !== child) return;
    cleanup();
  };

  const cleanup = () => {
    child.classList.remove(moveClass);
    child.removeEventListener('transitionend', onMoveEnd);
    child.removeEventListener('animationend', onMoveEnd);
  };

  child.addEventListener('transitionend', onMoveEnd);
  child.addEventListener('animationend', onMoveEnd);

  const durationStr = transitionDurations.reduce((max, d) => {
    if (d.endsWith('ms')) return Math.max(max, parseFloat(d));
    if (d.endsWith('s')) return Math.max(max, parseFloat(d) * 1000);
    return max;
  }, 0);
  const duration = durationStr > 0 ? durationStr + 50 : 3000;
  setTimeout(cleanup, duration);

  return true;
}

/**
 * 获取子元素的唯一 key。
 * 优先使用 data-key 属性，回退到元素索引。
 */
function getChildKey<HN, HE extends HN>(
  host: RendererHost<HN, HE>,
  el: HE,
  index: number,
): string | null {
  const key = host.getAttribute(el, 'data-key');
  if (key !== null) return key;
  return `__idx_${index}`;
}

function getChildKeyDOM(el: Element, index: number): string | null {
  const key = el.getAttribute('data-key');
  if (key !== null) return key;
  return `__idx_${index}`;
}



// ============================================================
// FLIP animation helpers
// ============================================================

/**
 * Record the current positions of all child elements.
 * Should be called before the DOM update (in beforeUpdate).
 *
 * @param hostOrChildren - RendererHost 实例或子元素数组（向后兼容）
 * @param children - 当第一个参数为 host 时，此为子元素数组
 */
export function recordPositions<HN, HE extends HN>(
  host: RendererHost<HN, HE>,
  children: HE[],
): Map<string, HostRect>;
export function recordPositions(children: Element[]): Map<string, DOMRect>;
export function recordPositions<HN, HE extends HN>(
  hostOrChildren: RendererHost<HN, HE> | Element[],
  children?: HE[],
): Map<string, HostRect> | Map<string, DOMRect> {
  if (Array.isArray(hostOrChildren)) {
    // 向后兼容：(children: Element[])
    const positions = new Map<string, DOMRect>();
    for (let i = 0; i < hostOrChildren.length; i++) {
      const child = hostOrChildren[i];
      if (!child) continue;
      const key = getChildKeyDOM(child, i);
      if (key !== null) {
        positions.set(key, child.getBoundingClientRect());
      }
    }
    return positions;
  } else {
    // 泛型版本：(host, children)
    const host = hostOrChildren as RendererHost<HN, HE>;
    const kids = children!;
    const positions = new Map<string, HostRect>();
    for (let i = 0; i < kids.length; i++) {
      const child = kids[i];
      if (!child) continue;
      const key = getChildKey(host, child, i);
      if (key !== null) {
        positions.set(key, host.getBoundingClientRect(child));
      }
    }
    return positions;
  }
}

/**
 * Apply FLIP animation to moved elements.
 * Compares old and new positions, applies inverse transform, then animates to final position.
 *
 * @param hostOrChildren - RendererHost 实例或子元素数组（向后兼容）
 * @param childrenOrOld - 当第一个参数为 host 时，此为子元素数组；否则为旧位置映射
 * @param oldPositionsOrMove - 当第一个参数为 host 时，此为旧位置映射；否则为移动类名
 * @param moveClass - 当第一个参数为 host 时，此为移动类名
 */
export function applyFLIP<HN, HE extends HN>(
  host: RendererHost<HN, HE>,
  children: HE[],
  oldPositions: Map<string, HostRect>,
  moveClass: string,
): void;
export function applyFLIP(
  children: Element[],
  oldPositions: Map<string, DOMRect>,
  moveClass: string,
): void;
export function applyFLIP<HN, HE extends HN>(
  hostOrChildren: RendererHost<HN, HE> | Element[],
  childrenOrOld: HE[] | Map<string, DOMRect>,
  oldPositionsOrMove?: Map<string, HostRect> | string,
  moveClass?: string,
): void {
  if (Array.isArray(hostOrChildren)) {
    // 向后兼容：(children: Element[], oldPositions: Map<string, DOMRect>, moveClass: string)
    // FIX: P2-7 使用提取的 applyFLIPToDOMElement 函数避免代码重复
    const children = hostOrChildren as Element[];
    const oldPositions = childrenOrOld as Map<string, DOMRect>;
    const mc = oldPositionsOrMove as string;

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (!child) continue;
      const key = getChildKeyDOM(child, i);
      if (key === null) continue;

      const oldRect = oldPositions.get(key);
      if (!oldRect) continue;

      applyFLIPToDOMElement(child, oldRect, mc);
    }
  } else {
    // 泛型版本：(host, children, oldPositions, moveClass)
    const host = hostOrChildren as RendererHost<HN, HE>;
    const kids = childrenOrOld as HE[];
    const oldPositions = oldPositionsOrMove as Map<string, HostRect>;
    const mc = moveClass!;

    for (let i = 0; i < kids.length; i++) {
      const child = kids[i];
      if (!child) continue;
      const key = getChildKey(host, child, i);
      if (key === null) continue;

      const oldRect = oldPositions.get(key);
      if (!oldRect) continue;

      const newRect = host.getBoundingClientRect(child);
      const dx = oldRect.left - newRect.left;
      const dy = oldRect.top - newRect.top;

      // FIX: P2-13 使用 flipThreshold 替代硬编码的 0 检查
      if (Math.abs(dx) < flipThreshold && Math.abs(dy) < flipThreshold) continue;

      host.setStyle(child, 'transform', `translate(${dx}px, ${dy}px)`);
      host.setStyle(child, 'transition', 'none');
      host.forceReflow(child);
      host.setStyle(child, 'transform', '');
      host.setStyle(child, 'transition', '');

      host.addClass(child, mc);

      const info = host.getTransitionInfo(child, 'enter');
      if (!info.hasTransition && !info.hasAnimation) {
        host.removeClass(child, mc);
      } else {
        // FIX: P1-12 / P2-15 调整声明顺序：onMoveEnd -> dispose -> cleanup -> setTimeout。
        // 虽然 JavaScript 闭包允许后声明的变量在回调中被引用（因为回调执行时
        // 变量已经初始化），但按逻辑依赖顺序声明使代码更易读和维护。
        const onMoveEnd = (event: unknown) => {
          const hostEvent = event as { target: unknown };
          if (hostEvent.target !== child) return;
          cleanup();
        };

        const disposeTransition = host.addEventListener(child, 'transitionend', onMoveEnd as never);
        const disposeAnimation = host.addEventListener(child, 'animationend', onMoveEnd as never);

        const cleanup = () => {
          host.removeClass(child, mc);
          disposeTransition();
          disposeAnimation();
        };

        const duration = info.duration > 0 ? info.duration + 50 : 3000;
        host.setTimeout(cleanup, duration);
      }
    }
  }
}

// ============================================================
// TransitionGroup enter/leave
// ============================================================

/**
 * Perform enter transition for a new child element in a TransitionGroup.
 *
 * @param hostOrEl - RendererHost 实例或 DOM Element（向后兼容）
 * @param elOrProps - 当第一个参数为 host 时，此为元素；否则为过渡属性
 * @param propsOrDone - 当第一个参数为 host 时，此为过渡属性；否则为完成回调
 * @param done - 当第一个参数为 host 时，此为完成回调
 */
export function performGroupEnterTransition<HN, HE extends HN>(
  host: RendererHost<HN, HE>,
  el: HE,
  props: TransitionGroupProps<HE>,
  done: () => void,
): void;
export function performGroupEnterTransition(
  el: Element,
  props: TransitionGroupProps<Element>,
  done: () => void,
): void;
export function performGroupEnterTransition<HN, HE extends HN>(
  hostOrEl: RendererHost<HN, HE> | Element,
  elOrProps: HE | TransitionGroupProps<Element>,
  propsOrDone?: TransitionGroupProps<HE> | (() => void),
  done?: () => void,
): void {
  if (typeof elOrProps === 'object' && elOrProps !== null && 'name' in elOrProps) {
    // 向后兼容：(el: Element, props, done)
    const el = hostOrEl as Element;
    const props = elOrProps as TransitionGroupProps<Element>;
    const doneFn = propsOrDone as () => void;

    // FIX: P1-7 使用 globalTransitionPrefix 替代硬编码的 'v'
    const name = props.name ?? globalTransitionPrefix;
    el.classList.add(`${name}-enter-from`);
    el.classList.add(`${name}-enter-active`);
    void el.getBoundingClientRect();
    el.classList.remove(`${name}-enter-from`);
    el.classList.add(`${name}-enter-to`);

    if (props.onEnter) {
      props.onEnter(el, () => {
        el.classList.remove(`${name}-enter-active`);
        el.classList.remove(`${name}-enter-to`);
        if (props.onAfterEnter) props.onAfterEnter(el);
        doneFn();
      });
    } else {
      el.classList.remove(`${name}-enter-active`);
      el.classList.remove(`${name}-enter-to`);
      if (props.onAfterEnter) props.onAfterEnter(el);
      doneFn();
    }
  } else {
    // 泛型版本：(host, el, props, done)
    const host = hostOrEl as RendererHost<HN, HE>;
    const el = elOrProps as HE;
    const props = propsOrDone as TransitionGroupProps<HE>;
    const doneFn = done!;

    // FIX: P1-7 使用 globalTransitionPrefix 替代硬编码的 'v'
    const name = props.name ?? globalTransitionPrefix;
    const from = props.enterFromClass ?? `${name}-enter-from`;
    const active = props.enterActiveClass ?? `${name}-enter-active`;
    const to = props.enterToClass ?? `${name}-enter-to`;

    if (props.onBeforeEnter) {
      props.onBeforeEnter(el);
    }

    host.addClass(el, from);
    host.addClass(el, active);
    host.forceReflow(el);
    host.removeClass(el, from);
    host.addClass(el, to);

    if (props.onEnter) {
      props.onEnter(el, () => {
        host.removeClass(el, active);
        host.removeClass(el, to);
        if (props.onAfterEnter) props.onAfterEnter(el);
        doneFn();
      });
    } else {
      const info = host.getTransitionInfo(el, 'enter');
      if (info.hasTransition || info.hasAnimation) {
        const finish = () => {
          host.removeClass(el, active);
          host.removeClass(el, to);
          if (props.onAfterEnter) props.onAfterEnter(el);
          doneFn();
        };
        if (info.duration > 0) {
          host.setTimeout(finish, info.duration + 50);
        } else {
          // FIX: P2-19 保存 timeoutId 并在 onEnd 回调中清除，
          // 避免过渡正常完成后 setTimeout 仍然执行导致重复调用 finish()。
          // FIX: P2-20 调整声明顺序：使用 let 声明 onEnd 以避免 TDZ 问题，
          // 同时添加 finished 标志防止 finish() 被多次调用。
          let fallbackTimerId: ReturnType<typeof host.setTimeout> | undefined;
          let finished = false;
          // 使用 const 声明，函数内部通过闭包引用 disposeT/disposeA
          const onEnd = (event: unknown) => {
            const e = event as { target: unknown };
            if (e.target !== el) return;
            if (finished) return;
            finished = true;
            disposeT();
            disposeA();
            if (fallbackTimerId !== undefined) {
              host.clearTimeout(fallbackTimerId);
              fallbackTimerId = undefined;
            }
            finish();
          };
          const disposeT = host.addEventListener(el, 'transitionend', onEnd as never);
          const disposeA = host.addEventListener(el, 'animationend', onEnd as never);
          fallbackTimerId = host.setTimeout(() => {
            if (finished) return;
            finished = true;
            disposeT(); disposeA(); finish();
          }, 3000);
        }
      } else {
        host.removeClass(el, active);
        host.removeClass(el, to);
        if (props.onAfterEnter) props.onAfterEnter(el);
        doneFn();
      }
    }
  }
}

/**
 * Perform leave transition for a removed child element in a TransitionGroup.
 * After the leave transition completes, the element is removed from the DOM.
 *
 * @param hostOrEl - RendererHost 实例或 DOM Element（向后兼容）
 * @param elOrProps - 当第一个参数为 host 时，此为元素；否则为过渡属性
 * @param propsOrRemove - 当第一个参数为 host 时，此为过渡属性；否则为移除回调
 * @param removeElement - 当第一个参数为 host 时，此为移除回调
 */
export function performGroupLeaveTransition<HN, HE extends HN>(
  host: RendererHost<HN, HE>,
  el: HE,
  props: TransitionGroupProps<HE>,
  removeElement: () => void,
): void;
export function performGroupLeaveTransition(
  el: Element,
  props: TransitionGroupProps<Element>,
  removeElement: () => void,
): void;
export function performGroupLeaveTransition<HN, HE extends HN>(
  hostOrEl: RendererHost<HN, HE> | Element,
  elOrProps: HE | TransitionGroupProps<Element>,
  propsOrRemove?: TransitionGroupProps<HE> | (() => void),
  removeElement?: () => void,
): void {
  if (typeof elOrProps === 'object' && elOrProps !== null && 'name' in elOrProps) {
    // 向后兼容：(el: Element, props, removeElement)
    const el = hostOrEl as Element;
    const props = elOrProps as TransitionGroupProps<Element>;
    const removeFn = propsOrRemove as () => void;

    // FIX: P1-7 使用 globalTransitionPrefix 替代硬编码的 'v'
    const name = props.name ?? globalTransitionPrefix;
    el.classList.add(`${name}-leave-from`);
    el.classList.add(`${name}-leave-active`);
    void el.getBoundingClientRect();
    el.classList.remove(`${name}-leave-from`);
    el.classList.add(`${name}-leave-to`);

    // FIX: P1-13 DOM 回退版 leave 动画修复：添加 CSS 过渡检测和等待逻辑，
    // 避免在 leave 动画未完成时就移除元素
    if (props.onLeave) {
      props.onLeave(el, () => {
        el.classList.remove(`${name}-leave-active`);
        el.classList.remove(`${name}-leave-to`);
        if (props.onAfterLeave) props.onAfterLeave(el);
        removeFn();
      });
    } else {
      const info = getTransitionInfoDOM(el, 'leave');
      if (info.hasTransition || info.hasAnimation) {
        const finish = () => {
          el.classList.remove(`${name}-leave-active`);
          el.classList.remove(`${name}-leave-to`);
          if (props.onAfterLeave) props.onAfterLeave(el);
          removeFn();
        };
        if (info.duration > 0) {
          setTimeout(finish, info.duration + 50);
        } else {
          waitForTransitionEndDOM(el, info, finish);
        }
      } else {
        el.classList.remove(`${name}-leave-active`);
        el.classList.remove(`${name}-leave-to`);
        if (props.onAfterLeave) props.onAfterLeave(el);
        removeFn();
      }
    }
  } else {
    // 泛型版本：(host, el, props, removeElement)
    const host = hostOrEl as RendererHost<HN, HE>;
    const el = elOrProps as HE;
    const props = propsOrRemove as TransitionGroupProps<HE>;
    const removeFn = removeElement!;

    // FIX: P1-7 使用 globalTransitionPrefix 替代硬编码的 'v'
    const name = props.name ?? globalTransitionPrefix;
    const from = props.leaveFromClass ?? `${name}-leave-from`;
    const active = props.leaveActiveClass ?? `${name}-leave-active`;
    const to = props.leaveToClass ?? `${name}-leave-to`;

    if (props.onBeforeLeave) {
      props.onBeforeLeave(el);
    }

    host.addClass(el, from);
    host.addClass(el, active);
    host.forceReflow(el);
    host.removeClass(el, from);
    host.addClass(el, to);

    if (props.onLeave) {
      props.onLeave(el, () => {
        host.removeClass(el, active);
        host.removeClass(el, to);
        if (props.onAfterLeave) props.onAfterLeave(el);
        removeFn();
      });
    } else {
      const info = host.getTransitionInfo(el, 'leave');
      if (info.hasTransition || info.hasAnimation) {
        const finish = () => {
          host.removeClass(el, active);
          host.removeClass(el, to);
          if (props.onAfterLeave) props.onAfterLeave(el);
          removeFn();
        };
        if (info.duration > 0) {
          host.setTimeout(finish, info.duration + 50);
        } else {
          // FIX: P2-6 调整声明顺序：onEnd 引用 disposeT/disposeA，
          // 使用 const 声明，函数内部通过闭包引用 disposeT/disposeA
          const onEnd = (event: unknown) => {
            const e = event as { target: unknown };
            if (e.target !== el) return;
            disposeT();
            disposeA();
            finish();
          };
          const disposeT = host.addEventListener(el, 'transitionend', onEnd as never);
          const disposeA = host.addEventListener(el, 'animationend', onEnd as never);
          host.setTimeout(() => { disposeT(); disposeA(); finish(); }, 3000);
        }
      } else {
        host.removeClass(el, active);
        host.removeClass(el, to);
        if (props.onAfterLeave) props.onAfterLeave(el);
        removeFn();
      }
    }
  }
}

// ============================================================
// TransitionGroup state management
// ============================================================

/**
 * Create FLIP state for tracking position changes.
 */
export function createFLIPState(): FLIPState {
  return {
    oldPositions: new Map(),
    newPositions: new Map(),
  };
}

/**
 * Prepare for a DOM update by recording current child positions.
 *
 * @param hostOrState - RendererHost 实例或 FLIPState（向后兼容）
 * @param stateOrChildren - 当第一个参数为 host 时，此为 FLIPState；否则为子元素数组
 * @param children - 当第一个参数为 host 时，此为子元素数组
 */
export function beforeUpdate<HN, HE extends HN>(
  host: RendererHost<HN, HE>,
  state: FLIPState,
  children: HE[],
): void;
export function beforeUpdate(state: FLIPState, children: Element[]): void;
export function beforeUpdate<HN, HE extends HN>(
  hostOrState: RendererHost<HN, HE> | FLIPState,
  stateOrChildren: FLIPState | HE[] | Element[],
  children?: HE[],
): void {
  if ('oldPositions' in hostOrState && 'newPositions' in hostOrState) {
    // 向后兼容：(state, children)
    const state = hostOrState as FLIPState;
    const kids = stateOrChildren as Element[];
    const positions = new Map<string, HostRect>();
    for (let i = 0; i < kids.length; i++) {
      const child = kids[i];
      if (!child) continue;
      const key = getChildKeyDOM(child, i);
      if (key !== null) {
        positions.set(key, child.getBoundingClientRect());
      }
    }
    state.oldPositions = positions;
  } else {
    // 泛型版本：(host, state, children)
    const host = hostOrState as RendererHost<HN, HE>;
    const state = stateOrChildren as FLIPState;
    const kids = children!;
    state.oldPositions = recordPositions(host, kids) as Map<string, HostRect>;
  }
}

/**
 * After DOM update, apply FLIP animations for moved elements.
 *
 * @param hostOrState - RendererHost 实例或 FLIPState（向后兼容）
 * @param stateOrChildren - 当第一个参数为 host 时，此为 FLIPState；否则为子元素数组
 * @param childrenOrMove - 当第一个参数为 host 时，此为子元素数组；否则为移动类名
 * @param moveClass - 当第一个参数为 host 时，此为移动类名
 */
export function afterUpdate<HN, HE extends HN>(
  host: RendererHost<HN, HE>,
  state: FLIPState,
  children: HE[],
  moveClass: string,
): void;
export function afterUpdate(
  state: FLIPState,
  children: Element[],
  moveClass: string,
): void;
export function afterUpdate<HN, HE extends HN>(
  hostOrState: RendererHost<HN, HE> | FLIPState,
  stateOrChildren: FLIPState | HE[] | Element[],
  childrenOrMove?: HE[] | Element[] | string,
  moveClass?: string,
): void {
  if ('oldPositions' in hostOrState && 'newPositions' in hostOrState) {
    // 向后兼容：(state, children, moveClass)
    const state = hostOrState as FLIPState;
    const kids = stateOrChildren as Element[];
    const mc = childrenOrMove as string;

    const newPositions = new Map<string, HostRect>();
    for (let i = 0; i < kids.length; i++) {
      const child = kids[i];
      if (!child) continue;
      const key = getChildKeyDOM(child, i);
      if (key !== null) {
        newPositions.set(key, child.getBoundingClientRect());
      }
    }
    state.newPositions = newPositions;

    // 使用 DOM 回退的 FLIP 逻辑
    // FIX: P2-7 使用提取的 applyFLIPToDOMElement 函数避免代码重复
    for (let i = 0; i < kids.length; i++) {
      const child = kids[i];
      if (!child) continue;
      const key = getChildKeyDOM(child, i);
      if (key === null) continue;

      const oldRect = state.oldPositions.get(key);
      if (!oldRect) continue;

      applyFLIPToDOMElement(child, oldRect, mc);
    }
  } else {
    // 泛型版本：(host, state, children, moveClass)
    const host = hostOrState as RendererHost<HN, HE>;
    const state = stateOrChildren as FLIPState;
    const kids = childrenOrMove as HE[];
    const mc = moveClass!;

    state.newPositions = recordPositions(host, kids) as Map<string, HostRect>;
    applyFLIP(host, kids, state.oldPositions, mc);
  }
}
