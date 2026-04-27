/**
 * Lyt.js TransitionGroup 内置列表过渡组件
 *
 * 继承 Transition 的所有功能，额外处理列表中元素的移动过渡（FLIP 动画技术）。
 * 使用 getBoundingClientRect 记录元素位置，在 DOM 更新后计算位移并应用 transform 动画。
 * 纯原生实现，零外部依赖。
 */

import {
  defineComponent,
  type ComponentDefine,
} from '../define-component';

import {
  type TransitionProps,
  nextFrame as _nextFrame,
  addTransitionClass,
  removeTransitionClass,
  getTransitionInfo as _getTransitionInfo,
  whenTransitionEnds,
} from './transition';

// ============================================================
// 类型定义
// ============================================================

/** TransitionGroup 组件的 Props 接口 */
export interface TransitionGroupProps extends TransitionProps {
  /** 包裹标签名，默认不渲染包裹元素（Fragment） */
  tag?: string;
  /** 移动过渡类名 */
  moveClass?: string;
}

/** FLIP 动画中的位置记录 */
interface FLIPPosition {
  /** 元素矩形信息 */
  rect: DOMRect;
  /** 对应的 DOM 元素 */
  el: HTMLElement;
}

// ============================================================
// 工具函数
// ============================================================

/**
 * 判断值是否为函数
 */
function _isFunction(val: unknown): val is Function {
  return typeof val === 'function';
}

/**
 * 判断值是否为普通对象
 */
function _isPlainObject(val: unknown): val is Record<string, any> {
  return val !== null && typeof val === 'object' && !Array.isArray(val);
}

/**
 * 执行 FLIP 动画（First, Last, Invert, Play）
 *
 * FLIP 动画技术：
 * 1. First：记录元素当前位置
 * 2. Last：DOM 更新后记录元素新位置
 * 3. Invert：计算差值，用 transform 将元素移回旧位置
 * 4. Play：移除 transform，让浏览器执行过渡动画
 *
 * @param positions - 旧位置记录数组
 * @param moveClass - 移动过渡类名
 */
function _performFLIP(positions: FLIPPosition[], moveClass: string): void {
  for (let i = 0; i < positions.length; i++) {
    const { rect: oldRect, el } = positions[i];

    // Last：获取元素当前位置
    const newRect = el.getBoundingClientRect();

    // 计算位移差值
    const dx = oldRect.left - newRect.left;
    const dy = oldRect.top - newRect.top;

    // 如果没有移动，跳过
    if (dx === 0 && dy === 0) {
      continue;
    }

    // Invert：用 transform 将元素移回旧位置
    el.style.transform = `translate(${dx}px, ${dy}px)`;
    el.style.transitionDuration = '0s';

    // Play：在下一帧移除 transform，触发过渡动画
    requestAnimationFrame(() => {
      // 强制重排，确保 transform 生效
      el.getBoundingClientRect();

      // 添加移动过渡类名
      if (moveClass) {
        addTransitionClass(el, moveClass);
      }

      // 移除 transform，触发过渡
      el.style.transform = '';
      el.style.transitionDuration = '';

      // 等待过渡完成后移除类名
      whenTransitionEnds(el, 'transition', 0, () => {
        if (moveClass) {
          removeTransitionClass(el, moveClass);
        }
      });
    });
  }
}

// ============================================================
// TransitionGroup 组件实现
// ============================================================

/**
 * TransitionGroup 内置列表过渡组件
 *
 * 处理列表中多个子元素的进入、离开和移动过渡。
 * 继承 Transition 的 CSS 类名和 JS 钩子功能，
 * 额外使用 FLIP 技术实现元素移动动画。
 *
 * @example
 * ```ts
 * // 列表过渡
 * <transition-group name="list" tag="ul">
 *   <li v-for="item in items" :key="item.id">
 *     {{ item.text }}
 *   </li>
 * </transition-group>
 *
 * // CSS 示例
 * // .list-enter-active, .list-leave-active { transition: all 0.3s; }
 * // .list-enter-from, .list-leave-to { opacity: 0; transform: translateX(30px); }
 * // .list-move { transition: transform 0.3s; }
 * ```
 */
