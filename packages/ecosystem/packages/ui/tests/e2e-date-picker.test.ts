// @vitest-environment jsdom
/**
 * 行为级判据：`DatePicker` 的开合、选日、范围、时间与快捷项
 *
 * ## 为什么要有这条
 *
 * `DatePicker`（441 行）是 UI 包里**已从 `src/index.ts` 导出、随包发布**的公开组件，
 * 覆盖率实测仅 ~5%（360 条语句未覆盖），且**无任何专项测试**。
 * 静态审查已发现可疑：数组型快捷项只设内部状态、**从不调 `onChange`**（静默失效）。
 *
 * ## 关于"今天"
 *
 * 组件内部用 `new Date()` 取当前年月与「今天」⇒ 本电池的断言一律**相对当前日期**推导
 * （`daysInMonth(y,m)` / `firstDayOfMonth(y,m)`），不写死月份，避免跨月脆弱。
 */

import { describe, it, expect, afterEach } from 'vitest';
import { createApp, h } from '@lytjs/core';
import { DatePicker } from '../src/components/DatePicker';

const hosts: HTMLElement[] = [];

afterEach(() => {
  for (const x of hosts.splice(0)) x.remove();
});

const today = new Date();
const Y = today.getFullYear();
const M = today.getMonth();
const daysInMonth = (y: number, m: number): number => new Date(y, m + 1, 0).getDate();
const firstWeekday = (y: number, m: number): number => new Date(y, m, 1).getDay();
const pad = (n: number): string => String(n).padStart(2, '0');
const fmt = (y: number, m: number, d: number): string => `${y}-${pad(m + 1)}-${pad(d)}`;

