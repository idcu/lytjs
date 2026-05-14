/**
 * @lytjs/ui - Modal 组件
 *
 * 对话框组件，支持拖拽移动、全屏显示、自定义页脚、层级管理、动画优化
 */

import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { signal } from '@lytjs/reactivity';

export interface ModalSetupProps {
  modelValue: boolean;
  title: string;
  width: string | number;
  top: string;
  showClose: boolean;
  closeOnClickModal: boolean;
  closeOnPressEscape: boolean;
  lockScroll: boolean;
  draggable: boolean;
  fullscreen: boolean;
  appendToBody: boolean;
  customClass: string;
  class: string;
  onBeforeOpen: (() => boolean | void | Promise<boolean | void>) | undefined;
  onBeforeClose: (() => boolean | void | Promise<boolean | void>) | undefined;
  onOpen: (() => void) | undefined;
  onClose: (() => void) | undefined;
  onConfirm: (() => void) | undefined;
  onCancel: (() => void) | undefined;
}

export interface ModalSlots {
  header?: () => VNode[];
  default?: () => VNode[];
  footer?: () => VNode[];
}

export interface DragState {
  dragging: boolean;
  startX: number;
  startY: number;
  startLeft: number;
  startTop: number;
}

export interface ModalPosition {
  left: string;
  top: string;
}

export const Modal = defineComponent({
  name: 'LytModal',

  props: {
    modelValue: { type: Boolean, default: false },
    title: { type: String, default: '' },
    width: { type: [String, Number], default: '50%' },
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

  setup(props: ModalSetupProps, { slots }: { slots: ModalSlots; emit: (event: string, ...args: unknown[]) => void }) {
    const isClosing = signal(false);
    const isFullscreen = signal(props.fullscreen);
    const dragState = signal<DragState>({
      dragging: false,
      startX: 0,
      startY: 0,
      startLeft: 0,
      startTop: 0,
    });
    const modalPosition = signal<ModalPosition>({ left: '50%', top: props.top });

    const close = async () => {
      if (isClosing()) return;
      if (props.onBeforeClose) {
        const result = await props.onBeforeClose();
        if (result === false) return;
      }
      isClosing.set(true);
      // emit('update:modelValue', false);
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

    const toggleFullscreen = () => {
      isFullscreen.set(!isFullscreen());
    };

    return () => {
      if (!props.modelValue) return null;

      const children: VNode[] = [];

      if (slots.header) {
        children.push(createVNode('div', { class: 'lyt-modal__header' }, [slots.header()]));
      } else if (props.title) {
        children.push(createVNode('div', { class: 'lyt-modal__header' }, [
          createVNode('span', { class: 'lyt-modal__title' }, [props.title]),
          props.showClose && createVNode('button', {
            class: 'lyt-modal__close',
            onClick: close,
          }, ['×']),
        ]));
      }

      if (slots.default) {
        children.push(createVNode('div', { class: 'lyt-modal__body' }, [slots.default()]));
      }

      if (slots.footer) {
        children.push(createVNode('div', { class: 'lyt-modal__footer' }, [slots.footer()]));
      } else {
        children.push(createVNode('div', { class: 'lyt-modal__footer' }, [
          createVNode('button', {
            class: 'lyt-modal__cancel-btn',
            onClick: close,
          }, ['取消']),
          createVNode('button', {
            class: 'lyt-modal__confirm-btn',
            onClick: () => props.onConfirm?.(),
          }, ['确定']),
        ]));
      }

      const modalClass = [
        'lyt-modal',
        isClosing() ? 'lyt-modal--closing' : '',
        isFullscreen() ? 'lyt-modal--fullscreen' : '',
        props.customClass,
        props.class,
      ].filter(Boolean).join(' ');

      const modalStyle = isFullscreen()
        ? ''
        : `width: ${typeof props.width === 'number' ? `${props.width}px` : props.width};`;

      return createVNode('div', {
        class: 'lyt-modal__overlay',
        onClick: handleModalClick,
      }, [
        createVNode('div', {
          class: modalClass,
          style: modalStyle,
        }, children),
      ]);
    };
  },
});

export type { ModalProps, ModalSlots } from './types';
