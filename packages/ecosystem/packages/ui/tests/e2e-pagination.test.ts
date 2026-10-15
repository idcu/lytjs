// @vitest-environment jsdom
/**
 * 行为级判据：`Pagination` 的交互与可访问性
 *
 * ## 为什么要有这条
 *
 * `Pagination`（295 行）已随包发布，覆盖率实测仅 ~25%（221 条语句未覆盖）——
 * 页码窗口 / 翻页 / sizes / jumper / 布局裁剪五条主路径均未被真挂载验证过。
 *
 * ⚠️ 已登记的设计怪癖（按真实行为断言，修复走单独决策，勿顺手改）：
 *  A) **非受控**：`currentPage`/`currentPageSize` 是内部 signal（:49-50），
 *     仅取 props 初值、无 watch ⇒ 外部改 `current` prop 显示不同步。
 *  B) `layout` 用 `includes` 判断存在性（:125/:133/...），渲染顺序却是代码里
 *     写死的 total→prev→pager→next→sizes→jumper ⇒ layout='next, prev'
 *     仍然 prev 在前 —— 布局字符串控制不了顺序。
 *  C) `total=0`（totalPages=0）时 `next` 的 disabled 条件是
 *     `currentPage() === totalPages()` ⇒ 1===0 为 false ⇒ 按钮**不**禁用，
 *     但点击被 handlePageChange 的范围守卫挡掉 —— 可点但无反应。
 *  D) jumper 非法输入（超界 / NaN）静默忽略（:102），输入框保留垃圾值。
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { createApp, h } from '@lytjs/core';
import { signal } from '@lytjs/reactivity';
import { Pagination } from '../src/components/Pagination';

const hosts: HTMLElement[] = [];

afterEach(() => {
  for (const x of hosts.splice(0)) x.remove();
});

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

/** 受控挂载：signal 驱动 current/pageSize props（用于怪癖 A 验证） */
async function mountPagination(
  props: Record<string, unknown> = {},
): Promise<{ host: HTMLElement; setProp: (k: 'current' | 'pageSize', v: number) => void }> {
  const host = document.createElement('div');
  document.body.appendChild(host);
  hosts.push(host);
  const current = signal((props.current as number) ?? 1);
  const pageSize = signal((props.pageSize as number) ?? 10);
  await createApp({
    setup() {
      return () =>
        h(Pagination as never, { total: 100, ...props, current: current(), pageSize: pageSize() });
    },
  } as never).mount(host);
  await flush();
  return {
    host,
    setProp: (k, v) => (k === 'current' ? current.set(v) : pageSize.set(v)),
  };
}

const getRoot = (host: HTMLElement): HTMLElement => host.querySelector('.lyt-pagination')!;
const pagerTexts = (host: HTMLElement): string[] =>
  [...host.querySelectorAll('.lyt-pagination__pager > *')].map((x) => x.textContent ?? '');
const pageBtn = (host: HTMLElement, page: number): HTMLElement | null =>
  [...host.querySelectorAll<HTMLElement>('.lyt-pagination__pager button')].find(
    (b) => b.textContent === String(page),
  ) ?? null;
const activePage = (host: HTMLElement): string | null =>
  host.querySelector('.lyt-pagination__btn--active')?.textContent ?? null;
const getPrev = (host: HTMLElement): HTMLButtonElement =>
  host.querySelector('.lyt-pagination__prev')!;
const getNext = (host: HTMLElement): HTMLButtonElement =>
  host.querySelector('.lyt-pagination__next')!;

