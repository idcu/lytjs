/**
 * @lytjs/ui - Dialog 组件
 *
 * 对话框组件，支持全屏、拖拽等高级功能
 */

import { defineComponent } from '@lytjs/component';
import { createVNode, createTextVNode, type VNode } from '@lytjs/vdom';
import { signal, watch } from '@lytjs/reactivity';
import { getDialogA11yProps, getButtonA11yProps, mergeA11yProps } from '@lytjs/common-a11y';
import type { DialogSetupProps, DialogSlots } from './types';

export const Dialog = defineComponent({
  name: 'LytDialog',

  props: {
    modelValue: { type: Boolean, default: false },
    title: { type: String, default: '' },
    width: { type: [String, Number] as unknown as StringConstructor, default: '50%' },
    showClose: { type: Boolean, default: true },
    closeOnClickModal: { type: Boolean, default: true },
    closeOnPressEscape: { type: Boolean, default: true },
    lockScroll: { type: Boolean, default: true },
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

  setup(props: Record<string, unknown>, { slots }: { slots: DialogSlots }) {
    const p = props as DialogSetupProps;
    const visible = signal(p.modelValue);

    // 监听 modelValue 变化
    watch(() => p.modelValue, (newVal) => {
      visible.set(newVal);
      if (newVal) {
        p.onOpen?.();
      }
    });

    const handleClose = async () => {
      if (p.onBeforeClose) {
        const result = await p.onBeforeClose();
        if (result === false) return;
      }
      visible.set(false);
      p.onClose?.();
    };

    const handleKeydown = (e: KeyboardEvent) => {
      if (p.closeOnPressEscape && e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
      p.onKeydown?.(e);
    };

    return () => {
      if (!visible()) {
        return createVNode('div', { style: 'display: none;' }, []);
      }

      const children: VNode[] = [];

      if (slots.header) {
        children.push(createVNode('div', { 
          class: 'lyt-dialog__header',
          id: p.id ? `${p.id}-header` : undefined,
        }, slots.header()));
      } else if (p.title) {
        const headerChildren: VNode[] = [];
        headerChildren.push(createVNode('span', { 
          class: 'lyt-dialog__title',
          id: p.id ? `${p.id}-title` : undefined,
        }, [createTextVNode(p.title)]));
        if (p.showClose) {
          const closeBtnProps = getButtonA11yProps({
            ariaLabel: 'Close dialog',
          });
          headerChildren.push(createVNode('button', mergeA11yProps(closeBtnProps, {
            class: 'lyt-dialog__close',
            onClick: handleClose,
          }), [createTextVNode('×')]));
        }
        children.push(createVNode('div', { 
          class: 'lyt-dialog__header',
          id: p.id ? `${p.id}-header` : undefined,
        }, headerChildren));
      }

      if (slots.default) {
        children.push(createVNode('div', { 
          class: 'lyt-dialog__body',
          id: p.id ? `${p.id}-body` : undefined,
        }, slots.default()));
      }

      if (slots.footer) {
        children.push(createVNode('div', { 
          class: 'lyt-dialog__footer',
          id: p.id ? `${p.id}-footer` : undefined,
        }, slots.footer()));
      }

      const dialogClass = [
        'lyt-dialog',
        p.class,
      ].filter(Boolean).join(' ');

      const dialogStyle = `width: ${typeof p.width === 'number' ? `${p.width}px` : p.width}`;

      const dialogA11yProps = getDialogA11yProps({
        id: p.id,
        ariaLabel: p.ariaLabel || p.title,
        ariaDescribedBy: p.ariaDescribedBy || (p.id ? `${p.id}-body` : undefined),
        labelledBy: p.title && p.id ? `${p.id}-title` : undefined,
        modal: p.ariaModal,
      });

      return createVNode('div', { 
        class: 'lyt-dialog__wrapper',
        onKeydown: handleKeydown,
      }, [
        createVNode('div', {
          class: 'lyt-dialog__overlay',
          'aria-hidden': true,
          onClick: p.closeOnClickModal ? handleClose : undefined,
        }),
        createVNode('div', mergeA11yProps(dialogA11yProps, {
          class: dialogClass,
          style: dialogStyle,
        }), children),
      ]);
    };
  },
});

export type { DialogProps, DialogSlots } from './types';
