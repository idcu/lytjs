/**
 * @lytjs/ui - Drawer 组件
 *
 * 抽屉组件，支持上下左右弹出、遮罩控制、宽度自适应、嵌套弹窗功能
 *
 * 2026-11 本周期已补行为用例，列入 Golden 20（stable）。
 *       成熟度表见 `src/component-status.ts`（单一真相源）。
 */

import { defineComponent, Teleport, onMounted, onUnmounted } from '@lytjs/component';
import { createVNode, type VNode, signal, watch } from '@lytjs/core/runtime';
import { getDialogA11yProps, getButtonA11yProps, mergeA11yProps } from '@lytjs/common-a11y';
import { createOverlayFocus } from './overlay-focus';
import { t } from '../locale';
import type { DrawerSetupProps, DrawerSlots } from './types';

export const Drawer = defineComponent({
  name: 'LytDrawer',

  props: {
    modelValue: { type: Boolean, default: false },
    title: { type: String, default: '' },
    size: { type: [String, Number] as unknown as StringConstructor, default: '30%' },
    direction: { type: String, default: 'rtl' },
    showClose: { type: Boolean, default: true },
    closeOnClickModal: { type: Boolean, default: true },
    closeOnPressEscape: { type: Boolean, default: true },
    lockScroll: { type: Boolean, default: true },
    appendToBody: { type: Boolean, default: false },
    withHeader: { type: Boolean, default: true },
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
  },

  setup(
    props: Record<string, unknown>,
    {
      slots,
      emit,
    }: {
      slots: DrawerSlots;
      emit: (event: string, ...args: unknown[]) => void;
    },
  ) {
    const p = props as DrawerSetupProps;
    const isClosing = signal(false);

    // ★ 2026-10-04 新增：`lockScroll` / `onBeforeOpen` / `onOpen` / `onClose`
    //   此前声明了却从未使用 ⇒ 传了毫无效果（静默失效）。
    //   语义与同包的 `Dialog` 对齐：`onBeforeOpen` 返回 `false` 则**阻止打开**
    //   （await，允许异步判断）；`lockScroll` 打开时锁 `body` 滚动、关闭时恢复。
    let scrollLocked = false;
    const setScrollLocked = (locked: boolean): void => {
      if (typeof document === 'undefined') return;
      document.body.style.overflow = locked ? 'hidden' : '';
      scrollLocked = locked;
    };

    // ★ 2026-11-04：抽屉根元素 + 焦点控制器
    let drawerEl: HTMLElement | null = null;

    /**
     * ⚠️ 2026-11-04 修（P0）：此前 Drawer 的 Escape 是
     *   `window.addEventListener('keydown', ...)`，在 **setup 里注册、从不移除**：
     *   ① 卸载后监听还在（`modelValue` 由外部持有 ⇒ 卸载后的抽屉仍会被 Escape 改回 false）；
     *   ② 多个抽屉同时打开时，**一次 Escape 全部关闭**（没有「最上层」概念）；
     *   ③ 打开后焦点不进入抽屉，Tab 会走到背后的页面。
     *   现在统一走 `createOverlayFocus`：document 级监听 + 最上层判定 + 焦点陷阱 + 卸载清理。
     */
    const overlayFocus = createOverlayFocus(() => drawerEl, {
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
      overlayFocus.deactivate();
    });

    watch(
      () => p.modelValue,
      async (newVal) => {
        if (newVal) {
          if (p.onBeforeOpen) {
            const allowed = await p.onBeforeOpen();
            if (allowed === false) return;
          }
          // 同 Modal（B05）：关闭动画期间重开时清掉 `isClosing`，
          // 否则紧接着的 ESC / 遮罩点击会被 `close()` 的守卫吞掉。
          isClosing.set(false);
          if (p.lockScroll) setScrollLocked(true);
          p.onOpen?.();
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
      // ⚠️ 2026-10-27 修（P0）：与 Modal 同款 —— 从不回写 `v-model` ⇒ 受控抽屉关不掉。
      emit('update:modelValue', false);
      setTimeout(() => {
        isClosing.set(false);
      }, 300);
      p.onClose?.();
      if (scrollLocked) setScrollLocked(false);
    };

    const handleModalClick = () => {
      if (p.closeOnClickModal) close();
    };

    const getDrawerClass = () => {
      const classes = ['lyt-drawer'];
      classes.push(`lyt-drawer--${p.direction}`);
      if (p.modelValue) classes.push('lyt-drawer--visible');
      if (isClosing()) classes.push('lyt-drawer--closing');
      if (p.class) classes.push(p.class as string);
      if (p.customClass) classes.push(p.customClass as string);
      return classes.join(' ');
    };

    const getSizeStyle = (): Record<string, string> => {
      const size = typeof p.size === 'number' ? `${p.size}px` : (p.size as string);
      const style: Record<string, string> = {};

      switch (p.direction) {
        case 'ltr':
        case 'rtl':
          style.width = size;
          break;
        case 'ttb':
        case 'btt':
          style.height = size;
          break;
      }

      return style;
    };

    const formatStyle = (style: Record<string, string>) => {
      if (!style) return '';
      return Object.entries(style)
        .map(([key, value]) => `${key}: ${value}`)
        .join('; ');
    };

    return () => {
      if (!p.modelValue && !isClosing()) {
        return createVNode('div', { hidden: true }, []);
      }

      const children: VNode[] = [];

      children.push(
        createVNode('div', { class: 'lyt-drawer__overlay', onClick: handleModalClick }),
      );

      const drawerChildren: VNode[] = [];

      if (p.withHeader) {
        const headerChildren: VNode[] = [];

        if (slots.header) {
          headerChildren.push(...slots.header());
        } else if (p.title) {
          headerChildren.push(
            createVNode(
              'span',
              { class: 'lyt-drawer__title', id: p.id ? `${p.id}-title` : undefined },
              [createVNode('span', {}, String(p.title))],
            ),
          );
        }

        if (p.showClose) {
          const closeBtnProps = getButtonA11yProps({ ariaLabel: t('drawer.close') });
          headerChildren.push(
            createVNode(
              'button',
              mergeA11yProps(closeBtnProps, {
                class: 'lyt-drawer__close',
                type: 'button',
                onClick: close,
              }),
              [
                createVNode('svg', { viewBox: '0 0 1024 1024', width: '1em', height: '1em' }, [
                  createVNode('path', {
                    d: 'M563.8 512l262.5-312.9c4.4-5.2.7-13.1-6.1-13.1h-79.8c-4.7 0-9.2 2.1-12.3 5.7L511.6 449.8 295.1 191.7c-3-3.6-7.5-5.7-12.3-5.7H203c-6.8 0-10.5 7.9-6.1 13.1L459.4 512 196.9 824.9c-4.4 5.2-.7 13.1 6.1 13.1h79.8c4.7 0 9.2-2.1 12.3-5.7l216.5-258.1 216.5 258.1c3 3.6 7.5 5.7 12.3 5.7h79.8c6.8 0 10.5-7.9 6.1-13.1L563.8 512z',
                    fill: 'currentColor',
                  }),
                ]),
              ],
            ),
          );
        }

        if (headerChildren.length > 0) {
          drawerChildren.push(
            createVNode(
              'div',
              { class: 'lyt-drawer__header', id: p.id ? `${p.id}-header` : undefined },
              headerChildren,
            ),
          );
        }
      }

      if (slots.default) {
        drawerChildren.push(
          createVNode(
            'div',
            { class: 'lyt-drawer__body', id: p.id ? `${p.id}-body` : undefined },
            slots.default(),
          ),
        );
      }

      if (slots.footer) {
        drawerChildren.push(
          createVNode(
            'div',
            { class: 'lyt-drawer__footer', id: p.id ? `${p.id}-footer` : undefined },
            slots.footer(),
          ),
        );
      }

      const drawerContainer = createVNode(
        'div',
        {
          class: 'lyt-drawer__container',
          style: formatStyle(getSizeStyle()),
          // ⚠️ 2026-10-27 修（P0）：内容区阻止冒泡，否则点抽屉内部会触发遮罩关闭
          onClick: (e: Event) => e.stopPropagation(),
        },
        drawerChildren,
      );
      children.push(drawerContainer);

      const a11yProps = getDialogA11yProps({
        id: p.id,
        ariaLabel: p.ariaLabel || p.title,
        ariaDescribedBy: p.ariaDescribedBy || (p.id ? `${p.id}-body` : undefined),
        labelledBy: p.title && p.id ? `${p.id}-title` : undefined,
        modal: p.ariaModal,
      });

      const root = createVNode(
        'div',
        mergeA11yProps(a11yProps, {
          class: getDrawerClass(),
          ref: (el: unknown) => {
            drawerEl = (el as HTMLElement | null) ?? null;
          },
        }),
        children,
      );
      // ★ 2026-10-04：`appendToBody` 声明了却从未使用 ⇒ 弹层无法挂到 `body` 下，
      //   会被父级容器的 `overflow` / `transform` 裁剪。
      //   未传时行为与原先**完全一致**（不套 Teleport）。
      return p.appendToBody ? createVNode(Teleport, { to: 'body' }, [root]) : root;
    };
  },
});

export default Drawer;
export type { DrawerProps, DrawerSlots, DrawerDirection, DrawerSetupProps } from './types';
