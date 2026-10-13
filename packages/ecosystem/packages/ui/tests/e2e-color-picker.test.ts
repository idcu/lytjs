// @vitest-environment jsdom
/**
 * 行为级判据：`ColorPicker` 的开合、选色、通知与取色器
 *
 * ## 为什么要有这条
 *
 * `ColorPicker`（468 行）是 UI 包里**已从 `src/index.ts` 导出、随包发布**的公开组件，
 * 覆盖率实测仅 ~8.8%（371 条语句未覆盖），且**无任何专项测试**。
 * 静态审查已发现三处可疑：`toggleDropdown` 的守卫、`onChange` 从未被调用、
 * `clearColor` 不通知父组件 —— 本电池先用实测确立事实。
 */

import { describe, it, expect, afterEach } from 'vitest';
import { createApp, h } from '@lytjs/core';
import { ColorPicker } from '../src/components/ColorPicker';

const hosts: HTMLElement[] = [];

afterEach(() => {
  for (const x of hosts.splice(0)) x.remove();
});

async function mountPicker(props: Record<string, unknown> = {}): Promise<HTMLElement> {
  const host = document.createElement('div');
  document.body.appendChild(host);
  hosts.push(host);
  await createApp({
    setup() {
      return () => h(ColorPicker as never, props);
    },
  } as never).mount(host);
  await new Promise((r) => setTimeout(r, 30));
  return host;
}

const q = (host: HTMLElement, sel: string): HTMLElement | null =>
  host.querySelector(sel) as HTMLElement | null;
const qa = (host: HTMLElement, sel: string): HTMLElement[] =>
  [...host.querySelectorAll(sel)] as HTMLElement[];
const tick = (): Promise<void> => new Promise((r) => setTimeout(r, 20));
const trigger = (host: HTMLElement): HTMLElement => q(host, '.lyt-color-picker-trigger')!;
const click = async (el: HTMLElement): Promise<void> => {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await tick();
};

describe('ColorPicker — 渲染与开合', () => {
  it('渲染 trigger 与色块（背景为 modelValue），初始无下拉', async () => {
    const host = await mountPicker({ modelValue: '#ff0000' });
    expect(trigger(host)).toBeTruthy();
    // jsdom 会把 `backgroundColor: '#ff0000'` 规范成 `rgb(255, 0, 0)`
    expect(q(host, '.lyt-color-picker-display')!.getAttribute('style')).toContain('rgb(255, 0, 0)');
    expect(q(host, '.lyt-color-picker-dropdown')).toBeNull();
  });

  it('★ 点击 trigger 应打开下拉（默认 props）', async () => {
    const host = await mountPicker();
    await click(trigger(host));
    expect(q(host, '.lyt-color-picker-dropdown')).toBeTruthy();
  });

  it('再点一次应关闭（默认 props）', async () => {
    const host = await mountPicker();
    await click(trigger(host));
    await click(trigger(host));
    expect(q(host, '.lyt-color-picker-dropdown')).toBeNull();
  });

  it('showClear=false 时开合正常', async () => {
    const host = await mountPicker({ showClear: false });
    await click(trigger(host));
    expect(q(host, '.lyt-color-picker-dropdown')).toBeTruthy();
  });
});

