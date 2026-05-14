/**
 * @lytjs/ui - Button 组件
 *
 * 基础按钮组件，支持多种类型、尺寸和状态
 */

import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { isString, isObject } from '@lytjs/common-is';
import type { ButtonSetupProps, ButtonSlots } from './types';

export const Button = defineComponent({
  name: 'LytButton',

  props: {
    type: { type: String, default: 'default' },
    size: { type: String, default: 'medium' },
    disabled: { type: Boolean, default: false },
    loading: { type: Boolean, default: false },
    plain: { type: Boolean, default: false },
    round: { type: Boolean, default: false },
    circle: { type: Boolean, default: false },
    nativeType: { type: String, default: 'button' },
    class: { type: String, default: '' },
    style: { type: String, default: '' },
    onClick: { type: Function, default: undefined },
  },

  setup(props: Record<string, unknown>, { slots }: { slots: ButtonSlots }) {
    const p = props as ButtonSetupProps;
    const handleClick = (event: MouseEvent) => {
      if (p.disabled || p.loading) {
        event.preventDefault();
        return;
      }
      p.onClick?.(event);
    };

    const getButtonClass = () => {
      const classes = ['lyt-button'];
      if (p.type !== 'default') classes.push(`lyt-button--${p.type}`);
      if (p.size !== 'medium') classes.push(`lyt-button--${p.size}`);
      if (p.plain) classes.push('lyt-button--plain');
      if (p.round) classes.push('lyt-button--round');
      if (p.circle) classes.push('lyt-button--circle');
      if (p.disabled) classes.push('lyt-button--disabled');
      if (p.loading) classes.push('lyt-button--loading');
      if (p.class) classes.push(p.class);
      return classes.join(' ');
    };

    const getButtonStyle = () => {
      if (!p.style) return undefined;
      if (isString(p.style)) return p.style;
      if (isObject(p.style)) {
        return Object.entries(p.style)
          .map(([key, value]) => `${key}: ${value}`)
          .join('; ');
      }
      return undefined;
    };

    return () => {
      const children: VNode[] = [];

      if (p.loading) {
        children.push(
          createVNode('span', { class: 'lyt-button__loading' }, [
            createVNode('svg', { class: 'lyt-button__loading-icon', viewBox: '0 0 1024 1024' }, [
              createVNode('path', {
                d: 'M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm0 820c-205.4 0-372-166.6-372-372s166.6-372 372-372 372 166.6 372 372-166.6 372-372 372z',
                fill: 'currentColor',
              }),
            ]),
          ]),
        );
      }

      if (slots.default) {
        children.push(createVNode('span', { class: 'lyt-button__text' }, slots.default()));
      }

      return createVNode(
        'button',
        {
          class: getButtonClass(),
          style: getButtonStyle(),
          type: p.nativeType,
          disabled: p.disabled || p.loading,
          onClick: handleClick,
        },
        children,
      );
    };
  },
});

export type { ButtonProps, ButtonSlots, ButtonSetupProps } from './types';
