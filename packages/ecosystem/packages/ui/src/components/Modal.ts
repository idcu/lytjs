/**
 * @lytjs/ui - Modal 组件
 *
 * 对话框组件，支持拖拽移动、全屏显示、自定义页脚、层级管理、动画优化
 */

import { defineComponent } from '@lytjs/component';
import { createVNode, createTextVNode, type VNode } from '@lytjs/vdom';
import { signal } from '@lytjs/reactivity';
import { getDialogA11yProps, getButtonA11yProps, mergeA11yProps } from '@lytjs/common-a11y';
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
    id: { type: String, default: '' },
    ariaLabel: { type: String, default: '' },
    ariaDescribedBy: { type: String, default: '' },
    ariaModal: { type: Boolean, default: true },
    onBeforeOpen: { type: Function, default: undefined },
    onBeforeClose: { type: Function, default: undefined },
    onOpen: { type: Function, default: undefined },
    onClose: { type: Function, default: undefined },
    onConfirm: { type: Function, default: undefined },
    onCancel: { type: Function, default: undefined },
    onKeydown: { type: Function, default: undefined },
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

    const handleKeydown = (e: KeyboardEvent) => {
      if (p.closeOnPressEscape && e.key === 'Escape') {
        e.preventDefault();
        close();
      }
      p.onKeydown?.(e);
    };

    return () => {
      if (!p.modelValue) {
        return createVNode('div', { style: 'display: none;' }, []);
      }

      const headerChildren: VNode[] = [];

      if (slots.header) {
        headerChildren.push(createVNode('div', { 
          class: 'lyt-modal__header',
          id: p.id ? `${p.id}-header` : undefined,
        }, slots.header()));
      } else if (p.title) {
        const titlePart: VNode[] = [
          createVNode('span', { 
            class: 'lyt-modal__title',
            id: p.id ? `${p.id}-title` : undefined,
          }, [createTextVNode(String(p.title))]),
        ];

        if (p.showClose) {
          const closeBtnProps = getButtonA11yProps({
            ariaLabel: 'Close dialog',
          });
          titlePart.push(createVNode('button', mergeA11yProps(closeBtnProps, {
            class: 'lyt-modal__close',
            onClick: close,
          }), [createTextVNode('×')]));
        }

        headerChildren.push(createVNode('div', { 
          class: 'lyt-modal__header',
          id: p.id ? `${p.id}-header` : undefined,
        }, titlePart));
      }

      const bodyChildren: VNode[] = [];
      if (slots.default) {
        bodyChildren.push(...slots.default());
      }

      const footerChildren: VNode[] = [];
      if (slots.footer) {
        footerChildren.push(createVNode('div', { 
          class: 'lyt-modal__footer',
          id: p.id ? `${p.id}-footer` : undefined,
        }, slots.footer()));
      } else {
        const cancelBtnProps = getButtonA11yProps({
          ariaLabel: 'Cancel',
        });
        const confirmBtnProps = getButtonA11yProps({
          ariaLabel: 'Confirm',
        });
        footerChildren.push(
          createVNode('div', { 
            class: 'lyt-modal__footer',
            id: p.id ? `${p.id}-footer` : undefined,
          }, [
            createVNode('button', mergeA11yProps(cancelBtnProps, {
              class: 'lyt-modal__cancel-btn',
              onClick: close,
            }), [createTextVNode('取消')]),
            createVNode('button', mergeA11yProps(confirmBtnProps, {
              class: 'lyt-modal__confirm-btn',
              onClick: () => p.onConfirm?.(),
            }), [createTextVNode('确定')]),
          ])
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

      const modalA11yProps = getDialogA11yProps({
        id: p.id,
        ariaLabel: p.ariaLabel || p.title,
        ariaDescribedBy: p.ariaDescribedBy || (p.id ? `${p.id}-body` : undefined),
        labelledBy: p.title && p.id ? `${p.id}-title` : undefined,
        modal: p.ariaModal,
      });

      return createVNode('div', {
        class: 'lyt-modal__overlay',
        'aria-hidden': true,
        onClick: handleModalClick,
      }, [
        createVNode('div', mergeA11yProps(modalA11yProps, {
          class: modalClass,
          style: modalStyle,
          onKeydown: handleKeydown,
        }), [
          ...headerChildren,
          createVNode('div', { 
            class: 'lyt-modal__body',
            id: p.id ? `${p.id}-body` : undefined,
          }, bodyChildren),
          ...(Array.isArray(footerChildren) ? footerChildren : [footerChildren]),
        ]),
      ]);
    };
  },
});

export type { ModalProps, ModalSlots, ModalSetupProps } from './types';
