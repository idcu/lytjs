/**
 * @lytjs/ui - Transition 组件
 *
 * 过渡动画组件，支持进入/离开动画
 */

import { defineComponent } from '@lytjs/component';
import { createVNode } from '@lytjs/vdom';

/**
 * Transition 组件
 */
export const Transition = defineComponent({
  name: 'LytTransition',

  props: {
    name: { type: String, default: 'fade' },
    appear: { type: Boolean, default: false },
    mode: { type: String, default: '' },
    duration: { type: Number, default: 300 },
    class: { type: String, default: '' },
  },

  setup(props: any, { slots }: any) {
    // 生成类名
    const getTransitionClass = () => {
      const classes = [`${props.name}-transition`];
      if (props.class) {
        classes.push(props.class);
      }
      return classes.join(' ');
    };

    // 生成样式
    const getTransitionStyle = () => {
      return `transition-duration: ${props.duration}ms;`;
    };

    return () => {
      return createVNode('div', {
        class: getTransitionClass(),
        style: getTransitionStyle(),
      }, slots.default?.());
    };
  },
});

/**
 * TransitionGroup 组件
 */
export const TransitionGroup = defineComponent({
  name: 'LytTransitionGroup',

  props: {
    name: { type: String, default: 'list' },
    tag: { type: String, default: 'div' },
    duration: { type: Number, default: 300 },
    class: { type: String, default: '' },
  },

  setup(props: any, { slots }: any) {
    return () => {
      const children = slots.default?.() || [];
      
      const wrappedChildren = children.map((child: any, index: number) =>
        createVNode('div', {
          key: child.key || index,
          class: `${props.name}-item`,
          style: `transition: all ${props.duration}ms ease;`,
        }, [child])
      );

      return createVNode(props.tag, {
        class: `lyt-transition-group ${props.class}`,
      }, wrappedChildren);
    };
  },
});

export default { Transition, TransitionGroup };
