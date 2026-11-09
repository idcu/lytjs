#!/usr/bin/env node
/**
 * 门禁：三模式渲染写入路径一致性（S10 起）
 *
 * 同一份 props 在 vnode / signal / SSR 三条路径上必须产生一致的安全结论：
 *   · vnode   → `@lytjs/common-dom` 的 `patchAttr`（走 `isSafeAttribute`）
 *   · signal  → `@lytjs/dom-runtime` 的 `setAttribute`
 *   · SSR     → `@lytjs/renderer` 的 `renderToString`
 *
 * 本项从 S10 的「属性安全」开始，后续 S11（style 单位）继续在此扩展。
 */

import { JSDOM } from '../node_modules/jsdom/lib/api.js';

const ROOT = process.cwd();
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' });
const w = dom.window;
for (const key of ['window', 'document', 'Node', 'Element', 'HTMLElement', 'Event', 'MouseEvent']) {
  globalThis[key] = key === 'window' ? w : w[key];
}

const commonDom = await import(`${ROOT}/packages/common/packages/dom/dist/index.mjs`);
const domRuntime = await import(`${ROOT}/packages/dom-runtime/dist/index.mjs`);
const vdom = await import(`${ROOT}/packages/vdom/dist/index.mjs`);
const renderer = await import(`${ROOT}/packages/renderer/dist/index.mjs`);

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

const DANGER = 'javascript:alert(1)';
const SAFE = 'https://example.com/a';

section('[1] 属性安全：javascript: URL 三模式均拦截');
{
  const el = w.document.createElement('a');
  commonDom.patchAttr(el, 'href', DANGER, false);
  check('[vnode/common-dom] 拦截 javascript:', !el.hasAttribute('href'), el.getAttribute('href'));
}
{
  const el = w.document.createElement('a');
  domRuntime.setAttribute(el, 'href', DANGER);
  check('[signal/dom-runtime] 拦截 javascript:', !el.hasAttribute('href'), el.getAttribute('href'));
}
{
  const vnode = vdom.createVNode('a', { href: DANGER }, 'x');
  const html = await renderer.renderToString({ vnode });
  check('[ssr/renderer] 拦截 javascript:', !html.includes('javascript:'), html);
}

section('[2] 属性安全：安全 URL 三模式均保留');
{
  const el = w.document.createElement('a');
  commonDom.patchAttr(el, 'href', SAFE, false);
  check(
    '[vnode/common-dom] 保留 https:',
    el.getAttribute('href') === SAFE,
    el.getAttribute('href'),
  );
}
{
  const el = w.document.createElement('a');
  domRuntime.setAttribute(el, 'href', SAFE);
  check(
    '[signal/dom-runtime] 保留 https:',
    el.getAttribute('href') === SAFE,
    el.getAttribute('href'),
  );
}
{
  const vnode = vdom.createVNode('a', { href: SAFE }, 'x');
  const html = await renderer.renderToString({ vnode });
  check('[ssr/renderer] 保留 https:', html.includes(SAFE), html);
}

// ★ 2026-11-07（S11 / ADR 0018）：style 数值策略——三模式统一**不自动补 px**。
// 同一份 style 对象经三条写入路径后，DOM 上的计算结果必须一致：
//   · vnode  → common-dom.patchStyle（setProperty）
//   · signal → dom-runtime.setStyle（setProperty）
//   · SSR    → renderer.renderToString（buildStyleString 序列化后由浏览器解析）
section('[3] style 单位：数值不补 px，三模式一致（ADR 0018）');
{
  const read = (el) =>
    `${el.style.getPropertyValue('width')}|${el.style.getPropertyValue('font-weight')}`;

  const vnodeEl = w.document.createElement('div');
  commonDom.patchStyle(vnodeEl, null, { width: 10, fontWeight: 700 });

  const signalEl = w.document.createElement('div');
  domRuntime.setStyle(signalEl, { width: 10, fontWeight: 700 });

  const html = await renderer.renderToString({
    vnode: vdom.createVNode('div', { style: { width: 10, fontWeight: 700 } }, 'x'),
  });
  const holder = w.document.createElement('div');
  holder.innerHTML = html;
  const ssrEl = holder.firstElementChild;

  check(
    '[三模式一致] { width: 10, fontWeight: 700 }',
    read(vnodeEl) === read(signalEl) && read(signalEl) === read(ssrEl),
    `vnode=${read(vnodeEl)} signal=${read(signalEl)} ssr=${read(ssrEl)}`,
  );
  check('[SSR 序列化] 数值未被补成 px', !html.includes('10px'), html);
  check(
    '[客户端] 数值未被补成 px',
    !String(vnodeEl.getAttribute('style')).includes('10px') &&
      !String(signalEl.getAttribute('style')).includes('10px'),
    `vnode=${vnodeEl.getAttribute('style')} signal=${signalEl.getAttribute('style')}`,
  );
}

