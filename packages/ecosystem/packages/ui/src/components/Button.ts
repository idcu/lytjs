/**
 * @lytjs/ui - Button 组件
 *
 * 基础按钮组件，支持多种类型、尺寸和状态
 */

import type { ButtonProps, ButtonSlots } from './types';
import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { isString, isObject } from '@lytjs/common-is';

/**
 * Button 组件
 */
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

  setup(props: any, { slots }: any) {
    const handleClick = (event: MouseEvent) => {
      if (props.disabled || props.loading) {
        event.preventDefault();
        return;
      }
      props.onClick?.(event);
    };

    const getButtonClass = () => {
      const classes = ['lyt-button'];
      if (props.type !== 'default') classes.push(`lyt-button--${props.type}`);
      if (props.size !== 'medium') classes.push(`lyt-button--${props.size}`);
      if (props.plain) classes.push('lyt-button--plain');
      if (props.round) classes.push('lyt-button--round');
      if (props.circle) classes.push('lyt-button--circle');
      if (props.disabled) classes.push('lyt-button--disabled');
      if (props.loading) classes.push('lyt-button--loading');
      if (props.class) classes.push(props.class);
      return classes.join(' ');
    };

    const getButtonStyle = () => {
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

      if (props.loading) {
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
          type: props.nativeType,
          disabled: props.disabled || props.loading,
          onClick: handleClick,
        },
        children,
      );
    };
  },
});

export type { ButtonProps, ButtonSlots };
