#!/usr/bin/env node
/* global document */
/**
 * 渲染成本门禁 check-render-cost
 *
 * ## 为什么需要它
 *
 * 2026-11-02 停用了 vdom 的「Block Tree 快速路径」（连出两个 P0，见
 * `evaluation/PROJECT_STATUS_2026-11-02.md` §八 / §九）。但那个决策有一个
 * **未测量的部分**：优化到底省了多少、停用后代价多大，**没有任何门禁度量**。
 * 仓库有 `check-bundle-size`（产物体积），却**没有一条运行时成本判据**。
 *
 * 没有度量 ⇒ 无法判断「某次改动是否把 O(n) 变成了 O(n²)」，
 * 而这正是渲染层最容易悄悄退化的地方（8432 个用例全绿也发现不了）。
 *
 * ## 为什么统计「DOM 操作次数」而不是耗时
 *
 * 耗时随机器负载波动，做门禁必然 flaky。**DOM 操作次数是确定性的**：
 * 同样的输入必然得到同样的计数，且它直接反映算法复杂度 ——
 * 「追加 1 项却碰了其余 200 个节点」在计数上无所遁形，在耗时上却可能被噪声淹没。
 *
 * ## 判据（全部是**结构性**的，不设绝对时间阈值）
 *
 * 1. **追加 1 项不得触碰既有节点**：ops ≤ 5（与列表长度无关）
 * 2. **改 1 项文本**：结构性 ops = 0
 * 3. **删 1 项**：ops ≤ 5
 * 4. **整体倒序**：ops ≤ 2N（LIS 优化下应约 N-1 次移动，而不是 N²）
 * 5. **规模无关性**：N=400 追加 1 项 的 ops 必须与 N=200 时**相同量级**
 *    （若退化为 O(N)，这一条会直接红）
 *
 * ## 退出码
 *
 * 0 = 全部通过。
 */
import { JSDOM } from '../node_modules/jsdom/lib/api.js';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' });
const G = globalThis;

G.window = dom.window;
G.document = dom.window.document;
G.Node = dom.window.Node;
G.Element = dom.window.Element;
G.HTMLElement = dom.window.HTMLElement;
G.SVGElement = dom.window.SVGElement;
G.Event = dom.window.Event;
G.MouseEvent = dom.window.MouseEvent;
G.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
try {
  Object.defineProperty(G, 'navigator', { value: dom.window.navigator, configurable: true });
} catch {
  /* ignore */
}
G.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
G.cancelAnimationFrame = (id) => clearTimeout(id);

const url = (p) => new URL(p, import.meta.url).href;
const { createApp, ref } = await import(url('../packages/core/dist/index.mjs'));

const tick = (ms = 60) => new Promise((r) => setTimeout(r, ms));

// ── DOM 操作计数 ────────────────────────────────────────────
const proto = dom.window.Node.prototype;
const orig = {
  insertBefore: proto.insertBefore,
  appendChild: proto.appendChild,
  removeChild: proto.removeChild,
  replaceChild: proto.replaceChild,
};

const counters = { insert: 0, remove: 0, replace: 0 };
let counting = false;

proto.insertBefore = function (child, refNode) {
  if (counting) counters.insert++;
  return orig.insertBefore.call(this, child, refNode);
};
proto.appendChild = function (child) {
  if (counting) counters.insert++;
  return orig.appendChild.call(this, child);
};
proto.removeChild = function (child) {
  if (counting) counters.remove++;
  return orig.removeChild.call(this, child);
};
proto.replaceChild = function (newChild, oldChild) {
  if (counting) counters.replace++;
  return orig.replaceChild.call(this, newChild, oldChild);
};

// ⚠️ 刻意**不**统计文本写入次数。
//   实测：jsdom 里框架更新文本走的是 `textContent`（内部用原生 slot 替换子节点），
//   既不经过 `CharacterData.data` 也不经过 `Node.nodeValue` 的 setter ⇒
//   挂钩子会得到一个**恒为 0 的假指标**。
//   假指标比没有指标更危险（看起来"测了"，实际什么都没测）。
//   本门禁只统计**结构性操作**（insert / remove / replace）——它们才是
//   "碰了哪些节点"的直接证据。

