/**
 * @lytjs/ui - Container 组件
 *
 * 容器组件，用于布局
 */

import type { ContainerProps, ContainerSlots } from './types';
import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { isString, isObject } from '@lytjs/common-is';

/**
 * Container 组件
 */
export const Container = defineComponent({
  name: 'LytContainer',

  props: {
    fluid: { type: Boolean, default: false },
    class: { type: String, default: '' },
    style: { type: String, default: '' },
  },

  setup(props: any, { slots }: any) {
    const getContainerClass = () => {
      const classes = ['lyt-container'];
      if (props.fluid) {
        classes.push('lyt-container--fluid');
      }
      if (props.class) {
        classes.push(props.class);
      }
      return classes.join(' ');
    };

    const getContainerStyle = () => {
      if (!props.style) return undefined;
      if (isString(props.style)) return props.style;
      if (isObject(props.style)) {
        return Object.entries(props.style)
          .map(([key, value]) => `${key}: ${value}`)
          .join('; ');
      }
      return undefined;
    };

    return () => {
      const children: VNode[] = [];
      if (slots.default) {
        children.push(...slots.default());
      }

      return createVNode('div', {
        class: getContainerClass(),
        style: getContainerStyle(),
      }, children);
    };
  },
});

export type { ContainerProps, ContainerSlots };
