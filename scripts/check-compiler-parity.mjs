#!/usr/bin/env node
/* eslint-disable no-undef -- 本脚本刻意在裸 Node 里模拟浏览器全局（见文件头注释） */
/**
 * scripts/check-compiler-parity.mjs
 *
 * **门禁：signal/vapor 编译产物的「默认路径」必须语义正确**（A04 / D1）。
 *
 * ## 为什么需要它（2026-11-05 新增）
 *
 * `codegen-signal-optimized` 在 2026-11 的默认路径上是**静默丢内容**的：
 *
 *   - `{{msg}}` 根级文本 → 产物里根本没有 DOM 创建（页面空白）；
 *   - `<span v-if="ok" :id="i">{{msg}}</span>` → 属性写成 `id="i"`、文本整段丢失；
 *   - `<my-comp/>` → `_ctx.my-comp` 被解析成减法（ReferenceError）；
 *   - `<li v-for="x in xs"><span>{{x}}</span></li>` → 每个 li 都是空的。
 *
 * 这些问题产出的字符串「看起来像编译成功」，单测断言片段时全部能过，
 * 只有**真的执行并断言 DOM** 才会暴露。因此本门禁：
 *
 * 1. 对 5 个最小模板，用**默认选项**（不传 optimizeSignal）编译 → 执行 → 断言真实 DOM；
 * 2. 断言默认产物与 `optimizeSignal: false` 产物**逐字相同**（默认必须是基础实现）；
 * 3. 对响应式更新（改名 / 切分支 / 改列表）重新断言 DOM；
 * 4. 显式 `optimizeSignal: true` 的分叉记录在
 *    `scripts/compiler-parity-baseline.json`，**只允许减少不允许增加**（棘轮）。
 *
 * 退出码：0 = 全部通过；1 = 有失败（打印实际 DOM 与产物）。
 */
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

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

const COMPILER = new URL('../packages/compiler/dist/index.mjs', import.meta.url).href;
const DOM_RUNTIME = new URL('../packages/dom-runtime/dist/index.mjs', import.meta.url).href;
const REACTIVITY = new URL('../packages/reactivity/dist/index.mjs', import.meta.url).href;
const VDOM = new URL('../packages/vdom/dist/index.mjs', import.meta.url).href;
const RENDERER = new URL('../packages/renderer/dist/index.mjs', import.meta.url).href;

const { compile } = await import(COMPILER);
const { createSignalRenderer } = await import(RENDERER);
const { reactive } = await import(REACTIVITY);

/**
 * 执行 signal 产物（与 packages/renderer/src/signal/signal-renderer.ts 的参数表一致）。
 *
 * 门禁必须能跑**显式 optimizeSignal: true** 的产物，而 `createSignalRenderer` 写死
 * `optimizeSignal: false`，所以这里保留一份最小执行器，只用于分叉基线对比。
 */
const runtime = {
  ...(await import(DOM_RUNTIME)),
  ...(await import(REACTIVITY)),
  ...(await import(VDOM)),
  ...(await import(RENDERER)),
};
const EXEC_PARAMS = [
  'effect',
  'reconcileArray',
  'createTemplate',
  'getRealNode',
  'setText',
  'setHTML',
  'setAttribute',
  'setProperty',
  'setStyle',
  'setClass',
  'insert',
  'remove',
  'createEventHandler',
  'bindEffect',
  'onCleanup',
  'runCleanups',
  'mountComponent',
  'createVNode',
  'Text',
  'claimTextSlots',
  '__DEV__',
];
const EXEC_ARGS = [
  runtime.effect,
  runtime.reconcileArray,
  runtime.createTemplate,
  runtime.getRealNode,
  runtime.setText,
  runtime.setHTML,
  runtime.setAttribute,
  runtime.setProperty,
  runtime.setStyle,
  runtime.setClass,
  runtime.insert,
  runtime.remove,
  runtime.createEventHandler,
  runtime.bindEffect,
  runtime.onCleanup,
  runtime.runCleanups,
  runtime.mountComponent,
  runtime.createVNode,
  runtime.Text,
  runtime.claimTextSlots,
  false,
];

/** 直接执行一段信号产物；返回 DOM 字符串（抛错时返回 `throw: ...`）。 */
function execSignal(code, ctx, container) {
  const moduleCode = code.replace(/^\s*import[^\n]*\n/gm, '').replace(/\bexport\s+/g, '');
  const factory = new Function(...EXEC_PARAMS, `${moduleCode}\nreturn render;`);
  const render = factory(...EXEC_ARGS);
  render(ctx, container);
  return container.innerHTML.trim();
}

const MyComp = {
  name: 'MyComp',
  setup: () => ({}),
  render: () => runtime.createVNode('div', { class: 'c' }, 'comp-ok'),
};

/**
 * 5 个最小模板 = 评估报告里「静默丢内容」的具体形态。
 * `apply` 用来验证响应式更新后的 DOM（只跑默认路径）。
 */
