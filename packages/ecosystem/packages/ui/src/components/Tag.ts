/**
 * @lytjs/ui - Tag 组件
 *
 * 标签组件，支持多种类型和可关闭功能
 */

import type { TagProps, TagSlots } from './types';
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

  setup(props: any, { slots, emit }: any) {
    const state = reactive({
      visible: true,
    });

    const handleClose = (e: Event) => {
      e.stopPropagation();
      state.visible = false;
      emit('close');
      props.onClose?.();
    };

    const getTagClass = () => {
      const classes = ['lyt-tag'];
      if (props.type !== 'default') classes.push(`lyt-tag--${props.type}`);
      if (props.size !== 'medium') classes.push(`lyt-tag--${props.size}`);
      if (props.color) classes.push('lyt-tag--custom');
      if (props.class) classes.push(props.class);
      return classes.join(' ');
    };

    const getTagStyle = () => {
      const style: Record<string, string> = {};
      if (props.color) {
        style.backgroundColor = props.color + '15';
        style.borderColor = props.color;
        style.color = props.color;
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
      if (!state.visible) return null;

      const children: VNode[] = [];
      
      // 内容插槽
      if (slots.default) {
        children.push(...slots.default());
      }

      // 关闭按钮
      if (props.closable) {
        children.push(createVNode('span', {
          class: 'lyt-tag__close',
          onClick: handleClose,
        }, ['&times;']));
      }

      return createVNode('span', {
        class: getTagClass(),
        style: getTagStyle(),
      }, children);
    };
  },
});

export type { TagProps, TagSlots };
