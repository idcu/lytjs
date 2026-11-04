#!/usr/bin/env node
/* global document */
/**
 * 门禁：水合（hydration）—— 「SSR 出来的 DOM」必须收敛到「客户端渲染的 DOM」
 *
 * ## 为什么需要这一项
 *
 * 水合是「服务端先把 HTML 送出去、客户端再接管」的那一步。它有两个失败模式，
 * 而**两个都不会报错**：
 *
 * 1. **接管失败**：事件没绑上 ⇒ 页面看起来完全正常（SSR 的 HTML 就在那里），
 *    但点了没反应。用户以为「网站卡了」。
 * 2. **接管了但结果不对**：水合后的 DOM 与「客户端直接渲染」的 DOM 不一致 ——
 *    多出服务端独有的节点（脏内容）、少了客户端新增的节点、顺序错、
 *    属性残留。这类偏差在**下一次更新**时会被放大（vnode 与真实 DOM 结构对不上）。
 *
 * 所以本门禁的核心判据只有一条：**`hydrate(ssrHtml)` 的 DOM === `mount()` 的 DOM**。
 * 另外单独断言「节点被复用」（否则等于重新挂载，水合的全部意义就没了）。
 *
 * ## 2026-11-04 首次运行抓到的 5 个缺陷
 *
 * | # | 缺陷 | 实测 |
 * |---|---|---|
 * | 1 | 客户端**新增**的节点被追加到末尾 | `<div><i>I</i><span>N</span></div>`（应 `span` 在前） |
 * | 2 | 服务端**独有**的节点不被清理 | `<div><span class="only-server">S</span><i>I</i></div>` 脏内容留在页面上 |
 * | 3 | 服务端**独有**的属性不被清理 | `id` / `title` / `data-*` 全部残留 |
 * | 4 | 缩进 HTML 的空白文本节点既不被认领也不被清理 | `<div>` 的 `childNodes` 从 2 涨到 5 |
 * | 5 | 以上全部**静默**（没有任何 mismatch 告警） | 控制台无输出 |
 */

import { JSDOM } from '../node_modules/jsdom/lib/api.js';

const dom = new JSDOM('<!doctype html><html><body><div id="tp"></div></body></html>', {
  url: 'http://localhost',
});
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
  'KeyboardEvent',
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
const { createApp, h, ref, Teleport, KeepAlive } = await import(
  `${ROOT}/packages/core/dist/index.mjs`
);
const SSR = await import(`${ROOT}/packages/ecosystem/packages/ssr-kit/packages/ssr/dist/index.mjs`);

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
const sleep = (ms = 50) => new Promise((r) => setTimeout(r, ms));

/** 归一化：只抹掉空白差异与注释占位（`v-if` 的锚点），不掩盖结构差异 */
const norm = (s) =>
  s
    .replace(/\s+/g, ' ')
    .replace(/<!--[^>]*-->/g, '')
    .trim();

const ssrHtmlOf = (comp) => SSR.renderToString(h(comp));

async function hydrateWith(comp, ssrHtml) {
  const container = document.createElement('div');
  container.innerHTML = ssrHtml ?? ssrHtmlOf(comp);
  document.body.appendChild(container);
  await createApp(comp).mount(container, { hydrate: true });
  await sleep();
  return container;
}

async function mountOnly(comp) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  await createApp(comp).mount(container);
  await sleep();
  return container;
}

/** 核心判据：水合结果必须与「客户端直接渲染」一致 */
async function sameAsMount(label, comp, ssrHtml) {
  const hydrated = await hydrateWith(comp, ssrHtml);
  const mounted = await mountOnly(comp);
  const a = norm(hydrated.innerHTML);
  const b = norm(mounted.innerHTML);
  check(`${label}：水合结果 === 客户端渲染`, a === b, a === b ? undefined : { 水合: a, 客户端: b });
}

