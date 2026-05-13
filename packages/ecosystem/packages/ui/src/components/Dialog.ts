/**
 * @lytjs/ui - Dialog 组件
 *
 * 对话框组件，支持模态、自定义内容、关闭确认等功能
 */

import type { DialogProps, DialogSlots } from './types';
import { defineComponent } from '@lytjs/component';
import { createVNode } from '@lytjs/vdom';
import { isString, isObject } from '@lytjs/common-is';
import { signal } from '@lytjs/reactivity';

/**
 * Dialog 组件
 */
export const Dialog = defineComponent({
  name: 'LytDialog',

  props: {
    modelValue: { type: Boolean, default: false },
    title: { type: String, default: '' },
    width: { type: String, default: '50%' },
    showClose: { type: Boolean, default: true },
    closeOnClickModal: { type: Boolean, default: true },
    closeOnPressEscape: { type: Boolean, default: true },
    lockScroll: { type: Boolean, default: true },
    class: { type: String, default: '' },
    style: { type: String, default: '' },
    onBeforeOpen: { type: Function, default: undefined },
    onBeforeClose: { type: Function, default: undefined },
    onOpen: { type: Function, default: undefined },
    onClose: { type: Function, default: undefined },
    onConfirm: { type: Function, default: undefined },
    onCancel: { type: Function, default: undefined },
  },

  setup(props: any, { slots, emit }: any) {
    const isClosing = signal(false);

    const close = async () => {
      if (isClosing()) return;
      if (props.onBeforeClose) {
        const result = await props.onBeforeClose();
        if (result === false) return;
      }
      isClosing.set(true);
      emit('update:modelValue', false);
      props.onClose?.();
      setTimeout(() => { isClosing.set(false); }, 300);
    };

    const handleModalClick = () => {
      if (props.closeOnClickModal) close();
    };

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && props.closeOnPressEscape && props.modelValue) {
        close();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeydown);
    }

    const getDialogClass = () => {
      const classes = ['lyt-dialog'];
      if (props.modelValue) classes.push('lyt-dialog--visible');
      if (isClosing()) classes.push('lyt-dialog--closing');
      if (props.class) classes.push(props.class);
      return classes.join(' ');
    };

    const getDialogStyle = () => {
      if (!props.style) return undefined;
      if (isString(props.style)) return props.style;
      if (isObject(props.style)) {
        return Object.entries(props.style)
          .map(([key, value]) => `${key}: ${value}`)
          .join('; ');
      }
      return undefined;
    };

    return () => {
      if (!props.modelValue && !isClosing()) {
        return createVNode('div', { style: 'display: none;' }, []);
      }

      const width = props.width;
      const children: any[] = [];

      children.push(createVNode('div', { class: 'lyt-dialog__overlay', onClick: handleModalClick }));

      const dialogChildren: any[] = [];

      const headerChildren: any[] = [];
      if (slots.header) {
        headerChildren.push(...slots.header());
      } else if (props.title) {
        headerChildren.push(createVNode('span', { class: 'lyt-dialog__title' }, props.title));
      }

      if (props.showClose) {
        headerChildren.push(
          createVNode('button', { class: 'lyt-dialog__close', type: 'button', onClick: close }, [
            createVNode('svg', { viewBox: '0 0 1024 1024', width: '1em', height: '1em' }, [
              createVNode('path', {
                d: 'M563.8 512l262.5-312.9c4.4-5.2.7-13.1-6.1-13.1h-79.8c-4.7 0-9.2 2.1-12.3 5.7L511.6 449.8 295.1 191.7c-3-3.6-7.5-5.7-12.3-5.7H203c-6.8 0-10.5 7.9-6.1 13.1L459.4 512 196.9 824.9c-4.4 5.2-.7 13.1 6.1 13.1h79.8c4.7 0 9.2-2.1 12.3-5.7l216.5-258.1 216.5 258.1c3 3.6 7.5 5.7 12.3 5.7h79.8c6.8 0 10.5-7.9 6.1-13.1L563.8 512z',
                fill: 'currentColor',
              }),
            ]),
          ])
        );
      }

      if (headerChildren.length > 0) {
        dialogChildren.push(createVNode('div', { class: 'lyt-dialog__header' }, headerChildren));
      }

      if (slots.default) {
        dialogChildren.push(createVNode('div', { class: 'lyt-dialog__body' }, slots.default()));
      }

      if (slots.footer) {
        dialogChildren.push(createVNode('div', { class: 'lyt-dialog__footer' }, slots.footer()));
      }

      children.push(
        createVNode('div', { class: 'lyt-dialog__wrapper' }, [
          createVNode('div', { class: 'lyt-dialog__content', style: `width: ${width};` }, dialogChildren),
        ])
      );

      return createVNode('div', { class: getDialogClass(), style: getDialogStyle() }, children);
    };
  },
});

export type { DialogProps, DialogSlots };
