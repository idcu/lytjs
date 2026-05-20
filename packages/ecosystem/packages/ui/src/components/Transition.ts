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
    name: { type: String, default: 'fade' },
    appear: { type: Boolean, default: false },
    mode: { type: String, default: '' },
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
