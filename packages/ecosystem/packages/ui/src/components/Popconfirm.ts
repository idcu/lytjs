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
import { getDialogA11yProps, getButtonA11yProps, mergeA11yProps } from '@lytjs/common-a11y';

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
    style: { type: [String, Object] as any, default: '' },
    id: { type: String, default: '' },
    ariaLabel: { type: String, default: '' },
    ariaDescribedBy: { type: String, default: '' },
    onConfirm: { type: Function, default: undefined },
    onCancel: { type: Function, default: undefined },
  },

  setup(props: Record<string, unknown>, { slots, emit }) {
    const _props = props as PopconfirmSetupProps;
    const visible = signal(false);

    const getPopconfirmClass = () => {
      const classes = ['lyt-popconfirm'];
      if (_props.class) classes.push(_props.class as string);
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
      visible.set(false);
      emit('confirm');
      _props.onConfirm?.();
    };

    const handleCancel = () => {
      visible.set(false);
      emit('cancel');
      _props.onCancel?.();
    };

    return () => {
      const children: VNode[] = [];

      if (slots.reference) {
        const refContent = slots.reference();
        if (Array.isArray(refContent)) {
          children.push(createVNode('div', { class: 'lyt-popconfirm__reference' }, refContent as VNode[]));
        }
      }

      const popupChildren: VNode[] = [];

      const contentChildren: VNode[] = [];

      if (!_props.hideIcon) {
        const iconChildren: VNode[] = [];
        if (slots.icon) {
          const iconContent = slots.icon();
          if (Array.isArray(iconContent)) {
            iconChildren.push(...iconContent as VNode[]);
          }
        }
        contentChildren.push(createVNode('span', { class: 'lyt-popconfirm__icon' }, iconChildren));
      }

      const titleId = _props.id ? `${_props.id}-title` : undefined;
      if (slots.default || _props.title) {
        const titleChildren: VNode[] = [];
        if (slots.default) {
          const titleContent = slots.default();
          if (Array.isArray(titleContent)) {
            titleChildren.push(...titleContent as VNode[]);
          }
        } else {
          titleChildren.push(createVNode('span', {}, _props.title as string));
        }
        contentChildren.push(createVNode('span', {
          class: 'lyt-popconfirm__title',
          id: titleId,
        }, titleChildren));
      }

      popupChildren.push(createVNode('div', { class: 'lyt-popconfirm__content' }, contentChildren));

      const buttonChildren: VNode[] = [];
      const cancelBtnProps = getButtonA11yProps({ ariaLabel: _props.cancelButtonText as string });
      buttonChildren.push(createVNode('button', mergeA11yProps(cancelBtnProps, {
        class: 'lyt-button lyt-button--small',
        onClick: handleCancel,
      }), [createVNode('span', {}, _props.cancelButtonText as string)]));

      const confirmBtnProps = getButtonA11yProps({ ariaLabel: _props.confirmButtonText as string });
      buttonChildren.push(createVNode('button', mergeA11yProps(confirmBtnProps, {
        class: `lyt-button lyt-button--small lyt-button--${_props.confirmButtonType}`,
        onClick: handleConfirm,
      }), [createVNode('span', {}, _props.confirmButtonText as string)]));
      popupChildren.push(createVNode('div', { class: 'lyt-popconfirm__buttons' }, buttonChildren));

      const a11yProps = getDialogA11yProps({
        id: _props.id as string,
        ariaLabel: (_props.ariaLabel as string) || (_props.title as string),
        ariaDescribedBy: (_props.ariaDescribedBy as string) || titleId,
        labelledBy: titleId,
        modal: true,
      });

      children.push(createVNode('div', mergeA11yProps(a11yProps, { class: 'lyt-popconfirm__popup' }), popupChildren));

      return createVNode('div', {
        class: getPopconfirmClass(),
        style: getPopconfirmStyle(),
      }, children);
    };
  },
});

export type { PopconfirmProps, PopconfirmSlots };
