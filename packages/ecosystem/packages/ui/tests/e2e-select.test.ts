// @vitest-environment jsdom
/**
 * 行为级判据：`Select` 的交互与可访问性
 *
 * ## 为什么要有这条
 *
 * `Select`（494 行）是 UI 包里**已从 `src/index.ts` 导出、随包发布**的公开组件，
 * 但覆盖率实测仅 ~13.8%（380 条语句未覆盖）—— 开合 / 选择 / 清除 / 过滤 / 键盘 / a11y
 * 六条主路径**一条都没被验证过**。
 *
 * 这类缺陷结构上无法被「直接调 `setup()` + mock props」风格的老测试抓到
 * ⇒ 这里用 `createApp` 真挂载 + 真实事件派发断言。
 */

import { describe, it, expect, afterEach } from 'vitest';
import { createApp, h } from '@lytjs/core';
import { Select } from '../src/components/Select';

const hosts: HTMLElement[] = [];

afterEach(() => {
  for (const x of hosts.splice(0)) x.remove();
});

const OPTIONS = [
  { label: '苹果', value: 'apple' },
  { label: '香蕉', value: 'banana' },
  { label: '樱桃', value: 'cherry', disabled: true },
];

async function mountSelect(props: Record<string, unknown> = {}): Promise<HTMLElement> {
  const host = document.createElement('div');
  document.body.appendChild(host);
  hosts.push(host);
  await createApp({
    setup() {
      return () => h(Select as never, { options: OPTIONS, ...props });
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

async function open(host: HTMLElement): Promise<void> {
  q(host, '.lyt-select__trigger')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await tick();
}

describe('Select — 渲染与占位', () => {
  it('无选择时显示 placeholder，且 trigger 具备 combobox 语义', async () => {
    const host = await mountSelect({ placeholder: '请选一个' });
    const trigger = q(host, '.lyt-select__trigger')!;
    expect(trigger).toBeTruthy();
    expect(trigger.getAttribute('role')).toBe('combobox');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(host.querySelector('.lyt-select__value--placeholder')).toBeTruthy();
    expect(host.textContent).toContain('请选一个');
    expect(q(host, '.lyt-select__dropdown')).toBeNull();
  });

  it('单选：modelValue 命中时显示该项 label（不再是 placeholder）', async () => {
    const host = await mountSelect({ modelValue: 'banana' });
    expect(host.textContent).toContain('香蕉');
    expect(host.querySelector('.lyt-select__value--placeholder')).toBeNull();
  });

  it('多选：数组 modelValue 显示多个 label，逗号分隔', async () => {
    const host = await mountSelect({ modelValue: ['apple', 'banana'], multiple: true });
    expect(host.textContent).toContain('苹果, 香蕉');
  });

  it('size / class / disabled 反映到根类名', async () => {
    const host = await mountSelect({ size: 'small', class: 'my-cls', disabled: true });
    const root = q(host, '.lyt-select')!;
    expect(root.className).toContain('lyt-select--small');
    expect(root.className).toContain('lyt-select--disabled');
    expect(root.className).toContain('my-cls');
  });
});

describe('Select — 打开 / 关闭', () => {
  it('点击 trigger 打开（aria-expanded=true、listbox 出现、onVisibleChange(true)），再点关闭', async () => {
    const seen: unknown[] = [];
    const host = await mountSelect({ onVisibleChange: (v: unknown) => seen.push(v) });
    await open(host);
    expect(q(host, '.lyt-select__trigger')!.getAttribute('aria-expanded')).toBe('true');
    const listbox = q(host, '.lyt-select__dropdown')!;
    expect(listbox).toBeTruthy();
    expect(listbox.getAttribute('role')).toBe('listbox');
    expect(seen).toEqual([true]);

    q(host, '.lyt-select__trigger')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await tick();
    expect(q(host, '.lyt-select__trigger')!.getAttribute('aria-expanded')).toBe('false');
    expect(q(host, '.lyt-select__dropdown')).toBeNull();
    expect(seen).toEqual([true, false]);
  });

  it('disabled 时点击不打开', async () => {
    const host = await mountSelect({ disabled: true });
    await open(host);
    expect(q(host, '.lyt-select__dropdown')).toBeNull();
  });
});

describe('Select — 选择', () => {
  it('单选：点击选项触发 onChange(value)，并按 closeOnSelect 关闭', async () => {
    const seen: unknown[] = [];
    const host = await mountSelect({ onChange: (v: unknown) => seen.push(v) });
    await open(host);
    const opts = qa(host, '.lyt-select__option');
    expect(opts).toHaveLength(3);
    opts[1]!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await tick();
    expect(seen).toEqual(['banana']);
    expect(q(host, '.lyt-select__dropdown')).toBeNull();
    expect(host.textContent).toContain('香蕉');
  });

  it('closeOnSelect=false：选中后保持打开', async () => {
    const host = await mountSelect({ closeOnSelect: false });
    await open(host);
    qa(host, '.lyt-select__option')[0]!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await tick();
    expect(q(host, '.lyt-select__dropdown')).toBeTruthy();
  });

  it('禁用选项：点击不触发 onChange', async () => {
    const seen: unknown[] = [];
    const host = await mountSelect({ onChange: (v: unknown) => seen.push(v) });
    await open(host);
    const disabled = qa(host, '.lyt-select__option').find((o) =>
      o.className.includes('--disabled'),
    )!;
    expect(disabled).toBeTruthy();
    disabled.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await tick();
    expect(seen).toEqual([]);
  });

  it('多选：再点同一项取消选中，onChange 始终传数组', async () => {
    const seen: unknown[] = [];
    const host = await mountSelect({ multiple: true, onChange: (v: unknown) => seen.push(v) });
    await open(host);
    qa(host, '.lyt-select__option')[0]!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await tick();
    expect(seen[0]).toEqual(['apple']);
    qa(host, '.lyt-select__option')[0]!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await tick();
    expect(seen[1]).toEqual([]);
  });

  it('已选项带 ✓ 与 aria-selected=true', async () => {
    const host = await mountSelect({ modelValue: 'apple' });
    await open(host);
    const first = qa(host, '.lyt-select__option')[0]!;
    expect(first.getAttribute('aria-selected')).toBe('true');
    expect(first.className).toContain('--selected');
    expect(first.querySelector('.lyt-select__check')).toBeTruthy();
  });
});

describe('Select — 清除', () => {
  it('clearable + 已选：显示清除按钮，点击触发 onClear 与 onChange(空)', async () => {
    const cleared: unknown[] = [];
    const changed: unknown[] = [];
    const host = await mountSelect({
      modelValue: 'apple',
      clearable: true,
      onClear: () => cleared.push(1),
      onChange: (v: unknown) => changed.push(v),
    });
    const clear = q(host, '.lyt-select__clear')!;
    expect(clear).toBeTruthy();
    clear.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await tick();
    expect(cleared).toEqual([1]);
    expect(changed).toEqual(['']);
    expect(q(host, '.lyt-select__clear')).toBeNull();
  });

  it('未选时不显示清除按钮', async () => {
    const host = await mountSelect({ clearable: true });
    expect(q(host, '.lyt-select__clear')).toBeNull();
  });
});

describe('Select — 过滤', () => {
  it('filterable：输入过滤选项；无命中时显示空态', async () => {
    const host = await mountSelect({ filterable: true });
    await open(host);
    const input = q(host, '.lyt-select__search') as HTMLInputElement;
    expect(input).toBeTruthy();

    input.value = '香';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await tick();
    const opts = qa(host, '.lyt-select__option');
    expect(opts).toHaveLength(1);
    expect(opts[0]!.textContent).toContain('香蕉');

    input.value = 'zzz';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await tick();
    expect(q(host, '.lyt-select__empty')).toBeTruthy();
    expect(host.textContent).toContain('无匹配选项');
  });
});

describe('Select — 键盘', () => {
  it('关闭态按 ArrowDown 打开下拉', async () => {
    const host = await mountSelect({});
    q(host, '.lyt-select__trigger')!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
    );
    await tick();
    expect(q(host, '.lyt-select__dropdown')).toBeTruthy();
  });

  it('Enter 选中当前高亮项', async () => {
    const seen: unknown[] = [];
    const host = await mountSelect({ onChange: (v: unknown) => seen.push(v) });
    const root = q(host, '.lyt-select')!;
    root.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await tick();
    root.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await tick();
    expect(seen).toEqual(['apple']);
  });

  it('Escape 关闭下拉', async () => {
    const host = await mountSelect({});
    const root = q(host, '.lyt-select')!;
    root.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await tick();
    root.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await tick();
    expect(q(host, '.lyt-select__dropdown')).toBeNull();
  });

  it('End / Home 跳末/首项（跳过 disabled）并更新 aria-activedescendant', async () => {
    const host = await mountSelect({});
    const root = q(host, '.lyt-select')!;
    root.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await tick();
    root.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    await tick();
    expect(q(host, '.lyt-select__trigger')!.getAttribute('aria-activedescendant')).toBe(
      'lyt-select-option-banana',
    );
    root.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    await tick();
    expect(q(host, '.lyt-select__trigger')!.getAttribute('aria-activedescendant')).toBe(
      'lyt-select-option-apple',
    );
  });

  it('onKeydown 透传原始事件', async () => {
    const keys: unknown[] = [];
    const host = await mountSelect({ onKeydown: (e: KeyboardEvent) => keys.push(e.key) });
    q(host, '.lyt-select')!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
    );
    await tick();
    expect(keys).toContain('ArrowDown');
  });
});

describe('Select — 空态与 a11y', () => {
  it('options 为空时下拉显示空态', async () => {
    const host = await mountSelect({ options: [] });
    await open(host);
    expect(q(host, '.lyt-select__empty')).toBeTruthy();
  });

  it('打开时含 live region，且 aria-controls 指向真实 listbox', async () => {
    const host = await mountSelect({ modelValue: 'apple' });
    await open(host);
    const trigger = q(host, '.lyt-select__trigger')!;
    const listId = trigger.getAttribute('aria-controls')!;
    expect(listId).toBeTruthy();
    expect(q(host, `#${listId}`)).toBeTruthy();
    const sro = q(host, '.lyt-select__sro')!;
    expect(sro.getAttribute('aria-live')).toBe('polite');
    expect(sro.textContent).toContain('已选择 1 个选项');
  });

  it('disabled 时 trigger 的 tabIndex = -1', async () => {
    const host = await mountSelect({ disabled: true });
    expect(q(host, '.lyt-select__trigger')!.getAttribute('tabindex')).toBe('-1');
  });
});