const FIXTURES = [
  {
    name: 'static-interpolation',
    template: '<p class="a">Hello {{name}}!</p>',
    state: () => reactive({ name: 'World' }),
    expected: '<p class="a">Hello World!</p>',
    update: (ctx) => {
      ctx.name = 'LytJS';
      return '<p class="a">Hello LytJS!</p>';
    },
  },
  {
    name: 'root-text',
    template: '{{msg}}',
    state: () => reactive({ msg: 'root text' }),
    expected: 'root text',
    update: (ctx) => {
      ctx.msg = 'updated text';
      return 'updated text';
    },
  },
  {
    name: 'if-dynamic-attr',
    template: '<span v-if="ok" :id="i">{{msg}}</span>',
    state: () => reactive({ ok: true, i: 7, msg: 'M' }),
    expected: '<span id="7">M</span>',
    update: (ctx) => {
      ctx.i = 9;
      ctx.msg = 'N';
      return '<span id="9">N</span>';
    },
  },
  {
    name: 'kebab-component',
    template: '<my-comp/>',
    state: () => ({ 'my-comp': MyComp }),
    expected:
      '<lyt-comp data-lyt-comp="my-comp" style="display: contents"><div class="c">comp-ok</div></lyt-comp>',
  },
  {
    name: 'for-nested-element',
    template: '<li v-for="x in xs" :key="x"><span>{{x}}</span></li>',
    state: () => reactive({ xs: ['a', 'b'] }),
    expected: '<li><span>a</span></li><li><span>b</span></li>',
    update: (ctx) => {
      ctx.xs = ['a', 'c'];
      return '<li><span>a</span></li><li><span>c</span></li>';
    },
  },
];

const tick = (ms = 40) => new Promise((r) => setTimeout(r, ms));
let failed = 0;
const fail = (msg, extra) => {
  failed += 1;
  console.log(`  ❌ ${msg}`);
  if (extra) console.log(`     ${extra}`);
};

console.log('\n🔍 编译器一致性 check-compiler-parity（signal/vapor 默认路径）\n');
console.log('   5 个最小模板：默认选项编译 → 真实执行 → 断言 DOM + 更新 + 默认关闭棘轮\n');

for (const fx of FIXTURES) {
  const ctx = fx.state();
  let ok = true;
  // ① 默认必须等于基础实现（D1：优化默认关闭）
  const defaultCode = compile(fx.template, { rendererMode: 'signal' }).code;
  const baseCode = compile(fx.template, { rendererMode: 'signal', optimizeSignal: false }).code;
  if (defaultCode !== baseCode) {
    ok = false;
    fail(
      `${fx.name}: 默认产物 ≠ optimizeSignal:false —— 优化器又被默认启用了`,
      'D1 决策：默认必须走基础实现（见 keel/decisions）',
    );
  }

  // ② 真实执行 + DOM 断言（走 renderer 的真实路径）
  const root = document.createElement('div');
  document.body.appendChild(root);
  try {
    const r = await createSignalRenderer(fx.template, ctx);
    r.render(root);
    await tick();
    const actual = root.innerHTML.trim();
    if (actual !== fx.expected) {
      ok = false;
      fail(
        `${fx.name}: 初始 DOM 不符`,
        `实际: ${JSON.stringify(actual)}\n     期望: ${JSON.stringify(fx.expected)}`,
      );
    } else if (fx.update) {
      // ③ 响应式更新
      const expectedAfter = fx.update(ctx);
      await tick();
      const updated = root.innerHTML.trim();
      if (updated !== expectedAfter) {
        ok = false;
        fail(
          `${fx.name}: 更新后 DOM 不符`,
          `实际: ${JSON.stringify(updated)}\n     期望: ${JSON.stringify(expectedAfter)}`,
        );
      }
    }
    if (ok) console.log(`  ✅ ${fx.name}`);
    r.unmount();
  } catch (e) {
    fail(`${fx.name}: 执行抛错`, e instanceof Error ? e.message : String(e));
  }
}

// ④ 显式开启优化器的分叉棘轮（只允许减少，不允许增加）
const baselinePath = new URL('./compiler-parity-baseline.json', import.meta.url);
const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
console.log(
  `\n  ↪ 显式 optimizeSignal:true 的已知分叉（基线 ${baseline.divergent.length} 项，只允许减少）`,
);
for (const fx of FIXTURES) {
  let divergent = false;
  let detail = '';
  const optRoot = document.createElement('div');
  try {
    const optCode = compile(fx.template, { rendererMode: 'signal', optimizeSignal: true }).code;
    const optCtx = fx.state();
    const optDom = execSignal(optCode, optCtx, optRoot);
    if (optDom !== fx.expected) {
      divergent = true;
      detail = `实际: ${JSON.stringify(optDom)}`;
    }
  } catch (e) {
    divergent = true;
    detail = `抛错: ${e instanceof Error ? e.message : String(e)}`;
  }
  const known = baseline.divergent.includes(fx.name);
  if (divergent && !known) {
    fail(`${fx.name}: 优化器新增分叉（基线未记录）`, detail);
  } else if (!divergent && known) {
    // 修好了是好事，但必须同步收缩基线，否则棘轮会失效
    fail(`${fx.name}: 优化器已不再分叉，请从 compiler-parity-baseline.json 移除`);
  } else if (divergent) {
    console.log(`     · ${fx.name} 仍分叉（已记录基线）`);
  }
}

console.log(
  failed === 0
    ? '\n✅ check-compiler-parity 通过：默认路径 5 模板全部语义正确\n'
    : `\n❌ check-compiler-parity 失败：${failed} 项\n`,
);
process.exit(failed === 0 ? 0 : 1);
