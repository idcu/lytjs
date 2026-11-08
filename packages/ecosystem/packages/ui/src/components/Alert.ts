/**
 * @lytjs/ui - Alert 组件
 *
 * 警告提示组件，用于展示重要的提示信息
 *
 * @beta 2026-10-26 全维度审计列为**半成品**：主要路径可用，
 *       边界条件 / 交互闭环 / 键盘可达性未系统覆盖。
 *       成熟度表见 `src/component-status.ts`（单一真相源）。
 */

import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/core/runtime';
import type { AlertType, AlertSetupProps } from './types';
import { getButtonA11yProps, mergeA11yProps } from '@lytjs/common-a11y';
import { useSlotContent } from '../composables';

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
    const slotContent = useSlotContent(slots);
    const handleClose = () => {
      emit('close');
      // ★ 2026-10-04：`emit` 本身就会去 props 里找 `onClose` 并调用（见 component/src/emit.ts）⇒ 紧随其后的直接调用是**重复触发**，已删。
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
      ]
        .filter(Boolean)
        .join(' ');

      const children: VNode[] = [];

      if (_props.showIcon) {
        const icon = getIconMap()[_props.type as AlertType] || 'ℹ';
        children.push(
          createVNode('span', { class: 'lyt-alert__icon' }, [createVNode('span', {}, icon)]),
        );
      }

      const contentChildren: VNode[] = [];

      // Title
      if (slots.title || _props.title) {
        const titleChildren: VNode[] = [];
        if (slots.title) {
          const content = slotContent.resolve('title');
          if (content) titleChildren.push(...content);
        } else if (_props.title) {
          titleChildren.push(createVNode('span', {}, _props.title));
        }
        if (titleChildren.length > 0) {
          contentChildren.push(createVNode('div', { class: 'lyt-alert__title' }, titleChildren));
        }
      }

      // Description
      if (_props.description) {
        contentChildren.push(
          createVNode('div', { class: 'lyt-alert__description' }, [
            createVNode('span', {}, _props.description),
          ]),
        );
      }

      // Default slot
      if (slots.default) {
        const content = slotContent.resolve('default');
        if (content) {
          contentChildren.push(createVNode('div', { class: 'lyt-alert__message' }, content));
        }
      }

      if (contentChildren.length > 0) {
        children.push(createVNode('div', { class: 'lyt-alert__content' }, contentChildren));
      }

      if (_props.closable) {
        const closeBtnProps = getButtonA11yProps({ ariaLabel: '关闭提示' });
        children.push(
          createVNode(
            'button',
            mergeA11yProps(closeBtnProps, {
              class: 'lyt-alert__close',
              onClick: handleClose,
            }),
            [createVNode('span', {}, '×')],
          ),
        );
      }

      return createVNode(
        'div',
        {
          id: _props.id,
          'aria-label': _props.ariaLabel || _props.title || 'Alert',
          'aria-describedby': _props.ariaDescribedBy,
          role: 'alert',
          class: alertClass,
        },
        children,
      );
    };
  },
});

export type { AlertProps, AlertSlots, AlertType, AlertEffect } from './types';
