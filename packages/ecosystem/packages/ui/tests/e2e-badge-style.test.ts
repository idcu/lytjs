// @vitest-environment jsdom
/**
 * 行为级判据：`Badge` 的 `style` prop 必须真正落到根元素
 *
 * ## 为什么要有这条
 *
 * `Badge` 的 `props` 里声明了 `style: { type: String, default: '' }`，
 * 但渲染函数在根 `span` 上只合并了 `class`，**从未读取 `p.style`** ⇒
 * 用户写 `<Badge style="color: red" />` 时样式被静默丢弃（不报错、不警告）。
 * 下方第一条用例在修复前**必红**（根元素没有 style 属性）。
 */

import { describe, it, expect, afterEach } from 'vitest';
import { createApp, h } from '@lytjs/core';
import { Badge } from '../src/components/Badge';

const hosts: HTMLElement[] = [];

afterEach(() => {
  for (const x of hosts.splice(0)) x.remove();
});

async function mountBadge(props: Record<string, unknown>): Promise<HTMLElement> {
  const host = document.createElement('div');
  document.body.appendChild(host);
  hosts.push(host);
  await createApp({
    setup() {
      return () => h(Badge as never, props, () => 'content');
    },
  } as never).mount(host);
  await new Promise((r) => setTimeout(r, 20));
  return host;
}

describe('Badge — style prop 接线', () => {
  it('★ 传入 style 应落到根元素（改前被静默丢弃）', async () => {
    const host = await mountBadge({ count: 1, style: 'color: red' });
    const root = host.querySelector('.lyt-badge') as HTMLElement;
    expect(root).toBeTruthy();
    expect(root.getAttribute('style')).toContain('color');
    expect(root.style.color).toBe('red');
  });

  it('未传 style 时不产生 style 属性（零行为变化）', async () => {
    const host = await mountBadge({ count: 1 });
    const root = host.querySelector('.lyt-badge') as HTMLElement;
    expect(root.getAttribute('style')).toBeNull();
  });

  it('offset 仍只作用于角标 sup，不与根 style 互相覆盖', async () => {
    const host = await mountBadge({ count: 1, offset: [10, 5], style: 'color: red' });
    const root = host.querySelector('.lyt-badge') as HTMLElement;
    const sup = host.querySelector('.lyt-badge__count') as HTMLElement;
    expect(root.style.color).toBe('red');
    expect(sup.style.top).toBe('10px');
    expect(sup.style.right).toBe('5px');
  });
});
