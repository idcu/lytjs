// @vitest-environment jsdom
/**
 * N18 第 3 个真实应用的正式判据：**子组件 props 下行 / emit 上行 + 排序 / 筛选 / 分页 / 空态**。
 *
 * 期望值全部从 `./api.js` 的数据源**独立算出**（`Math.min` / `filter` / `length`），
 * 不是把当前渲染结果抄进断言 —— 后者是自证式假绿：即使排序根本没生效，
 * 抄下来的「第一名」也会一直等于它自己。
 *
 * ⚠️ 本文件同时锁住一条**当前实现的限制**：模板里给子组件绑定多词属性/事件
 * 必须用 camelCase（`:sortKey` / `@sortChange`）。kebab-case 写法会静默失效，
 * 原因与判据见 N28（keel 台账）。若将来 N28 修好，把下面这些绑定换成
 * kebab-case 后本判据仍应全绿 —— 那正是修复的验收方式。
 */
import { describe, it, expect } from 'vitest';
import { ORDERS, formatMoney, statusLabel } from './api.js';

const sleep = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));

const waitFor = async (predicate: () => boolean, timeoutMs = 3000) => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (predicate()) return;
    await sleep(10);
  }
};

const waitForText = (host: Element, text: string) =>
  waitFor(() => Boolean(host.textContent?.includes(text)));

const click = (el: Element) =>
  el.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 }));

const setInput = (el: HTMLInputElement, value: string) => {
  el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
};

const setSelect = (el: HTMLSelectElement, value: string) => {
  el.value = value;
  el.dispatchEvent(new Event('change', { bubbles: true }));
};

const bodyRows = (host: Element) => Array.from(host.querySelectorAll('.data-row'));
const cellText = (row: Element | undefined, cls: string) =>
  row?.querySelector(`.${cls}`)?.textContent?.trim();

const PAGE_SIZE = 10;
const TOTAL_PAGES = Math.ceil(ORDERS.length / PAGE_SIZE);
const AMOUNTS = ORDERS.map((o) => o.amount);
const MIN_AMOUNT = Math.min(...AMOUNTS);
const MAX_AMOUNT = Math.max(...AMOUNTS);

