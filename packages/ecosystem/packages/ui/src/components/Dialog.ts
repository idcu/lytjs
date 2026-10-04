/**
 * @lytjs/ui - Dialog 组件（增强版）
 *
 * 对话框组件，增强 Accessibility 支持
 * - 焦点陷阱（Focus Trap）
 * - 焦点管理（打开聚焦，关闭返回）
 * - ESC 键关闭支持
 */

import { defineComponent, Teleport } from '@lytjs/component';
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

    // ★ 2026-10-04 新增：`lockScroll` 与 `onBeforeOpen` 此前声明了却从未使用
    //   ⇒ 传了毫无效果（静默失效）。
    //   · `lockScroll`：打开时锁住 `body` 滚动，关闭时恢复
    //     （实现放在 `onMounted`/`onUnmounted` 之外，避免与焦点管理耦合）。
    //   · `onBeforeOpen`：与本文件已有的 `onBeforeClose` 对称 —— 返回 `false`
    //     则**阻止打开**（await，允许异步判断）。
    let scrollLocked = false;
    const setScrollLocked = (locked: boolean): void => {
      if (typeof document === 'undefined') return;
      document.body.style.overflow = locked ? 'hidden' : '';
      scrollLocked = locked;
    };

    watch(
      () => p.modelValue,
      async (newVal) => {
        if (newVal) {
          if (p.onBeforeOpen) {
            const allowed = await p.onBeforeOpen();
            if (allowed === false) return;
          }
          visible.set(true);
          if (p.lockScroll) setScrollLocked(true);
          p.onOpen?.();
        } else {
          visible.set(false);
          if (scrollLocked) setScrollLocked(false);
        }
      },
    );

    const handleClose = async () => {
      if (p.onBeforeClose) {
        const result = await p.onBeforeClose();
        if (result === false) return;
      }
      visible.set(false);
      if (scrollLocked) setScrollLocked(false);
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

      // ★ 2026-10-04：`appendToBody` 声明了却从未使用 ⇒ 弹层无法挂到 `body` 下，
      //   会被父级容器的 `overflow` / `transform` 裁剪。
      //   未传时**原样返回**，行为与原先完全一致。
      const withTeleport = (node: VNode): VNode =>
        p.appendToBody ? createVNode(Teleport, { to: 'body' }, [node]) : node;

      return withTeleport(
        createVNode(
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
        ),
      );
    };
  },
});

export type { DialogProps, DialogSlots } from './types';
