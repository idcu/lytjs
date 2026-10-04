/**
 * @lytjs/ui - Modal 组件
 *
 * 对话框组件，支持拖拽移动、全屏显示、自定义页脚、层级管理、动画优化
 */

import { defineComponent, Teleport } from '@lytjs/component';
import { createVNode, createTextVNode, type VNode } from '@lytjs/vdom';
import { signal, watch } from '@lytjs/reactivity';
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

    // ★ 2026-10-04 新增：`lockScroll` / `onBeforeOpen` / `onOpen`
    //   此前声明了却从未使用 ⇒ 传了毫无效果（静默失效）。
    //   语义与同包的 `Dialog` / `Drawer` 对齐：`onBeforeOpen` 返回 `false`
    //   则**阻止打开**（await，允许异步判断）；`lockScroll` 打开时锁 `body`
    //   滚动、关闭时恢复。
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
          if (p.lockScroll) setScrollLocked(true);
          p.onOpen?.();
        } else if (scrollLocked) {
          setScrollLocked(false);
        }
      },
    );

    const close = async () => {
      if (isClosing()) return;
      if (p.onBeforeClose) {
        const result = await p.onBeforeClose();
        if (result === false) return;
      }
      isClosing.set(true);
      p.onClose?.();
      if (scrollLocked) setScrollLocked(false);
      setTimeout(() => {
        isClosing.set(false);
      }, 300);
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
        headerChildren.push(
          createVNode(
            'div',
            {
              class: 'lyt-modal__header',
              id: p.id ? `${p.id}-header` : undefined,
            },
            slots.header(),
          ),
        );
      } else if (p.title) {
        const titlePart: VNode[] = [
          createVNode(
            'span',
            {
              class: 'lyt-modal__title',
              id: p.id ? `${p.id}-title` : undefined,
            },
            [createTextVNode(String(p.title))],
          ),
        ];

        if (p.showClose) {
          const closeBtnProps = getButtonA11yProps({
            ariaLabel: 'Close dialog',
          });
          titlePart.push(
            createVNode(
              'button',
              mergeA11yProps(closeBtnProps, {
                class: 'lyt-modal__close',
                onClick: close,
              }),
              [createTextVNode('×')],
            ),
          );
        }

        headerChildren.push(
          createVNode(
            'div',
            {
              class: 'lyt-modal__header',
              id: p.id ? `${p.id}-header` : undefined,
            },
            titlePart,
          ),
        );
      }

      const bodyChildren: VNode[] = [];
      if (slots.default) {
        bodyChildren.push(...slots.default());
      }

      const footerChildren: VNode[] = [];
      if (slots.footer) {
        footerChildren.push(
          createVNode(
            'div',
            {
              class: 'lyt-modal__footer',
              id: p.id ? `${p.id}-footer` : undefined,
            },
            slots.footer(),
          ),
        );
      } else {
        const cancelBtnProps = getButtonA11yProps({
          ariaLabel: 'Cancel',
        });
        const confirmBtnProps = getButtonA11yProps({
          ariaLabel: 'Confirm',
        });
        footerChildren.push(
          createVNode(
            'div',
            {
              class: 'lyt-modal__footer',
              id: p.id ? `${p.id}-footer` : undefined,
            },
            [
              createVNode(
                'button',
                mergeA11yProps(cancelBtnProps, {
                  class: 'lyt-modal__cancel-btn',
                  onClick: close,
                }),
                [createTextVNode('取消')],
              ),
              createVNode(
                'button',
                mergeA11yProps(confirmBtnProps, {
                  class: 'lyt-modal__confirm-btn',
                  onClick: () => p.onConfirm?.(),
                }),
                [createTextVNode('确定')],
              ),
            ],
          ),
        );
      }

      const modalClass = [
        'lyt-modal',
        isClosing() ? 'lyt-modal--closing' : '',
        isFullscreen() ? 'lyt-modal--fullscreen' : '',
        p.customClass as string,
        p.class as string,
      ]
        .filter(Boolean)
        .join(' ');

      const modalWidth = typeof p.width === 'number' ? `${p.width}px` : (p.width as string);
      // ★ 2026-10-04：`top` 声明了却从未使用 ⇒ 弹层顶部偏移不可定制。
      const topOffset = p.top ? `top: ${String(p.top)}px;` : '';
      const modalStyle = isFullscreen() ? topOffset : `width: ${modalWidth};${topOffset}`;

      const modalA11yProps = getDialogA11yProps({
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
            class: 'lyt-modal__overlay',
            'aria-hidden': true,
            onClick: handleModalClick,
          },
          [
            createVNode(
              'div',
              mergeA11yProps(modalA11yProps, {
                class: modalClass,
                style: modalStyle,
                onKeydown: handleKeydown,
              }),
              [
                ...headerChildren,
                createVNode(
                  'div',
                  {
                    class: 'lyt-modal__body',
                    id: p.id ? `${p.id}-body` : undefined,
                  },
                  bodyChildren,
                ),
                ...(Array.isArray(footerChildren) ? footerChildren : [footerChildren]),
              ],
            ),
          ],
        ),
      );
    };
  },
});

export type { ModalProps, ModalSlots, ModalSetupProps } from './types';
