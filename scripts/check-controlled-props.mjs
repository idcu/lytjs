#!/usr/bin/env node
/* global document */
/**
 * 门禁：受控组件（prop → 视图）一致性
 *
 * ## 为什么需要这一项
 *
 * 这些组件内部都有自己的 `signal`（页码、开关值、滑块位置…），初值来自 props。
 * 一旦**只取初值、不跟随 props**，就变成「受控组件不受控」：
 *
 *   · 父组件把 `current` 重置为 1（筛选条件变了）⇒ 分页器**仍停在第 5 页**；
 *   · 父组件改 `pageSize` ⇒ 每页条数变了，页码数量不变；
 *   · `current` 超出总页数 ⇒ 页码区**一个 `--active` 都没有**（「没有任何一页被选中」）。
 *
 * 这三种都不会报错、不会有控制台警告，只是**视图和数据不一致** ——
 * 只有「挂载 → 改 prop → 再看 DOM」才能发现。
 *
 * ## 2026-11-03 首次运行抓到的 3 个缺陷（全部在 Pagination）
 *
 * | # | 缺陷 | 实测 |
 * |---|---|---|
 * | 1 | `current` prop 变化被忽略 | `current: 1 → 3`，`--active` 仍是 **1** |
 * | 2 | `pageSize` prop 变化被忽略 | `pageSize: 10 → 50`，页码按钮数仍 **6**（应 2） |
 * | 3 | `current` 越界时不夹取 | `current=10 / total=30`（3 页）⇒ **无 active** |
 *
 * 另：`v-model:current` 静默无效（组件**从不 emit** `update:current`）。
 *
 * 判据覆盖 8 个有内部状态的组件，同一套「挂载 → 改 prop → 断言 DOM」流程。
 */

import { JSDOM } from '../node_modules/jsdom/lib/api.js';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' });
const w = dom.window;
for (const key of [
  'window',
  'document',
  'Node',
  'Element',
  'HTMLElement',
  'SVGElement',
  'Event',
  'MouseEvent',
  'CustomEvent',
  'Text',
  'Comment',
  'DocumentFragment',
]) {
  globalThis[key] = key === 'window' ? w : w[key];
}
try {
  Object.defineProperty(globalThis, 'navigator', { value: w.navigator, configurable: true });
} catch {
  /* Node 22 的 navigator 只有 getter */
}
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

const ROOT = process.cwd();
const { createApp, h, ref } = await import(`${ROOT}/packages/core/dist/index.mjs`);
const ui = await import(`${ROOT}/packages/ecosystem/packages/ui/dist/index.mjs`);

let pass = 0;
let fail = 0;
const failures = [];
const check = (name, ok, detail) => {
  if (ok) {
    pass++;
    console.log(`   ✅ ${name}`);
  } else {
    fail++;
    failures.push(name);
    console.log(`   ❌ ${name}`);
    if (detail !== undefined) {
      console.log(`         → ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`);
    }
  }
};
const section = (t) => console.log(`\n${t}`);
const sleep = (ms = 20) => new Promise((r) => setTimeout(r, ms));

const hosts = [];
async function mount(render) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  hosts.push(host);
  await createApp({ setup: () => render }).mount(host);
  await sleep();
  return host;
}
const text = (el) => (el ? el.textContent.trim() : null);

// ══════════════════════════════════════════════════════════
section('[1] Pagination：current / pageSize 必须跟随 props');
{
  const current = ref(1);
  const host = await mount(() =>
    h(ui.Pagination, { current: current.value, total: 100, pageSize: 10 }),
  );
  const active = () => text(host.querySelector('.lyt-pagination__btn--active'));
  check('初始 active 为 1', active() === '1', active());

  current.value = 3;
  await sleep();
  check('外部改 current=3 后 active 跟随（此前恒为 1）', active() === '3', active());

  current.value = 1;
  await sleep();
  check('外部改回 current=1 后 active 跟随', active() === '1', active());
}

{
  const size = ref(10);
  const host = await mount(() =>
    h(ui.Pagination, { current: 1, total: 100, pageSize: size.value }),
  );
  const pagerCount = () => host.querySelectorAll('.lyt-pagination__pager button').length;
  const before = pagerCount();
  size.value = 50;
  await sleep();
  const after = pagerCount();
  check('外部改 pageSize 后页码数量变化（此前不变）', after < before, `${before} → ${after}`);
}