function beginCount() {
  counters.insert = 0;
  counters.remove = 0;
  counters.replace = 0;
  counting = true;
}
function endCount() {
  counting = false;
  return {
    ...counters,
    structural: counters.insert + counters.remove + counters.replace,
  };
}

// ── 断言 ────────────────────────────────────────────────────
let fail = 0;
let total = 0;
const check = (name, ok, detail) => {
  total++;
  if (!ok) fail++;
  console.log(`${ok ? '   ✅' : '   ❌'} ${name}${detail ? ' :: ' + detail : ''}`);
};

/** 建一个 N 项的列表应用，返回 { root, items } */
async function mountList(n, countMount = false) {
  const items = ref(Array.from({ length: n }, (_, i) => ({ id: i, v: 'v' + i })));
  const root = document.createElement('div');
  document.body.appendChild(root);
  if (countMount) beginCount();
  await createApp({
    setup: () => ({ items }),
    template: `<div class="wrap"><h1>title</h1><ul class="l"><li v-for="it in items" :key="it.id">{{it.v}}</li></ul><span class="tail">end</span></div>`,
  }).mount(root);
  await tick();
  const mountOps = countMount ? endCount() : null;
  return { root, items, mountOps };
}

console.log('🔍 渲染成本门禁 check-render-cost\n');
console.log('   [列表更新只碰相关节点]\n');

// ── 1. 追加 1 项（N=200）──────────────────────────────────
let appendOps200 = 0;
{
  const { root, items } = await mountList(200);
  check(
    '初始 200 项渲染完成',
    root.querySelectorAll('li').length === 200,
    `li=${root.querySelectorAll('li').length}`,
  );

  beginCount();
  items.value = [...items.value, { id: 999, v: 'new' }];
  await tick();
  const ops = endCount();
  appendOps200 = ops.structural;

  check(
    '追加 1 项：结构性 DOM 操作 ≤ 5（与列表长度无关）',
    ops.structural <= 5,
    `insert=${ops.insert} remove=${ops.remove} replace=${ops.replace}`,
  );
  check('追加 1 项：没有重挂既有节点（remove=0）', ops.remove === 0, `remove=${ops.remove}`);
  check(
    '追加 1 项：结果正确',
    root.querySelectorAll('li').length === 201,
    `li=${root.querySelectorAll('li').length}`,
  );
  check(
    '追加 1 项：ul 未重复',
    root.querySelectorAll('ul.l').length === 1,
    `ul 数=${root.querySelectorAll('ul.l').length}`,
  );
  check(
    '追加 1 项：尾部兄弟节点仍在',
    root.querySelector('.tail') !== null,
    root.innerHTML.slice(0, 120),
  );
}

// ── 2. 改 1 项文本 ────────────────────────────────────────
{
  const { root, items } = await mountList(200);
  beginCount();
  const next = items.value.map((it, i) => (i === 0 ? { ...it, v: 'CHANGED' } : it));
  items.value = next;
  await tick();
  const ops = endCount();
  check(
    '改 1 项文本：结构性 DOM 操作 = 0（不重建节点）',
    ops.structural === 0,
    `insert=${ops.insert} remove=${ops.remove} replace=${ops.replace}`,
  );
  // 行为断言：不能只证明"没动结构"，还要证明"内容真的变了"
  // （否则「什么都不做」也能让上面那条通过）
  check(
    '改 1 项文本：内容确实更新',
    root.querySelector('li')?.textContent?.trim() === 'CHANGED',
    root.querySelector('li')?.textContent,
  );
}

// ── 3. 删 1 项 ────────────────────────────────────────────
{
  const { root, items } = await mountList(200);
  beginCount();
  items.value = items.value.filter((it) => it.id !== 0);
  await tick();
  const ops = endCount();
  check(
    '删 1 项：结构性 DOM 操作 ≤ 5',
    ops.structural <= 5,
    `insert=${ops.insert} remove=${ops.remove}`,
  );
  check(
    '删 1 项：结果正确',
    root.querySelectorAll('li').length === 199,
    `li=${root.querySelectorAll('li').length}`,
  );
}

