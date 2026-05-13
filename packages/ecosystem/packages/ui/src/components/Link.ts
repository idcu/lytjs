/**
 * @lytjs/ui - Link 组件
 *
 * 链接组件，支持多种类型和样式
 */

import type { LinkProps, LinkSlots } from './types';
import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { isString, isObject } from '@lytjs/common-is';

/**
 * Link 组件
 */
export const Link = defineComponent({
  name: 'LytLink',

  props: {
    type: { type: String, default: 'default' },
    disabled: { type: Boolean, default: false },
    underline: { type: Boolean, default: true },
    href: { type: String, default: '' },
    target: { type: String, default: '_self' },
    class: { type: String, default: '' },
    style: { type: String, default: '' },
    onClick: { type: Function, default: undefined },
  },

  setup(props: any, { slots, emit }: any) {
    const handleClick = (event: MouseEvent) => {
      if (props.disabled) {
        event.preventDefault();
        return;
      }
      props.onClick?.(event);
    };

    const getLinkClass = () => {
      const classes = ['lyt-link'];
      if (props.type !== 'default') {
        classes.push(`lyt-link--${props.type}`);
      }
      if (!props.underline) {
        classes.push('lyt-link--no-underline');
      }
      if (props.disabled) {
        classes.push('lyt-link--disabled');
      }
      if (props.class) {
        classes.push(props.class);
      }
      return classes.join(' ');
    };

    const getLinkStyle = () => {
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

      if (props.href) {
        return createVNode('a', {
          class: getLinkClass(),
          style: getLinkStyle(),
          href: props.href,
          target: props.target,
          onClick: handleClick,
        }, children);
      } else {
        return createVNode('span', {
          class: getLinkClass(),
          style: getLinkStyle(),
          onClick: handleClick,
        }, children);
      }
    };
  },
});

export type { LinkProps, LinkSlots };
