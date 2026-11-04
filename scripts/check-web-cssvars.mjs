#!/usr/bin/env node
/* global document */
/**
 * 门禁：CSS 变量与主题（`@lytjs/web`）
 *
 * ## 为什么需要这一项
 *
 * 主题切换是「看起来在工作」的典型：`apply('dark')` 之后页面确实变了，
 * 但**上一个主题独有的变量还留在内联样式里** —— 页面变成「深色底 + 浅色边框」。
 * 这类残留不抛异常、不看细节也发现不了，只有用户截图说「颜色怪」。
 *
 * 另一半是**跨环境**：同一份组件在 SSR 与浏览器都会跑，而本包的入口直接写
 * `document.documentElement` / `window.getComputedStyle` ⇒ SSR 里一调用就 500。
 *
 * ## 2026-11-04 首次运行抓到的 4 个缺陷（修复前实测）
 *
 * | # | 缺陷 | 实测 |
 * |---|---|---|
 * | 1 | `ThemeManager.apply()` **不清理旧主题变量** | `light({bg,border})` → `dark({bg})` 后 `--border` 仍是 `gray` |
 * | 2 | `setCSSVar('name', value)` 抛**看不懂的 TypeError** | `Cannot use 'in' operator to search for 'element' in primary`（而 `getCSSVar('name')` 就是字符串 —— 读写不对称） |
 * | 3 | SSR（无 `document`）下直接抛错 | `setCSSVar(...)` / `getCSSVar(...)` ⇒ `ReferenceError: document is not defined` |
 * | 4 | `observe(['a'])` 之后 `subscribe('b')` **永远收不到** | 改动 `b` 时回调 0 次（检查范围被 observe 的列表锁死） |
 *
 * 本门禁在 jsdom 里跑（需要真实 DOM 才能验证内联样式与 MutationObserver）。
 */
import { join } from 'node:path';
import { JSDOM } from '../node_modules/jsdom/lib/api.js';

const dom = new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>', {
  url: 'http://localhost',
  pretendToBeVisual: true,
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
  'MutationObserver',
  'getComputedStyle',
]) {
  if (key === 'getComputedStyle') globalThis[key] = w.getComputedStyle.bind(w);
  else if (key === 'window') globalThis[key] = w;
  else if (w[key] !== undefined) globalThis[key] = w[key];
}

const ROOT = process.cwd();
const W = await import(join(ROOT, 'packages/web/dist/index.mjs'));

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
const root = document.documentElement;
const el = document.getElementById('app');
const reset = () => {
  root.removeAttribute('style');
  root.removeAttribute('data-theme');
  el.removeAttribute('style');
};

// ══════════════════════════════════════════════════════════
section('[1] 名称规范化');
{
  check('缺前缀自动补 --', W.normalizeVarName('primary') === '--primary');
  check('已有前缀保持不变', W.normalizeVarName('--primary') === '--primary');
  check('大小写保留（CSS 变量区分大小写）', W.normalizeVarName('--PRIMARY') === '--PRIMARY');
  check('stripVarPrefix 去前缀', W.stripVarPrefix('--primary') === 'primary');
}

// ══════════════════════════════════════════════════════════
section('[2] 写入的三种形态（对象 / 位置 / 简写）');
{
  reset();
  W.setCSSVar({ name: 'a', value: '1' });
  check('对象形式（全局）', root.style.getPropertyValue('--a') === '1', root.getAttribute('style'));

  W.setCSSVar({ element: el, name: 'b', value: 12, options: { unit: 'px' } });
  check(
    '对象形式（元素 + 单位）',
    el.style.getPropertyValue('--b') === '12px',
    el.getAttribute('style'),
  );

  W.setCSSVar(el, 'c', '3');
  check('位置参数形式（文档标注仍可用）', el.style.getPropertyValue('--c') === '3');

  let shorthandOk = false;
  let shorthandErr = '';
  try {
    W.setCSSVar('d', '4');
    shorthandOk = root.style.getPropertyValue('--d') === '4';
  } catch (err) {
    shorthandErr = err.message;
  }
  check(
    '★ 简写 setCSSVar("name", value)（与 getCSSVar("name") 对称；此前抛 TypeError）',
    shorthandOk,
    shorthandErr || root.getAttribute('style'),
  );

  let clearError = '';
  try {
    W.setCSSVar(123);
  } catch (err) {
    clearError = err.message;
  }
  check(
    '非法形态给出**可操作**的错误（而不是 `in` 的 TypeError）',
    clearError.includes('setCSSVar') && !clearError.includes("'in' operator"),
    clearError,
  );
}

