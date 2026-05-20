/**
 * @lytjs/ui - Dialog 组件（增强版）
 *
 * 对话框组件，增强 Accessibility 支持
 * - 焦点陷阱（Focus Trap）
 * - 焦点管理（打开聚焦，关闭返回）
 * - ESC 键关闭支持
 */

import { defineComponent } from '@lytjs/component';
import { createVNode, createTextVNode, type VNode } from '@lytjs/vdom';
import { signal, watch, effect } from '@lytjs/reactivity';
import { getDialogA11yProps, getButtonA11yProps, mergeA11yProps } from '@lytjs/common-a11y';
import type { DialogSetupProps, DialogSlots } from './types';

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

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
    initialFocus: { type: [String, Object] as unknown as StringConstructor, default: undefined },
    returnFocusOnClose: { type: Boolean, default: true },
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
    const dialogRef = signal<HTMLElement | null>(null);
    const previousActiveElement = signal<HTMLElement | null>(null);

    watch(
      () => p.modelValue,
      (newVal) => {
        visible.set(newVal);
        if (newVal) {
          p.onOpen?.();
        }
      },
    );

    const handleClose = async () => {
      if (p.onBeforeClose) {
        const result = await p.onBeforeClose();
        if (result === false) return;
      }
      visible.set(false);
      p.onClose?.();

      if (p.returnFocusOnClose) {
        const prevEl = previousActiveElement();
        if (prevEl && prevEl.focus) {
          prevEl.focus();
        }
      }
    };

    const handleKeydown = (e: KeyboardEvent) => {
      if (p.closeOnPressEscape && e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
      p.onKeydown?.(e);
    };

    const getFocusableElements = (container: HTMLElement): HTMLElement[] => {
      return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)).filter(
        (el) => {
          return el.offsetParent !== null && !el.hasAttribute('aria-hidden');
        },
      );
    };

    const handleTabKey = (e: KeyboardEvent) => {
      const dialog = dialogRef();
      if (!dialog) return;

      const focusableElements = getFocusableElements(dialog);
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0]!;
      const lastElement = focusableElements[focusableElements.length - 1]!;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    effect(() => {
      if (visible()) {
        previousActiveElement.set(document.activeElement as HTMLElement);

        setTimeout(() => {
          const dialog = dialogRef();
          if (dialog) {
            if (p.initialFocus) {
              const initialEl =
                typeof p.initialFocus === 'string'
                  ? dialog.querySelector<HTMLElement>(p.initialFocus)
                  : (p.initialFocus as HTMLElement);
              if (initialEl && initialEl.focus) {
                initialEl.focus();
              } else {
                const focusableElements = getFocusableElements(dialog);
                if (focusableElements.length > 0) {
                  (focusableElements[0] as HTMLElement).focus();
                }
              }
            } else {
              const focusableElements = getFocusableElements(dialog);
              if (focusableElements.length > 0) {
                (focusableElements[0] as HTMLElement).focus();
              }
            }
          }
        }, 0);
      }
    });

    return () => {
      if (!visible()) {
        return createVNode('div', { style: 'display: none;' }, []);
      }

      const children: VNode[] = [];

      if (slots.header) {
        children.push(
          createVNode(
            'div',
            {
              class: 'lyt-dialog__header',
              id: p.id ? `${p.id}-header` : undefined,
            },
            slots.header(),
          ),
        );
      } else if (p.title) {
        const headerChildren: VNode[] = [];
        headerChildren.push(
          createVNode(
            'span',
            {
              class: 'lyt-dialog__title',
              id: p.id ? `${p.id}-title` : undefined,
            },
            [createTextVNode(p.title)],
          ),
        );
        if (p.showClose) {
          const closeBtnProps = getButtonA11yProps({
            ariaLabel: 'Close dialog',
          });
          headerChildren.push(
            createVNode(
              'button',
              mergeA11yProps(closeBtnProps, {
                class: 'lyt-dialog__close',
                onClick: handleClose,
              }),
              [createTextVNode('×')],
            ),
          );
        }
        children.push(
          createVNode(
            'div',
            {
              class: 'lyt-dialog__header',
              id: p.id ? `${p.id}-header` : undefined,
            },
            headerChildren,
          ),
        );
      }

      if (slots.default) {
        children.push(
          createVNode(
            'div',
            {
              class: 'lyt-dialog__body',
              id: p.id ? `${p.id}-body` : undefined,
            },
            slots.default(),
          ),
        );
      }

      if (slots.footer) {
        children.push(
          createVNode(
            'div',
            {
              class: 'lyt-dialog__footer',
              id: p.id ? `${p.id}-footer` : undefined,
            },
            slots.footer(),
          ),
        );
      }

      const dialogClass = ['lyt-dialog', p.class].filter(Boolean).join(' ');

      const dialogStyle = `width: ${typeof p.width === 'number' ? `${p.width}px` : p.width}`;

      const dialogA11yProps = getDialogA11yProps({
        id: p.id,
        ariaLabel: p.ariaLabel || p.title,
        ariaDescribedBy: p.ariaDescribedBy || (p.id ? `${p.id}-body` : undefined),
        labelledBy: p.title && p.id ? `${p.id}-title` : undefined,
        modal: p.ariaModal,
      });

      return createVNode(
        'div',
        {
          class: 'lyt-dialog__wrapper',
          onKeydown: (e: KeyboardEvent) => {
            if (e.key === 'Tab') {
              handleTabKey(e);
            }
            handleKeydown(e);
          },
          ref: (el: HTMLElement | null) => {
            dialogRef.set(el);
          },
        },
        [
          createVNode('div', {
            class: 'lyt-dialog__overlay',
            'aria-hidden': true,
            onClick: p.closeOnClickModal ? handleClose : undefined,
          }),
          createVNode(
            'div',
            mergeA11yProps(dialogA11yProps, {
              class: dialogClass,
              style: dialogStyle,
              role: 'dialog',
              'aria-modal': p.ariaModal,
            }),
            children,
          ),
        ],
      );
    };
  },
});

export type { DialogProps, DialogSlots } from './types';
