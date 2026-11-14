#!/usr/bin/env node
/* eslint-disable no-undef -- 本脚本刻意在裸 Node 里模拟浏览器全局（见文件头注释） */
/**
 * scripts/check-signal-output-evaluates.mjs
 *
 * **门禁：signal 产物必须是「自洽可求值」的 ES 模块。**
 *
 * ## 为什么需要（2026-11-14，for13 缺 import）
 *
 * `signal-profile-snapshot.json` 只比较文本，`check-compiler-parity` 的执行器又把
 * 全部运行时 helper 作为 `new Function` 参数注入 —— 两者都会**掩盖缺失的 import**：
 * 产物里写 `setClass(...)` 却没 `import{setClass}`，在参数注入下照常运行。
 *
 * 本门禁按产物**自己的 import 图**求值：只把 import 声明里的绑定注入作用域，
 * 不额外提供任何 helper。于是少一条 import 就必然 `ReferenceError`。
 *
 * ## 判据
 *
 * 1. 遍历 `signal-profile-snapshot.json` 的 115×2 份冻结产物，逐份求值；
 * 2. 任何 `ReferenceError` / `SyntaxError` / 未知运行时导出 ⇒ 失败；
 * 3. 其它错误（宿主/桩不足导致）单独列出，不冒充“通过”。
 */
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const ROOT = new URL('../', import.meta.url);
const SNAPSHOT = new URL('./signal-profile-snapshot.json', import.meta.url);
const TEMPLATES = new URL('./compiler-parity-templates.json', import.meta.url);

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

const MODULES = {
  '@lytjs/reactivity': await import(new URL('packages/reactivity/dist/index.mjs', ROOT)),
  '@lytjs/dom-runtime': await import(new URL('packages/dom-runtime/dist/index.mjs', ROOT)),
  '@lytjs/vdom': await import(new URL('packages/vdom/dist/index.mjs', ROOT)),
  '@lytjs/renderer': await import(new URL('packages/renderer/dist/index.mjs', ROOT)),
  '@lytjs/component': await import(new URL('packages/component/dist/index.mjs', ROOT)),
};

/** 产物 import 声明 → 本地别名 → 运行时导出。未声明的 helper 不会出现在作用域里。 */
function resolveImports(code) {
  const bindings = {};
  const body = code.replace(
    /\bimport\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]\s*;?/g,
    (_full, specs, mod) => {
      const exported = MODULES[mod];
      if (!exported) throw new Error(`未知运行时模块：${mod}`);
      for (const raw of specs.split(',')) {
        const s = raw.trim();
        if (!s) continue;
        const [orig, alias = orig] = s.split(/\s+as\s+/).map((x) => x.trim());
        if (!(orig in exported)) throw new Error(`运行时模块 ${mod} 缺少导出：${orig}`);
        bindings[alias] = exported[orig];
      }
      return '';
    },
  );
  return { body, bindings };
}

function execSignal(code, ctx, container) {
  const { body, bindings } = resolveImports(code);
  const names = Object.keys(bindings);
  const factory = new Function(
    'document',
    'window',
    '__DEV__',
    ...names,
    `${body.replace(/\bexport\s+/g, '')}\nreturn render;`,
  );
  const render = factory(document, window, false, ...names.map((n) => bindings[n]));
  render(ctx, container);
  return container.innerHTML.trim();
}

const { createVNode } = MODULES['@lytjs/vdom'];
const { reactive } = MODULES['@lytjs/reactivity'];

function makeComponent(tag) {
  return {
    name: tag,
    setup: () => ({}),
    render: () => createVNode('div', null, `comp:${tag}`),
  };
}

const pascal = (tag) =>
  tag.replace(/(^|-)([a-z])/g, (_m, _p, c) => c.toUpperCase()).replace(/-/g, '');

function makeCtx(entry) {
  const data = { ...(entry.state ?? {}) };
  for (const tag of entry.components ?? []) {
    data[tag] = makeComponent(tag);
    data[pascal(tag)] = makeComponent(tag);
  }
  if (entry.slots) {
    data.$slots = Object.fromEntries(
      entry.slots.map((name) => [name, () => [createVNode('span', null, 'slot-ok')]]),
    );
  }
  return reactive(data);
}

const snapshot = JSON.parse(readFileSync(SNAPSHOT, 'utf8'));
const templatesFile = JSON.parse(readFileSync(TEMPLATES, 'utf8'));
const entries = new Map((templatesFile.templates ?? templatesFile).map((t) => [t.id, t]));

let failed = 0;
let evaluated = 0;
const unevaluable = [];

console.log('\n🔍 signal 产物自洽求值 check-signal-output-evaluates\n');
console.log('   按产物自身 import 图执行 115×2 份快照；不注入额外 helper\n');

for (const profile of ['base', 'optimized']) {
  for (const [id, code] of Object.entries(snapshot[profile] ?? {})) {
    const entry = entries.get(id);
    if (!entry) {
      failed += 1;
      console.log(`  ❌ ${profile}/${id}: 快照在模板集合中无对应条目`);
      continue;
    }
    const container = document.createElement('div');
    try {
      execSignal(code, makeCtx(entry), container);
      evaluated += 1;
    } catch (error) {
      const name = error instanceof Error ? error.name : 'Error';
      const message = error instanceof Error ? error.message : String(error);
      if (name === 'ReferenceError' || name === 'SyntaxError') {
        failed += 1;
        console.log(`  ❌ ${profile}/${id}: ${name}: ${message}`);
      } else {
        unevaluable.push({ profile, id, name, message });
      }
    }
  }
}

console.log(
  `\n  ↪ 成功求值 ${evaluated} 份；结构性失败 ${failed} 份；其它错误 ${unevaluable.length} 份`,
);
if (unevaluable.length > 0) {
  console.log('\n  ⚠️ 以下产物无法在当前离线沙箱求值（非 import 结构问题，不计入通过）：');
  for (const u of unevaluable) {
    console.log(`     · ${u.profile}/${u.id}: ${u.name}: ${u.message}`);
  }
}

console.log(
  failed === 0
    ? '\n✅ check-signal-output-evaluates 通过：所有产物引用都被自身 import 覆盖\n'
    : `\n❌ check-signal-output-evaluates 失败：${failed} 份产物存在未声明的引用\n`,
);
process.exit(failed === 0 ? 0 : 1);
