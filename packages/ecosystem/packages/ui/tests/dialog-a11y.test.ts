// @vitest-environment jsdom
/**
 * 对话框的无障碍契约（2026-11-04）
 *
 * 三个弹层此前各写了一套焦点 / 键盘处理，而且**三套都是错的**：
 *
 * | 组件 | Escape 挂在哪 | 后果 |
 * |---|---|---|
 * | `Modal` | 对话框元素的 `onKeydown` | 焦点从未移入 ⇒ 收不到事件 ⇒ Escape 永不生效 |
 * | `Dialog` | 包裹层的 `onKeydown` | 焦点离开包裹层就失效 |
 * | `Drawer` | `window.addEventListener`（从不移除） | 卸载后仍响应；N 个抽屉一次全关 |
 *
 * 这些缺陷的共同点是**视觉上完全正常**：弹窗出现了、内容正确、鼠标能点。
 * 所以用例必须断言「焦点在哪」「按了 Escape 之后状态变没变」，而不是断言 DOM 结构。
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { createApp, h, ref, nextTick } from '@lytjs/core';
import { Modal } from '../src/components/Modal';
import { Dialog } from '../src/components/Dialog';
import { Drawer } from '../src/components/Drawer';

const hosts: HTMLElement[] = [];
const apps: Array<{ unmount: () => void }> = [];

/**
 * 等待策略：
 * - 焦点陷阱由 `overlay-focus` 在打开后用一个宏任务（`setTimeout(0)`）建立
 *   ⇒ 焦点/ Escape 类断言用 `vi.waitFor` 轮询**真实焦点位置 / 状态值**；
 * - 纯渲染类断言（aria 树、内联样式）只需 `nextTick` 冲刷调度器。
 */

/** 挂一个「触发按钮 + 弹层」的小应用；返回 `open` 与真正能卸载的 app 句柄 */
async function mountOverlay(Component: unknown, props: Record<string, unknown> = {}) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  hosts.push(host);

  const open = ref(false);
  const app = createApp({
    setup: () => () =>
      h('div', [
        h('button', { id: 'trigger' }, 'open'),
        h(
          Component as never,
          {
            modelValue: open.value,
            title: 'T',
            'onUpdate:modelValue': (v: boolean) => {
              open.value = v;
            },
            ...props,
          },
          () => h('button', { id: 'inner' }, 'ok'),
        ),
      ]),
  });
  apps.push(app as unknown as { unmount: () => void });
  await app.mount(host);
  return { host, open, app };
}

const pressEscape = (): void => {
  document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
};

afterEach(() => {
  for (const app of apps.splice(0)) {
    try {
      app.unmount();
    } catch {
      /* 已卸载 */
    }
  }
  for (const host of hosts.splice(0)) host.remove();
});

describe.each([
  ['Modal', Modal, '.lyt-modal'],
  ['Dialog', Dialog, '.lyt-dialog'],
  ['Drawer', Drawer, '.lyt-drawer'],
])('%s：焦点与 Escape', (name, Component, selector) => {
  it('打开后焦点进入弹层（此前停在 body / 触发按钮上）', async () => {
    const { open } = await mountOverlay(Component);
    open.value = true;
    // 陷阱建立后焦点才会进入弹层 ⇒ 轮询真实 activeElement，而非固定 sleep
    await vi.waitFor(() => {
      const box = document.querySelector(selector);
      expect(box).not.toBeNull();
      expect(box!.contains(document.activeElement)).toBe(true);
    });

    const box = document.querySelector(selector);
    expect(box).not.toBeNull();
    expect(box!.contains(document.activeElement)).toBe(true);
  });

  it('焦点在弹层外时 Escape 仍能关闭（元素级监听收不到这种情况）', async () => {
    const { open } = await mountOverlay(Component);
    open.value = true;
    // 先等陷阱真正建立（焦点进入弹层）——否则 Escape 根本没人接
    await vi.waitFor(() => {
      const box = document.querySelector(selector);
      expect(box).not.toBeNull();
      expect(box!.contains(document.activeElement)).toBe(true);
    });

    // 关键：把焦点挪出去。真实用户完全可能先点一下页面别处再看弹窗。
    (document.activeElement as HTMLElement | null)?.blur();
    pressEscape();
    await vi.waitFor(() => {
      expect(open.value).toBe(false);
    });
  });

  it('关闭后焦点回到触发元素', async () => {
    const { open } = await mountOverlay(Component);
    const trigger = document.getElementById('trigger')!;
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    open.value = true;
    await vi.waitFor(() => {
      const box = document.querySelector(selector);
      expect(box).not.toBeNull();
      expect(box!.contains(document.activeElement)).toBe(true);
    });
    expect(document.activeElement).not.toBe(trigger);

    open.value = false;
    await vi.waitFor(() => {
      expect(document.activeElement).toBe(trigger);
    });
  });

  it('卸载后不再响应 Escape', async () => {
    const { open, app } = await mountOverlay(Component);
    open.value = true;
    await vi.waitFor(() => {
      const box = document.querySelector(selector);
      expect(box).not.toBeNull();
      expect(box!.contains(document.activeElement)).toBe(true);
    });
    expect(open.value).toBe(true);

    app.unmount();
    // 卸载钩子是同步解除监听的；nextTick 只用于冲刷调度器
    await nextTick();

    pressEscape();
    await nextTick();
    expect(open.value).toBe(true);
  });
});

