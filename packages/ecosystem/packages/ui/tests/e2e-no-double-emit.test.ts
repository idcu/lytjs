// @vitest-environment jsdom
/**
 * 回归判据：**一次交互只触发一次回调**（`emit` 不与直接调用重复）
 *
 * ## 背景（2026-10-04）
 *
 * `component/src/emit.ts` 的 `emit(instance, event, …)` 本身就会
 * **去 `instance.props[onXxx]` 里找处理器并调用**。
 * 而 9 个 UI 组件在 `emit('change', v)` 之后**又直接调了一次** `_props.onChange?.(v)`
 * ⇒ 同一次交互把回调触发了 **2 次**。
 *
 * 纯元素（`h('button', { onClick })`）不受影响 ⇒ 这是**组件层**的重复调用，
 * 但根因是**没读懂 emit 的契约**。
 */
import { describe, it, expect, afterEach } from 'vitest';
import { createApp, h } from '@lytjs/core';
import { Radio } from '../src/components/Radio';
import { Checkbox } from '../src/components/Checkbox';
import { Switch } from '../src/components/Switch';
import { Tag } from '../src/components/Tag';

const hosts: HTMLElement[] = [];
afterEach(() => {
  for (const x of hosts.splice(0)) x.remove();
});

async function tick(ms = 40): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

async function mount(node: unknown): Promise<HTMLElement> {
  const host = document.createElement('div');
  document.body.appendChild(host);
  hosts.push(host);
  await createApp({ setup: () => () => node } as never).mount(host);
  await tick();
  return host;
}

describe('回归：一次交互只触发一次回调', () => {
  it('★ Radio：点击 input 只触发一次 onChange', async () => {
    const seen: unknown[] = [];
    const host = await mount(
      h(Radio as never, {
        label: 'b',
        modelValue: 'a',
        onChange: (v: unknown) => seen.push(v),
      }),
    );
    const input = host.querySelector('input')!;
    input.checked = true;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await tick();
    expect(seen).toEqual(['b']);
  });

  it('★ Checkbox：切换只触发一次 onChange', async () => {
    const seen: unknown[] = [];
    const host = await mount(
      h(Checkbox as never, {
        label: 'x',
        modelValue: [],
        onChange: (v: unknown) => seen.push(v),
      }),
    );
    const input = host.querySelector('input')!;
    input.checked = true;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await tick();
    expect(seen).toHaveLength(1);
  });

  it('★ Switch：切换只触发一次 onChange', async () => {
    const seen: unknown[] = [];
    const host = await mount(
      h(Switch as never, {
        modelValue: false,
        onChange: (v: unknown) => seen.push(v),
      }),
    );
    // ★ Switch 渲染的是 `<div>` + `.lyt-switch__core`（**内部没有原生 `<input>`**），
    //   所以点它的可点区域。
    const core = host.querySelector('.lyt-switch__core') as HTMLElement | null;
    expect(core).not.toBeNull();
    core!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await tick();
    expect(seen).toHaveLength(1);
  });

  it('★ Tag：关闭只触发一次 onClose', async () => {
    const seen: unknown[] = [];
    const host = await mount(
      h(Tag as never, {
        closable: true,
        onClose: () => seen.push(1),
      }),
    );
    const closeBtn = host.querySelector('.lyt-tag__close') as HTMLElement | null;
    expect(closeBtn).not.toBeNull();
    closeBtn!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await tick();
    expect(seen).toHaveLength(1);
  });
});
