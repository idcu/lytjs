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
 * ## 2026-11-04 第二轮（收敛语义）抓到的 6 个缺陷
 *
 * | # | 缺陷 | 实测 |
 * |---|---|---|
 * | 6 | 认领是「全局搜索」而非「游标」 | SSR `p,span` + 客户端 `span,p` ⇒ 水合后仍是 `p,span`（顺序不收敛） |
 * | 7 | 根内的 `<script type="application/json">` 被当多余节点删掉 | hydration data 丢失，无报错 |
 * | 8 | 水合按 vnode 无条件写表单 props | 用户在 JS 到达前输入的文本被抹掉（`typed by user` → `server`） |
 * | 9 | 多根（Fragment）根节点不做容器级收敛 | SSR 3 个根、客户端 2 个 ⇒ 第 3 个根一直留在页面上 |
 * | 10 | 片段锚点被追加到容器末尾（且在收敛时被删） | 卸载时摘不到子节点；新节点插到片段外 |
 * | 11 | `createHydrationFunctions` 静默产出「不可交互的页面」 | 点击后文本不变、改状态 DOM 不动，无任何提示 |
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
section('[8] 游标语义：顺序不一致时必须收敛到客户端顺序');
{
  // 8.1 两个不同标签互换位置。旧实现是「在容器里搜索第一个匹配的节点」，
  //     于是 <span> 会跨过 <p> 去认领后面那个 —— 两个都「命中」，DOM 顺序却还是 p,span。
  const Client = { render: () => h('div', {}, [h('span', {}, 'S'), h('p', {}, 'P')]) };
  const c = await hydrateWith(Client, '<div><p>P</p><span>S</span></div>');
  check(
    '标签互换：以客户端顺序为准（此前仍是服务端顺序）',
    norm(c.innerHTML) === '<div><span>S</span><p>P</p></div>',
    norm(c.innerHTML),
  );
  await sameAsMount('标签互换', Client, '<div><p>P</p><span>S</span></div>');
}
{
  // 8.2 同标签兄弟前插：旧的「搜索」实现会认领后面那个，文本被改对但节点身份错位
  const Client = { render: () => h('div', {}, [h('b', {}, 'NEW'), h('b', {}, 'OLD')]) };
  const c = await hydrateWith(Client, '<div><b>OLD</b></div>');
  check(
    '同标签前插：顺序与内容都对',
    norm(c.innerHTML) === '<div><b>NEW</b><b>OLD</b></div>',
    norm(c.innerHTML),
  );
}
{
  // 8.3 keyed 列表逆序：**文本/属性**必须收敛到客户端（节点身份按位置配对 —— 见评估 §31.6）
  const mk = (order) => ({
    render: () =>
      h(
        'ul',
        {},
        order.map((k) => h('li', { key: k, 'data-k': String(k) }, String(k))),
      ),
  });
  const c = await hydrateWith(
    mk([3, 2, 1]),
    '<ul><li data-k="1">1</li><li data-k="2">2</li><li data-k="3">3</li></ul>',
  );
  check(
    'keyed 逆序：内容按客户端顺序落位',
    norm(c.innerHTML) ===
      '<ul><li data-k="3">3</li><li data-k="2">2</li><li data-k="1">1</li></ul>',
    norm(c.innerHTML),
  );
}