describe('Pagination · 渲染与布局', () => {
  it('默认渲染：total / prev / pager / next / jumper 齐全，根 a11y 属性', async () => {
    const { host } = await mountPagination({ total: 100, id: 'pg', ariaDescribedBy: 'd1' });
    expect(host.textContent).toContain('共 100 条');
    expect(getPrev(host)).toBeTruthy();
    expect(host.querySelector('.lyt-pagination__pager')).toBeTruthy();
    expect(getNext(host)).toBeTruthy();
    expect(host.querySelector('.lyt-pagination__jumper')).toBeTruthy();
    const root = getRoot(host);
    expect(root.getAttribute('aria-label')).toBe('分页');
    expect(root.id).toBe('pg');
    expect(root.getAttribute('aria-describedby')).toBe('d1');
  });

  it('background / simple / class 落根类；simple 不渲 pager', async () => {
    const { host } = await mountPagination({
      total: 100,
      background: true,
      simple: true,
      class: 'my-pg',
    });
    const cls = getRoot(host).className;
    expect(cls).toContain('lyt-pagination--background');
    expect(cls).toContain('lyt-pagination--simple');
    expect(cls).toContain('my-pg');
    expect(host.querySelector('.lyt-pagination__pager')).toBeNull();
  });

  it('layout 裁剪：只留 total 时其余不渲染', async () => {
    const { host } = await mountPagination({ total: 100, layout: 'total' });
    expect(host.textContent).toContain('共 100 条');
    expect(host.querySelector('.lyt-pagination__prev')).toBeNull();
    expect(host.querySelector('.lyt-pagination__pager')).toBeNull();
    expect(host.querySelector('.lyt-pagination__next')).toBeNull();
    expect(host.querySelector('.lyt-pagination__jumper')).toBeNull();
  });

  it('怪癖 B：layout 顺序无效 —— "next, prev" 仍先渲 prev', async () => {
    const { host } = await mountPagination({ total: 100, layout: 'next, prev' });
    const order = [...getRoot(host).children].map((x) => x.className);
    const prevIdx = order.findIndex((c) => String(c).includes('prev'));
    const nextIdx = order.findIndex((c) => String(c).includes('next'));
    expect(prevIdx).toBeGreaterThanOrEqual(0);
    expect(nextIdx).toBeGreaterThanOrEqual(0);
    expect(prevIdx).toBeLessThan(nextIdx); // 声明 next 在前也没用
  });

  it('sizes：渲染 select 与 N 条/页选项，初始值跟随 pageSize', async () => {
    const { host } = await mountPagination({
      total: 100,
      layout: 'sizes',
      pageSizes: [10, 50],
      pageSize: 50,
    });
    const select = host.querySelector<HTMLSelectElement>('.lyt-pagination__select')!;
    const texts = [...select.querySelectorAll('option')].map((o) => o.textContent);
    expect(texts).toEqual(['10 条/页', '50 条/页']);
    expect(select.getAttribute('aria-label')).toBe('每页条数');
  });

  it('class 数组与字符串两种写法产出一致（patchClass 规范化）', async () => {
    const { host } = await mountPagination({ total: 100 });
    const prevCls = getPrev(host).className;
    const pageCls = pageBtn(host, 1)!.className;
    expect(pageCls).toBe('lyt-pagination__btn lyt-pagination__btn--active');
    expect(prevCls).toBe('lyt-pagination__btn lyt-pagination__prev'); // 数组也被规范化
  });
});

describe('Pagination · 页码窗口', () => {
  it('totalPages≤5 全显、无省略号', async () => {
    const { host } = await mountPagination({ total: 50, pageSize: 10 });
    expect(pagerTexts(host)).toEqual(['1', '2', '3', '4', '5']);
  });

  it('current 居中：1 + ... + 窗口 + ... + 末页', async () => {
    const { host } = await mountPagination({ total: 200, pageSize: 10, current: 10 });
    // totalPages=20，窗口 8..12
    expect(pagerTexts(host)).toEqual(['1', '...', '8', '9', '10', '11', '12', '...', '20']);
  });

  it('current 靠前：start=1 时补齐到 5 页、无首部省略', async () => {
    const { host } = await mountPagination({ total: 200, pageSize: 10, current: 2 });
    expect(pagerTexts(host)).toEqual(['1', '2', '3', '4', '5', '...', '20']);
  });

  it('current 靠后：end=total 时补齐到 5 页、无尾部省略', async () => {
    const { host } = await mountPagination({ total: 200, pageSize: 10, current: 19 });
    expect(pagerTexts(host)).toEqual(['1', '...', '16', '17', '18', '19', '20']);
  });
});