async function mountPicker(props: Record<string, unknown> = {}): Promise<HTMLElement> {
  const host = document.createElement('div');
  document.body.appendChild(host);
  hosts.push(host);
  await createApp({
    setup() {
      return () => h(DatePicker as never, props);
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
const trigger = (host: HTMLElement): HTMLElement => q(host, '.lyt-date-picker__trigger')!;
const dayCells = (host: HTMLElement): HTMLElement[] => qa(host, '.lyt-date-picker__day');
const click = async (el: HTMLElement): Promise<void> => {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await tick();
};

describe('DatePicker — 渲染与开合', () => {
  it('渲染 trigger 与占位；初始无下拉', async () => {
    const host = await mountPicker({ placeholder: '请选日期' });
    expect(trigger(host)).toBeTruthy();
    expect(host.textContent).toContain('请选日期');
    expect(q(host, '.lyt-date-picker__dropdown')).toBeNull();
  });

  it('点击 trigger 打开（触发 onOpen），再点关闭（触发 onClose）', async () => {
    const opened: unknown[] = [];
    const closed: unknown[] = [];
    const host = await mountPicker({ onOpen: () => opened.push(1), onClose: () => closed.push(1) });
    await click(trigger(host));
    expect(q(host, '.lyt-date-picker__dropdown')).toBeTruthy();
    expect(opened).toEqual([1]);
    await click(trigger(host));
    expect(q(host, '.lyt-date-picker__dropdown')).toBeNull();
    expect(closed).toEqual([1]);
  });

  it('disabled 时点击不打开', async () => {
    const host = await mountPicker({ disabled: true });
    await click(trigger(host));
    expect(q(host, '.lyt-date-picker__dropdown')).toBeNull();
  });

  it('class / disabled 反映到根类名', async () => {
    const host = await mountPicker({ class: 'my-dp', disabled: true });
    const root = q(host, '.lyt-date-picker')!;
    expect(root.className).toContain('my-dp');
    expect(root.className).toContain('lyt-date-picker--disabled');
  });
});

describe('DatePicker — 日历', () => {
  it('月标签为当前年月；▶ 前进一月、◀ 后退一月（含跨年）', async () => {
    const host = await mountPicker();
    await click(trigger(host));
    expect(q(host, '.lyt-date-picker__month-label')!.textContent).toContain(
      `${Y}年${pad(M + 1)}月`,
    );
    const navs = qa(host, '.lyt-date-picker__nav-btn');
    await click(navs[1]!); // ▶
    const nextM = M === 11 ? 0 : M + 1;
    const nextY = M === 11 ? Y + 1 : Y;
    expect(q(host, '.lyt-date-picker__month-label')!.textContent).toContain(
      `${nextY}年${pad(nextM + 1)}月`,
    );
    await click(navs[0]!); // ◀
    expect(q(host, '.lyt-date-picker__month-label')!.textContent).toContain(
      `${Y}年${pad(M + 1)}月`,
    );
  });

  it('星期表头 7 列，首列为「日」', async () => {
    const host = await mountPicker();
    await click(trigger(host));
    const wd = qa(host, '.lyt-date-picker__weekday');
    expect(wd).toHaveLength(7);
    expect(wd[0]!.textContent).toBe('日');
  });

  it('网格：前导空格 = 当月 1 号星期几，天数 = 当月天数', async () => {
    const host = await mountPicker();
    await click(trigger(host));
    const cells = dayCells(host);
    expect(cells).toHaveLength(firstWeekday(Y, M) + daysInMonth(Y, M));
    const empties = cells.filter((c) => c.className.includes('--empty'));
    expect(empties).toHaveLength(firstWeekday(Y, M));
  });

  it('今天带 --today 标记', async () => {
    const host = await mountPicker();
    await click(trigger(host));
    const todayCell = dayCells(host).find((c) => c.className.includes('--today'));
    expect(todayCell).toBeTruthy();
    expect(todayCell!.textContent).toBe(String(today.getDate()));
  });
});

describe('DatePicker — 选日与清除', () => {
  it('点选某天：onChange(格式化串)、关闭下拉、该天标记 --selected', async () => {
    const seen: unknown[] = [];
    const host = await mountPicker({ onChange: (v: unknown) => seen.push(v) });
    await click(trigger(host));
    const cells = dayCells(host).filter((c) => !c.className.includes('--empty'));
    await click(cells[0]!);
    expect(seen).toEqual([fmt(Y, M, 1)]);
    expect(q(host, '.lyt-date-picker__dropdown')).toBeNull();

    await click(trigger(host));
    const sel = dayCells(host).find((c) => c.className.includes('--selected'));
    expect(sel!.textContent).toBe('1');
  });

  it('自定义 format 生效', async () => {
    const seen: unknown[] = [];
    const host = await mountPicker({
      format: 'DD/MM/YYYY',
      onChange: (v: unknown) => seen.push(v),
    });
    await click(trigger(host));
    const cells = dayCells(host).filter((c) => !c.className.includes('--empty'));
    await click(cells[0]!);
    expect(seen).toEqual([`01/${pad(M + 1)}/${Y}`]);
  });

  it('disabledDate 命中的天被禁用，点击不触发 onChange', async () => {
    const seen: unknown[] = [];
    const host = await mountPicker({
      disabledDate: (d: Date) => d.getDate() === 2,
      onChange: (v: unknown) => seen.push(v),
    });
    await click(trigger(host));
    const cells = dayCells(host).filter((c) => !c.className.includes('--empty'));
    const d2 = cells.find((c) => c.textContent === '2')!;
    expect(d2.className).toContain('--disabled');
    await click(d2);
    expect(seen).toEqual([]);
  });

  it('clearable + 已选：显示清除按钮，点击 onChange(null)', async () => {
    const seen: unknown[] = [];
    const host = await mountPicker({
      modelValue: new Date(Y, M, 5),
      onChange: (v: unknown) => seen.push(v),
    });
    const clear = q(host, '.lyt-date-picker__clear')!;
    expect(clear).toBeTruthy();
    await click(clear);
    expect(seen).toEqual([null]);
    expect(q(host, '.lyt-date-picker__clear')).toBeNull();
  });

  it('modelValue 作为初始值（Date / string / 数组）', async () => {
    const a = await mountPicker({ modelValue: new Date(Y, M, 7) });
    expect(a.textContent).toContain(fmt(Y, M, 7));

    const b = await mountPicker({ modelValue: `${Y}-${pad(M + 1)}-09` });
    expect(b.textContent).toContain(fmt(Y, M, 9));

    const c = await mountPicker({
      type: 'daterange',
      modelValue: [`${Y}-${pad(M + 1)}-03`, `${Y}-${pad(M + 1)}-08`],
    });
    expect(c.textContent).toContain(`${fmt(Y, M, 3)} - ${fmt(Y, M, 8)}`);
  });
});

describe('DatePicker — 范围与时间', () => {
  it('type=daterange：两次点击完成范围并 onChange([start,end])', async () => {
    const seen: unknown[] = [];
    const host = await mountPicker({
      type: 'daterange',
      onChange: (v: unknown) => seen.push(v),
    });
    await click(trigger(host));
    const cells = dayCells(host).filter((c) => !c.className.includes('--empty'));
    await click(cells[2]!); // 3 号
    expect(seen).toEqual([]);
    await click(cells[5]!); // 6 号
    expect(seen).toEqual([[fmt(Y, M, 3), fmt(Y, M, 6)]]);
  });

  it('daterange：区间内日期带 --in-range（不含端点）', async () => {
    const host = await mountPicker({
      type: 'daterange',
      modelValue: [`${Y}-${pad(M + 1)}-03`, `${Y}-${pad(M + 1)}-06`],
    });
    await click(trigger(host));
    const inRange = dayCells(host).filter((c) => c.className.includes('--in-range'));
    expect(inRange.map((c) => c.textContent)).toEqual(['4', '5']);
  });

  it('type=datetime：渲染时间控件，确定后 onChange 带时间（需自定义 format）', async () => {
    const seen: unknown[] = [];
    const host = await mountPicker({
      type: 'datetime',
      format: 'YYYY-MM-DD HH:mm:ss',
      onChange: (v: unknown) => seen.push(v),
    });
    await click(trigger(host));
    expect(q(host, '.lyt-date-picker__time')).toBeTruthy();
    const cells = dayCells(host).filter((c) => !c.className.includes('--empty'));
    await click(cells[3]!); // 4 号
    const inputs = qa(host, '.lyt-date-picker__time-input') as HTMLInputElement[];
    inputs[0]!.value = '13';
    inputs[0]!.dispatchEvent(new Event('input', { bubbles: true }));
    await tick();
    await click(q(host, '.lyt-date-picker__confirm-btn')!);
    expect(seen).toEqual([`${fmt(Y, M, 4)} 13:00:00`]);
  });

  it('type=date 时不渲染时间控件', async () => {
    const host = await mountPicker();
    await click(trigger(host));
    expect(q(host, '.lyt-date-picker__time')).toBeNull();
  });
});

describe('DatePicker — 快捷项与插槽', () => {
  it('shortcuts：Date 型快捷项触发选日（onChange）', async () => {
    const seen: unknown[] = [];
    const host = await mountPicker({
      shortcuts: [{ text: '五号', value: new Date(Y, M, 5) }],
      onChange: (v: unknown) => seen.push(v),
    });
    await click(trigger(host));
    await click(q(host, '.lyt-date-picker__shortcut')!);
    expect(seen).toEqual([fmt(Y, M, 5)]);
  });

  it('★ shortcuts：数组型快捷项应设置范围并 onChange', async () => {
    const seen: unknown[] = [];
    const host = await mountPicker({
      shortcuts: [{ text: '本周', value: [new Date(Y, M, 3), new Date(Y, M, 7)] }],
      onChange: (v: unknown) => seen.push(v),
    });
    await click(trigger(host));
    await click(q(host, '.lyt-date-picker__shortcut')!);
    expect(seen).toEqual([[fmt(Y, M, 3), fmt(Y, M, 7)]]);
  });

  it('shortcuts：onClick 型直接调用回调', async () => {
    const hits: unknown[] = [];
    const host = await mountPicker({
      shortcuts: [{ text: '自定义', onClick: () => hits.push(1) }],
    });
    await click(trigger(host));
    await click(q(host, '.lyt-date-picker__shortcut')!);
    expect(hits).toEqual([1]);
  });

  it('无 shortcuts 时不渲染快捷区', async () => {
    const host = await mountPicker();
    await click(trigger(host));
    expect(q(host, '.lyt-date-picker__shortcuts')).toBeNull();
  });
});