// ══════════════════════════════════════════════════════════
section('[9] 服务端资源节点：不能被当成「多余节点」删掉');
{
  // 9.1 SSG 常把序列化状态塞在根节点里 —— 上一轮的收敛逻辑把它删了（丢数据、无报错）
  const Client = { render: () => h('div', { id: 'root' }, [h('p', {}, 'x')]) };
  const ssrHtml =
    '<div id="root"><p>x</p><script type="application/json">{"token":"abc"}</script></div>';
  const c = await hydrateWith(Client, ssrHtml);
  const script = c.querySelector('script[type="application/json"]');
  check('根内的 <script type="application/json"> 被保留', script !== null, c.innerHTML);
  check(
    '保留的 hydration data 内容可读（不是空壳）',
    script !== null && JSON.parse(script.textContent).token === 'abc',
    script?.textContent,
  );
}
{
  const Client = { render: () => h('div', {}, [h('p', {}, 'x')]) };
  const c = await hydrateWith(Client, '<div><style>.a{color:red}</style><p>x</p></div>');
  check('根内的 <style> 被保留', c.querySelector('style') !== null, c.innerHTML);
  const c2 = await hydrateWith(Client, '<div><noscript>需要 JS</noscript><p>x</p></div>');
  check('根内的 <noscript> 被保留', c2.querySelector('noscript') !== null, c2.innerHTML);
}
{
  // 对照：普通的多余元素**必须**仍然被删 —— 否则「一律不删」也能通过上面几条
  const Client = { render: () => h('div', {}, [h('p', {}, 'x')]) };
  const c = await hydrateWith(Client, '<div><span class="stale">stale</span><p>x</p></div>');
  check(
    '对照：普通多余元素仍被删除',
    norm(c.innerHTML) === '<div><p>x</p></div>',
    norm(c.innerHTML),
  );
  const c2 = await hydrateWith(Client, '<div><!--stale--><p>x</p></div>');
  check('对照：多余注释仍被清理', !c2.innerHTML.includes('stale'), c2.innerHTML);
}

// ══════════════════════════════════════════════════════════
section('[10] 表单状态：用户在 JS 到达之前的输入不能被抹掉');
{
  const Client = { render: () => h('input', { value: 'server' }) };

  // 对照：没人动过 ⇒ 值就是服务端渲染的那个（收敛路径正常工作）
  const plain = await hydrateWith(Client, '<input value="server">');
  check(
    '对照：没人动过时值保持服务端渲染的内容',
    plain.querySelector('input').value === 'server',
    plain.querySelector('input').value,
  );

  // 场景：慢网络下用户已经敲了字，之后脚本才加载完成
  const host = document.createElement('div');
  host.innerHTML = '<input value="server">';
  document.body.appendChild(host);
  host.querySelector('input').value = 'typed by user';
  await createApp(Client).mount(host, { hydrate: true });
  await sleep();
  check(
    '已输入的内容在水合后仍然存在（此前被抹成 server）',
    host.querySelector('input').value === 'typed by user',
    host.querySelector('input').value,
  );
}
{
  const Client = { render: () => h('input', { type: 'checkbox', checked: false }) };
  const host = document.createElement('div');
  host.innerHTML = '<input type="checkbox">';
  document.body.appendChild(host);
  const box = host.querySelector('input');
  box.checked = true; // 用户已经勾上
  await createApp(Client).mount(host, { hydrate: true });
  await sleep();
  check('已勾选的复选框不被取消', host.querySelector('input').checked === true);
}
{
  const Client = {
    render: () =>
      h('select', { value: 'a' }, [
        h('option', { value: 'a' }, 'A'),
        h('option', { value: 'b' }, 'B'),
      ]),
  };
  const host = document.createElement('div');
  host.innerHTML = '<select><option value="a">A</option><option value="b">B</option></select>';
  document.body.appendChild(host);
  host.querySelector('select').value = 'b'; // 用户已经选了 B
  await createApp(Client).mount(host, { hydrate: true });
  await sleep();
  check('已选择的下拉项不被重置', host.querySelector('select').value === 'b');
}
{
  // 对照：没人动过、两端不同 ⇒ 必须收敛到客户端（不能为了「保护用户输入」一律跳过）
  const Client = { render: () => h('input', { value: 'client' }) };
  const c = await hydrateWith(Client, '<input value="server">');
  check(
    '对照：两端 value 不同且用户没动过 ⇒ 以客户端为准',
    c.querySelector('input').value === 'client',
    c.querySelector('input').value,
  );
}

