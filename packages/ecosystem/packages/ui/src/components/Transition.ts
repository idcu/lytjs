/**
 * @lytjs/ui - Transition 组件
 *
 * 过渡动画组件，支持进入/离开动画
 */

import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';

export interface TransitionSetupProps {
  name: string;
  appear: boolean;
  mode: string;
  duration: number;
  class: string;
}

export interface TransitionSlots {
  default?: () => VNode[];
}

export const Transition = defineComponent({
  name: 'LytTransition',

  props: {
    // ⚠️ 2026-10-04 移除 `appear` / `mode` —— 本组件是**纯 CSS class 包装**
    //   （只输出 `${name}-transition` / `${name}-item`，无响应式状态、无
    //   transitionend / getComputedStyle 等过渡逻辑）⇒ 这两个 prop 描述的是
    //   **尚未实现的过渡能力**。待真正实现进入/离开时序时再加回。
    name: { type: String, default: 'fade' },
    duration: { type: Number, default: 300 },
    class: { type: String, default: '' },
  },

  setup(props: Record<string, unknown>, { slots }: { slots: TransitionSlots }) {
    const p = props as unknown as TransitionSetupProps;

    const getTransitionClass = () => {
      const classes = [`${p.name}-transition`];
      if (p.class) {
        classes.push(p.class);
      }
      return classes.join(' ');
    };

    const getTransitionStyle = () => {
      return `transition-duration: ${p.duration}ms;`;
    };

    return () => {
      return createVNode(
        'div',
        {
          class: getTransitionClass(),
          style: getTransitionStyle(),
        },
        slots.default?.(),
      );
    };
  },
});

export interface TransitionGroupSetupProps {
  name: string;
  tag: string;
  duration: number;
  class: string;
}

export interface TransitionGroupSlots {
  default?: () => VNode[];
}

export const TransitionGroup = defineComponent({
  name: 'LytTransitionGroup',

  props: {
    name: { type: String, default: 'list' },
    tag: { type: String, default: 'div' },
    duration: { type: Number, default: 300 },
    class: { type: String, default: '' },
  },

  setup(props: Record<string, unknown>, { slots }: { slots: TransitionGroupSlots }) {
    const p = props as unknown as TransitionGroupSetupProps;

    return () => {
      const children = slots.default?.() || [];

      const wrappedChildren: VNode[] = children.map((child: VNode, index: number) =>
        createVNode(
          'div',
          {
            key: (child as unknown as { key?: string | number }).key || index,
            class: `${p.name}-item`,
            style: `transition: all ${p.duration}ms ease;`,
          },
          [child],
        ),
      );

      return createVNode(
        p.tag as string,
        {
          class: `lyt-transition-group ${p.class}`,
        },
        wrappedChildren,
      );
    };
  },
});

export default { Transition, TransitionGroup };