describe('Pagination · 翻页交互', () => {
  it('点页码：onChange(page, pageSize) + active 类 + aria-current=page', async () => {
    const onChange = vi.fn();
    const { host } = await mountPagination({ total: 100, onChange });
    pageBtn(host, 3)!.click();
    await flush();
    expect(onChange).toHaveBeenCalledWith(3, 10);
    expect(activePage(host)).toBe('3');
    expect(pageBtn(host, 3)!.getAttribute('aria-current')).toBe('page');
    expect(pageBtn(host, 1)!.getAttribute('aria-current')).toBeNull();
  });

  it('点当前页：不重复触发 onChange', async () => {
    const onChange = vi.fn();
    const { host } = await mountPagination({ total: 100, current: 2, onChange });
    pageBtn(host, 2)!.click();
    await flush();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('prev / next 翻页', async () => {
    const onChange = vi.fn();
    const { host } = await mountPagination({ total: 100, current: 5, onChange });
    getPrev(host).click();
    await flush();
    expect(onChange).toHaveBeenCalledWith(4, 10);
    getNext(host).click();
    getNext(host).click();
    await flush();
    expect(onChange).toHaveBeenLastCalledWith(6, 10);
    expect(activePage(host)).toBe('6');
  });

  it('第 1 页 prev disabled（属性 + aria-disabled）；末页 next disabled', async () => {
    const r1 = await mountPagination({ total: 100, current: 1 });
    expect(getPrev(r1.host).disabled).toBe(true);
    expect(getPrev(r1.host).getAttribute('aria-disabled')).toBe('true');
    const r2 = await mountPagination({ total: 100, current: 10 });
    expect(getNext(r2.host).disabled).toBe(true);
    expect(getNext(r2.host).getAttribute('aria-disabled')).toBe('true');
  });

  it('怪癖 C：total=0 时 next 不禁用但点击无效', async () => {
    const onChange = vi.fn();
    const { host } = await mountPagination({ total: 0, onChange });
    const next = getNext(host);
    expect(next.disabled).toBe(false); // 1 !== 0 ⇒ 未禁用
    next.click();
    await flush();
    expect(onChange).not.toHaveBeenCalled(); // 范围守卫挡掉
  });
});

describe('Pagination · sizes 与 jumper', () => {
  it('切换 size：onSizeChange + onChange(1, size) + 重置第 1 页 + 页码重算', async () => {
    const onSizeChange = vi.fn();
    const onChange = vi.fn();
    const { host } = await mountPagination({
      total: 100,
      current: 5,
      pageSizes: [10, 50],
      layout: 'pager, sizes',
      onSizeChange,
      onChange,
    });
    const select = host.querySelector<HTMLSelectElement>('.lyt-pagination__select')!;
    select.value = '50';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    await flush();
    expect(onSizeChange).toHaveBeenCalledWith(50);
    expect(onChange).toHaveBeenCalledWith(1, 50);
    expect(activePage(host)).toBe('1');
    expect(pagerTexts(host)).toEqual(['1', '2']); // totalPages=100/50=2
  });

  it('jumper 输入合法页码：change 后跳页', async () => {
    const onChange = vi.fn();
    const { host } = await mountPagination({ total: 100, onChange });
    const input = host.querySelector<HTMLInputElement>('.lyt-pagination__input')!;
    expect(input.getAttribute('aria-label')).toBe('跳转到第几页');
    expect(input.max).toBe('10');
    input.value = '7';
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await flush();
    expect(onChange).toHaveBeenCalledWith(7, 10);
    expect(activePage(host)).toBe('7');
  });

  it('怪癖 D：jumper 超界与 NaN 静默忽略，输入框保留垃圾值', async () => {
    const onChange = vi.fn();
    const { host } = await mountPagination({ total: 100, current: 2, onChange });
    const input = host.querySelector<HTMLInputElement>('.lyt-pagination__input')!;
    input.value = '99';
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await flush();
    expect(onChange).not.toHaveBeenCalled();
    expect(activePage(host)).toBe('2');
    expect(input.value).toBe('99'); // 无回写无清空
    input.value = 'abc';
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await flush();
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('Pagination · 受控语义', () => {
  it('怪癖 A：外部 current prop 变化不同步内部显示（无 watch）', async () => {
    const { host, setProp } = await mountPagination({ total: 100, current: 1 });
    expect(activePage(host)).toBe('1');
    setProp('current', 5);
    await flush();
    expect(activePage(host)).toBe('1'); // prop 变了，内部 signal 不动
  });

  it('内部翻页后外部 prop 仍初值 —— 非受控脱节双向成立', async () => {
    const onChange = vi.fn();
    const { host } = await mountPagination({ total: 100, current: 1, onChange });
    pageBtn(host, 4)!.click();
    await flush();
    expect(activePage(host)).toBe('4'); // 内部已翻页
    expect(onChange).toHaveBeenCalledWith(4, 10);
  });
});