section('[2] Pagination：total 变化与越界夹取');
{
  const total = ref(100);
  const host = await mount(() =>
    h(ui.Pagination, { current: 1, total: total.value, pageSize: 10 }),
  );
  const pagerCount = () => host.querySelectorAll('.lyt-pagination__pager button').length;
  const before = pagerCount();
  total.value = 30;
  await sleep();
  check('total 变小时页码减少', pagerCount() < before, `${before} → ${pagerCount()}`);
}

{
  // 10 页的位置，但只有 3 页
  const host = await mount(() => h(ui.Pagination, { current: 10, total: 30, pageSize: 10 }));
  const active = () => text(host.querySelector('.lyt-pagination__btn--active'));
  check('current 越界时夹到最后一页（此前无 active）', active() === '3', active());
  const nextBtn = host.querySelector('.lyt-pagination__next');
  check(
    '越界时「下一页」禁用',
    nextBtn?.hasAttribute('disabled') === true,
    nextBtn?.outerHTML?.slice(0, 80),
  );
}

section('[3] Pagination：v-model:current 往返');
{
  const current = ref(1);
  const host = await mount(() =>
    h(ui.Pagination, {
      current: current.value,
      total: 100,
      pageSize: 10,
      'onUpdate:current': (v) => {
        current.value = v;
      },
    }),
  );
  const active = () => text(host.querySelector('.lyt-pagination__btn--active'));
  const pageTwo = [...host.querySelectorAll('.lyt-pagination__pager button')].find(
    (b) => text(b) === '2',
  );
  check('找到第 2 页按钮', pageTwo !== undefined);
  pageTwo?.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  await sleep();
  check('点击第 2 页后 v-model 收到 2（此前从不 emit）', current.value === 2, current.value);
  check('点击后视图 active 为 2', active() === '2', active());
}

// ══════════════════════════════════════════════════════════
section('[4] Switch / Checkbox：modelValue 跟随');
{
  const v = ref(false);
  const host = await mount(() => h(ui.Switch, { modelValue: v.value }));
  const cls = () => host.querySelector('.lyt-switch')?.className ?? '';
  check('Switch 初始未选中', !cls().includes('--checked'), cls());
  v.value = true;
  await sleep();
  check('Switch 外部改 true 后选中', cls().includes('--checked'), cls());

  const cv = ref(false);
  const host2 = await mount(() => h(ui.Checkbox, { modelValue: cv.value, label: 'x' }));
  const cls2 = () => host2.querySelector('.lyt-checkbox')?.className ?? '';
  check('Checkbox 初始未选中', !cls2().includes('--checked'), cls2());
  cv.value = true;
  await sleep();
  check('Checkbox 外部改 true 后选中', cls2().includes('--checked'), cls2());
}

// ══════════════════════════════════════════════════════════
section('[5] Slider / Progress：数值 prop 跟随');
{
  const v = ref(10);
  const host = await mount(() => h(ui.Slider, { modelValue: v.value }));
  const width = () => host.querySelector('.lyt-slider__bar')?.getAttribute('style') ?? '';
  check('Slider 初始 10%', width().includes('10%'), width());
  v.value = 80;
  await sleep();
  check('Slider 外部改 80 后跟随', width().includes('80%'), width());

  const p = ref(20);
  const host2 = await mount(() => h(ui.Progress, { percentage: p.value }));
  const inner = () => host2.querySelector('.lyt-progress__inner')?.getAttribute('style') ?? '';
  check('Progress 初始 20%', inner().includes('20%'), inner());
  p.value = 80;
  await sleep();
  check('Progress 外部改 80 后跟随', inner().includes('80%'), inner());
}

