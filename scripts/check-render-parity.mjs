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

console.log(`\n共 ${pass + fail} 条断言：✅ ${pass} / ❌ ${fail}`);
if (fail > 0) {
  console.log('❌ check-render-parity 失败');
  process.exit(1);
}
console.log('✅ check-render-parity 通过');