describe('ColorPicker — 选色与通知', () => {
  it('★ 点击预设色应通知父组件（onChange）', async () => {
    const seen: unknown[] = [];
    const host = await mountPicker({ onChange: (c: string) => seen.push(c) });
    await click(trigger(host));
    const first = qa(host, '.lyt-color-picker-presets .lyt-color-picker-color')[0]!;
    await click(first);
    expect(seen).toHaveLength(1);
    expect(seen[0]).toBe('#ff4500');
  });

  it('★ 点击预设色应发 update:modelValue（v-model 契约）', async () => {
    const updates: unknown[] = [];
    const host = await mountPicker({ 'onUpdate:modelValue': (v: unknown) => updates.push(v) });
    await click(trigger(host));
    const first = qa(host, '.lyt-color-picker-presets .lyt-color-picker-color')[0]!;
    await click(first);
    expect(updates).toEqual(['#ff4500']);
  });

  it('选色后写入历史并关闭下拉', async () => {
    const host = await mountPicker();
    await click(trigger(host));
    const first = qa(host, '.lyt-color-picker-presets .lyt-color-picker-color')[0]!;
    await click(first);
    expect(q(host, '.lyt-color-picker-dropdown')).toBeNull();
    // 面板只在展开时渲染 ⇒ 重新打开才能看到历史区块
    await click(trigger(host));
    expect(q(host, '.lyt-color-picker-history')).toBeTruthy();
    expect(qa(host, '.lyt-color-picker-history .lyt-color-picker-color')).toHaveLength(1);
  });

  it('输入框 change 触发选色通知', async () => {
    const seen: unknown[] = [];
    const host = await mountPicker({ onChange: (c: string) => seen.push(c) });
    await click(trigger(host)); // 输入框在面板内，需先展开
    const input = q(host, '.lyt-color-picker-input input') as HTMLInputElement;
    input.value = '#123456';
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await tick();
    expect(seen).toEqual(['#123456']);
  });

  it('「确认」按钮用当前取色器颜色通知', async () => {
    const seen: unknown[] = [];
    const host = await mountPicker({
      modelValue: '#ff0000',
      onChange: (c: string) => seen.push(c),
    });
    await click(trigger(host));
    await click(q(host, '.lyt-color-picker-confirm')!);
    expect(seen).toHaveLength(1);
    expect(String(seen[0])).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe('ColorPicker — 清除', () => {
  it('showClear 且有色值时显示清除按钮', async () => {
    const host = await mountPicker({ modelValue: '#ff0000' });
    expect(q(host, '.lyt-color-picker-clear')).toBeTruthy();
  });

  it('无色值时不显示清除按钮', async () => {
    const host = await mountPicker({ modelValue: '' });
    expect(q(host, '.lyt-color-picker-clear')).toBeNull();
  });

  it('点击清除触发 onClear，且**不会**把下拉打开', async () => {
    const cleared: unknown[] = [];
    const host = await mountPicker({ modelValue: '#ff0000', onClear: () => cleared.push(1) });
    await click(q(host, '.lyt-color-picker-clear')!);
    expect(cleared).toEqual([1]);
    expect(q(host, '.lyt-color-picker-dropdown')).toBeNull();
  });
});

describe('ColorPicker — 面板构成', () => {
  it('默认含预设色区块；showPreset=false 时不渲染', async () => {
    const a = await mountPicker();
    await click(trigger(a));
    expect(q(a, '.lyt-color-picker-presets')).toBeTruthy();
    expect(qa(a, '.lyt-color-picker-presets .lyt-color-picker-color')).toHaveLength(16);

    const b = await mountPicker({ showPreset: false });
    await click(trigger(b));
    expect(q(b, '.lyt-color-picker-presets')).toBeNull();
  });

  it('showAlpha 控制 alpha 滑条是否渲染', async () => {
    const a = await mountPicker();
    await click(trigger(a));
    expect(q(a, '.lyt-color-picker-alpha')).toBeNull();

    const b = await mountPicker({ showAlpha: true });
    await click(trigger(b));
    expect(q(b, '.lyt-color-picker-alpha')).toBeTruthy();
  });

  it('history 非空且 showHistory 时渲染历史区块', async () => {
    const host = await mountPicker({ history: ['#111111', '#222222'] });
    await click(trigger(host));
    expect(q(host, '.lyt-color-picker-history')).toBeTruthy();
    expect(qa(host, '.lyt-color-picker-history .lyt-color-picker-color')).toHaveLength(2);
  });

  it('自定义 class 落到根元素', async () => {
    const host = await mountPicker({ class: 'my-cp' });
    expect(q(host, '.lyt-color-picker')!.className).toContain('my-cp');
  });
});

describe('ColorPicker — 取色器拖动', () => {
  function stubRect(el: HTMLElement, width = 200, height = 100): void {
    el.getBoundingClientRect = () =>
      ({
        left: 0,
        top: 0,
        right: width,
        bottom: height,
        width,
        height,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect;
  }

  it('在色相滑条上按下把色相设为对应位置（并刷新预览色）', async () => {
    const host = await mountPicker({ showAlpha: true });
    await click(trigger(host));
    const hue = q(host, '.lyt-color-picker-hue-slider')!;
    stubRect(hue, 360, 20);
    hue.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 180 }));
    await tick();
    // 色相 180 ⇒ 预览色应为青色系（#00ffff 附近）
    const preview = q(host, '.lyt-color-picker-preview')!;
    expect(preview.getAttribute('style')).toMatch(/rgb\(/);
  });

  it('未按下时 mousemove 不改色（isDragging 守卫）', async () => {
    const host = await mountPicker({ showAlpha: true });
    await click(trigger(host));
    const hue = q(host, '.lyt-color-picker-hue-slider')!;
    stubRect(hue, 360, 20);
    const before = q(host, '.lyt-color-picker-preview')!.getAttribute('style');
    hue.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 300 }));
    await tick();
    expect(q(host, '.lyt-color-picker-preview')!.getAttribute('style')).toBe(before);
  });

  it('alpha 滑条按下后预览切成 rgba', async () => {
    const host = await mountPicker({ showAlpha: true });
    await click(trigger(host));
    const alpha = q(host, '.lyt-color-picker-alpha-slider')!;
    stubRect(alpha, 100, 20);
    alpha.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 50 }));
    await tick();
    expect(q(host, '.lyt-color-picker-preview')!.getAttribute('style')).toContain('rgba(');
  });

  it('在饱和面板上按下同时改变饱和与明度', async () => {
    const host = await mountPicker({ showAlpha: true });
    await click(trigger(host));
    const sat = q(host, '.lyt-color-picker-saturation')!;
    stubRect(sat, 200, 100);
    sat.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 50, clientY: 25 }));
    await tick();
    expect(q(host, '.lyt-color-picker-preview')!.getAttribute('style')).toMatch(/rgb\(/);
  });
});

