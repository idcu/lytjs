// src/transition.ts
// Transition component definition
//
// 泛型化重构：TransitionComponentProps 中的回调类型从 Element 改为泛型 HE。
// 保留 TransitionComponentPropsLegacy 类型别名以确保向后兼容。

import type { ComponentOptions, SetupContext } from './types';

// ==================== Transition Props ====================

/**
 * Transition 组件属性（泛型版本）。
 * @template HE - 宿主元素类型
 */
export interface TransitionComponentProps<HE = unknown> {
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
 * @deprecated 使用 TransitionComponentProps<HE> 代替。
 * 保留此类型别名以确保向后兼容。
 */
export type TransitionComponentPropsLegacy = TransitionComponentProps<Element>;

// ==================== Transition Component ====================

export const Transition: ComponentOptions = {
  name: 'Transition',

  props: {
    name: { type: String },
    appear: { type: Boolean, default: false },
    mode: { type: String, default: 'default' },
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

  setup(_props: Record<string, unknown>, { slots }: SetupContext) {
    return (() => {
      return slots.default?.();
    }) as unknown as void;
  },
};
