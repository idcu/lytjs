#!/usr/bin/env node
/**
 * 门禁：keyed list diff 两路径对拍（S12 / ADR 0019）
 *
 * 仓库里有两条 keyed 列表更新路径：
 *   · vnode 路径：`@lytjs/vdom` 的 `patchKeyedChildren`（经 `createDOMRenderer().render`）
 *   · signal 路径：`@lytjs/dom-runtime` 的 `reconcileArray`
 *
 * 它们的输入模型不同，但「key 匹配 + 最小移动」的语义必须一致：
 * 同一组 [旧列表 → 新列表] 变化，两条路径产出的 DOM 结构、顺序、文本必须相同，
 * 且保留下来的 item 必须复用同一个 DOM 节点（不重建）。
 */

import { JSDOM } from '../node_modules/jsdom/lib/api.js';

const ROOT = process.cwd();
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' });
const w = dom.window;
for (const key of ['window', 'document', 'Node', 'Element', 'HTMLElement']) {
  globalThis[key] = key === 'window' ? w : w[key];
}
globalThis.__DEV__ = false;

const vdom = await import(`${ROOT}/packages/vdom/dist/index.mjs`);
const domRuntime = await import(`${ROOT}/packages/dom-runtime/dist/index.mjs`);
const adapterWeb = await import(`${ROOT}/packages/adapter-web/dist/index.mjs`);

let pass = 0;
let fail = 0;

function check(label, condition, detail) {
  if (condition) {
    pass += 1;
    console.log(`   ✅ ${label}`);
  } else {
    fail += 1;
    console.log(`   ❌ ${label}${detail === undefined ? '' : `（${detail}）`}`);
  }
}

function section(title) {
  console.log(`\n${'═'.repeat(58)}`);
  console.log(title);
}

/** 把 [{ key, text }] 渲染成 `<li data-key="k">text</li>` 列表 */
function normalize(container) {
  return container.innerHTML.replace(/\s+/g, ' ');
}

/**
 * vnode 路径：用真实的 DOM 渲染器挂载 / 更新整棵 `<ul>`。
 * @returns {{ container: Element, html: string, nodesByKey: Map<string, Element> }}
 */
function renderViaVNodes(prev, next) {
  const container = w.document.createElement('div');
  const renderer = adapterWeb.createDOMRenderer();
  const toVNode = (list) =>
    vdom.createVNode(
      'ul',
      null,
      list.map((item) =>
        vdom.createVNode('li', { key: item.key, 'data-key': item.key }, item.text),
      ),
    );

  renderer.render(toVNode(prev), container);
  const before = new Map();
  for (const el of container.querySelectorAll('li')) before.set(el.dataset.key, el);

  renderer.render(toVNode(next), container);
  const after = new Map();
  for (const el of container.querySelectorAll('li')) after.set(el.dataset.key, el);

  return { container, before, after };
}

/**
 * signal 路径：用 `reconcileArray` 维护同一个 `<ul>`。
 * @returns {{ container: Element, html: string, nodesByKey: Map<string, Element> }}
 */
function renderViaSignals(prev, next) {
  const container = w.document.createElement('div');
  const ul = w.document.createElement('ul');
  container.appendChild(ul);

  const options = {
    key: (item) => item.key,
    create: (item) => {
      const li = w.document.createElement('li');
      li.dataset.key = item.key;
      li.textContent = item.text;
      return li;
    },
    update: (node, item) => {
      node.textContent = item.text;
    },
  };

  domRuntime.reconcileArray(ul, prev, options);
  const before = new Map();
  for (const el of ul.querySelectorAll('li')) before.set(el.dataset.key, el);

  domRuntime.reconcileArray(ul, next, options);
  const after = new Map();
  for (const el of ul.querySelectorAll('li')) after.set(el.dataset.key, el);

  return { container, before, after };
}

const item = (key, text = key) => ({ key, text });