// ══════════════════════════════════════════════════════════
section('[3] 读取：内联优先、计算样式兜底、fallback');
{
  reset();
  const style = document.createElement('style');
  style.textContent = ':root { --sheet: sheetValue; }';
  document.head.appendChild(style);

  check('样式表里的变量可读（走 getComputedStyle）', W.getCSSVar('sheet') === 'sheetValue');
  check('hasCSSVar 同样能识别样式表变量', W.hasCSSVar('sheet') === true);

  W.setCSSVar({ name: 'inline', value: 'x' });
  check('内联变量可读', W.getCSSVar('inline') === 'x');
  check('元素级变量可读', (W.setCSSVar(el, 'e', '9'), W.getCSSVar(el, 'e') === '9'));
  check('不存在的变量返回 fallback', W.getCSSVar('nope', 'fb') === 'fb');
  check('不存在的变量返回 null', W.getCSSVar('nope') === null);
  check('hasCSSVar 对不存在的变量为 false', W.hasCSSVar('nope') === false);
}

// ══════════════════════════════════════════════════════════
section('[4] 删除与切换');
{
  reset();
  W.setCSSVar({ name: 'a', value: '1' });
  W.removeCSSVar('a');
  check('removeCSSVar 后读不到', W.getCSSVar('a') === null);
  check('removeCSSVar 后 hasCSSVar 为 false', W.hasCSSVar('a') === false);

  W.setCSSVar({ name: 'flag', value: 'on' });
  const first = W.toggleCSSVar('flag', 'on', 'off');
  const second = W.toggleCSSVar('flag', 'on', 'off');
  check(
    'toggleCSSVar 在两个值之间切换并返回新值',
    first === 'off' && second === 'on' && W.getCSSVar('flag') === 'on',
    [first, second],
  );
}

// ══════════════════════════════════════════════════════════
section('[5] 主题切换：不能残留上一个主题的变量');
{
  reset();
  const warnings = [];
  const originalWarn = console.warn;
  console.warn = (...args) => warnings.push(args.map(String).join(' '));

  const tm = new W.ThemeManager();
  tm.register('light', { bg: 'white', fg: 'black', border: 'gray' });
  tm.register('dark', { bg: 'black', fg: 'white' });

  const appliedLight = tm.apply('light');
  check('apply 成功返回 true', appliedLight === true);
  check('data-theme 已设置', root.getAttribute('data-theme') === 'light');

  tm.apply('dark');
  check(
    '★ 切换主题后，旧主题独有的变量被移除（此前残留 --border: gray）',
    root.style.getPropertyValue('--border') === '' && W.getCSSVar('border') === null,
    root.getAttribute('style'),
  );
  check('新主题的变量已生效', W.getCSSVar('bg') === 'black' && W.getCSSVar('fg') === 'white');
  check('两主题共有的变量被覆盖（不是叠加）', root.style.getPropertyValue('--bg') === 'black');
  check('getCurrentTheme 跟随切换', tm.getCurrentTheme() === 'dark');

  const unknown = tm.apply('nope');
  console.warn = originalWarn;
  check('未注册的主题返回 false', unknown === false);
  check(
    '未注册的主题给出告警（不静默）',
    warnings.some((l) => l.includes('nope')),
    warnings,
  );
}