// ══════════════════════════════════════════════════════════
section('[11] 多根（Fragment）根节点：容器级收敛与锚点');
{
  const Client = { render: () => [h('p', {}, '1'), h('p', {}, '2')] };
  const hydrated = await hydrateWith(Client);
  const mounted = await mountOnly(Client);
  check('多根：逐字等于客户端渲染（含片段锚点）', hydrated.innerHTML === mounted.innerHTML, {
    水合: hydrated.innerHTML,
    客户端: mounted.innerHTML,
  });
}
{
  // SSR 多一个根：此前**完全没删**（元素级收敛覆盖不到「根就是 Fragment」）
  const Client = { render: () => [h('p', {}, '1'), h('p', {}, '2')] };
  const c = await hydrateWith(Client, '<p>1</p><p>2</p><p>3</p>');
  check('SSR 多一个根：残留根被删除', norm(c.innerHTML) === '<p>1</p><p>2</p>', norm(c.innerHTML));
}
{
  // 客户端多一个根：必须落在片段内（结束锚点之前），不能跑到锚点后面
  const Client = { render: () => [h('p', {}, '1'), h('p', {}, '2'), h('p', {}, '3')] };
  const hydrated = await hydrateWith(Client, '<p>1</p><p>2</p>');
  const mounted = await mountOnly(Client);
  check(
    '客户端多一个根：插在片段内（与客户端渲染一致）',
    hydrated.innerHTML === mounted.innerHTML,
    { 水合: hydrated.innerHTML, 客户端: mounted.innerHTML },
  );
}
{
  // 片段范围不能把「不属于本片段」的服务端内容包进去 —— 否则卸载时会一起删掉
  const Client = { render: () => [h('p', {}, '1')] };
  const c = await hydrateWith(Client, '<p>1</p><script type="application/json">{"a":1}</script>');
  const script = c.querySelector('script[type="application/json"]');
  check('片段外的资源节点被保留', script !== null, c.innerHTML);
  const app = createApp(Client);
  const host = document.createElement('div');
  host.innerHTML = '<p>1</p><script type="application/json">{"a":1}</script>';
  document.body.appendChild(host);
  await app.mount(host, { hydrate: true });
  await sleep();
  app.unmount();
  await sleep();
  check(
    '卸载后资源节点仍在（片段范围没把它包进去）',
    host.querySelector('script[type="application/json"]') !== null,
    host.innerHTML,
  );
}

// ══════════════════════════════════════════════════════════
section('[12] 陷阱 API：createHydrationFunctions 不能是静默的');
{
  const adapter = await import(`${ROOT}/packages/adapter-web/dist/index.mjs`);
  check(
    'createHydrationFunctions 仍是导出（删属于破坏性变更）',
    typeof adapter.createHydrationFunctions === 'function',
  );
  const calls = [];
  const original = console.warn;
  console.warn = (...args) => calls.push(args.map(String).join(' '));
  try {
    adapter.createHydrationFunctions({});
  } finally {
    console.warn = original;
  }
  const warned = calls.some((line) => line.includes('createHydrationFunctions'));
  check('调用时给出弃用提示（说明它不会接管响应式）', warned, warned ? undefined : calls);
  check(
    '提示里指明了正确入口',
    calls.some((line) => line.includes('mount') && line.includes('hydrate')),
    calls,
  );
}
{
  // 指南曾写「app.mount('#app') 就会自动水合」—— 实测不会：服务端那份 HTML 留着，
  // 客户端又追加一份（连 id 都重复）。现在至少要在「有内容 + 没开 hydrate」时告警。
  const C = { render: () => h('div', { id: 'root' }, 'client') };
  const capture = async (container) => {
    const calls = [];
    const original = console.warn;
    console.warn = (...args) => calls.push(args.map(String).join(' '));
    try {
      await createApp(C).mount(container);
      await sleep(20);
    } finally {
      console.warn = original;
    }
    return calls;
  };

  const nonEmpty = document.createElement('div');
  nonEmpty.innerHTML = '<div id="root">server</div>';
  document.body.appendChild(nonEmpty);
  const warned = await capture(nonEmpty);
  check(
    'mount 到「有内容但没开 hydrate」的容器 ⇒ 告警（否则内容被静默追加）',
    warned.some((line) => line.includes('hydrate')),
    warned,
  );

  const empty = document.createElement('div');
  document.body.appendChild(empty);
  const quiet = await capture(empty);
  check('对照：空容器挂载不告警', quiet.length === 0, quiet);
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