section('[4] style 单位：显式 10px 三模式一致');
{
  const read = (el) => el.style.getPropertyValue('width');

  const vnodeEl = w.document.createElement('div');
  commonDom.patchStyle(vnodeEl, null, { width: '10px' });

  const signalEl = w.document.createElement('div');
  domRuntime.setStyle(signalEl, { width: '10px' });

  const html = await renderer.renderToString({
    vnode: vdom.createVNode('div', { style: { width: '10px' } }, 'x'),
  });
  const holder = w.document.createElement('div');
  holder.innerHTML = html;
  const ssrEl = holder.firstElementChild;

  check(
    '[三模式一致] { width: "10px" }',
    read(vnodeEl) === '10px' && read(signalEl) === '10px' && read(ssrEl) === '10px',
    `vnode=${read(vnodeEl)} signal=${read(signalEl)} ssr=${read(ssrEl)}`,
  );
}

// ★ 2026-11-10（N09）：URL 属性白名单与实体编码绕过。
// 此前 SSR 的 URL_ATTRS 漏了 poster / background，客户端 isSafeAttribute 也不解码
// 实体 ⇒ 同一份 props 在三条路径上安全结论不同（且 SSR 会输出危险 HTML）。
section('[5] URL 属性白名单：poster / background 危险协议三模式均拦截');
{
  for (const attr of ['poster', 'background']) {
    const vnodeEl = w.document.createElement('video');
    commonDom.patchAttr(vnodeEl, attr, DANGER, false);

    const signalEl = w.document.createElement('video');
    domRuntime.setAttribute(signalEl, attr, DANGER);

    const html = await renderer.renderToString({
      vnode: vdom.createVNode('video', { [attr]: DANGER }, 'x'),
    });

    check(
      `[三模式一致] ${attr} 的 javascript: 均被拦截`,
      !vnodeEl.hasAttribute(attr) && !signalEl.hasAttribute(attr) && !html.includes('javascript:'),
      `vnode=${vnodeEl.getAttribute(attr)} signal=${signalEl.getAttribute(attr)} ssr=${html}`,
    );
  }
}

section('[6] 防假阳性：合法的 poster / background 三模式均保留');
{
  for (const attr of ['poster', 'background']) {
    const vnodeEl = w.document.createElement('video');
    commonDom.patchAttr(vnodeEl, attr, SAFE, false);

    const signalEl = w.document.createElement('video');
    domRuntime.setAttribute(signalEl, attr, SAFE);

    const html = await renderer.renderToString({
      vnode: vdom.createVNode('video', { [attr]: SAFE }, 'x'),
    });

    check(
      `[三模式一致] ${attr} 的 https: 均保留`,
      vnodeEl.getAttribute(attr) === SAFE &&
        signalEl.getAttribute(attr) === SAFE &&
        html.includes(SAFE),
      `vnode=${vnodeEl.getAttribute(attr)} signal=${signalEl.getAttribute(attr)} ssr=${html}`,
    );
  }
}

section('[7] 实体编码绕过：javascript&#58; 三模式均拦截');
{
  const EVIL = 'javascript&#58;alert(1)';
  const vnodeEl = w.document.createElement('a');
  commonDom.patchAttr(vnodeEl, 'href', EVIL, false);

  const signalEl = w.document.createElement('a');
  domRuntime.setAttribute(signalEl, 'href', EVIL);

  const html = await renderer.renderToString({
    vnode: vdom.createVNode('a', { href: EVIL }, 'x'),
  });

  check(
    '[三模式一致] 实体编码的 javascript: 均被拦截',
    !vnodeEl.hasAttribute('href') && !signalEl.hasAttribute('href') && !html.includes('javascript'),
    `vnode=${vnodeEl.getAttribute('href')} signal=${signalEl.getAttribute('href')} ssr=${html}`,
  );
}

section('[8] 防回归：data:text/html 三模式均拦截');
{
  const DATA_HTML = 'data:text/html,<script>alert(1)</script>';
  const vnodeEl = w.document.createElement('a');
  commonDom.patchAttr(vnodeEl, 'href', DATA_HTML, false);

  const signalEl = w.document.createElement('a');
  domRuntime.setAttribute(signalEl, 'href', DATA_HTML);

  const html = await renderer.renderToString({
    vnode: vdom.createVNode('a', { href: DATA_HTML }, 'x'),
  });

  check(
    '[三模式一致] data:text/html 均被拦截',
    !vnodeEl.hasAttribute('href') &&
      !signalEl.hasAttribute('href') &&
      !html.includes('data:text/html'),
    `vnode=${vnodeEl.getAttribute('href')} signal=${signalEl.getAttribute('href')} ssr=${html}`,
  );
}

console.log(`\n共 ${pass + fail} 条断言：✅ ${pass} / ❌ ${fail}`);
if (fail > 0) {
  console.log('❌ check-render-parity 失败');
  process.exit(1);
}
console.log('✅ check-render-parity 通过');
