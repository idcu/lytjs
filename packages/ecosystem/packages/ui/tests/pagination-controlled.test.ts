// @vitest-environment jsdom
/**
 * Pagination 受控行为回归（2026-11-03）
 *
 * 组件内部有自己的 `signal`（页码 / 每页条数），初值来自 props。缺陷形态是
 * **只取初值、不跟随 props** ⇒ 视图与状态不一致，且没有任何报错。
 *
 * 对应门禁：`scripts/check-controlled-props.mjs`（8 个组件 / 24 条断言）。
 */
import { describe, it, expect, afterEach } from 'vitest';
import { createApp, h, ref } from '@lytjs/core';
import { Pagination } from '../src/components/Pagination';

const hosts: HTMLElement[] = [];
const sleep = (ms = 20): Promise<void> => new Promise((r) => setTimeout(r, ms));

async function mount(render: () => unknown): Promise<HTMLElement> {
  const host = document.createElement('div');
  document.body.appendChild(host);
  hosts.push(host);
  await createApp({ setup: () => render as never } as never).mount(host);
  await sleep();
  return host;
}

afterEach(() => {
  for (const host of hosts.splice(0)) host.remove();
});

const activeText = (host: HTMLElement): string | null =>
  host.querySelector('.lyt-pagination__btn--active')?.textContent?.trim() ?? null;

describe('Pagination 受控行为', () => {
  it('外部改 current 后视图跟随', async () => {
    const current = ref(1);
    const host = await mount(() =>
      h(Pagination, { current: current.value, total: 100, pageSize: 10 }),
    );
    expect(activeText(host)).toBe('1');

    current.value = 3;
    await sleep();
    expect(activeText(host)).toBe('3');
  });

  it('外部改 pageSize 后页码数量跟随', async () => {
    const size = ref(10);
    const host = await mount(() => h(Pagination, { current: 1, total: 100, pageSize: size.value }));
    const count = () => host.querySelectorAll('.lyt-pagination__pager button').length;
    const before = count();

    size.value = 50;
    await sleep();
    expect(count()).toBeLessThan(before);
  });

  it('current 越界时夹到最后一页', async () => {
    const host = await mount(() => h(Pagination, { current: 10, total: 30, pageSize: 10 }));

    expect(activeText(host)).toBe('3');
    expect(host.querySelector('.lyt-pagination__next')?.hasAttribute('disabled')).toBe(true);
  });

  it('点击页码会 emit update:current（v-model 往返）', async () => {
    const current = ref(1);
    const host = await mount(() =>
      h(Pagination, {
        current: current.value,
        total: 100,
        pageSize: 10,
        'onUpdate:current': (v: number) => {
          current.value = v;
        },
      }),
    );

    const pageTwo = [...host.querySelectorAll('.lyt-pagination__pager button')].find(
      (b) => b.textContent?.trim() === '2',
    );
    pageTwo?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await sleep();

    expect(current.value).toBe(2);
    expect(activeText(host)).toBe('2');
  });

  it('「下一页」在最后一页禁用', async () => {
    const host = await mount(() => h(Pagination, { current: 3, total: 30, pageSize: 10 }));
    expect(host.querySelector('.lyt-pagination__next')?.hasAttribute('disabled')).toBe(true);
    expect(host.querySelector('.lyt-pagination__prev')?.hasAttribute('disabled')).toBe(false);
  });

  it('total 变小时页码减少', async () => {
    const total = ref(100);
    const host = await mount(() => h(Pagination, { current: 1, total: total.value, pageSize: 10 }));
    const count = () => host.querySelectorAll('.lyt-pagination__pager button').length;
    const before = count();

    total.value = 30;
    await sleep();
    expect(count()).toBeLessThan(before);
  });
});
