/**
 * B05 · Golden 20 真实浏览器交互宿主页
 *
 * 被 `e2e/tests/ui-a11y-interaction.test.ts` 访问（`/ui-a11y.html`）。
 * 目的不是「好看」，而是提供一个**稳定、可重复**的点击面：
 *   · Dialog / Modal / Drawer 各自一个触发按钮，便于验证焦点归还到触发按钮；
 *   · 弹层内至少两个可聚焦控件，便于验证 Tab 首尾环绕；
 *   · InputNumber 暴露加减按钮，便于验证 Enter/Space 真的能改值。
 *
 * 使用源码（playground/vite.config.ts 的 alias），不走 dist，避免产物过期。
 */
import { createApp, h } from '@lytjs/core';
import { signal } from '@lytjs/reactivity';
import { Dialog, Drawer, InputNumber, Modal, Pagination } from '@lytjs/ui';

const dialogOpen = signal(false);
const modalOpen = signal(false);
const drawerOpen = signal(false);
const page = signal(1);
const number = signal(5);

const bindOpen = (state: ReturnType<typeof signal<boolean>>) => ({
  modelValue: state(),
  'onUpdate:modelValue': (v: boolean) => state.set(Boolean(v)),
});

const App = {
  setup() {
    return () =>
      h('main', { id: 'harness' }, [
        h(
          'button',
          { id: 'open-dialog', type: 'button', onClick: () => dialogOpen.set(true) },
          '打开 Dialog',
        ),
        h(
          'button',
          { id: 'open-modal', type: 'button', onClick: () => modalOpen.set(true) },
          '打开 Modal',
        ),
        h(
          'button',
          { id: 'open-drawer', type: 'button', onClick: () => drawerOpen.set(true) },
          '打开 Drawer',
        ),

        h(
          Dialog as never,
          {
            ...bindOpen(dialogOpen),
            id: 'ha-dialog',
            title: 'Dialog title',
            'aria-label': 'Dialog title',
            onCancel: () => undefined,
            onConfirm: () => undefined,
          },
          {
            default: () => h('input', { id: 'dialog-field', placeholder: 'dialog field' }),
          } as never,
        ),

        h(
          Modal as never,
          {
            ...bindOpen(modalOpen),
            id: 'ha-modal',
            title: 'Modal title',
            'aria-label': 'Modal title',
            onCancel: () => undefined,
            onConfirm: () => undefined,
          },
          {
            default: () => h('input', { id: 'modal-field', placeholder: 'modal field' }),
          } as never,
        ),

        h(
          Drawer as never,
          {
            ...bindOpen(drawerOpen),
            id: 'ha-drawer',
            title: 'Drawer title',
            'aria-label': 'Drawer title',
          },
          {
            default: () => h('input', { id: 'drawer-field', placeholder: 'drawer field' }),
          } as never,
        ),

        h(Pagination as never, {
          id: 'ha-pagination',
          total: 100,
          current: page(),
          pageSize: 10,
          'onUpdate:current': (v: number) => page.set(v),
        }),

        // ⚠️ InputNumber 会把 `id` 透传到内部 `<input>`（不是根 div），
        //   所以这里用外层容器锁定作用域，避免选择器把「输入框」当「组件根」。
        h('div', { id: 'ha-input-number' }, [
          h(InputNumber as never, {
            modelValue: number(),
            min: 0,
            max: 10,
            'onUpdate:modelValue': (v: number) => number.set(v),
          }),
        ]),
      ]);
  },
};

createApp(App as never).mount(document.getElementById('app')!);