// ══════════════════════════════════════════════════════════
section('[6] Rate / InputNumber / Tabs：值 prop 跟随');
{
  const v = ref(1);
  const host = await mount(() => h(ui.Rate, { modelValue: v.value }));
  const full = () => host.querySelectorAll('.lyt-rate-star-full').length;
  check('Rate 初始 1 颗', full() === 1, full());
  v.value = 4;
  await sleep();
  check('Rate 外部改 4 后跟随', full() === 4, full());

  const n = ref(1);
  const host2 = await mount(() => h(ui.InputNumber, { modelValue: n.value }));
  const input = () => host2.querySelector('input')?.value;
  check('InputNumber 初始 1', input() === '1', input());
  n.value = 42;
  await sleep();
  check('InputNumber 外部改 42 后跟随', input() === '42', input());

  const tab = ref('a');
  const host3 = await mount(() =>
    h(ui.Tabs, { modelValue: tab.value }, () => [
      h(ui.TabPane, { label: 'A', name: 'a' }, () => 'AAA'),
      h(ui.TabPane, { label: 'B', name: 'b' }, () => 'BBB'),
    ]),
  );
  const activeTab = () => text(host3.querySelector('.lyt-tabs__item--active'));
  check('Tabs 初始选中 A', activeTab() === 'A', activeTab());
  tab.value = 'b';
  await sleep();
  check('Tabs 外部改 b 后跟随', activeTab() === 'B', activeTab());
}

// ══════════════════════════════════════════════════════════
section('[7] Radio：modelValue 跟随');
{
  const v = ref('a');
  const host = await mount(() =>
    h('div', {}, [
      h(ui.Radio, { modelValue: v.value, label: 'a' }),
      h(ui.Radio, { modelValue: v.value, label: 'b' }),
    ]),
  );
  const checkedLabel = () => text(host.querySelector('.lyt-radio--checked .lyt-radio__label'));
  check('Radio 初始选中 a', checkedLabel() === 'a', checkedLabel());
  v.value = 'b';
  await sleep();
  check('Radio 外部改 b 后选中跟随', checkedLabel() === 'b', checkedLabel());
}

// ══════════════════════════════════════════════════════════
section('[8] RadioGroup：modelValue 跟随');
{
  const v = ref('a');
  const host = await mount(() =>
    h(ui.RadioGroup, { modelValue: v.value }, () => [
      h(ui.Radio, { label: 'a' }),
      h(ui.Radio, { label: 'b' }),
    ]),
  );
  const checked = () => host.querySelector('.lyt-radio--checked .lyt-radio__label');
  check('RadioGroup 初始选中 a', text(checked()) === 'a', text(checked()));
  v.value = 'b';
  await sleep();
  check('RadioGroup 外部改 b 后选中跟随', text(checked()) === 'b', text(checked()));
}

// ══════════════════════════════════════════════════════════
section('[9] Image：src 跟随并重置错误态');
{
  const src = ref('a.png');
  const host = await mount(() => h(ui.Image, { src: src.value, alt: 'x', preview: false }));
  const img = () => host.querySelector('.lyt-image-inner');
  check(
    'Image 初始 src 为 a.png',
    img()?.getAttribute('src') === 'a.png',
    img()?.getAttribute('src'),
  );

  img()?.dispatchEvent(new w.Event('error'));
  await sleep();
  check('加载失败后出现兜底', host.querySelector('.lyt-image-error') !== null);

  src.value = 'b.png';
  await sleep();
  check(
    '外部改 src 后图片跟随且错误态重置',
    img()?.getAttribute('src') === 'b.png' && host.querySelector('.lyt-image-error') === null,
    `${img()?.getAttribute('src')} / ${host.querySelector('.lyt-image-error') !== null}`,
  );
}

// ══════════════════════════════════════════════════════════
section('[10] TimePicker：modelValue 跟随');
{
  const v = ref('01:02:03');
  const host = await mount(() => h(ui.TimePicker, { modelValue: v.value }));
  host
    .querySelector('.lyt-time-picker__trigger')
    ?.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  await sleep();
  const selectValues = () => [...host.querySelectorAll('select')].map((el) => el.value).join(':');
  check('TimePicker 初始显示为 01:02:03', text(host).includes('01:02:03'), text(host));

  v.value = '10:20:30';
  await sleep();
  check('外部改 modelValue 后显示跟随', text(host).includes('10:20:30'), text(host));
  check('外部改 modelValue 后下拉选择跟随', selectValues() === '10:20:30', selectValues());
}

// ══════════════════════════════════════════════════════════
for (const host of hosts) host.remove();
// jsdom 会留下内部定时器/句柄，进程会一直挂着（实测挂 60s+）⇒ 断言跑完就显式退出
dom.window.close();

console.log(`\n共 ${pass + fail} 条断言：✅ ${pass} / ❌ ${fail}`);
if (fail > 0) {
  console.log('\n失败项：');
  for (const f of failures) console.log(`  · ${f}`);
  process.exit(1);
}
process.exit(0);
