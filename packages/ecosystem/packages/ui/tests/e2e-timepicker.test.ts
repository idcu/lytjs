// @vitest-environment jsdom
/**
 * 行为级判据：时间选择器的 `minTime` / `maxTime` / `step` / `format`
 *
 * 2026-10-04：这四个 prop 此前**声明了却从未使用** ⇒ 时间范围、步长、显示格式
 * 全部不可约束。本判据用真挂载断言**真实渲染出的 `<option>` 集合与显示文本**。
 */

import { describe, it, expect, afterEach } from 'vitest';
import { createApp, h } from '@lytjs/core';
import { TimePicker } from '../src/components/TimePicker';

const hosts: HTMLElement[] = [];
afterEach(() => {
  for (const x of hosts.splice(0)) x.remove();
});

async function renderPicker(props: Record<string, unknown>): Promise<HTMLElement> {
  const host = document.createElement('div');
  document.body.appendChild(host);
  hosts.push(host);
  await createApp({
    setup() {
      return () => h(TimePicker as never, { modelValue: '12:00:00', ...props });
    },
  } as never).mount(host);
  await new Promise((r) => setTimeout(r, 40));
  // ★ 下拉层只在展开时渲染 ⇒ 先点开
  const trigger =
    host.querySelector('.lyt-time-picker__trigger') ?? host.querySelector('.lyt-time-picker');
  trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 40));
  return host;
}

function selectsOf(host: HTMLElement): HTMLSelectElement[] {
  return [...host.querySelectorAll('select')];
}

function hourValues(host: HTMLElement): string[] {
  const first = selectsOf(host)[0];
  return first
    ? [...first.querySelectorAll('option')].map((o) => o.getAttribute('value') ?? '')
    : [];
}

describe('行为：TimePicker 的时间约束', () => {
  it('★ 不传约束时小时选项是完整 24 个', async () => {
    const host = await renderPicker({});
    expect(hourValues(host).length).toBe(24);
  });

  it('★ minTime / maxTime 过滤掉越界的小时', async () => {
    const host = await renderPicker({ minTime: '09:00', maxTime: '17:00' });
    const hours = hourValues(host);
    // 09..17 均与 [09:00, 17:00] 有交集；08 与 18 应被排除
    expect(hours).toContain('9');
    expect(hours).toContain('17');
    expect(hours).not.toContain('8');
    expect(hours).not.toContain('18');
  });

  it('★ step 按分钟步长过滤分钟选项', async () => {
    const host = await renderPicker({ step: 15 });
    const minutes = [...(selectsOf(host)[1]?.querySelectorAll('option') ?? [])].map((o) =>
      Number(o.getAttribute('value')),
    );
    expect(minutes).toContain(0);
    expect(minutes).toContain(15);
    expect(minutes).not.toContain(7);
  });

  it('★ format 决定显示文本（默认 HH:mm:ss）', async () => {
    const host = await renderPicker({});
    expect(host.textContent).toContain('12:00:00');

    const host2 = await renderPicker({ format: 'HH:mm' });
    expect(host2.textContent).toContain('12:00');
    expect(host2.textContent).not.toContain('12:00:00');
  });
});
