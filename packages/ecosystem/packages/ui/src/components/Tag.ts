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
import { getButtonA11yProps, mergeA11yProps } from '@lytjs/common-a11y';

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
    id: { type: String, default: '' },
    ariaLabel: { type: String, default: '' },
    ariaDescribedBy: { type: String, default: '' },
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
      // ★ 2026-10-04：`emit` 本身就会去 props 里找 `onClose` 并调用（见 component/src/emit.ts）⇒ 紧随其后的直接调用是**重复触发**，已删。
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
        // ★ 2026-10-04：此前**只有数组形态**才渲染 —— slot 返回**单个 VNode**
        //   （最常见写法）时内容被**整个丢弃**。现在两种形态都处理。
        if (Array.isArray(slotContent)) {
          children.push(...(slotContent as VNode[]));
        } else if (slotContent) {
          children.push(slotContent as VNode);
        }
      }

      // 关闭按钮
      if (_props.closable) {
        const closeBtnProps = getButtonA11yProps({ ariaLabel: '关闭标签' });
        children.push(
          createVNode(
            'span',
            mergeA11yProps(closeBtnProps, {
              class: 'lyt-tag__close',
              onClick: handleClose,
            }),
            [createVNode('span', {}, '&times;')],
          ),
        );
      }

      return createVNode(
        'span',
        mergeA11yProps(
          {
            id: _props.id,
            'aria-label': _props.ariaLabel,
            'aria-describedby': _props.ariaDescribedBy,
          },
          {
            class: getTagClass(),
            style: getTagStyle(),
          },
        ),
        children,
      );
    };
  },
});

export type { TagProps, TagSlots };
