// src/transition-group.ts
// TransitionGroup component definition

import type { ComponentOptions, SetupContext } from './types';

// ==================== TransitionGroup Props ====================

export interface TransitionGroupComponentProps {
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
  onBeforeEnter?: (el: Element) => void;
  onEnter?: (el: Element, done: () => void) => void;
  onAfterEnter?: (el: Element) => void;
  onEnterCancelled?: (el: Element) => void;
  onBeforeLeave?: (el: Element) => void;
  onLeave?: (el: Element, done: () => void) => void;
  onAfterLeave?: (el: Element) => void;
  onLeaveCancelled?: (el: Element) => void;
}

// ==================== TransitionGroup Component ====================

export const TransitionGroup: ComponentOptions = {
  name: 'TransitionGroup',

  props: {
    name: { type: String },
    appear: { type: Boolean, default: false },
    tag: { type: [String, Boolean] as any },
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

  setup(_props: Record<string, unknown>, { slots }: SetupContext) {
    return (() => {
      return slots.default?.();
    }) as unknown as void;
  },
};
