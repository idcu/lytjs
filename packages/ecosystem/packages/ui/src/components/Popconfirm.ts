/**
 * @lytjs/ui - Popconfirm 气泡确认框组件
 *
 * 气泡确认框组件，用于操作确认
 */

import type { PopconfirmProps, PopconfirmSlots, PopconfirmSetupProps } from './types';
import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { isString, isObject } from '@lytjs/common-is';
import { signal } from '@lytjs/reactivity';

/**
 * Popconfirm 气泡确认框组件
 */
export const Popconfirm = defineComponent({
  name: 'LytPopconfirm',

  props: {
    title: { type: String, default: '' },
    confirmButtonText: { type: String, default: '确定' },
    cancelButtonText: { type: String, default: '取消' },
    confirmButtonType: { type: String, default: 'primary' },
    cancelButtonType: { type: String, default: '' },
    icon: { type: String, default: '' },
    iconColor: { type: String, default: '' },
    hideIcon: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
    width: { type: Number, default: 0 },
    class: { type: String, default: '' },
    style: { type: [String, Object], default: '' },
    onConfirm: { type: Function, default: undefined },
    onCancel: { type: Function, default: undefined },
  },

  setup(props: Record<string, unknown>, { slots, emit }) {
    const _props = props as PopconfirmSetupProps;
    const visible = signal(false);

    const getPopconfirmClass = () => {
      const classes = ['lyt-popconfirm'];
      if (_props.class) classes.push(_props.class);
      return classes.join(' ');
    };

    const getPopconfirmStyle = () => {
      const style: Record<string, string> = {};
      if (_props.width) {
        style.width = `${_props.width}px`;
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

    const handleConfirm = () => {
      visible.value = false;
      emit('confirm');
      _props.onConfirm?.();
    };

    const handleCancel = () => {
      visible.value = false;
      emit('cancel');
      _props.onCancel?.();
    };

    return () => {
      const children: VNode[] = [];
      
      if (slots.reference) {
        const refContent = slots.reference();
        if (Array.isArray(refContent)) {
          children.push(createVNode('div', { class: 'lyt-popconfirm__reference' }, refContent));
        }
      }
      
      const popupChildren: VNode[] = [];
      
      const contentChildren: VNode[] = [];
      
      if (!_props.hideIcon) {
        const iconChildren: VNode[] = [];
        if (slots.icon) {
          const iconContent = slots.icon();
          if (Array.isArray(iconContent)) {
            iconChildren.push(...iconContent);
          }
        }
        contentChildren.push(createVNode('span', { class: 'lyt-popconfirm__icon' }, iconChildren));
      }
      
      if (slots.default || _props.title) {
        const titleChildren: VNode[] = [];
        if (slots.default) {
          const titleContent = slots.default();
          if (Array.isArray(titleContent)) {
            titleChildren.push(...titleContent);
          }
        } else {
          titleChildren.push(_props.title);
        }
        contentChildren.push(createVNode('span', { class: 'lyt-popconfirm__title' }, titleChildren));
      }
      
      popupChildren.push(createVNode('div', { class: 'lyt-popconfirm__content' }, contentChildren));
      
      const buttonChildren: VNode[] = [];
      buttonChildren.push(createVNode('button', {
        class: 'lyt-button lyt-button--small',
        onClick: handleCancel,
      }, [_props.cancelButtonText]));
      buttonChildren.push(createVNode('button', {
        class: `lyt-button lyt-button--small lyt-button--${_props.confirmButtonType}`,
        onClick: handleConfirm,
      }, [_props.confirmButtonText]));
      popupChildren.push(createVNode('div', { class: 'lyt-popconfirm__buttons' }, buttonChildren));
      
      children.push(createVNode('div', { class: 'lyt-popconfirm__popup' }, popupChildren));

      return createVNode('div', {
        class: getPopconfirmClass(),
        style: getPopconfirmStyle(),
      }, children);
    };
  },
});

export type { PopconfirmProps, PopconfirmSlots };
