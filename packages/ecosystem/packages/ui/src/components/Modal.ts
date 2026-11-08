/**
 * @lytjs/ui - Modal 组件
 *
 * 对话框组件，支持拖拽移动、全屏显示、自定义页脚、层级管理、动画优化
 *
 * 2026-11 本周期已补行为用例，列入 Golden 20（stable）。
 *       成熟度表见 `src/component-status.ts`（单一真相源）。
 */

import { defineComponent, Teleport, onMounted, onUnmounted } from '@lytjs/component';
import { createVNode, createTextVNode, type VNode } from '@lytjs/core/runtime';
import { signal, watch } from '@lytjs/reactivity';
import { getDialogA11yProps, getButtonA11yProps, mergeA11yProps } from '@lytjs/common-a11y';
import { createOverlayFocus } from './overlay-focus';
import { t } from '../locale';
import type { ModalSetupProps, ModalSlots } from './types';

export const Modal = defineComponent({
  name: 'LytModal',

  props: {
    // ⚠️ 2026-10-04 移除 `draggable` —— 本组件**没有任何拖拽实现**
    //   （无 mousedown / mousemove / 位置状态）⇒ 该开关毫无作用。
    //   待真正实现「按住标题栏拖动」时再加回。
    modelValue: { type: Boolean, default: false },
    title: { type: String, default: '' },
    width: { type: [String, Number] as unknown as StringConstructor, default: '50%' },
    top: { type: String, default: '15vh' },
    showClose: { type: Boolean, default: true },
    closeOnClickModal: { type: Boolean, default: true },
    closeOnPressEscape: { type: Boolean, default: true },
    lockScroll: { type: Boolean, default: true },
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

  setup(
    props: Record<string, unknown>,
    {
      slots,
      emit,
    }: {
      slots: ModalSlots;
      emit: (event: string, ...args: unknown[]) => void;
    },
  ) {
    const p = props as ModalSetupProps;
    const isClosing = signal(false);
    const isFullscreen = signal(p.fullscreen);

    // ★ 2026-11-04：对话框根元素（焦点陷阱的容器）。渲染时才存在，故用可变引用。
    let dialogEl: HTMLElement | null = null;

    /**
     * 焦点 / Escape 控制器。
     *
     * ⚠️ 2026-11-04 修（P0）：此前 Modal **完全没有焦点管理** ——
     *   打开后 `document.activeElement` 仍是触发器（焦点留在页面上），
     *   Tab 会走到对话框**背后**的页面，键盘用户进不去对话框；
     *   而 Escape 处理挂在对话框元素的 `onKeydown` 上 ⇒ 焦点不在里面 ⇒ **永不生效**。
     */
    const overlayFocus = createOverlayFocus(() => dialogEl, {
      onEscape: () => {
        // `closeOnPressEscape` 是公开 prop，必须在这里生效（否则等于被删掉）
        if (p.closeOnPressEscape) void close();
      },
    });

    // 初始就是打开状态时，`watch` 不会触发（值没有变化）⇒ 这里补一次
    onMounted(() => {
      if (p.modelValue) overlayFocus.activate();
    });

    onUnmounted(() => {
      // 卸载时若陷阱还开着，监听会一直挂在 document 上（直到进程退出）
      overlayFocus.deactivate();
    });

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
          // ⚠️ 2026-11-06 修（B05 浏览器验证暴露）：关闭后的 300ms 里 `isClosing` 为 true，
          //   此时若「重新打开 → 立即按 ESC / 点遮罩」，`close()` 会被守卫直接 return，
          //   弹层看起来对 Escape 无反应。重开即视为一次新的打开，清掉关闭态。
          isClosing.set(false);
          if (p.lockScroll) setScrollLocked(true);
          p.onOpen?.();
          // DOM 就位后再建立陷阱（渲染是异步的，这里延一个宏任务）
          overlayFocus.activate();
        } else {
          if (scrollLocked) setScrollLocked(false);
          overlayFocus.deactivate();
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
      // ⚠️ 2026-10-27 修（P0）：此前只改内部 `isClosing`、从不回写 `v-model`。
      //   而可见性由 `modelValue` 驱动（`if (!p.modelValue) return 隐藏占位`）⇒
      //   点 × / 遮罩 / Esc **弹层不会消失**，`v-model` 永远是 true。
      emit('update:modelValue', false);
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
        return createVNode('div', { hidden: true }, []);
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
            ariaLabel: t('dialog.close'),
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
          ariaLabel: t('dialog.cancel'),
        });
        const confirmBtnProps = getButtonA11yProps({
          ariaLabel: t('dialog.confirm'),
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
                  // ★ 2026-10-04：`onCancel` 声明了却从未被调用 ⇒
                  //   「取消」按钮只关闭弹层、不通知使用者。
                  onClick: () => {
                    p.onCancel?.();
                    close();
                  },
                }),
                [createTextVNode(t('dialog.cancel'))],
              ),
              createVNode(
                'button',
                mergeA11yProps(confirmBtnProps, {
                  class: 'lyt-modal__confirm-btn',
                  onClick: () => p.onConfirm?.(),
                }),
                [createTextVNode(t('dialog.confirm'))],
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
      // ⚠️ 2026-11-04 修（P1）：默认值是 `'15vh'`（**自带单位**），而这里无条件拼 `px`
      //   ⇒ 生成 `top: 15vhpx` —— 非法 CSS，浏览器整条声明丢弃（实测 style 里只剩
      //   `width: 50%`）⇒ 默认顶部偏移从未生效，而且没有任何报错。
      //   只有「纯数字」才补 `px`（`top: 20` / `top: '20'` 都当 px 处理）。
      const rawTop = String(p.top ?? '').trim();
      const topOffset = rawTop
        ? `top: ${/^-?\d+(\.\d+)?$/.test(rawTop) ? `${rawTop}px` : rawTop};`
        : '';
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
            // ⚠️ 2026-11-04 修（P0）：此前这里是 `'aria-hidden': true` —— 而遮罩层
            //   **包着** `role="dialog"` 的对话框 ⇒ 整棵子树被移出无障碍树，
            //   读屏软件**完全看不到对话框内容**（连「对话框」都不会播报）。
            //   `aria-hidden` 只能挂在**装饰性**的兄弟节点上（Dialog / Drawer 的遮罩
            //   就是兄弟节点，那才是正确写法）；容器节点上不能挂。
            onClick: handleModalClick,
          },
          [
            createVNode(
              'div',
              mergeA11yProps(modalA11yProps, {
                class: modalClass,
                style: modalStyle,
                ref: (el: unknown) => {
                  dialogEl = (el as HTMLElement | null) ?? null;
                },
                onKeydown: handleKeydown,
                // ⚠️ 2026-10-27 修（P0）：此前内容区**没有** stopPropagation，
                //   而遮罩层挂了 onClick=close ⇒ 点正文、点输入框、点按钮都会把弹层关掉
                //   （输入到一半内容丢失）。
                onClick: (e: Event) => e.stopPropagation(),
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
