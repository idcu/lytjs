#!/usr/bin/env node
/* eslint-disable no-undef -- 本脚本刻意在裸 Node 里模拟浏览器全局（见文件头注释） */
/**
 * 门禁：`v-html` 的消毒一致性（vnode / signal 两种渲染模式）
 *
 * ## 为什么需要这一项
 *
 * `v-html` 是**唯一**允许把字符串当 HTML 插进 DOM 的入口，也是 XSS 的正门。
 * 本仓有两条完全不同的实现路径：
 *
 *   · **vnode**：编译期把 `v-html="x"` 转成 `innerHTML: sanitizeHTML(x)`，
 *     再由 DOM 属性写入；
 *   · **signal**：编译期生成 `setHTML(el, x)`，运行时由
 *     `@lytjs/dom-runtime` 的 `setHTML` 调用 `sanitizeHTML` 后写 innerHTML。
 *
 * 两者只要有一边漏掉消毒，就会出现「同一模板换个 renderer 就变成 XSS」——
 * 单测各自断言自己的产物字符串时**发现不了**。本门禁把同一批不可信载荷
 * 分别喂给两条真实渲染路径，断言：
 *
 *   1. 两边消毒后的 DOM **逐字相同**（语义一致，不是近似一致）；
 *   2. 输出里不存在 script/iframe 标签、on* 事件属性、javascript: 协议；
 *   3. 安全内容（`<b>` 等）被保留 —— 消毒不是「整段删掉」；
 *   4. `setHTML` 自身必须消毒（这是两条路径共用的单一真相源，
 *      它一旦退化，两边会「一致地不安全」）。
 *
 * ⚠️ 2026-11-05（A09）审计说「signal 模式直接 setHTML ⇒ 绕过消毒」。
 *   实测并非如此：`dom-runtime.setHTML` 自 2026-10-27 起就走 sanitizeHTML，
 *   两条路径当前结果完全一致。但该保障**只靠 setHTML 的实现细节**，
 *   任何重构都可能静默移除。因此用门禁把「一致性 + setHTML 自身消毒」钉死。
 */
import { join } from 'node:path';
import { JSDOM } from 'jsdom';

const ROOT = process.cwd();
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.Node = dom.window.Node;
globalThis.Element = dom.window.Element;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.SVGElement = dom.window.SVGElement;
globalThis.Event = dom.window.Event;
globalThis.MouseEvent = dom.window.MouseEvent;
try {
  Object.defineProperty(globalThis, 'navigator', {
    value: dom.window.navigator,
    configurable: true,
  });
} catch {
  /* 某些 Node 版本 navigator 只读，忽略 */
}
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
globalThis.__DEV__ = false;

const pkg = (name, entry = 'index.mjs') => join(ROOT, 'packages', name, 'dist', entry);
const { compile } = await import(pkg('compiler'));
const { openBlock, createBlock } = await import(pkg('vdom'));
const { createApp } = await import(pkg('core'));
const { createSignalRenderer } = await import(pkg('renderer'));
const { sanitizeHTML, setHTML } = await import(pkg('dom-runtime'));
const { reactive } = await import(pkg('reactivity'));

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
const tick = (ms = 40) => new Promise((r) => setTimeout(r, ms));

/** vnode 模式：编译 → 直接执行产物拿到 render → 交给真实 app 渲染 */
async function renderVnode(template, state) {
  const code = compile(template, { rendererMode: 'vnode' }).code;
  const render = new Function(
    'openBlock',
    'createBlock',
    'sanitizeHTML',
    '__DEV__',
    `${code}\nreturn render;`,
  )(openBlock, createBlock, sanitizeHTML, false);
  const host = document.createElement('div');
  document.body.appendChild(host);
  await createApp({ render: () => render(state, {}) }).mount(host);
  return host.innerHTML;
}

/** signal 模式：走真实 `createSignalRenderer`（含 runtime 注入 + effect 执行） */
async function renderSignal(template, state) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const r = await createSignalRenderer(template, state);
  r.render(host);
  await tick();
  const html = host.innerHTML;
  r.unmount();
  return html;
}

