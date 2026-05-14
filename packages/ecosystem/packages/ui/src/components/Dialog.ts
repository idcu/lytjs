/**
 * @lytjs/ui - Dialog 组件
 *
 * 对话框组件，支持全屏、拖拽等高级功能
 */

import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { signal } from '@lytjs/reactivity';

export interface DialogSetupProps {
  modelValue: boolean;
  title: string;
  width: string | number;
  showClose: boolean;
  closeOnClickModal: boolean;
  closeOnPressEscape: boolean;
  lockScroll: boolean;
  class: string;
  onBeforeOpen: (() => boolean | void | Promise<boolean | void>) | undefined;
  onBeforeClose: (() => boolean | void | Promise<boolean | void>) | undefined;
  onOpen: (() => void) | undefined;
  onClose: (() => void) | undefined;
  onConfirm: (() => void) | undefined;
  onCancel: (() => void) | undefined;
}

export interface DialogSlots {
  header?: () => VNode[];
  default?: () => VNode[];
  footer?: () => VNode[];
}

export const Dialog = defineComponent({
  name: 'LytDialog',

  props: {
    modelValue: { type: Boolean, default: false },
    title: { type: String, default: '' },
    width: { type: [String, Number], default: '50%' },
    showClose: { type: Boolean, default: true },
    closeOnClickModal: { type: Boolean, default: true },
    closeOnPressEscape: { type: Boolean, default: true },
    lockScroll: { type: Boolean, default: true },
    class: { type: String, default: '' },
    onBeforeOpen: { type: Function, default: undefined },
    onBeforeClose: { type: Function, default: undefined },
    onOpen: { type: Function, default: undefined },
    onClose: { type: Function, default: undefined },
    onConfirm: { type: Function, default: undefined },
    onCancel: { type: Function, default: undefined },
  },

  setup(props: DialogSetupProps, { slots }: { slots: DialogSlots }) {
    const visible = signal(props.modelValue);

    const handleClose = async () => {
      if (props.onBeforeClose) {
        const result = await props.onBeforeClose();
        if (result === false) return;
      }
      visible.set(false);
      props.onClose?.();
    };

    const handleConfirm = () => {
      props.onConfirm?.();
    };

    const handleCancel = () => {
      props.onCancel?.();
      handleClose();
    };

    return () => {
      if (!visible()) return null;

      const children: VNode[] = [];

      if (slots.header) {
        children.push(createVNode('div', { class: 'lyt-dialog__header' }, [slots.header()]));
      } else if (props.title) {
        children.push(createVNode('div', { class: 'lyt-dialog__header' }, [
          createVNode('span', { class: 'lyt-dialog__title' }, [props.title]),
          props.showClose && createVNode('button', {
            class: 'lyt-dialog__close',
            onClick: handleClose,
          }, ['×']),
        ]));
      }

      if (slots.default) {
        children.push(createVNode('div', { class: 'lyt-dialog__body' }, [slots.default()]));
      }

      if (slots.footer) {
        children.push(createVNode('div', { class: 'lyt-dialog__footer' }, [slots.footer()]));
      }

      const dialogClass = [
        'lyt-dialog',
        props.class,
      ].filter(Boolean).join(' ');

      const dialogStyle = `width: ${typeof props.width === 'number' ? `${props.width}px` : props.width}`;

      return createVNode('div', { class: 'lyt-dialog__wrapper' }, [
        createVNode('div', {
          class: 'lyt-dialog__overlay',
          onClick: props.closeOnClickModal ? handleClose : undefined,
        }),
        createVNode('div', {
          class: dialogClass,
          style: dialogStyle,
        }, children),
      ]);
    };
  },
});

export type { DialogProps, DialogSlots } from './types';
