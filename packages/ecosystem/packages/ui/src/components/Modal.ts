/**
 * @lytjs/ui - Modal 组件
 *
 * 对话框组件，支持拖拽移动、全屏显示、自定义页脚、层级管理、动画优化
 */

import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { signal } from '@lytjs/reactivity';
import type { ModalSetupProps, ModalSlots } from './types';

export const Modal = defineComponent({
  name: 'LytModal',

  props: {
    modelValue: { type: Boolean, default: false },
    title: { type: String, default: '' },
    width: { type: [String, Number] as unknown as StringConstructor, default: '50%' },
    top: { type: String, default: '15vh' },
    showClose: { type: Boolean, default: true },
    closeOnClickModal: { type: Boolean, default: true },
    closeOnPressEscape: { type: Boolean, default: true },
    lockScroll: { type: Boolean, default: true },
    draggable: { type: Boolean, default: false },
    fullscreen: { type: Boolean, default: false },
    appendToBody: { type: Boolean, default: false },
    customClass: { type: String, default: '' },
    class: { type: String, default: '' },
    onBeforeOpen: { type: Function, default: undefined },
    onBeforeClose: { type: Function, default: undefined },
    onOpen: { type: Function, default: undefined },
    onClose: { type: Function, default: undefined },
    onConfirm: { type: Function, default: undefined },
    onCancel: { type: Function, default: undefined },
  },

  setup(props: Record<string, unknown>, { slots }: { slots: ModalSlots }) {
    const p = props as ModalSetupProps;
    const isClosing = signal(false);
    const isFullscreen = signal(p.fullscreen);

    const close = async () => {
      if (isClosing()) return;
      if (p.onBeforeClose) {
        const result = await p.onBeforeClose();
        if (result === false) return;
      }
      isClosing.set(true);
      p.onClose?.();
      setTimeout(() => { isClosing.set(false); }, 300);
    };

    const handleModalClick = () => {
      if (p.closeOnClickModal) close();
    };

    return () => {
      if (!p.modelValue) {
        return createVNode('div', { style: 'display: none;' }, []);
      }

      const headerChildren: VNode[] = [];

      if (slots.header) {
        headerChildren.push(...slots.header());
      } else if (p.title) {
        const titlePart: VNode[] = [
          createVNode('span', { class: 'lyt-modal__title' }, [createVNode('span', {}, String(p.title))]),
        ];

        if (p.showClose) {
          titlePart.push(createVNode('button', {
            class: 'lyt-modal__close',
            onClick: close,
          }, [createVNode('span', {}, '×')]));
        }

        headerChildren.push(createVNode('div', { class: 'lyt-modal__header' }, titlePart));
      }

      const bodyChildren: VNode[] = [];
      if (slots.default) {
        bodyChildren.push(...slots.default());
      }

      const footerChildren: VNode[] = [];
      if (slots.footer) {
        footerChildren.push(...slots.footer());
      } else {
        footerChildren.push(
          createVNode('button', {
            class: 'lyt-modal__cancel-btn',
            onClick: close,
          }, [createVNode('span', {}, '取消')]),
          createVNode('button', {
            class: 'lyt-modal__confirm-btn',
            onClick: () => p.onConfirm?.(),
          }, [createVNode('span', {}, '确定')])
        );
      }

      const modalClass = [
        'lyt-modal',
        isClosing() ? 'lyt-modal--closing' : '',
        isFullscreen() ? 'lyt-modal--fullscreen' : '',
        p.customClass as string,
        p.class as string,
      ].filter(Boolean).join(' ');

      const modalWidth = typeof p.width === 'number' ? `${p.width}px` : p.width as string;
      const modalStyle = isFullscreen() ? '' : `width: ${modalWidth};`;

      return createVNode('div', {
        class: 'lyt-modal__overlay',
        onClick: handleModalClick,
      }, [
        createVNode('div', {
          class: modalClass,
          style: modalStyle,
        }, [
          ...headerChildren,
          createVNode('div', { class: 'lyt-modal__body' }, bodyChildren),
          createVNode('div', { class: 'lyt-modal__footer' }, footerChildren),
        ]),
      ]);
    };
  },
});

export type { ModalProps, ModalSlots, ModalSetupProps } from './types';
