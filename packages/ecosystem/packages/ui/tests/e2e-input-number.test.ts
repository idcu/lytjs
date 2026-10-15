// @vitest-environment jsdom
/**
 * 行为级判据：`InputNumber` 的交互与可访问性
 *
 * ## 为什么要有这条
 *
 * `InputNumber`（309 行）已随包发布，覆盖率实测仅 ~27%（224 条语句未覆盖）——
 * 加减按钮 / 输入解析 / blur 钳制 / 键盘 / 受控同步五条主路径均未被真挂载验证过。
 *
 * ⚠️ 已登记的设计怪癖（按真实行为断言，修复走单独决策，勿顺手改）：
 *  A) 输入框一旦 dirty（用户键入过），程序对 `value` 的改写**全部失效**：
 *     patchProp 的 value 落 patchAttr ⇒ `setAttribute('value')` 只改
 *     defaultValue，不改 dirty 元素的当前值（HTML 规范语义，浏览器同样）
 *     ⇒ blur 钳制（99→10）、precision 格式化、非法输入回滚后，**显示与
 *     内部值脱节**：内部已是 10，用户看到的还是自己敲的 '99'。
 *  B) `handleInput` 用 `parseFloat`（:135）静默截断尾部垃圾：'12abc' 按 12
 *     接受并 emit change(12)，但（因怪癖 A）输入框仍显示 '12abc'。
 *  C) blur 对完全无法解析的输入（'abc'）**静默放过**（:151-155 无 else 分支）：
 *     不 setValue、不 emit change，显示也（因怪癖 A）保持 'abc' —— 用户
 *     以为自己改成功了，内部其实还是旧值。
 *  D) 加减按钮从空值起步用 `inputValue || 0`（:113/:119）：undefined 时按 0
 *     加减再 clamp —— min=5 时空值点 '+' 路径为 0+1=1 → clamp 5。
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { createApp, h } from '@lytjs/core';
import { signal } from '@lytjs/reactivity';
import { InputNumber } from '../src/components/InputNumber';

const hosts: HTMLElement[] = [];

afterEach(() => {
  for (const x of hosts.splice(0)) x.remove();
});

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

/**
 * 受控挂载：signal 驱动 modelValue，`onUpdate:modelValue` 回写。
 * userOnChange 先收 change 事件参数供断言。
 */
async function mountInputNumber(
  props: Record<string, unknown> = {},
): Promise<{ host: HTMLElement; mv: (v?: number) => void }> {
  const host = document.createElement('div');
  document.body.appendChild(host);
  hosts.push(host);
  const value = signal<number | undefined>(props.modelValue as number | undefined);
  const userUpdate = props['onUpdate:modelValue'] as ((v?: number) => void) | undefined;
  await createApp({
    setup() {
      return () =>
        h(InputNumber as never, {
          ...props,
          modelValue: value(),
          'onUpdate:modelValue': (v?: number) => {
            userUpdate?.(v);
            value.set(v);
          },
        });
    },
  } as never).mount(host);
  await flush();
  return { host, mv: (v?: number) => value.set(v) };
}

const getInput = (host: HTMLElement): HTMLInputElement =>
  host.querySelector('input.lyt-input-number__input')!;
const getInc = (host: HTMLElement): HTMLElement =>
  host.querySelector('.lyt-input-number__increase')!;
const getDec = (host: HTMLElement): HTMLElement =>
  host.querySelector('.lyt-input-number__decrease')!;
const getRoot = (host: HTMLElement): HTMLElement => host.querySelector('.lyt-input-number')!;

function typeAndBlur(input: HTMLInputElement, text: string): void {
  input.value = text;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('blur', { bubbles: true }));
}

function keydown(input: HTMLInputElement, key: string): KeyboardEvent {
  const e = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  input.dispatchEvent(e);
  return e;
}