// ══════════════════════════════════════════════════════════
section('[1] 节点复用：水合不能退化成「重新挂载」');
{
  const C = { render: () => h('div', { class: 'root' }, [h('p', {}, 'hi')]) };
  const container = document.createElement('div');
  container.innerHTML = ssrHtmlOf(C);
  document.body.appendChild(container);
  const originalDiv = container.querySelector('div');
  const originalP = container.querySelector('p');

  await createApp(C).mount(container, { hydrate: true });
  await sleep();

  check(
    '根元素是**同一个** DOM 节点（不是新建的）',
    container.querySelector('div') === originalDiv,
  );
  check('子元素是**同一个** DOM 节点', container.querySelector('p') === originalP);
  check('没有产生重复节点', container.querySelectorAll('div').length === 1, container.innerHTML);
}

// ══════════════════════════════════════════════════════════
section('[2] 基本形态：文本 / 列表 / 子组件 / 多根 / 深层');
await sameAsMount('文本 + 兄弟元素', {
  render: () => h('div', { class: 'a' }, [h('p', {}, 'hi'), h('span', {}, 'x')]),
});
await sameAsMount('v-for 列表', {
  render: () =>
    h(
      'ul',
      {},
      [1, 2, 3].map((i) => h('li', { key: i }, String(i))),
    ),
});
await sameAsMount('子组件', {
  render: () => {
    const Child = {
      props: { label: String },
      render() {
        return h('span', { class: 'c' }, this.label);
      },
    };
    return h('div', {}, [h(Child, { label: 'L' })]);
  },
});
await sameAsMount('多根节点（Fragment）', {
  render: () => [h('p', {}, '1'), h('p', {}, '2')],
});
await sameAsMount('深层嵌套', {
  render: () =>
    h('div', { class: 'root' }, [
      h('header', {}, [h('h1', {}, 'T')]),
      h(
        'ul',
        {},
        [1, 2].map((i) => h('li', { key: i }, [h('span', {}, String(i))])),
      ),
      h('footer', {}, 'F'),
    ]),
});
await sameAsMount('SVG', {
  render: () => h('svg', { viewBox: '0 0 10 10' }, [h('circle', { cx: 5, cy: 5, r: 4 })]),
});
await sameAsMount(
  '空容器（SSR 什么都没输出）',
  { render: () => h('div', { class: 'x' }, 'y') },
  '',
);

// ══════════════════════════════════════════════════════════
section('[3] 服务端与客户端不一致：必须收敛到客户端');
{
  // 3.1 服务端多出来的节点（v-if 两端不一致）
  const Client = { render: () => h('div', {}, [h('i', {}, 'I')]) };
  const ssrHtml = '<div><span class="only-server">S</span><i>I</i></div>';
  const c = await hydrateWith(Client, ssrHtml);
  check(
    '服务端独有的节点被移除（此前脏内容留在页面上）',
    norm(c.innerHTML) === '<div><i>I</i></div>',
    norm(c.innerHTML),
  );
}
{
  // 3.2 客户端多出来的节点：必须插在正确位置
  const Client = {
    render: () => h('div', {}, [h('span', { class: 'new' }, 'N'), h('i', {}, 'I')]),
  };
  const c = await hydrateWith(Client, '<div><i>I</i></div>');
  check(
    '客户端新增的节点插在正确位置（此前被追加到末尾）',
    norm(c.innerHTML) === '<div><span class="new">N</span><i>I</i></div>',
    norm(c.innerHTML),
  );
}
{
  // 3.3 服务端独有的属性
  const Client = { render: () => h('div', {}, ['x']) };
  const c = await hydrateWith(Client, '<div id="srv" title="T" data-x="1">x</div>');
  check(
    '服务端独有的属性被清理（此前 id / title / data-* 全部残留）',
    norm(c.innerHTML) === '<div>x</div>',
    norm(c.innerHTML),
  );
}
{
  // 3.4 文本内容不同（服务端时间 vs 客户端时间）
  const Client = { render: () => h('div', {}, [h('p', {}, 'client-time')]) };
  const c = await hydrateWith(Client, '<div><p>server-time</p></div>');
  check(
    '文本不一致时以客户端为准',
    norm(c.innerHTML) === '<div><p>client-time</p></div>',
    norm(c.innerHTML),
  );
}

