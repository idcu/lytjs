// @vitest-environment jsdom
/**
 * 行为级判据：`Slider` 的交互与可访问性
 *
 * ## 为什么要有这条
 *
 * `Slider`（457 行）是 UI 包里**已从 `src/index.ts` 导出、随包发布**的公开组件，
 * 但覆盖率实测仅 ~9%（355 条语句未覆盖）—— 键盘 / 拖动 / range / 数字输入 / a11y
 * 五条主路径一条都没被验证过。
 *
 * ⇒ 用 `createApp` 真挂载 + 真实事件派发断言（与 `e2e-steps` / `e2e-select` 同范式）。
 */

import { describe, it, expect, afterEach } from 'vitest';
import { createApp, h } from '@lytjs/core';
import { Slider } from '../src/components/Slider';

const hosts: HTMLElement[] = [];

afterEach(() => {
  for (const x of hosts.splice(0)) x.remove();
});

async function mountSlider(props: Record<string, unknown> = {}): Promise<HTMLElement> {
  const host = document.createElement('div');
  document.body.appendChild(host);
  hosts.push(host);
  await createApp({
    setup() {
      return () => h(Slider as never, props);
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

/** jsdom 的 getBoundingClientRect 恒为 0 ⇒ 拖动换算会得 NaN，需给根元素桩一个真实矩形 */
function stubRect(el: HTMLElement, width = 200, height = 20): void {
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

describe('Slider — 渲染', () => {
  it('渲染 runway / bar / 把手，把手带 role=slider 与 aria-valuenow/min/max', async () => {
    const host = await mountSlider({ modelValue: 30, min: 0, max: 100 });
    expect(q(host, '.lyt-slider__runway')).toBeTruthy();
    expect(q(host, '.lyt-slider__bar')).toBeTruthy();
    const button = q(host, '.lyt-slider__button')!;
    expect(button).toBeTruthy();
    expect(button.getAttribute('role')).toBe('slider');
    expect(button.getAttribute('aria-valuenow')).toBe('30');
    expect(button.getAttribute('aria-valuemin')).toBe('0');
    expect(button.getAttribute('aria-valuemax')).toBe('100');
  });

  it('根类名反映 vertical / disabled / 自定义 class', async () => {
    const host = await mountSlider({ vertical: true, disabled: true, class: 'my-slider' });
    const root = q(host, '.lyt-slider')!;
    expect(root.className).toContain('lyt-slider--vertical');
    expect(root.className).toContain('lyt-slider--disabled');
    expect(root.className).toContain('my-slider');
  });

  it('tooltip 显示值，formatTooltip 生效', async () => {
    const host = await mountSlider({
      modelValue: 42,
      formatTooltip: (v: number) => `${v}%`,
    });
    expect(q(host, '.lyt-slider__tooltip')!.textContent).toContain('42%');
  });

  it('showStops 按 (max-min)/step 渲染 stop', async () => {
    const host = await mountSlider({ min: 0, max: 10, step: 2, showStops: true });
    expect(qa(host, '.lyt-slider__stop')).toHaveLength(6); // i=0..5
  });

  it('★ showTooltip=false 时**把手仍应存在**（否则失去焦点与键盘入口）', async () => {
    const host = await mountSlider({ showTooltip: false, modelValue: 10 });
    expect(q(host, '.lyt-slider__tooltip')).toBeNull();
    expect(q(host, '.lyt-slider__button')).toBeTruthy();
  });

  it('style 传字符串时直接落到根元素', async () => {
    const host = await mountSlider({ style: 'margin-top: 4px' });
    expect(q(host, '.lyt-slider')!.getAttribute('style')).toContain('margin-top');
  });
});

describe('Slider — 键盘', () => {
  it('ArrowRight / ArrowUp 增加一个 step，并触发 input', async () => {
    const seen: unknown[] = [];
    const host = await mountSlider({
      modelValue: 10,
      step: 5,
      onInput: (v: unknown) => seen.push(v),
    });
    const button = q(host, '.lyt-slider__button')!;
    button.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    await tick();
    expect(seen).toEqual([15]);
    expect(q(host, '.lyt-slider__button')!.getAttribute('aria-valuenow')).toBe('15');
  });

  it('ArrowLeft / ArrowDown 减少一个 step', async () => {
    const seen: unknown[] = [];
    const host = await mountSlider({
      modelValue: 10,
      step: 5,
      onInput: (v: unknown) => seen.push(v),
    });
    const button = q(host, '.lyt-slider__button')!;
    button.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    await tick();
    expect(seen).toEqual([5]);
  });

  it('Home 跳到 min，End 跳到 max', async () => {
    const seen: unknown[] = [];
    const host = await mountSlider({
      modelValue: 50,
      min: 10,
      max: 90,
      onInput: (v: unknown) => seen.push(v),
    });
    const button = q(host, '.lyt-slider__button')!;
    button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    await tick();
    button.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    await tick();
    expect(seen).toEqual([10, 90]);
  });

  it('disabled 时键盘不改变值', async () => {
    const seen: unknown[] = [];
    const host = await mountSlider({
      modelValue: 10,
      disabled: true,
      onInput: (v: unknown) => seen.push(v),
    });
    const button = q(host, '.lyt-slider__button')!;
    button.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    await tick();
    expect(seen).toEqual([]);
  });

  it('未识别的按键透传给 onKeydown，且不改值', async () => {
    const keys: unknown[] = [];
    const host = await mountSlider({
      modelValue: 10,
      onKeydown: (e: KeyboardEvent) => keys.push(e.key),
    });
    const button = q(host, '.lyt-slider__button')!;
    button.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
    await tick();
    expect(keys).toEqual(['a']);
  });

  it('到达 max 后再按 ArrowRight 不变（夹取）', async () => {
    const seen: unknown[] = [];
    const host = await mountSlider({
      modelValue: 100,
      min: 0,
      max: 100,
      onInput: (v: unknown) => seen.push(v),
    });
    const button = q(host, '.lyt-slider__button')!;
    button.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    await tick();
    expect(seen).toEqual([]);
  });
});

describe('Slider — 鼠标拖动', () => {
  it('mousedown→mousemove→mouseup：更新值并触发 change', async () => {
    const inputs: unknown[] = [];
    const changes: unknown[] = [];
    const host = await mountSlider({
      modelValue: 0,
      min: 0,
      max: 100,
      onInput: (v: unknown) => inputs.push(v),
      onChange: (v: unknown) => changes.push(v),
    });
    stubRect(q(host, '.lyt-slider')!, 200, 20);

    q(host, '.lyt-slider__runway')!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 100 }));
    await tick();
    expect(inputs).toEqual([50]);

    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    await tick();
    expect(changes).toEqual([50]);
  });

  it('disabled 时 mousedown 不启动拖动（mousemove 无效）', async () => {
    const inputs: unknown[] = [];
    const host = await mountSlider({
      modelValue: 0,
      disabled: true,
      onInput: (v: unknown) => inputs.push(v),
    });
    stubRect(q(host, '.lyt-slider')!, 200, 20);
    q(host, '.lyt-slider__runway')!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 100 }));
    await tick();
    expect(inputs).toEqual([]);
  });
});

