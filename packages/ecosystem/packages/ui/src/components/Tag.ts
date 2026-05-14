/**
 * @lytjs/ui - Tag 组件
 *
 * 标签组件，支持多种类型和可关闭功能
 */

import type { TagProps, TagSlots, TagSetupProps } from './types';
import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { isString, isObject } from '@lytjs/common-is';
import { reactive } from '@lytjs/reactivity';

/**
 * Tag 组件
 */
export const Tag = defineComponent({
  name: 'LytTag',

  props: {
    type: { type: String, default: 'default' },
    closable: { type: Boolean, default: false },
    color: { type: String, default: '' },
    size: { type: String, default: 'medium' },
    class: { type: String, default: '' },
    style: { type: String, default: '' },
    onClose: { type: Function, default: undefined },
  },

  setup(props: Record<string, unknown>, { slots, emit }) {
    const _props = props as TagSetupProps;
    const state = reactive({
      visible: true,
    });

    const handleClose = (e: Event) => {
      e.stopPropagation();
      state.visible = false;
      emit('close');
      _props.onClose?.();
    };

    const getTagClass = () => {
      const classes = ['lyt-tag'];
      if (_props.type !== 'default') classes.push(`lyt-tag--${_props.type}`);
      if (_props.size !== 'medium') classes.push(`lyt-tag--${_props.size}`);
      if (_props.color) classes.push('lyt-tag--custom');
      if (_props.class) classes.push(_props.class);
      return classes.join(' ');
    };

    const getTagStyle = () => {
      const style: Record<string, string> = {};
      if (_props.color) {
        style.backgroundColor = _props.color + '15';
        style.borderColor = _props.color;
        style.color = _props.color;
      }
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
      if (!state.visible) return createVNode('div', { style: 'display: none;' }, []);

      const children: VNode[] = [];
      
      // 内容插槽
      if (slots.default) {
        const slotContent = slots.default();
        if (Array.isArray(slotContent)) {
          children.push(...(slotContent as VNode[]));
        }
      }

      // 关闭按钮
      if (_props.closable) {
        children.push(createVNode('span', {
          class: 'lyt-tag__close',
          onClick: handleClose,
        }, [createVNode('span', {}, '&times;')]));
      }

      return createVNode('span', {
        class: getTagClass(),
        style: getTagStyle(),
      }, children);
    };
  },
});

export type { TagProps, TagSlots };
