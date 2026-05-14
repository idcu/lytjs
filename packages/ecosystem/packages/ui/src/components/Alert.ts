/**
 * @lytjs/ui - Alert 组件
 *
 * 警告提示组件，用于展示重要的提示信息
 */

import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';

export type AlertType = 'success' | 'warning' | 'info' | 'error';
export type AlertEffect = 'light' | 'dark';

export interface AlertSetupProps {
  title: string;
  description: string;
  type: AlertType;
  closable: boolean;
  showIcon: boolean;
  effect: AlertEffect;
  class: string;
  onClose: (() => void) | undefined;
}

export interface AlertSlots {
  default?: () => VNode[];
  title?: () => VNode[];
}

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
    onClose: { type: Function, default: undefined },
  },

  setup(props: AlertSetupProps, { slots }: { slots: AlertSlots; emit: (event: string, ...args: unknown[]) => void }) {
    const handleClose = () => {
      emit('close');
      props.onClose?.();
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
        `lyt-alert--${props.type}`,
        `lyt-alert--${props.effect}`,
        props.class,
      ].filter(Boolean).join(' ');

      const children: VNode[] = [];

      if (props.showIcon) {
        const icon = getIconMap()[props.type as AlertType] || 'ℹ';
        children.push(createVNode('span', { class: 'lyt-alert__icon' }, [icon]));
      }

      children.push(createVNode('div', { class: 'lyt-alert__content' }, [
        (slots.title || props.title) && createVNode('div', { class: 'lyt-alert__title' }, [
          slots.title ? slots.title() : props.title,
        ]),
        props.description && createVNode('div', { class: 'lyt-alert__description' }, [
          props.description,
        ]),
        slots.default && createVNode('div', { class: 'lyt-alert__message' }, [
          slots.default(),
        ]),
      ]));

      if (props.closable) {
        children.push(createVNode('button', {
          class: 'lyt-alert__close',
          onClick: handleClose,
        }, ['×']));
      }

      return createVNode('div', { class: alertClass }, [children]);
    };
  },
});

export type { AlertProps, AlertSlots, AlertType, AlertEffect } from './types';
