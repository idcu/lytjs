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

import { describe, it, expect, afterEach } from 'vitest';
import { createApp, h } from '@lytjs/core';
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
  await new Promise((r) => setTimeout(r, 30));
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
    await new Promise((r) => setTimeout(r, 20));
    expect(host.querySelector('.lyt-popconfirm__popup')).not.toBeNull();
  });

  it('★ 移开后气泡消失', async () => {
    const host = mount();
    await renderPopconfirm(host);
    const ref = host.querySelector('.lyt-popconfirm__reference')!;
    enter(ref);
    await new Promise((r) => setTimeout(r, 20));
    leave(ref);
    await new Promise((r) => setTimeout(r, 20));
    expect(host.querySelector('.lyt-popconfirm__popup')).toBeNull();
  });

  it('★ disabled 时悬浮不打开（此前该 prop 从未使用）', async () => {
    const host = mount();
    await renderPopconfirm(host, { disabled: true });
    enter(host.querySelector('.lyt-popconfirm__reference')!);
    await new Promise((r) => setTimeout(r, 20));
    expect(host.querySelector('.lyt-popconfirm__popup')).toBeNull();
  });

  it('★ cancelButtonType 拼进取消按钮 class（此前从未使用）', async () => {
    const host = mount();
    await renderPopconfirm(host, { cancelButtonType: 'primary' });
    enter(host.querySelector('.lyt-popconfirm__reference')!);
    await new Promise((r) => setTimeout(r, 20));
    const cancel = host.querySelector('.lyt-popconfirm__popup button');
    expect(cancel?.className).toContain('lyt-button--primary');
  });
});
