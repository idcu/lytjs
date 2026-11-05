/**
 * @lytjs/ui - Link 组件
 *
 * 链接组件，支持多种类型和样式
 */

import type { LinkProps, LinkSlots, LinkSetupProps } from './types';
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
    const _props = props as LinkSetupProps;
    const handleClick = (event: Event) => {
      if (_props.disabled) {
        event.preventDefault();
        return;
      }
      _props.onClick?.(event as MouseEvent);
    };

    // ★ 2026-11-06（B04）：无 href 时渲染 span[role=link]，此前只有 onClick
    //   ⇒ 既不可聚焦也无法用 Enter/Space 激活。与点击共用同一激活逻辑。
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        handleClick(event);
      }
    };

    const getLinkClass = () => {
      const classes = ['lyt-link'];
      if (_props.type !== 'default') {
        classes.push(`lyt-link--${_props.type}`);
      }
      // ★ 2026-11-06（B04）：CSS 里存在的是 `--underline`，此前却输出
      //   `--no-underline`（无规则）⇒ underline=false 无效、true 也没下划线。
      if (_props.underline) {
        classes.push('lyt-link--underline');
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
        } else if (slotContent) {
          children.push(...[slotContent as VNode]);
        }
      }

      if (_props.href) {
        return createVNode(
          'a',
          mergeA11yProps(
            {
              id: _props.id,
              'aria-label': _props.ariaLabel,
              'aria-describedby': _props.ariaDescribedBy,
            },
            {
              class: getLinkClass(),
              style: getLinkStyle(),
              href: _props.href,
              target: _props.target,
              onClick: handleClick,
            },
          ),
          children,
        );
      } else {
        return createVNode(
          'span',
          mergeA11yProps(
            {
              id: _props.id,
              'aria-label': _props.ariaLabel,
              'aria-describedby': _props.ariaDescribedBy,
              role: 'link',
            },
            {
              class: getLinkClass(),
              style: getLinkStyle(),
              tabindex: _props.disabled ? -1 : 0,
              onClick: handleClick,
              onKeydown: handleKeydown,
            },
          ),
          children,
        );
      }
    };
  },
});

export type { LinkProps, LinkSlots };