// ══════════════════════════════════════════════════════════
section('[4] 缩进/换行的 SSR HTML（真实服务器常带）');
{
  const Client = { render: () => h('div', {}, [h('p', {}, 'a'), h('p', {}, 'b')]) };
  const pretty = '<div>\n  <p>a</p>\n  <p>b</p>\n</div>';
  const c = await hydrateWith(Client, pretty);
  const root = c.querySelector('div');
  check(
    '空白文本节点被清理（childNodes 只剩 2 个）',
    root.childNodes.length === 2,
    root.childNodes.length,
  );
  check('内容正确', norm(c.innerHTML) === '<div><p>a</p><p>b</p></div>', norm(c.innerHTML));
}
{
  // 文本 vnode 不能去认领「缩进用的空白文本节点」
  const Client = { render: () => h('div', {}, ['hello', h('p', {}, 'p')]) };
  const pretty = '<div>\n  hello\n  <p>p</p>\n</div>';
  const c = await hydrateWith(Client, pretty);
  const root = c.querySelector('div');
  check(
    '文本 vnode 认领正确节点（childNodes 只剩 2 个）',
    root.childNodes.length === 2,
    root.childNodes.length,
  );
  check('文本内容正确', norm(c.innerHTML) === '<div>hello<p>p</p></div>', norm(c.innerHTML));
}

// ══════════════════════════════════════════════════════════
section('[5] 表单状态不能被水合重置');
{
  const value = ref('hello');
  const C = { render: () => h('input', { value: value.value }) };
  const c = await hydrateWith(C);
  const input = c.querySelector('input');
  check('input 的 value 保留', input.value === 'hello', input.value);
  check(
    'input 的 value 属性保留（清理属性时不能误删表单状态）',
    input.getAttribute('value') === 'hello',
    input.getAttribute('value'),
  );
}

// ══════════════════════════════════════════════════════════
section('[6] 水合之后必须能正常接管（事件 + 响应式）');
{
  const n = ref(0);
  const C = { render: () => h('button', { onClick: () => n.value++ }, String(n.value)) };
  const c = await hydrateWith(C);
  const btn = c.querySelector('button');
  btn.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  await sleep();
  check(
    '事件监听在水合后生效（点了没反应是最典型的「看着正常其实死了」）',
    btn.textContent === '1',
    btn.textContent,
  );

  n.value = 5;
  await sleep();
  check('响应式更新在水合后接管', btn.textContent === '5', btn.textContent);
}

// ══════════════════════════════════════════════════════════
section('[7] v-if 切换 / Teleport / KeepAlive');
{
  const show = ref(true);
  const C = {
    render: () => h('div', {}, [show.value ? h('span', { class: 's' }, 'S') : h('i', {}, 'I')]),
  };
  const c = await hydrateWith(C);
  check(
    '初始渲染正确',
    norm(c.innerHTML) === '<div><span class="s">S</span></div>',
    norm(c.innerHTML),
  );
  show.value = false;
  await sleep();
  check('水合后 v-if 切换正常', norm(c.innerHTML) === '<div><i>I</i></div>', norm(c.innerHTML));
}
{
  const C = {
    render: () => h('div', {}, [h('span', {}, 'A'), h(Teleport, { to: '#tp' }, [h('b', {}, 'T')])]),
  };
  const c = await hydrateWith(C);
  check(
    'Teleport 内容进目标容器',
    norm(document.getElementById('tp').innerHTML) === '<b>T</b>',
    document.getElementById('tp').innerHTML,
  );
  check(
    'Teleport 不在原位留下副本',
    norm(c.innerHTML) === '<div><span>A</span></div>',
    norm(c.innerHTML),
  );
  document.getElementById('tp').innerHTML = '';
}
{
  const Inner = { render: () => h('p', {}, 'inner') };
  const C = { render: () => h('div', {}, [h(KeepAlive, null, [h(Inner)])]) };
  await sameAsMount('KeepAlive', C);
}

// ══════════════════════════════════════════════════════════
dom.window.close();

console.log(`\n共 ${pass + fail} 条断言：✅ ${pass} / ❌ ${fail}`);
if (fail > 0) {
  console.log('\n失败项：');
  for (const f of failures) console.log(`  · ${f}`);
  process.exit(1);
}
process.exit(0);
