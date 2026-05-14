/**
 * @lytjs/ui - Alert 组件
 *
 * 警告提示组件，用于展示重要的提示信息
 */

import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import type { AlertType, AlertSetupProps } from './types';
import { getButtonA11yProps, mergeA11yProps } from '@lytjs/common-a11y';

export const Alert = defineComponent({
  name: 'LytAlert',

  props: {
    title: { type: String, default: '' },
    description: { type: String, default: '' },
    type: { type: String, default: 'info' },
    closable: { type: Boolean, default: false },
    showIcon: { type: Boolean, default: true },
    effect: { type: String, default: 'light' },
    class: { type: String, default: '' },
    id: { type: String, default: '' },
    ariaLabel: { type: String, default: '' },
    ariaDescribedBy: { type: String, default: '' },
    onClose: { type: Function, default: undefined },
  },

  setup(props: Record<string, unknown>, { slots, emit }) {
    const _props = props as AlertSetupProps;
    const handleClose = () => {
      emit('close');
      _props.onClose?.();
    };

    const getIconMap = (): Record<AlertType, string> => ({
      success: '✓',
      warning: '⚠',
      info: 'ℹ',
      error: '✕',
    });

    return () => {
      const alertClass = [
        'lyt-alert',
        `lyt-alert--${_props.type}`,
        `lyt-alert--${_props.effect}`,
        _props.class,
      ].filter(Boolean).join(' ');

      const children: VNode[] = [];

      if (_props.showIcon) {
        const icon = getIconMap()[_props.type as AlertType] || 'ℹ';
        children.push(createVNode('span', { class: 'lyt-alert__icon' }, [createVNode('span', {}, icon)]));
      }

      const contentChildren: VNode[] = [];
      
      // Title
      if (slots.title || _props.title) {
        const titleChildren: VNode[] = [];
        if (slots.title) {
          const slotContent = slots.title();
          if (Array.isArray(slotContent)) {
            titleChildren.push(...(slotContent as VNode[]));
          }
        } else if (_props.title) {
          titleChildren.push(createVNode('span', {}, _props.title));
        }
        if (titleChildren.length > 0) {
          contentChildren.push(createVNode('div', { class: 'lyt-alert__title' }, titleChildren));
        }
      }

      // Description
      if (_props.description) {
        contentChildren.push(createVNode('div', { class: 'lyt-alert__description' }, [createVNode('span', {}, _props.description)]));
      }

      // Default slot
      if (slots.default) {
        const slotContent = slots.default();
        if (Array.isArray(slotContent)) {
          contentChildren.push(createVNode('div', { class: 'lyt-alert__message' }, slotContent as VNode[]));
        }
      }

      if (contentChildren.length > 0) {
        children.push(createVNode('div', { class: 'lyt-alert__content' }, contentChildren));
      }

      if (_props.closable) {
        const closeBtnProps = getButtonA11yProps({ ariaLabel: '关闭提示' });
        children.push(createVNode('button', mergeA11yProps(closeBtnProps, {
          class: 'lyt-alert__close',
          onClick: handleClose,
        }), [createVNode('span', {}, '×')]));
      }

      return createVNode('div', {
        id: _props.id,
        'aria-label': _props.ariaLabel || _props.title || 'Alert',
        'aria-describedby': _props.ariaDescribedBy,
        'role': 'alert',
        class: alertClass,
      }, children);
    };
  },
});

export type { AlertProps, AlertSlots, AlertType, AlertEffect } from './types';