describe('Slider — range 模式', () => {
  it('未给数组时默认 [min, max]，渲染两个把手', async () => {
    const host = await mountSlider({ range: true, min: 0, max: 100 });
    expect(qa(host, '.lyt-slider__button')).toHaveLength(2);
  });

  it('modelValue 数组生效并反映到两个把手的 aria-valuenow', async () => {
    const host = await mountSlider({ range: true, modelValue: [20, 80], min: 0, max: 100 });
    const values = qa(host, '.lyt-slider__button').map((b) => b.getAttribute('aria-valuenow'));
    expect(values).toEqual(['20', '80']);
  });
});

describe('Slider — 数字输入框', () => {
  it('showInput 渲染 number 输入框，label 作为可访问名称', async () => {
    const host = await mountSlider({ modelValue: 7, showInput: true, label: '音量' });
    const input = q(host, '.lyt-slider__input input') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.getAttribute('type')).toBe('number');
    expect(input.getAttribute('aria-label')).toBe('音量');
  });

  it('showInputControls=false 时不渲染输入框', async () => {
    const host = await mountSlider({ showInput: true, showInputControls: false });
    expect(q(host, '.lyt-slider__input')).toBeNull();
  });

  it('range 模式不渲染输入框', async () => {
    const host = await mountSlider({ showInput: true, range: true });
    expect(q(host, '.lyt-slider__input')).toBeNull();
  });

  it('输入合法数字更新值；非法输入忽略', async () => {
    // 注：数字输入框只发 `update:modelValue`（不调 `onInput`）—— 与把手路径不一致，
    // 已在报告里记为待决项，本用例只断言「值确实更新」这一核心契约。
    const updates: unknown[] = [];
    const host = await mountSlider({
      modelValue: 7,
      showInput: true,
      min: 0,
      max: 10,
      'onUpdate:modelValue': (v: unknown) => updates.push(v),
    });
    const input = q(host, '.lyt-slider__input input') as HTMLInputElement;
    input.value = '3';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await tick();
    expect(updates).toEqual([3]);
    expect(q(host, '.lyt-slider__button')!.getAttribute('aria-valuenow')).toBe('3');

    input.value = 'abc';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await tick();
    expect(updates).toEqual([3]);
  });
});

