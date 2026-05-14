/**
 * @lytjs/ui - Divider 组件
 *
 * 分割线组件
 */

import type { DividerProps, DividerSlots } from './types';
import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { isString, isObject } from '@lytjs/common-is';
import { mergeA11yProps } from '@lytjs/common-a11y';

/**
 * Divider 组件
 */
export const Divider = defineComponent({
  name: 'LytDivider',

  props: {
    type: { type: String, default: 'horizontal' },
    contentPosition: { type: String, default: 'center' },
    class: { type: String, default: '' },
    style: { type: String, default: '' },
    id: { type: String, default: '' },
    ariaLabel: { type: String, default: '' },
    ariaDescribedBy: { type: String, default: '' },
  },

  setup(props: any, { slots }: any) {
    const getDividerClass = () => {
      const classes = ['lyt-divider'];
      if (props.type !== 'horizontal') {
        classes.push(`lyt-divider--${props.type}`);
      }
      if (slots.default) {
        classes.push(`lyt-divider--${props.contentPosition}`);
      }
      if (props.class) {
        classes.push(props.class);
      }
      return classes.join(' ');
    };

    const getDividerStyle = () => {
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
        children.push(createVNode('span', { class: 'lyt-divider__text' }, slots.default()));
      }

      return createVNode('div', mergeA11yProps({
        id: props.id,
        'aria-label': props.ariaLabel,
        'aria-describedby': props.ariaDescribedBy,
        role: 'separator',
      }, {
        class: getDividerClass(),
        style: getDividerStyle(),
      }), children);
    };
  },
});

export type { DividerProps, DividerSlots };