export const TransitionGroup: ComponentDefine = defineComponent({
  name: 'TransitionGroup',

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
    tag: { type: String, default: undefined },
    moveClass: { type: String, default: undefined },
  },

  state() {
    return {
      /** 上一次渲染的子元素 key 集合 */
      prevChildrenKeys: new Set<string>(),
      /** 当前渲染的子元素 key 集合 */
      currentChildrenKeys: new Set<string>(),
      /** FLIP 位置记录 */
      positions: [] as FLIPPosition[],
      /** 是否已首次挂载 */
      hasAppeared: false,
    };
  },

  init(props, state) {
    state.hasAppeared = false;
    state.prevChildrenKeys = new Set();
    state.currentChildrenKeys = new Set();
    state.positions = [];
  },

  render(h, instance) {
    const props = instance.props as unknown as TransitionGroupProps;
    const state = instance.state;
    const slots = instance.slots;

    // 获取默认插槽内容（子元素列表）
    const children = slots.default ? slots.default() : null;

    // 标准化子元素为数组
    const rawChildren: any[] = Array.isArray(children)
      ? children
      : children !== null && children !== undefined ? [children] : [];

    // 提取当前子元素的 key 集合
    const newKeys = new Set<string>();
    for (let i = 0; i < rawChildren.length; i++) {
      const child = rawChildren[i];
      if (child && typeof child === 'object') {
        const key = child.key !== null && child.key !== undefined ? String(child.key) : `__tg_${i}`;
        newKeys.add(key);
      }
    }

    // 确定离开的元素和进入的元素
    const leavingKeys = new Set<string>();
    const enteringKeys = new Set<string>();

    // 离开的元素：在上一次存在但当前不存在
    state.prevChildrenKeys.forEach((key: string) => {
      if (!newKeys.has(key)) {
        leavingKeys.add(key);
      }
    });

    // 进入的元素：在当前存在但上一次不存在
    newKeys.forEach(key => {
      if (!state.prevChildrenKeys.has(key)) {
        enteringKeys.add(key);
      }
    });

    // 保存旧 key 集合用于下次比较
    state.prevChildrenKeys = new Set(newKeys);

    // 为每个子元素附加过渡信息
    const transitionName = props.name || '';
    const moveClassName = props.moveClass || (transitionName ? `${transitionName}-move` : '');

    const processedChildren = rawChildren.map((child, index) => {
      if (!child || typeof child !== 'object') {
        return child;
      }

      const key = child.key !== null && child.key !== undefined ? String(child.key) : `__tg_${index}`;
      const isEntering = enteringKeys.has(key);
      const isLeaving = leavingKeys.has(key);

      // 克隆子元素，附加过渡属性
      const cloned = { ...child };

      (cloned as any).__transition_group = {
        name: transitionName,
        appear: props.appear,
        duration: props.duration,
        enterFromClass: props.enterFromClass || (transitionName ? `${transitionName}-enter-from` : ''),
        enterActiveClass: props.enterActiveClass || (transitionName ? `${transitionName}-enter-active` : ''),
        enterToClass: props.enterToClass || (transitionName ? `${transitionName}-enter-to` : ''),
        leaveFromClass: props.leaveFromClass || (transitionName ? `${transitionName}-leave-from` : ''),
        leaveActiveClass: props.leaveActiveClass || (transitionName ? `${transitionName}-leave-active` : ''),
        leaveToClass: props.leaveToClass || (transitionName ? `${transitionName}-leave-to` : ''),
        moveClass: moveClassName,
        isEntering,
        isLeaving,
        onBeforeEnter: props.onBeforeEnter,
        onEnter: props.onEnter,
        onAfterEnter: props.onAfterEnter,
        onEnterCancelled: props.onEnterCancelled,
        onBeforeLeave: props.onBeforeLeave,
        onLeave: props.onLeave,
        onAfterLeave: props.onAfterLeave,
        onLeaveCancelled: props.onLeaveCancelled,
      };

      return cloned;
    });

    // 如果有 tag，返回包裹元素；否则返回 Fragment
    const tag = props.tag;
    if (tag) {
      return {
        tag,
        children: processedChildren,
        __transition_group_wrapper: true,
      };
    }

    return processedChildren;
  },
});