describe('Slider — 其余分支', () => {
  it('vertical 拖动按高度换算（而非宽度）', async () => {
    const inputs: unknown[] = [];
    const host = await mountSlider({
      vertical: true,
      modelValue: 0,
      min: 0,
      max: 100,
      onInput: (v: unknown) => inputs.push(v),
    });
    stubRect(q(host, '.lyt-slider')!, 200, 20);
    q(host, '.lyt-slider__runway')!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    // clientY=10、rect.bottom=20、height=20 ⇒ (20-10)/20*100 = 50
    document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientY: 10 }));
    await tick();
    expect(inputs).toEqual([50]);
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    await tick();
  });

  it('未按下时 mousemove 不改变值（dragging 守卫）', async () => {
    const inputs: unknown[] = [];
    const host = await mountSlider({ modelValue: 0, onInput: (v: unknown) => inputs.push(v) });
    stubRect(q(host, '.lyt-slider')!, 200, 20);
    document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 100 }));
    await tick();
    expect(inputs).toEqual([]);
  });

  it('range 拖动：靠近哪一端就移动哪一端，mouseup 发 [first, second]', async () => {
    const changes: unknown[] = [];
    const host = await mountSlider({
      range: true,
      modelValue: [0, 100],
      min: 0,
      max: 100,
      onChange: (v: unknown) => changes.push(v),
    });
    stubRect(q(host, '.lyt-slider')!, 200, 20);
    q(host, '.lyt-slider__runway')!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 150 })); // 75%
    await tick();
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    await tick();
    expect(changes).toEqual([[0, 75]]);
  });

  it('range + showTooltip=false：两个把手仍在，且无气泡', async () => {
    const host = await mountSlider({ range: true, modelValue: [20, 80], showTooltip: false });
    expect(qa(host, '.lyt-slider__button')).toHaveLength(2);
    expect(q(host, '.lyt-slider__tooltip')).toBeNull();
  });

  it('style 传对象时合并到根元素', async () => {
    const host = await mountSlider({ style: { marginTop: '4px' } });
    expect(q(host, '.lyt-slider')!.getAttribute('style')).toContain('margin-top');
  });

  it('vertical + showStops：stop 用 bottom 定位', async () => {
    const host = await mountSlider({ vertical: true, min: 0, max: 4, step: 1, showStops: true });
    const stops = qa(host, '.lyt-slider__stop');
    expect(stops.length).toBe(5);
    expect(stops[0]!.getAttribute('style')).toContain('bottom');
  });

  it('range 未给数组且 modelValue 非数组时回落到 [min, max]', async () => {
    const host = await mountSlider({ range: true, modelValue: 5, min: 1, max: 9 });
    const values = qa(host, '.lyt-slider__button').map((b) => b.getAttribute('aria-valuenow'));
    expect(values).toEqual(['1', '9']);
  });

  it('单值模式 modelValue 非数字时回落到 min', async () => {
    const host = await mountSlider({ modelValue: 'abc', min: 3, max: 9 });
    expect(q(host, '.lyt-slider__button')!.getAttribute('aria-valuenow')).toBe('3');
  });
});
