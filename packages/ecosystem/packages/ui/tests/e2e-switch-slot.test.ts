// @vitest-environment jsdom
/**
 * 行为级判据：`Switch` 的 `active` / `inactive` 插槽必须真正可见
 *
 * ## 为什么要有这条
 *
 * 组件把两个插槽都渲染成 `lyt-switch__label--left`，而随包发布的
 * `src/styles/index.css` 里有：
 *
 *   .lyt-switch--checked .lyt-switch__label--left { display: none; }
 *   .lyt-switch:not(.lyt-switch--checked) .lyt-switch__label--right { display: none; }
 *
 * ⇒ `active` 插槽只在选中态渲染，却被第一条规则隐藏，等于**完全不生效**。
 * 下方 `★` 用例在修复前**必红**（选中态插槽 label 带 `--left`）。
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, afterEach } from 'vitest';
import { createApp, h } from '@lytjs/core';
import { Switch } from '../src/components/Switch';

const hosts: HTMLElement[] = [];

afterEach(() => {
  for (const x of hosts.splice(0)) x.remove();
});

const switchCss = readFileSync(resolve(__dirname, '../src/styles/index.css'), 'utf8');

async function mountSwitch(
  props: Record<string, unknown>,
  slots?: Record<string, () => unknown>,
): Promise<HTMLElement> {
  const host = document.createElement('div');
  document.body.appendChild(host);
  hosts.push(host);
  await createApp({
    setup() {
      return () => h(Switch as never, props, slots as never);
    },
  } as never).mount(host);
  await new Promise((r) => setTimeout(r, 20));
  return host;
}

describe('Switch — active / inactive 插槽可见性', () => {
  it('随包 CSS 仍然用 --left/--right 控制选中态可见性（判据有效性锚点）', () => {
    expect(switchCss).toContain('.lyt-switch--checked .lyt-switch__label--left');
    expect(switchCss).toContain(':not(.lyt-switch--checked) .lyt-switch__label--right');
  });

  it('★ 选中态 active 插槽不得用被隐藏的 --left 类', async () => {
    const host = await mountSwitch({ modelValue: true }, { active: () => h('span', {}, 'ON') });
    const label = host.querySelector('.lyt-switch__label') as HTMLElement;
    expect(host.querySelector('.lyt-switch--checked')).toBeTruthy();
    expect(label.textContent).toBe('ON');
    // 选中态下 `--left` 被 display:none 隐藏 ⇒ 必须改用 `--right` 才看得见
    expect(label.classList.contains('lyt-switch__label--left')).toBe(false);
    expect(label.classList.contains('lyt-switch__label--right')).toBe(true);
  });

  it('未选中态 inactive 插槽使用 --left（本来可见，保持不变）', async () => {
    const host = await mountSwitch({ modelValue: false }, { inactive: () => h('span', {}, 'OFF') });
    const label = host.querySelector('.lyt-switch__label') as HTMLElement;
    expect(label.textContent).toBe('OFF');
    expect(label.classList.contains('lyt-switch__label--left')).toBe(true);
    expect(label.classList.contains('lyt-switch__label--right')).toBe(false);
  });

  it('activeText 优先于 active 插槽，且选中态可见副本仍是 --right', async () => {
    const host = await mountSwitch(
      { modelValue: true, activeText: 'TEXT' },
      { active: () => h('span', {}, 'ON') },
    );
    const labels = [...host.querySelectorAll('.lyt-switch__label')] as HTMLElement[];
    const visible = labels.find((el) => el.classList.contains('lyt-switch__label--right'));
    expect(visible?.textContent).toBe('TEXT');
    expect(host.textContent).not.toContain('ON');
  });

  it('未选中态不渲染 active 插槽内容', async () => {
    const host = await mountSwitch({ modelValue: false }, { active: () => h('span', {}, 'ON') });
    expect(host.textContent).not.toContain('ON');
  });
});
