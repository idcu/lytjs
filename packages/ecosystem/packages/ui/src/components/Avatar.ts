/**
 * @lytjs/ui - Avatar 组件
 *
 * 头像组件，用于显示用户头像
 */

import type { AvatarProps, AvatarSlots, AvatarSetupProps } from './types';
import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { isString, isObject } from '@lytjs/common-is';
import { signal } from '@lytjs/reactivity';
import { mergeA11yProps } from '@lytjs/common-a11y';

/**
 * Avatar 组件
 */
export const Avatar = defineComponent({
  name: 'LytAvatar',

  props: {
    size: { type: [Number, String], default: 'default' },
    shape: { type: String, default: 'circle' },
    icon: { type: String, default: '' },
    src: { type: String, default: '' },
    srcSet: { type: String, default: '' },
    alt: { type: String, default: '' },
    fit: { type: String, default: 'cover' },
    class: { type: String, default: '' },
    style: { type: [String, Object], default: '' },
    id: { type: String, default: '' },
    ariaLabel: { type: String, default: '' },
    ariaDescribedBy: { type: String, default: '' },
    onError: { type: Function, default: undefined },
  },

  setup(props: Record<string, unknown>, { slots, emit }) {
    const _props = props as AvatarSetupProps;
    const isImageExist = signal(true);

    const getSize = () => {
      if (typeof _props.size === 'number') {
        return `${_props.size}px`;
      }
      const sizeMap: Record<string, string> = {
        small: '32px',
        default: '40px',
        large: '48px',
      };
      return sizeMap[_props.size] || sizeMap.default;
    };

    const handleError = (e: Event) => {
      if (_props.onError) {
        const result = _props.onError();
        if (result === false) {
          return;
        }
      }
      isImageExist.value = false;
    };

    const getAvatarClass = () => {
      const classes = ['lyt-avatar'];
      if (_props.shape) classes.push(`lyt-avatar--${_props.shape}`);
      if (typeof _props.size === 'string') {
        classes.push(`lyt-avatar--${_props.size}`);
      }
      if (_props.class) classes.push(_props.class);
      return classes.join(' ');
    };

    const getAvatarStyle = () => {
      const style: Record<string, string> = {
        height: getSize(),
        width: getSize(),
      };
      if (_props.style) {
        if (isString(_props.style)) {
          return _props.style;
        }
        if (isObject(_props.style)) {
          Object.assign(style, _props.style);
        }
      }
      return style;
    };

    return () => {
      const children: VNode[] = [];
      
      if (_props.src && isImageExist.value) {
        children.push(createVNode('img', {
          class: 'lyt-avatar__img',
          src: _props.src,
          srcset: _props.srcSet,
          alt: _props.alt,
          style: {
            objectFit: _props.fit,
          },
          onError: handleError,
        }));
      } else if (_props.icon) {
        children.push(createVNode('span', {
          class: ['lyt-avatar__icon', _props.icon],
        }));
      } else if (slots.default) {
        const slotContent = slots.default();
        if (Array.isArray(slotContent)) {
          children.push(...slotContent);
        }
      }

      return createVNode('span', mergeA11yProps({
        id: _props.id,
        'aria-label': _props.ariaLabel,
        'aria-describedby': _props.ariaDescribedBy,
      }, {
        class: getAvatarClass(),
        style: getAvatarStyle(),
      }), children);
    };
  },
});

export type { AvatarProps, AvatarSlots };