// ══════════════════════════════════════════════════════════
section('[1] 单一真相源：`sanitizeHTML` / `setHTML` 自身必须消毒');
{
  check(
    'sanitizeHTML 删除 <script> 标签',
    !/<script/i.test(sanitizeHTML('<script>alert(1)</script><b>ok</b>')),
    sanitizeHTML('<script>alert(1)</script><b>ok</b>'),
  );
  check(
    'sanitizeHTML 删除 on* 事件属性',
    !/onerror/i.test(sanitizeHTML('<img src=x onerror=alert(1)>')),
    sanitizeHTML('<img src=x onerror=alert(1)>'),
  );
  check(
    'sanitizeHTML 中和 javascript: 协议',
    !/javascript\s*:/i.test(sanitizeHTML('<a href="javascript:alert(1)">x</a>')),
    sanitizeHTML('<a href="javascript:alert(1)">x</a>'),
  );
  check(
    'sanitizeHTML 解码实体后再判定（&#111;nerror）',
    !/onerror/i.test(sanitizeHTML('<img src=x &#111;nerror=alert(1)>')),
    sanitizeHTML('<img src=x &#111;nerror=alert(1)>'),
  );

  // setHTML 是 vnode(运行时写入) / signal 两条路径共用的写入原语：
  // 它必须自己消毒，否则两条路径会「一致地不安全」，一致性断言反而变成帮凶。
  const host = document.createElement('div');
  setHTML(host, '<img src=x onerror=alert(1)><script>alert(1)</script><b>ok</b>');
  check(
    'dom-runtime.setHTML 写入前消毒（不依赖调用方）',
    !/onerror|<script/i.test(host.innerHTML) && host.innerHTML.includes('<b>ok</b>'),
    host.innerHTML,
  );
}

// ══════════════════════════════════════════════════════════
section('[2] 同一模板两种模式：不可信 HTML 的消毒结果必须逐字一致');
const DANGEROUS = /<script|<iframe|\son[a-z]+\s*=|javascript\s*:/i;
const PAYLOADS = [
  { name: 'script 标签', html: '<script>alert(1)</script>' },
  { name: 'onerror 事件属性', html: '<img src=x onerror=alert(1)>' },
  { name: 'javascript: 协议', html: '<a href="javascript:alert(1)">x</a>' },
  { name: 'svg onload', html: '<svg onload=alert(1)></svg>' },
  { name: 'onclick 属性', html: '<div onclick="alert(1)">hi</div>' },
  { name: 'style 整段（含内容）', html: '<b>bold</b><style>body{background:red}</style>' },
  { name: '实体编码绕过', html: '<img src=x &#111;nerror=alert(1)>' },
  { name: '重组 XSS', html: '<scr<script>ipt>alert(1)</scr</script>ipt>' },
];

for (const payload of PAYLOADS) {
  const template = '<div v-html="html"></div>';
  const vnodeDom = await renderVnode(template, { html: payload.html });
  const signalDom = await renderSignal(template, { html: payload.html });
  check(`[${payload.name}] vnode 与 signal 消毒结果一致`, vnodeDom === signalDom, {
    vnode: vnodeDom,
    signal: signalDom,
  });
  check(
    `[${payload.name}] 两条路径都不残留危险构造`,
    !DANGEROUS.test(vnodeDom) && !DANGEROUS.test(signalDom),
    {
      vnode: vnodeDom,
      signal: signalDom,
    },
  );
}

// 安全内容必须保留（消毒不能退化成「全删」）
{
  const safe = '<b>bold</b><i>italic</i>';
  const vnodeDom = await renderVnode('<div v-html="html"></div>', { html: safe });
  const signalDom = await renderSignal('<div v-html="html"></div>', { html: safe });
  check('安全 HTML 结构被保留（vnode）', vnodeDom === `<div>${safe}</div>`, vnodeDom);
  check('安全 HTML 结构被保留（signal）', signalDom === `<div>${safe}</div>`, signalDom);
}

// 更新路径（signal 的 effect 每次写入都要重新消毒）
{
  const ctx = reactive({ html: '<script>alert(1)</script><b>v1</b>' });
  const host = document.createElement('div');
  document.body.appendChild(host);
  const r = await createSignalRenderer('<div v-html="html"></div>', ctx);
  r.render(host);
  await tick();
  ctx.html = '<img src=x onerror=alert(1)><b>v2</b>';
  await tick();
  check(
    'signal 更新后重新消毒（不是只在首帧消毒）',
    !DANGEROUS.test(host.innerHTML) && host.innerHTML.includes('<b>v2</b>'),
    host.innerHTML,
  );
  r.unmount();
}

// ══════════════════════════════════════════════════════════
console.log(`\n共 ${pass + fail} 条断言：✅ ${pass} / ❌ ${fail}`);
if (fail > 0) {
  console.log('\n失败项：');
  for (const f of failures) console.log(`  · ${f}`);
  process.exit(1);
}
process.exit(0);
