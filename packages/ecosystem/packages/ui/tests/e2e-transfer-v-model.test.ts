// @vitest-environment jsdom
/**
 * 行为级判据：`Transfer` 的 `v-model` 契约
 *
 * 公开类型 `TransferProps` 用 `modelValue`，模板 `v-model` 也被编译器转成
 * `modelValue` + `onUpdate:modelValue`；运行时此前只认 `value` / `update:value`，
 * 两套名字对不上 ⇒ 任何 `v-model` 用法都静默失效（右栏永远为空）。
 */

import { describe, it, expect, afterEach } from 'vitest';
import { createApp, h } from '@lytjs/core';
import { signal } from '@lytjs/core/runtime';
import { Transfer } from '../src/components/Transfer';

const hosts: HTMLElement[] = [];

afterEach(() => {
  for (const x of hosts.splice(0)) x.remove();
});

const DATA = [
  { key: 'a', label: 'Apple' },
  { key: 'b', label: 'Banana' },
];

/** 受控挂载：modelValue 驱动 + onUpdate:modelValue 回写（即 v-model 展开） */
async function mountWithModel(
  initial: (string | number)[],
): Promise<{
  host: HTMLElement;
  model: { (): (string | number)[]; set: (v: (string | number)[]) => void };
}> {
  const host = document.createElement('div');
  document.body.appendChild(host);
  hosts.push(host);
  const model = signal<(string | number)[]>(initial);
  await createApp({
    setup() {
      return () =>
        h(Transfer as never, {
          data: DATA,
          modelValue: model(),
          'onUpdate:modelValue': (v: (string | number)[]) => model.set(v),
        });
    },
  } as never).mount(host);
  await new Promise((r) => setTimeout(r, 30));
  return { host, model };
}

const panels = (host: HTMLElement): HTMLElement[] =>
  [...host.querySelectorAll('.lyt-transfer-panel')] as HTMLElement[];
const items = (panel: HTMLElement): HTMLElement[] =>
  [...panel.querySelectorAll('.lyt-transfer-panel-item')] as HTMLElement[];

describe('Transfer — v-model', () => {
  it('modelValue 决定右侧已选项（初始值回显）', async () => {
    const { host } = await mountWithModel(['b']);
    const [left, right] = panels(host);
    expect(items(left).map((n) => n.textContent)).toEqual(['Apple']);
    expect(items(right).map((n) => n.textContent)).toEqual(['Banana']);
  });

  it('移入右侧后发出 update:modelValue 并回写渲染', async () => {
    const { host, model } = await mountWithModel([]);
    const [left, right] = panels(host);
    // 勾选左栏 Apple 后点「→」
    items(left)[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const moveRight = host.querySelector('.lyt-transfer-buttons button') as HTMLButtonElement;
    moveRight.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 20));

    expect(model()).toEqual(['a']);
    expect(items(left).map((n) => n.textContent)).toEqual(['Banana']);
    expect(items(right).map((n) => n.textContent)).toEqual(['Apple']);
  });
});