describe('InputNumber · 渲染与 a11y', () => {
  it('默认渲染：根类 / +− 按钮 role=button+aria-label / input type=text', async () => {
    const { host } = await mountInputNumber({ modelValue: 1 });
    expect(getRoot(host)).toBeTruthy();
    const inc = getInc(host);
    const dec = getDec(host);
    expect(inc.getAttribute('role')).toBe('button');
    expect(inc.getAttribute('aria-label')).toBe('增加');
    expect(dec.getAttribute('aria-label')).toBe('减少');
    expect(getInput(host).type).toBe('text');
  });

  it('controls=false 不渲染加减按钮', async () => {
    const { host } = await mountInputNumber({ modelValue: 1, controls: false });
    expect(host.querySelector('.lyt-input-number__increase')).toBeNull();
    expect(host.querySelector('.lyt-input-number__decrease')).toBeNull();
  });

  it('size / controlsPosition / disabled 落根类', async () => {
    const { host } = await mountInputNumber({
      modelValue: 1,
      size: 'small',
      controlsPosition: 'right',
      disabled: true,
    });
    const cls = getRoot(host).className;
    expect(cls).toContain('lyt-input-number--small');
    expect(cls).toContain('lyt-input-number--controls-right');
    expect(cls).toContain('lyt-input-number--disabled');
  });

  it('focus/blur 切换 is-focus 根类', async () => {
    const { host } = await mountInputNumber({ modelValue: 1 });
    const input = getInput(host);
    expect(getRoot(host).className).not.toContain('is-focus');
    input.dispatchEvent(new Event('focus', { bubbles: true }));
    await flush();
    expect(getRoot(host).className).toContain('lyt-input-number--focus');
    input.dispatchEvent(new Event('blur', { bubbles: true }));
    await flush();
    expect(getRoot(host).className).not.toContain('lyt-input-number--focus');
  });

  it('class 透传；style 字符串与对象两分支', async () => {
    const r1 = await mountInputNumber({ modelValue: 1, class: 'my-n', style: 'width: 120px' });
    expect(getRoot(r1.host).className).toContain('my-n');
    expect(getRoot(r1.host).getAttribute('style')).toContain('width: 120px');
    const r2 = await mountInputNumber({ modelValue: 1, style: { width: '99px' } });
    expect(getRoot(r2.host).getAttribute('style')).toContain('99px');
  });

  it('spinbutton a11y：aria-valuemin/max（有限时）/aria-valuenow/label/必填/无效/tabIndex', async () => {
    const { host } = await mountInputNumber({
      modelValue: 3,
      min: 0,
      max: 10,
      label: '数量',
      ariaRequired: true,
      ariaInvalid: true,
      tabIndex: 2,
      id: 'n1',
      name: 'count',
      placeholder: '请输入',
    });
    const input = getInput(host);
    expect(input.getAttribute('role')).toBe('spinbutton');
    expect(input.getAttribute('aria-valuemin')).toBe('0');
    expect(input.getAttribute('aria-valuemax')).toBe('10');
    expect(input.getAttribute('aria-valuenow')).toBe('3');
    expect(input.getAttribute('aria-label')).toBe('数量');
    expect(input.getAttribute('aria-required')).toBe('true');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('tabindex')).toBe('2');
    expect(input.id).toBe('n1');
    expect(input.name).toBe('count');
    expect(input.placeholder).toBe('请输入');
  });

  it('min/max 无限时不落 aria-valuemin/max', async () => {
    const { host } = await mountInputNumber({ modelValue: 1 });
    const input = getInput(host);
    expect(input.getAttribute('aria-valuemin')).toBeNull();
    expect(input.getAttribute('aria-valuemax')).toBeNull();
  });

  it('displayValue：undefined → 空串；precision → toFixed', async () => {
    const r1 = await mountInputNumber({});
    expect(getInput(r1.host).value).toBe('');
    const r2 = await mountInputNumber({ modelValue: 1.5, precision: 2 });
    expect(getInput(r2.host).value).toBe('1.50');
    const r3 = await mountInputNumber({ modelValue: 7 });
    expect(getInput(r3.host).value).toBe('7');
  });
});