/** 每条用例：旧列表 → 新列表；两路径的 DOM 与节点复用必须一致 */
const CASES = [
  {
    name: '原地不动',
    prev: [item('a'), item('b'), item('c')],
    next: [item('a'), item('b'), item('c')],
  },
  {
    name: '尾部前移（move）',
    prev: [item('a'), item('b'), item('c')],
    next: [item('c'), item('a'), item('b')],
  },
  {
    name: '混合：移动 + 删除 + 新增',
    prev: [item('a'), item('b'), item('c'), item('d')],
    next: [item('d'), item('b'), item('e'), item('a')],
  },
  {
    name: '整体倒序（LIS 最小移动）',
    prev: [item('1'), item('2'), item('3'), item('4'), item('5')],
    next: [item('5'), item('4'), item('3'), item('2'), item('1')],
  },
  {
    name: '全部删除',
    prev: [item('a'), item('b')],
    next: [],
  },
  {
    name: '从空列表全部新增',
    prev: [],
    next: [item('a'), item('b'), item('c')],
  },
  {
    name: '头部插入',
    prev: [item('b'), item('c')],
    next: [item('a'), item('b'), item('c')],
  },
  {
    name: '尾部追加',
    prev: [item('a')],
    next: [item('a'), item('b'), item('c')],
  },
  {
    name: '中间删除',
    prev: [item('a'), item('b'), item('c'), item('d')],
    next: [item('a'), item('d')],
  },
  {
    name: '同 key 更新文本（节点必须复用）',
    prev: [item('a', 'old-a'), item('b', 'old-b')],
    next: [item('a', 'new-a'), item('b', 'new-b')],
  },
];

section('[1] 两路径 DOM 结构与顺序一致');
for (const testCase of CASES) {
  const vnodeResult = renderViaVNodes(testCase.prev, testCase.next);
  const signalResult = renderViaSignals(testCase.prev, testCase.next);

  const vnodeHtml = normalize(vnodeResult.container);
  const signalHtml = normalize(signalResult.container);

  check(
    `${testCase.name}：innerHTML 一致`,
    vnodeHtml === signalHtml,
    `vnode=${vnodeHtml} signal=${signalHtml}`,
  );
}

section('[2] 保留下来的 item 在两路径中都复用同一个 DOM 节点');
for (const testCase of CASES) {
  const vnodeResult = renderViaVNodes(testCase.prev, testCase.next);
  const signalResult = renderViaSignals(testCase.prev, testCase.next);

  const keptKeys = testCase.next
    .map((entry) => entry.key)
    .filter((key) => vnodeResult.before.has(key) && signalResult.before.has(key));

  for (const key of keptKeys) {
    const vnodeReused = vnodeResult.before.get(key) === vnodeResult.after.get(key);
    const signalReused = signalResult.before.get(key) === signalResult.after.get(key);
    check(
      `${testCase.name}：key=${key} 节点复用`,
      vnodeReused && signalReused,
      `vnode=${vnodeReused} signal=${signalReused}`,
    );
  }
}

section('[3] 删除项在两路径中都从 DOM 移除');
for (const testCase of CASES) {
  const vnodeResult = renderViaVNodes(testCase.prev, testCase.next);
  const signalResult = renderViaSignals(testCase.prev, testCase.next);

  const removedKeys = testCase.prev
    .map((entry) => entry.key)
    .filter((key) => !testCase.next.some((entry) => entry.key === key));

  if (removedKeys.length === 0) continue;

  for (const key of removedKeys) {
    const vnodeNode = vnodeResult.before.get(key);
    const signalNode = signalResult.before.get(key);
    check(
      `${testCase.name}：key=${key} 已从 DOM 移除`,
      vnodeNode?.parentNode == null && signalNode?.parentNode == null,
      `vnode=${vnodeNode?.parentNode != null} signal=${signalNode?.parentNode != null}`,
    );
  }
}

console.log(`\n共 ${pass + fail} 条断言：✅ ${pass} / ❌ ${fail}`);
if (fail > 0) {
  console.log('❌ check-list-diff 失败');
  process.exit(1);
}
console.log('✅ check-list-diff 通过');
