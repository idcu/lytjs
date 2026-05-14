/**
 * @lytjs/ui - Dialog 组件
 *
 * 对话框组件，支持全屏、拖拽等高级功能
 */

import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { signal } from '@lytjs/reactivity';
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
    onBeforeOpen: { type: Function, default: undefined },
    onBeforeClose: { type: Function, default: undefined },
    onOpen: { type: Function, default: undefined },
    onClose: { type: Function, default: undefined },
    onConfirm: { type: Function, default: undefined },
    onCancel: { type: Function, default: undefined },
  },

  setup(props: Record<string, unknown>, { slots }: { slots: DialogSlots }) {
    const p = props as DialogSetupProps;
    const visible = signal(p.modelValue);

    const handleClose = async () => {
      if (p.onBeforeClose) {
        const result = await p.onBeforeClose();
        if (result === false) return;
      }
      visible.set(false);
      p.onClose?.();
    };

    return () => {
      if (!visible()) {
        return createVNode('div', { style: 'display: none;' }, []);
      }

      const children: VNode[] = [];

      if (slots.header) {
        children.push(createVNode('div', { class: 'lyt-dialog__header' }, slots.header()));
      } else if (p.title) {
        const headerChildren: VNode[] = [];
        headerChildren.push(createVNode('span', { class: 'lyt-dialog__title' }, p.title));
        if (p.showClose) {
          headerChildren.push(createVNode('button', {
            class: 'lyt-dialog__close',
            onClick: handleClose,
          }, '×'));
        }
        children.push(createVNode('div', { class: 'lyt-dialog__header' }, headerChildren));
      }

      if (slots.default) {
        children.push(createVNode('div', { class: 'lyt-dialog__body' }, slots.default()));
      }

      if (slots.footer) {
        children.push(createVNode('div', { class: 'lyt-dialog__footer' }, slots.footer()));
      }

      const dialogClass = [
        'lyt-dialog',
        p.class,
      ].filter(Boolean).join(' ');

      const dialogStyle = `width: ${typeof p.width === 'number' ? `${p.width}px` : p.width}`;

      return createVNode('div', { class: 'lyt-dialog__wrapper' }, [
        createVNode('div', {
          class: 'lyt-dialog__overlay',
          onClick: p.closeOnClickModal ? handleClose : undefined,
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
