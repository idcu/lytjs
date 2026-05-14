/**
 * @lytjs/ui - Icon 组件
 *
 * 基础图标组件，支持多种尺寸和颜色
 */

import type { IconProps, IconSlots } from './types';
import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { isString, isObject } from '@lytjs/common-is';
import { mergeA11yProps } from '@lytjs/common-a11y';

/**
 * Icon 组件
 */
export const Icon = defineComponent({
  name: 'LytIcon',

  props: {
    name: { type: String, default: '' },
    size: { type: String, default: '16px' },
    color: { type: String, default: '' },
    spin: { type: Boolean, default: false },
    class: { type: String, default: '' },
    style: { type: String, default: '' },
    id: { type: String, default: '' },
    ariaLabel: { type: String, default: '' },
    ariaDescribedBy: { type: String, default: '' },
  },

  setup(props: any, { slots }: any) {
    const getIconClass = () => {
      const classes = ['lyt-icon'];
      if (props.name) classes.push(`lyt-icon--${props.name}`);
      if (props.spin) classes.push('lyt-icon--spin');
      if (props.class) classes.push(props.class);
      return classes.join(' ');
    };

    const getIconStyle = () => {
      const style: Record<string, string> = {};
      if (props.size) style.fontSize = props.size;
      if (props.color) style.color = props.color;
      if (props.style) {
        if (isString(props.style)) {
          // 简单处理字符串风格
          return props.style;
        }
        if (isObject(props.style)) {
          Object.assign(style, props.style);
        }
      }
      return style;
    };

    return () => {
      const children: VNode[] = [];
      
      if (slots.default) {
        children.push(...slots.default());
      }

      return createVNode('i', mergeA11yProps({
        id: props.id,
        'aria-label': props.ariaLabel,
        'aria-describedby': props.ariaDescribedBy,
      }, {
        class: getIconClass(),
        style: getIconStyle(),
      }), children);
    };
  },
});

export type { IconProps, IconSlots };