describe('多个弹层同时打开', () => {
  it('一次 Escape 只关最上层（此前两个抽屉一起关）', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    hosts.push(host);

    const a = ref(true);
    const b = ref(true);
    const app = createApp({
      setup: () => () =>
        h('div', [
          h(
            Drawer,
            {
              modelValue: a.value,
              title: 'A',
              'onUpdate:modelValue': (v: boolean) => (a.value = v),
            },
            () => 'A',
          ),
          h(
            Drawer,
            {
              modelValue: b.value,
              title: 'B',
              'onUpdate:modelValue': (v: boolean) => (b.value = v),
            },
            () => 'B',
          ),
        ]),
    });
    apps.push(app as unknown as { unmount: () => void });
    await app.mount(host);
    // 两个陷阱按 DOM 顺序先后建立（A 先、B 后）；B 建立后焦点落在 B 内
    await vi.waitFor(() => {
      const drawers = document.querySelectorAll('.lyt-drawer');
      expect(drawers.length).toBe(2);
      expect(drawers[1]!.contains(document.activeElement)).toBe(true);
    });

    pressEscape();
    await vi.waitFor(() => {
      expect([a.value, b.value]).toEqual([true, false]);
    });

    pressEscape();
    await vi.waitFor(() => {
      expect([a.value, b.value]).toEqual([false, false]);
    });
  });
});

describe('Modal：无障碍树与样式', () => {
  it('role="dialog" 的祖先链上不能有 aria-hidden="true"（此前遮罩层把整个对话框抹掉）', async () => {
    const { open } = await mountOverlay(Modal);
    open.value = true;
    await nextTick();

    const dialog = document.querySelector('.lyt-modal')!;
    expect(dialog.getAttribute('role')).toBe('dialog');

    const hiddenAncestors: Element[] = [];
    for (let node = dialog.parentElement; node; node = node.parentElement) {
      if (node.getAttribute('aria-hidden') === 'true') hiddenAncestors.push(node);
    }
    expect(hiddenAncestors).toEqual([]);
  });

  it('默认 top="15vh" 生成合法 CSS（此前拼成 "15vhpx" 被整条丢弃）', async () => {
    const { open } = await mountOverlay(Modal);
    open.value = true;
    await nextTick();

    expect(document.querySelector('.lyt-modal')!.getAttribute('style')).toMatch(/top:\s*15vh/);
  });

  it('top 传数字时补 px', async () => {
    const { open } = await mountOverlay(Modal, { top: 20 });
    open.value = true;
    await nextTick();

    expect(document.querySelector('.lyt-modal')!.getAttribute('style')).toMatch(/top:\s*20px/);
  });
});

describe('aria-* 不输出空串', () => {
  it('弹层与表单控件都不带 aria-*=""', async () => {
    const { open } = await mountOverlay(Modal);
    open.value = true;
    await nextTick();

    const empties = [...document.querySelectorAll('*')].flatMap((el) =>
      [...el.attributes]
        .filter((attr) => attr.name.startsWith('aria-') && attr.value === '')
        .map((attr) => attr.name),
    );
    expect(empties).toEqual([]);
  });
});