// ══════════════════════════════════════════════════════════
section('[6] 观察者：订阅、断开、后订阅');
{
  reset();
  const seen = [];
  const obs = new W.CSSVarObserver();
  // 回调签名是 (newValue, oldValue, variable)
  obs.subscribe('primary', (next, prev, name) =>
    seen.push(`${name}:${String(prev)}->${String(next)}`),
  );
  obs.observe(['primary']);

  W.setCSSVar({ name: 'primary', value: 'blue' });
  await sleep();
  check('订阅 + 观察能收到变化', seen.length === 1 && seen[0].includes('blue'), seen);

  obs.disconnect();
  const before = seen.length;
  W.setCSSVar({ name: 'primary', value: 'green' });
  await sleep();
  check('disconnect 后不再收到', seen.length === before);

  // 先 observe 限定列表、后 subscribe 另一个名字
  reset();
  const seen2 = [];
  const obs2 = new W.CSSVarObserver();
  obs2.observe(['onlyThis']);
  obs2.subscribe('other', (next, prev, name) => seen2.push(name));
  W.setCSSVar({ name: 'other', value: '2' });
  await sleep();
  obs2.disconnect();
  check(
    '★ observe(names) 之后 subscribe 的新名字也能收到（此前永远收不到）',
    seen2.length === 1 && seen2[0] === '--other',
    seen2,
  );
}

// ══════════════════════════════════════════════════════════
section('[7] 无 DOM 环境（SSR）：不能抛错');
{
  const savedDoc = globalThis.document;
  const savedWin = globalThis.window;
  delete globalThis.document;
  delete globalThis.window;

  const results = {};
  const attempt = (key, fn) => {
    try {
      results[key] = { ok: true, value: fn() };
    } catch (err) {
      results[key] = { ok: false, message: err.message };
    }
  };

  attempt('set', () => W.setCSSVar({ name: 'x', value: '1' }));
  attempt('setShorthand', () => W.setCSSVar('x', '1'));
  attempt('get', () => W.getCSSVar('x', 'fb'));
  attempt('has', () => W.hasCSSVar('x'));
  attempt('remove', () => W.removeCSSVar('x'));
  attempt('themeCtor', () => new W.ThemeManager().apply('nope'));
  attempt('observerCtor', () => new W.CSSVarObserver().disconnect());

  globalThis.document = savedDoc;
  globalThis.window = savedWin;

  const crashed = Object.entries(results).filter(([, r]) => !r.ok);
  check(
    '★ SSR 下 setCSSVar / getCSSVar / removeCSSVar 都不抛错（此前 ReferenceError）',
    crashed.length === 0,
    crashed.map(([k, r]) => `${k}: ${r.message}`),
  );
  check('SSR 下 getCSSVar 返回 fallback', results.get.value === 'fb', results.get);
  check('SSR 下 hasCSSVar 返回 false', results.has.value === false, results.has);
}

// ══════════════════════════════════════════════════════════
section('[8] ResizeObserver：能力缺失时要优雅退化');
{
  const supported = W.supportsResizeObserver();
  check('supportsResizeObserver 返回布尔', typeof supported === 'boolean', supported);
  const stop = W.useResizeObserver(el, () => {});
  check(
    '无 ResizeObserver 时 useResizeObserver 仍返回可调用的清理函数',
    typeof stop === 'function',
  );
  let threw = '';
  try {
    stop();
  } catch (err) {
    threw = err.message;
  }
  check('清理函数可安全调用', threw === '', threw);
}

// ══════════════════════════════════════════════════════════
console.log(`\n共 ${pass + fail} 条断言：✅ ${pass} / ❌ ${fail}`);
if (fail > 0) {
  console.log('\n失败项：');
  for (const f of failures) console.log(`  · ${f}`);
  process.exit(1);
}
process.exit(0);
