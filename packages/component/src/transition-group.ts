// src/transition-group.ts
// TransitionGroup 组件定义
//
// 泛型化重构：TransitionGroupComponentProps 中的回调类型从 Element 改为泛型 HE。
// 保留 TransitionGroupComponentPropsLegacy 类型别名以确保向后兼容。

import type { ComponentOptions, SetupContext } from './types';
import { createVNode } from '@lytjs/vdom';
import type { VNode } from '@lytjs/vdom';
import { warn } from '@lytjs/common-error';

// ==================== TransitionGroup Props ====================

/**
 * TransitionGroup 组件属性（泛型版本）。
 * @template HE - 宿主元素类型
 */
export interface TransitionGroupComponentProps<HE = unknown> {
  name?: string;
  appear?: boolean;
  tag?: string | false;
  moveClass?: string;
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
 * @deprecated 使用 TransitionGroupComponentProps<HE> 代替。
 * 保留此类型别名以确保向后兼容。
 */
export type TransitionGroupComponentPropsLegacy = TransitionGroupComponentProps<Element>;

// ==================== TransitionGroup Component ====================

/**
 * 声明了、但**当前尚未接线**的过渡属性。
 *
 * 正确的组过渡需要 FLIP 前后两帧的 DOM 快照（`recordPositions` → 改 DOM → `applyFLIP`），
 * 只能在 patch 层完成；`@lytjs/vdom` 已有整套工具（`recordPositions` / `applyFLIP` /
 * `performGroupEnterTransition` / `performGroupLeaveTransition` / `beforeUpdate` / `afterUpdate`），
 * 但**没有任何调用方**。组件侧拿不到"哪些子节点是新增/被删"的差分，因此无法在此正确实现。
 *
 * 现状口径：`tag` 生效（结构性，组件侧可完整实现）；下面这些**不生效**，
 * 且在 DEV 下会明确告警 —— 沉默地"接受但不做事"比报错更难排查。
 */
const UNWIRED_TRANSITION_PROPS = [
  'name',
  'moveClass',
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
] as const;

export const TransitionGroup: ComponentOptions = {
  name: 'TransitionGroup',

  props: {
    name: { type: String },
    appear: { type: Boolean, default: false },
    tag: { type: [String, Boolean] as unknown as new () => string | boolean },
    moveClass: { type: String },
    enterFromClass: { type: String },
    enterActiveClass: { type: String },
    enterToClass: { type: String },
    leaveFromClass: { type: String },
    leaveActiveClass: { type: String },
    leaveToClass: { type: String },
    onBeforeEnter: { type: Function },
    onEnter: { type: Function },
    onAfterEnter: { type: Function },
    onEnterCancelled: { type: Function },
    onBeforeLeave: { type: Function },
    onLeave: { type: Function },
    onAfterLeave: { type: Function },
    onLeaveCancelled: { type: Function },
  },

  // FIX: DTS build error - 添加类型断言
  setup(props: Record<string, unknown>, { slots }: SetupContext) {
    // ★ 2026-10-25：`tag` 此前**完全不生效** —— setup 直接返回 `slots.default()`，
    //   于是 `<TransitionGroup tag="ul">` 渲染出来没有 `<ul>`（组件名与 props 都在承诺
    //   "有包裹元素"，实际是无包裹 Fragment）。这里补上唯一一个组件侧能完整实现的属性。
    if (__DEV__) {
      const received = UNWIRED_TRANSITION_PROPS.filter((key) => props[key] !== undefined);
      if (received.length > 0) {
        warn(
          `<TransitionGroup> 收到过渡属性 [${received.join(', ')}]，但它们**尚未接线**` +
            `（组过渡需要 patch 层的 FLIP 快照，当前无调用方）；目前只有 tag 生效。`,
        );
      }
    }

    return (() => {
      const children = (slots.default?.() ?? []) as VNode[];
      const tag = props.tag;

      if (typeof tag === 'string' && tag !== '') {
        return createVNode(tag, null, children) as unknown as VNode;
      }

      // `tag: false` 与未传同义：不包裹，直接返回子节点（保持既有行为）
      return children as unknown as VNode;
    }) as unknown as () => VNode;
  },
};
