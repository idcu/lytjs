// @vitest-environment jsdom
/**
 * 行为级判据：`Popconfirm` 真的能开合
 *
 * ## 为什么要有这条
 *
 * 2026-10-04 实测发现：`Popconfirm` 的 `visible` signal **从未被设为 true、
 * 也从未被读取**，渲染时**无条件**输出气泡 ⇒ 组件**永久可见、根本无法开合**。
 *
 * 而 UI 包原有的 2 个测试文件是「直接调 `setup()` + mock props」的风格，
 * **抓不到这类行为缺陷**（全绿但组件不能用）⇒ 这里补**真挂载 + 真事件**的判据。
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { createApp, h, nextTick } from '@lytjs/core';
import { Popconfirm } from '../src/components/Popconfirm';

const hosts: HTMLElement[] = [];

afterEach(() => {
  for (const x of hosts.splice(0)) x.remove();
});

function mount(): HTMLElement {
  const host = document.createElement('div');
  document.body.appendChild(host);
  hosts.push(host);
  return host;
}

function enter(el: Element): void {
  el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));
}

function leave(el: Element): void {
  el.dispatchEvent(new MouseEvent('mouseleave', { bubbles: false }));
}

async function renderPopconfirm(
  host: HTMLElement,
  props: Record<string, unknown> = {},
): Promise<void> {
  await createApp({
    setup() {
      return () =>
        h(
          Popconfirm as never,
          { title: '确定？', ...props },
          {
            reference: () => h('span', { id: 'ref' }, '触发'),
            default: () => '内容',
          },
        );
    },
  } as never).mount(host);
}

describe('行为：Popconfirm 的开合', () => {
  it('★ 初始不应渲染气泡（修复前是永久可见）', async () => {
    const host = mount();
    await renderPopconfirm(host);
    expect(host.querySelector('.lyt-popconfirm__reference')).not.toBeNull();
    expect(host.querySelector('.lyt-popconfirm__popup')).toBeNull();
  });

  it('★ 悬浮 reference 后出现气泡', async () => {
    const host = mount();
    await renderPopconfirm(host);
    enter(host.querySelector('.lyt-popconfirm__reference')!);
    await vi.waitFor(() => {
      expect(host.querySelector('.lyt-popconfirm__popup')).not.toBeNull();
    });
  });

  // ⚠️ 2026-10-27 行为变更：hover 事件从 `reference` 上移到**根容器**。
  //   原因：气泡是 reference 的**兄弟节点**（不是子节点），鼠标从触发元素移进气泡
  //   必然先触发 reference 的 mouseleave ⇒ 气泡立刻消失，用户点不到「确认」。
  //   现在：离开 reference **不**隐藏；离开整个组件区域才隐藏。
  it('★ 移开 reference 不隐藏（否则移进气泡就消失）', async () => {
    const host = mount();
    await renderPopconfirm(host);
    const ref = host.querySelector('.lyt-popconfirm__reference')!;
    enter(ref);
    await nextTick();
    leave(ref);
    await nextTick();
    expect(host.querySelector('.lyt-popconfirm__popup')).not.toBeNull();
  });

  it('★ 离开整个组件区域后气泡消失', async () => {
    const host = mount();
    await renderPopconfirm(host);
    const root = host.querySelector('.lyt-popconfirm')!;
    enter(host.querySelector('.lyt-popconfirm__reference')!);
    await nextTick();
    leave(root);
    await nextTick();
    expect(host.querySelector('.lyt-popconfirm__popup')).toBeNull();
  });

  it('★ disabled 时悬浮不打开（此前该 prop 从未使用）', async () => {
    const host = mount();
    await renderPopconfirm(host, { disabled: true });
    enter(host.querySelector('.lyt-popconfirm__reference')!);
    await nextTick();
    expect(host.querySelector('.lyt-popconfirm__popup')).toBeNull();
  });

  it('★ cancelButtonType 拼进取消按钮 class（此前从未使用）', async () => {
    const host = mount();
    await renderPopconfirm(host, { cancelButtonType: 'primary' });
    enter(host.querySelector('.lyt-popconfirm__reference')!);
    await vi.waitFor(() => {
      const cancel = host.querySelector('.lyt-popconfirm__popup button');
      expect(cancel?.className).toContain('lyt-button--primary');
    });
  });
});