// ── 4. 整体倒序 ───────────────────────────────────────────
{
  const { root, items } = await mountList(200);
  beginCount();
  items.value = [...items.value].reverse();
  await tick();
  const ops = endCount();
  check(
    '整体倒序 200 项：结构性 ops ≤ 2N（不能是 N²）',
    ops.structural <= 400,
    `insert=${ops.insert} remove=${ops.remove}（N²=40000）`,
  );
  check(
    '整体倒序：结果正确',
    root.querySelectorAll('li').length === 200,
    `li=${root.querySelectorAll('li').length}`,
  );
  const firstText = root.querySelector('li')?.textContent?.trim();
  check('整体倒序：首项变为原末项', firstText === 'v199', firstText);
}

// ── 5. 规模无关性（关键）──────────────────────────────────
console.log('\n   [规模无关性：O(1) vs O(N)]\n');
{
  const { items } = await mountList(400);
  beginCount();
  items.value = [...items.value, { id: 9999, v: 'new' }];
  await tick();
  const ops = endCount();

  check(
    'N=400 追加 1 项：ops 与 N=200 同量级（未退化为 O(N)）',
    ops.structural <= 5,
    `N=400: ${ops.structural} 次 / N=200: ${appendOps200} 次`,
  );
}

// ── 6. 空列表 → 1 项 ──────────────────────────────────────
{
  const { root, items } = await mountList(0);
  beginCount();
  items.value = [{ id: 1, v: 'only' }];
  await tick();
  const ops = endCount();
  check('空列表→1 项：结构性 ops ≤ 3', ops.structural <= 3, `insert=${ops.insert}`);
  check(
    '空列表→1 项：li 落在 ul 内',
    root.querySelector('ul.l')?.querySelectorAll('li').length === 1,
    root.innerHTML.slice(0, 160),
  );
  check(
    '空列表→1 项：无 li 逃逸',
    root.querySelectorAll('li').length === 1,
    `total=${root.querySelectorAll('li').length}`,
  );
}

// ── 7. 负向对照：阈值必须能区分 O(1) 与 O(N) ──────────────
//
// 上面所有断言都是「ops 必须很小」。如果阈值本身没有区分力（比如计数器
// 恒为 0），它们会**空转通过**。这一条构造一个**必然 O(N)** 的场景：
// 把每项的 key 全部换掉 ⇒ 等价于「整表重建」⇒ 必须产生远超 5 次的操作。
// 若这条不成立，说明上面的「≤5」毫无意义。
console.log('\n   [负向对照：阈值区分力]\n');
{
  const { items } = await mountList(200);
  beginCount();
  items.value = items.value.map((it, i) => ({ id: 100000 + i, v: it.v }));
  await tick();
  const ops = endCount();
  check(
    '负向对照：全换 key 必然整表重建（ops ≫ 5，证明阈值有区分力）',
    ops.structural > 100,
    `ops=${ops.structural}（阈值 5）`,
  );
}

// ── 8. 阳性对照：计数器本身必须有效 ───────────────────────
//
// 这一条是**门禁的守卫**：若上面的 DOM 钩子失效（jsdom 换了原型实现、
// 或 hook 装错了对象），所有「ops ≤ 5」都会**空转通过**。
// 用一次已知规模的挂载做阳性对照 —— 挂 200 项至少要有 200 次插入。
console.log('\n   [阳性对照：计数器有效性]\n');
{
  const { root, mountOps } = await mountList(200, true);
  check(
    '阳性对照：挂载 200 项至少记录到 200 次插入（计数器有效）',
    mountOps !== null && mountOps.insert >= 200,
    `insert=${mountOps?.insert} remove=${mountOps?.remove}`,
  );
  check(
    '阳性对照：挂载结果正确',
    root.querySelectorAll('li').length === 200,
    `li=${root.querySelectorAll('li').length}`,
  );
}

// ── 汇总 ──────────────────────────────────────────────────
console.log('');
if (fail === 0) {
  console.log(`✅ 通过：${total} 条渲染成本判据全部满足\n`);
} else {
  console.log(`❌ ${fail}/${total} 条渲染成本判据未满足\n`);
}
process.exit(fail === 0 ? 0 : 1);