describe('InputNumber · 加减按钮', () => {
  it('+：按 step 增加并 emit update:modelValue 与 change', async () => {
    const onChange = vi.fn();
    const onUpdate = vi.fn();
    const { host } = await mountInputNumber({
      modelValue: 1,
      step: 2,
      onChange,
      'onUpdate:modelValue': onUpdate,
    });
    getInc(host).click();
    await flush();
    expect(onUpdate).toHaveBeenCalledWith(3);
    expect(onChange).toHaveBeenCalledWith(3);
    expect(getInput(host).value).toBe('3');
  });

  it('−：按 step 减少', async () => {
    const onChange = vi.fn();
    const { host } = await mountInputNumber({ modelValue: 5, onChange });
    getDec(host).click();
    await flush();
    expect(onChange).toHaveBeenCalledWith(4);
    expect(getInput(host).value).toBe('4');
  });

  it('at max：+ 落 is-disabled/aria-disabled 且点击无效', async () => {
    const onChange = vi.fn();
    const { host } = await mountInputNumber({ modelValue: 10, max: 10, onChange });
    const inc = getInc(host);
    expect(inc.className).toContain('is-disabled');
    expect(inc.getAttribute('aria-disabled')).toBe('true');
    inc.click();
    await flush();
    expect(onChange).not.toHaveBeenCalled();
    expect(getInput(host).value).toBe('10');
  });

  it('at min：− 落 is-disabled 且点击无效', async () => {
    const onChange = vi.fn();
    const { host } = await mountInputNumber({ modelValue: 0, min: 0, onChange });
    const dec = getDec(host);
    expect(dec.className).toContain('is-disabled');
    dec.click();
    await flush();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('disabled：+− 均无效', async () => {
    const onChange = vi.fn();
    const { host } = await mountInputNumber({ modelValue: 5, disabled: true, onChange });
    getInc(host).click();
    getDec(host).click();
    await flush();
    expect(onChange).not.toHaveBeenCalled();
    expect(getInput(host).value).toBe('5');
  });

  it('怪癖 D：空值点 + 按 0 起步再 clamp —— min=5 时跳到 5', async () => {
    const onChange = vi.fn();
    const { host } = await mountInputNumber({ min: 5, max: 20, onChange });
    getInc(host).click();
    await flush();
    expect(onChange).toHaveBeenCalledWith(5);
    expect(getInput(host).value).toBe('5');
  });
});

describe('InputNumber · 输入与 blur', () => {
  it('输入数字：emit input（parseFloat 值），不 emit change', async () => {
    const onInput = vi.fn();
    const onChange = vi.fn();
    const { host } = await mountInputNumber({ modelValue: 0, onInput, onChange });
    const input = getInput(host);
    input.value = '42';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await flush();
    expect(onInput).toHaveBeenCalledWith(42);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("输入 ''：内部置 undefined 并 emit input(undefined)", async () => {
    const onInput = vi.fn();
    const { host } = await mountInputNumber({ modelValue: 3, onInput });
    const input = getInput(host);
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await flush();
    expect(onInput).toHaveBeenCalledWith(undefined);
  });

  it('blur 数字：clamp 后 emit change + update:modelValue，超出 max 被钳制', async () => {
    const onChange = vi.fn();
    const { host } = await mountInputNumber({ modelValue: 1, max: 10, onChange });
    typeAndBlur(getInput(host), '99');
    await flush();
    expect(onChange).toHaveBeenCalledWith(10);
    // 怪癖 A：输入框已 dirty，setAttribute('value') 失效 ⇒ 显示与内部值脱节
    expect(getInput(host).value).toBe('99');
    // 内部值确为 10：点 '−' 从 10 起步得 9（'+' 会撞 max 再钳回 10）
    getDec(host).click();
    await flush();
    expect(onChange).toHaveBeenCalledWith(9);
  });

  it("blur ''：emit change(undefined)", async () => {
    const onChange = vi.fn();
    const { host } = await mountInputNumber({ modelValue: 3, onChange });
    typeAndBlur(getInput(host), '');
    await flush();
    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  it('怪癖 C：blur 非法输入（abc）静默放过 —— 无 change、显示不回滚', async () => {
    const onChange = vi.fn();
    const { host } = await mountInputNumber({ modelValue: 7, onChange });
    typeAndBlur(getInput(host), 'abc');
    await flush();
    expect(onChange).not.toHaveBeenCalled();
    // 怪癖 A：显示保持用户输入，内部仍是 7（点 '+' 从 7 起步验证）
    expect(getInput(host).value).toBe('abc');
    getInc(host).click();
    await flush();
    expect(onChange).toHaveBeenCalledWith(8);
  });

  it('怪癖 B：parseFloat 静默截断 —— 12abc 按 12 接受，显示仍 12abc', async () => {
    const onChange = vi.fn();
    const { host } = await mountInputNumber({ modelValue: 0, onChange });
    typeAndBlur(getInput(host), '12abc');
    await flush();
    expect(onChange).toHaveBeenCalledWith(12);
    expect(getInput(host).value).toBe('12abc'); // 怪癖 A：显示脱节
  });

  it('输入过程不 clamp：超 max 输入即时生效，blur 才钳制内部值', async () => {
    const onChange = vi.fn();
    const { host } = await mountInputNumber({ modelValue: 1, max: 10, onChange });
    const input = getInput(host);
    input.value = '99';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await flush();
    expect(onChange).not.toHaveBeenCalled(); // 未 blur 无 change/clamp
    input.dispatchEvent(new Event('blur', { bubbles: true }));
    await flush();
    expect(onChange).toHaveBeenCalledWith(10);
  });

  it('怪癖 A：precision 格式化对 dirty 输入框失效 —— 击键显示不被 toFixed 改写', async () => {
    const { host } = await mountInputNumber({ precision: 2 });
    const input = getInput(host);
    input.value = '1';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await flush();
    expect(getInput(host).value).toBe('1'); // 非 '1.00'：dirty 后 setAttribute 失效
  });

  it('stepStrictly：blur 取整到 step 倍数', async () => {
    const onChange = vi.fn();
    const { host } = await mountInputNumber({
      modelValue: 2,
      step: 2,
      stepStrictly: true,
      onChange,
    });
    typeAndBlur(getInput(host), '3');
    await flush();
    expect(onChange).toHaveBeenCalledWith(4);
  });
});

describe('InputNumber · 键盘', () => {
  it('ArrowUp / ArrowDown：preventDefault + 增减', async () => {
    const onChange = vi.fn();
    const { host } = await mountInputNumber({ modelValue: 5, onChange });
    const input = getInput(host);
    const up = keydown(input, 'ArrowUp');
    await flush();
    expect(up.defaultPrevented).toBe(true);
    expect(onChange).toHaveBeenCalledWith(6);
    const down = keydown(input, 'ArrowDown');
    await flush();
    expect(down.defaultPrevented).toBe(true);
    expect(onChange).toHaveBeenCalledWith(5);
  });

  it('Home / End：有限 min/max 时 preventDefault + 跳到边界', async () => {
    const onChange = vi.fn();
    const { host } = await mountInputNumber({ modelValue: 5, min: 0, max: 10, onChange });
    const input = getInput(host);
    const home = keydown(input, 'Home');
    await flush();
    expect(home.defaultPrevented).toBe(true);
    expect(onChange).toHaveBeenCalledWith(0);
    const end = keydown(input, 'End');
    await flush();
    expect(end.defaultPrevented).toBe(true);
    expect(onChange).toHaveBeenCalledWith(10);
  });

  it('Home / End：无限 min/max 时不 preventDefault 且无变化', async () => {
    const onChange = vi.fn();
    const { host } = await mountInputNumber({ modelValue: 5, onChange });
    const input = getInput(host);
    const home = keydown(input, 'Home');
    const end = keydown(input, 'End');
    await flush();
    expect(home.defaultPrevented).toBe(false);
    expect(end.defaultPrevented).toBe(false);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('onKeydown 透传任意键（含已处理的 ArrowUp）', async () => {
    const onKeydown = vi.fn();
    const { host } = await mountInputNumber({ modelValue: 5, onKeydown });
    const input = getInput(host);
    keydown(input, 'a');
    keydown(input, 'ArrowUp');
    await flush();
    expect(onKeydown).toHaveBeenCalledTimes(2);
    expect((onKeydown.mock.calls[0]![0] as KeyboardEvent).key).toBe('a');
  });
});

describe('InputNumber · 受控', () => {
  it('外部 modelValue 变化同步到显示（watch 路径）', async () => {
    const { host, mv } = await mountInputNumber({ modelValue: 1 });
    expect(getInput(host).value).toBe('1');
    mv(42);
    await flush();
    expect(getInput(host).value).toBe('42');
  });

  it('受控回写同值不循环：+ 一次 only 一次 change', async () => {
    const onChange = vi.fn();
    const { host } = await mountInputNumber({ modelValue: 1, onChange });
    getInc(host).click();
    await flush();
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(getInput(host).value).toBe('2');
  });
});
