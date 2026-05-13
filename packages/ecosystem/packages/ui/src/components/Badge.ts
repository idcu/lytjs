/**
 * @lytjs/ui - Badge 组件
 *
 * 徽标组件，用于展示数字或点标记
 */

import type { BadgeProps, BadgeSlots } from './types';
import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { isString, isObject } from '@lytjs/common-is';
import { reactive } from '@lytjs/reactivity';

/**
 * Badge 组件
 */
export const Badge = defineComponent({
  name: 'LytBadge',

  props: {
    count: { type: Number, default: 0 },
    maxCount: { type: Number, default: 99 },
    dot: { type: Boolean, default: false },
    showZero: { type: Boolean, default: false },
    type: { type: String, default: 'danger' },
    offset: { type: Array, default: undefined },
    class: { type: String, default: '' },
    style: { type: String, default: '' },
  },

  setup(props: any, { slots }: any) {
    const state = reactive({
      visible: true,
    });

    const displayCount = () => {
      if (props.dot) return '';
      if (props.count > props.maxCount) return `${props.maxCount}+`;
      return String(props.count);
    };

    const showBadge = () => {
      if (props.dot) return true;
      if (props.count === 0) return props.showZero;
      return true;
    };

    const getBadgeClass = () => {
      const classes = ['lyt-badge'];
      if (props.class) classes.push(props.class);
      return classes.join(' ');
    };

    const getCountClass = () => {
      const classes = ['lyt-badge__count'];
      classes.push(`lyt-badge__count--${props.type}`);
      if (props.dot) classes.push('lyt-badge__count--dot');
      return classes.join(' ');
    };

    const getCountStyle = () => {
      const style: Record<string, string> = {};
      if (props.offset) {
        style.top = `${props.offset[0]}px`;
        style.right = `${props.offset[1]}px`;
      }
      if (props.style) {
        if (isString(props.style)) {
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
      
      // 内容插槽
      if (slots.default) {
        children.push(...slots.default());
      }

      // 徽章计数
      if (showBadge()) {
        children.push(createVNode('sup', {
          class: getCountClass(),
          style: getCountStyle(),
        }, [props.dot ? '' : displayCount()]));
      }

      return createVNode('span', {
        class: getBadgeClass(),
      }, children);
    };
  },
});

export type { BadgeProps, BadgeSlots };
