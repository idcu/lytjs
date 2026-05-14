/**
 * @lytjs/ui - Link 组件
 *
 * 链接组件，支持多种类型和样式
 */

import type { LinkProps, LinkSlots } from './types';
import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { isString, isObject } from '@lytjs/common-is';
import { mergeA11yProps } from '@lytjs/common-a11y';

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
    id: { type: String, default: '' },
    ariaLabel: { type: String, default: '' },
    ariaDescribedBy: { type: String, default: '' },
    onClick: { type: Function, default: undefined },
  },

  setup(props: Record<string, unknown>, { slots }) {
    const _props = props as any;
    const handleClick = (event: MouseEvent) => {
      if (_props.disabled) {
        event.preventDefault();
        return;
      }
      _props.onClick?.(event);
    };

    const getLinkClass = () => {
      const classes = ['lyt-link'];
      if (_props.type !== 'default') {
        classes.push(`lyt-link--${_props.type}`);
      }
      if (!_props.underline) {
        classes.push('lyt-link--no-underline');
      }
      if (_props.disabled) {
        classes.push('lyt-link--disabled');
      }
      if (_props.class) {
        classes.push(_props.class);
      }
      return classes.join(' ');
    };

    const getLinkStyle = () => {
      if (!_props.style) return undefined;
      if (isString(_props.style)) return _props.style;
      if (isObject(_props.style)) {
        return Object.entries(_props.style)
          .map(([key, value]) => `${key}: ${value}`)
          .join('; ');
      }
      return undefined;
    };

    return () => {
      const children: VNode[] = [];
      if (slots.default) {
        const slotContent = slots.default();
        if (Array.isArray(slotContent)) {
          children.push(...(slotContent as VNode[]));
        }
      }

      if (_props.href) {
        return createVNode('a', mergeA11yProps({
          id: _props.id,
          'aria-label': _props.ariaLabel,
          'aria-describedby': _props.ariaDescribedBy,
        }, {
          class: getLinkClass(),
          style: getLinkStyle(),
          href: _props.href,
          target: _props.target,
          onClick: handleClick,
        }), children);
      } else {
        return createVNode('span', mergeA11yProps({
          id: _props.id,
          'aria-label': _props.ariaLabel,
          'aria-describedby': _props.ariaDescribedBy,
          role: 'link',
        }, {
          class: getLinkClass(),
          style: getLinkStyle(),
          onClick: handleClick,
        }), children);
      }
    };
  },
});

export type { LinkProps, LinkSlots };