describe('data-table · 子组件 props+emit 与排序/筛选/分页/空态', () => {
  it('加载 → 排序 → 翻页 → 关键词筛选 → 状态筛选 → 空态 → 清空恢复', async () => {
    document.body.innerHTML = '<div id="app"></div>';

    await import('./main.js');
    const host = document.getElementById('app')!;

    // ── ① 首屏先 loading，且此时没有表格 ────────────────────────────────
    await waitForText(host, '加载中');
    expect(host.querySelector('.data-table')).toBeNull();

    // ── ② 数据到达：47 条 → 首页 10 行、共 5 页、默认按订单号升序 ─────────
    await waitFor(() => bodyRows(host).length === PAGE_SIZE);
    expect(host.querySelector('.row-count')?.textContent).toContain(`共 ${ORDERS.length} 条`);
    expect(host.querySelector('.row-count')?.textContent).toContain(`全部 ${ORDERS.length} 条`);
    expect(host.querySelector('.page-info')?.textContent?.trim()).toBe(`第 1 / ${TOTAL_PAGES} 页`);
    expect(bodyRows(host).map((r) => cellText(r, 'cell-id'))).toEqual(
      ORDERS.slice(0, PAGE_SIZE).map((o) => o.id),
    );
    // 金额与状态经真实格式化（不是把原始数字直接丢到页面上）
    expect(cellText(bodyRows(host)[0], 'cell-amount')).toBe(formatMoney(ORDERS[0]!.amount));
    expect(cellText(bodyRows(host)[0], 'cell-status')).toBe(statusLabel(ORDERS[0]!.status));

    // ── ③ 点「金额」表头 → emit sortChange → 父组件升序重排 ──────────────
    click(host.querySelector('.th-amount') as Element);
    await waitFor(() => cellText(bodyRows(host)[0], 'cell-amount') === formatMoney(MIN_AMOUNT));
    expect(host.querySelector('.th-amount .sort-mark')?.textContent?.trim()).toBe('▲');
    expect(cellText(bodyRows(host)[0], 'cell-amount')).toBe(formatMoney(MIN_AMOUNT));

    // ── ④ 再点一次 → 变降序，第一名换成最大值（排序真的翻转了） ──────────
    click(host.querySelector('.th-amount') as Element);
    await waitFor(() => cellText(bodyRows(host)[0], 'cell-amount') === formatMoney(MAX_AMOUNT));
    expect(host.querySelector('.th-amount .sort-mark')?.textContent?.trim()).toBe('▼');
    expect(cellText(bodyRows(host)[0], 'cell-amount')).toBe(formatMoney(MAX_AMOUNT));

    // ── ⑤ 「状态」列不可排序：点了不应改变排序标记 ──────────────────────
    click(host.querySelector('.th-status') as Element);
    await sleep(30);
    expect(host.querySelector('.th-status .sort-mark')).toBeNull();
    expect(host.querySelector('.th-amount .sort-mark')?.textContent?.trim()).toBe('▼');

    // ── ⑥ 翻页：回到按订单号升序后点下一页 ─────────────────────────────
    click(host.querySelector('.th-id') as Element);
    await waitFor(() => cellText(bodyRows(host)[0], 'cell-id') === ORDERS[0]!.id);
    click(host.querySelector('.next') as Element);
    await waitFor(
      () => host.querySelector('.page-info')?.textContent?.trim() === `第 2 / ${TOTAL_PAGES} 页`,
    );
    expect(bodyRows(host).map((r) => cellText(r, 'cell-id'))).toEqual(
      ORDERS.slice(PAGE_SIZE, PAGE_SIZE * 2).map((o) => o.id),
    );

    // ── ⑦ 关键词筛选：命中「张伟」，且页数重置为 1 ──────────────────────
    const expectedZhang = ORDERS.filter((o) => o.customer.includes('张伟'));
    setInput(host.querySelector('.search') as HTMLInputElement, '张伟');
    await waitFor(() =>
      Boolean(
        host.querySelector('.row-count')?.textContent?.includes(`共 ${expectedZhang.length} 条`),
      ),
    );
    expect(host.querySelector('.row-count')?.textContent).toContain(
      `共 ${expectedZhang.length} 条`,
    );
    expect(host.querySelector('.page-info')?.textContent?.trim()).toMatch(/^第 1 \/ /);
    expect(bodyRows(host).every((r) => cellText(r, 'cell-customer') === '张伟')).toBe(true);

    // ── ⑧ 叠加状态筛选：只留「已完成」 ──────────────────────────────────
    const expectedDone = expectedZhang.filter((o) => o.status === 'done');
    setSelect(host.querySelector('.status-filter') as HTMLSelectElement, 'done');
    await waitFor(() =>
      Boolean(
        host.querySelector('.row-count')?.textContent?.includes(`共 ${expectedDone.length} 条`),
      ),
    );
    expect(host.querySelector('.row-count')?.textContent).toContain(`共 ${expectedDone.length} 条`);
    expect(bodyRows(host).every((r) => cellText(r, 'cell-status') === '已完成')).toBe(true);

    // ── ⑨ 无匹配 → 空态由子组件的 emptyText prop 渲染 ───────────────────
    setInput(host.querySelector('.search') as HTMLInputElement, '不存在的客户');
    await waitFor(() => host.querySelector('.data-empty') !== null);
    expect(bodyRows(host)).toHaveLength(0);
    expect(host.querySelector('.data-empty')?.textContent?.trim()).toBe('没有匹配的数据');
    expect(host.querySelector('.row-count')?.textContent).toContain('共 0 条');

    // ── ⑩ 清空关键词 + 状态回到全部 → 恢复全量（不是卡在空态） ──────────
    setInput(host.querySelector('.search') as HTMLInputElement, '');
    setSelect(host.querySelector('.status-filter') as HTMLSelectElement, '');
    await waitFor(() => bodyRows(host).length === PAGE_SIZE);
    expect(host.querySelector('.data-empty')).toBeNull();
    expect(host.querySelector('.row-count')?.textContent).toContain(`共 ${ORDERS.length} 条`);
  }, 90_000);
});
