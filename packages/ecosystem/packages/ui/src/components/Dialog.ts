/**
 * @lytjs/ui - Dialog 组件（增强版）
 *
 * 对话框组件，增强 Accessibility 支持
 * - 焦点陷阱（Focus Trap）
 * - 焦点管理（打开聚焦，关闭返回）
 * - ESC 键关闭支持
 *
 * 2026-11 已补行为与无障碍（dialog-a11y / e2e-dialog），列入 Golden 20（stable）。
 *       成熟度表见 `src/component-status.ts`（单一真相源）。
 */

import { defineComponent, Teleport, onMounted, onUnmounted } from '@lytjs/component';
import { createVNode, createTextVNode, type VNode } from '@lytjs/vdom';
import { signal, watch } from '@lytjs/reactivity';
import { getDialogA11yProps, getButtonA11yProps, mergeA11yProps } from '@lytjs/common-a11y';
import { createOverlayFocus } from './overlay-focus';
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

  setup(
    props: Record<string, unknown>,
    {
      slots,
      emit,
    }: {
      slots: DialogSlots;
      emit: (event: string, ...args: unknown[]) => void;
    },
  ) {
    const p = props as DialogSetupProps;
    const visible = signal(p.modelValue);
    // ★ 2026-11-04：控制器要拿的是「当前 DOM 元素」，用可变引用比 signal 直接
    let dialogEl: HTMLElement | null = null;

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
          overlayFocus.activate();
        } else {
          visible.set(false);
          if (scrollLocked) setScrollLocked(false);
          overlayFocus.deactivate();
        }
      },
    );

    // ★ 2026-10-04 新增：内置 footer 按钮的处理函数（仅当传入 onConfirm/onCancel 时渲染）
    const handleCancel = (): void => {
      p.onCancel?.();
      void handleClose();
    };
    const handleConfirm = (): void => {
      p.onConfirm?.();
      void handleClose();
    };

    const handleClose = async () => {
      if (p.onBeforeClose) {
        const result = await p.onBeforeClose();
        if (result === false) return;
      }
      visible.set(false);
      // ⚠️ 2026-10-27 修（P0）：此前**从不**回写 `v-model`（测试里已登记为「已知设计怪癖 B」）。
      //   后果：受控用法下点 ESC / 遮罩 / × 后，外部 `modelValue` 仍是 true，
      //   想重开必须先 false 再 true —— 调用方以为关闭成功了。
      emit('update:modelValue', false);
      if (scrollLocked) setScrollLocked(false);
      p.onClose?.();

      // 焦点恢复由 `overlayFocus.deactivate()` 完成（它在 `focusTrap` 的 cleanup 里，
      // 且只在「陷阱确实建立过」时才执行）—— 这里不再手动恢复，避免两处各恢复一次。
    };

    const handleKeydown = (e: KeyboardEvent) => {
      // ⚠️ 2026-11-04：Escape 交给 `overlayFocus`（document 级 + 只关最上层）统一处理。
      //   此前这里也处理一次 ⇒ 焦点在对话框内时**一次 Escape 触发两次 handleClose**
      //   （`onBeforeClose` 是异步的时候两次都能通过守卫，回调被调两遍）。
      //   这里只负责把事件转给使用者的 `onKeydown`。
      p.onKeydown?.(e);
    };

    // ★ 2026-11-04：内联焦点陷阱 → 统一控制器
    //
    // ⚠️ 此前这里是自己写的一套：`getFocusableElements` + `handleTabKey` + `effect`。
    //   问题在于：
    //   ① Tab 只在包裹层的 `onKeydown` 里处理 —— 焦点一旦离开包裹层（点遮罩、程序化
    //      focus）就彻底失效，Tab 可以走到背后的页面；
    //   ② 可聚焦列表用 `el.offsetParent !== null` 判可见，而 `position: fixed` 元素的
    //      `offsetParent` 恒为 `null` ⇒ 固定定位对话框里的**所有**元素都被判为不可见，
    //      列表为空 ⇒ 初始焦点落空；
    //   ③ 容器内没有可聚焦元素时直接 `return`，容器也不会被临时 `tabindex=-1`，
    //      `focus()` 是空操作 ⇒ 焦点停在对话框外。
    //   现在与 Modal / Drawer 共用 `createOverlayFocus`（内部就是 `@lytjs/common-a11y`
    //   的 `focusTrap` —— 这个工具此前**一次都没被调用过**）。
    const overlayFocus = createOverlayFocus(() => dialogEl, {
      onEscape: () => {
        if (p.closeOnPressEscape) void handleClose();
      },
      // 只有**显式**传 false 才不归还（`undefined` 按默认 true 处理 ——
      // `Boolean(undefined)` 会把「没传」误判成「不归还」）
      restoreFocus: p.returnFocusOnClose !== false,
      initialFocus: p.initialFocus as string | HTMLElement | undefined,
    });

    // 初始就是打开状态时，`watch` 不会触发（值没有变化）⇒ 这里补一次
    onMounted(() => {
      if (p.modelValue) overlayFocus.activate();
    });

    onUnmounted(() => {
      overlayFocus.deactivate();
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

      // ★ 2026-10-04：`onConfirm` / `onCancel` 此前**声明了却永远不会被调用** ——
      //   `Dialog` 原本只有 header 的关闭按钮，底部是 `footer` **插槽**
      //   （确认按钮由使用者自己放）⇒ 组件无从调用这两个回调。
      //   处置（与同包 `Modal` 保持一致）：**传了才渲染内置按钮**，
      //   不传时 DOM 与之前**完全一致**（零回归风险）。
      const hasBuiltinFooter = Boolean(p.onConfirm || p.onCancel);
      if (slots.footer || hasBuiltinFooter) {
        const footerChildren: VNode[] = [];
        if (slots.footer) {
          const fc = slots.footer();
          if (Array.isArray(fc)) footerChildren.push(...(fc as VNode[]));
          else if (fc) footerChildren.push(fc as VNode);
        }
        if (hasBuiltinFooter) {
          if (p.onCancel) {
            footerChildren.push(
              createVNode('button', { class: 'lyt-dialog__cancel-btn', onClick: handleCancel }, [
                createTextVNode('取消'),
              ]),
            );
          }
          if (p.onConfirm) {
            footerChildren.push(
              createVNode('button', { class: 'lyt-dialog__confirm-btn', onClick: handleConfirm }, [
                createTextVNode('确定'),
              ]),
            );
          }
        }
        children.push(
          createVNode(
            'div',
            {
              class: 'lyt-dialog__footer',
              id: p.id ? `${p.id}-footer` : undefined,
            },
            footerChildren,
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
            onKeydown: handleKeydown,
            ref: (el: HTMLElement | null) => {
              dialogEl = el;
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