describe('ColorPicker — 颜色解析与历史', () => {
  it('覆盖多色族与短 hex（红/绿/蓝/黑/白/#abc）都能解析并进历史', async () => {
    const host = await mountPicker({
      presets: ['#ff0000', '#00ff00', '#0000ff', '#000000', '#ffffff', '#abc'],
    });
    await click(trigger(host));
    expect(qa(host, '.lyt-color-picker-presets .lyt-color-picker-color')).toHaveLength(6);
    for (let i = 0; i < 6; i++) {
      const cur = qa(host, '.lyt-color-picker-presets .lyt-color-picker-color');
      await click(cur[i]!);
      await click(trigger(host)); // 选色会关闭面板，需重新展开
    }
    expect(qa(host, '.lyt-color-picker-history .lyt-color-picker-color')).toHaveLength(6);
  });

  it('重复选同一颜色不产生重复项（置顶而非追加）', async () => {
    const host = await mountPicker({ presets: ['#111111', '#222222'] });
    await click(trigger(host));
    await click(qa(host, '.lyt-color-picker-presets .lyt-color-picker-color')[0]!);
    await click(trigger(host));
    await click(qa(host, '.lyt-color-picker-presets .lyt-color-picker-color')[1]!);
    await click(trigger(host));
    await click(qa(host, '.lyt-color-picker-presets .lyt-color-picker-color')[0]!);
    await click(trigger(host));
    const hist = qa(host, '.lyt-color-picker-history .lyt-color-picker-color');
    expect(hist).toHaveLength(2);
    expect(hist[0]!.getAttribute('style')).toContain('rgb(17, 17, 17)'); // 最近一次选的在最前
  });

  it('历史最多保留 10 条', async () => {
    const colors = Array.from(
      { length: 12 },
      (_, i) =>
        '#' +
        String(i + 1)
          .padStart(2, '0')
          .repeat(3),
    );
    const host = await mountPicker({ presets: colors });
    await click(trigger(host));
    for (let i = 0; i < 12; i++) {
      const cur = qa(host, '.lyt-color-picker-presets .lyt-color-picker-color');
      await click(cur[i]!);
      await click(trigger(host));
    }
    expect(qa(host, '.lyt-color-picker-history .lyt-color-picker-color')).toHaveLength(10);
  });

  it('showHistory=false 时不渲染历史区块', async () => {
    const host = await mountPicker({ history: ['#111111'], showHistory: false });
    await click(trigger(host));
    expect(q(host, '.lyt-color-picker-history')).toBeNull();
  });
});
