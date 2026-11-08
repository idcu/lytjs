#!/usr/bin/env node
/* eslint-disable no-undef -- 本脚本刻意在裸 Node 里模拟浏览器全局（见文件头注释） */
/**
 * scripts/check-compiler-parity.mjs
 *
 * **门禁：signal/vapor 编译产物的「默认路径」必须语义正确 + 两套 codegen 逐字对拍**
 *
 * ## 历史（2026-11-05 建立，A04 / D1）
 *
 * `codegen-signal-optimized` 曾静默丢内容：根级 `{{msg}}`、v-if 分支动态属性、
 * kebab 组件、v-for 嵌套子元素。因此本门禁本来的职责是：
 * 5 个最小模板走**默认选项**编译 → 真实执行 → 断言 DOM；默认产物必须等于
 * `optimizeSignal: false`；显式 `optimizeSignal: true` 的分叉记录在棘轮基线里。
 *
 * ## 2026-11-06（B01 前置）扩展
 *
 * 1. **修复执行器伪分叉**：优化版产物用短别名导入（`effect as e` / `setText as x`），
 *    旧执行器把 import 行整条剥掉却没有把 `e` / `x` 绑到运行时 ⇒ 优化版一律
 *    `ReferenceError: e is not defined`，被误记为「语义分叉」。现在解析 import 并
 *    按别名注入运行时，分叉才是真的语义分叉。
 * 2. **100 模板对拍**：`scripts/compiler-parity-templates.json` 里同一模板分别用
 *    `optimizeSignal: false`（基础实现 A）与 `true`（优化实现 B）编译并真实执行，
 *    断言 `innerHTML` 逐字一致；有 `update` 的模板再对拍一次响应式更新后的 DOM。
 * 3. **棘轮基线**：已知不一致与已知「基础实现≠人工核定语义基准」都记入
 *    `scripts/compiler-parity-baseline.json`，**只允许减少**。新增分叉直接报红，
 *    修好却未收缩基线也报红（防止棘轮失效）。
 *
 * 本文件只做对拍与断言，**不修改、不删除任何编译器实现**。
 *
 * 退出码：0 = 全部通过；1 = 有失败（打印实际 DOM 与产物）。
 *
 * 用法：
 *   node scripts/check-compiler-parity.mjs
 *   node scripts/check-compiler-parity.mjs --report /tmp/parity-report.json
 */
import { readFileSync, writeFileSync } from 'node:fs';
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
const COMPONENT = new URL('../packages/component/dist/index.mjs', import.meta.url).href;
const SECURITY = new URL('../packages/common/packages/security/dist/index.mjs', import.meta.url)
  .href;

const { compile } = await import(COMPILER);
const { createSignalRenderer, mountVNode } = await import(RENDERER);
const { reactive } = await import(REACTIVITY);
const vdomRuntime = await import(VDOM);
const domRuntimeModules = await import(DOM_RUNTIME);
await import(SECURITY);

/**
 * 执行 signal 产物（与 packages/renderer/src/signal/signal-renderer.ts 的参数表一致）。
 *
 * `createSignalRenderer` 写死 `optimizeSignal: false`，所以显式开启优化器的产物
 * 只能由本脚本直接执行。
 */
const runtime = {
  ...(await import(DOM_RUNTIME)),
  ...(await import(REACTIVITY)),
  ...(await import(VDOM)),
  ...(await import(RENDERER)),
  ...(await import(COMPONENT)),
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

/**
 * 把产物的 `import {X as y} from '...'` 解析成「本地别名 → 运行时导出」绑定。
 *
 * 这是 2026-11-06 修正的核心：优化版产物用短别名（`effect as e`、`setText as x`），
 * 旧执行器直接剥掉 import 行，导致 `e is not defined` 被误报成语义分叉。
 */
function resolveImports(code) {
  const bindings = {};
  const body = code.replace(
    /\bimport\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]\s*;?/g,
    (_full, specs, mod) => {
      for (const raw of specs.split(',')) {
        const s = raw.trim();
        if (!s) continue;
        const parts = s.split(/\s+as\s+/);
        const orig = parts[0].trim();
        const alias = (parts[1] ?? parts[0]).trim();
        if (!(orig in runtime)) {
          throw new Error(`产物引用了运行时缺失的导出：${orig}（来自 ${mod}）`);
        }
        // 全名导入且参数表已提供同名参数时，不需要再声明一次（会重复声明报错）
        if (alias === orig && EXEC_PARAMS.includes(orig)) continue;
        bindings[alias] = runtime[orig];
      }
      return '';
    },
  );
  return { body, bindings };
}

/** 直接执行一段信号产物；返回 DOM 字符串（抛错时由调用方捕获）。 */
function execSignal(code, ctx, container) {
  const { body, bindings } = resolveImports(code);
  const names = Object.keys(bindings);
  const factory = new Function(
    ...EXEC_PARAMS,
    ...names,
    `${body.replace(/\bexport\s+/g, '')}\nreturn render;`,
  );
  const render = factory(...EXEC_ARGS, ...names.map((n) => bindings[n]));
  render(ctx, container);
  return container.innerHTML.trim();
}

const MyComp = {
  name: 'MyComp',
  setup: () => ({}),
  render: () => runtime.createVNode('div', { class: 'c' }, 'comp-ok'),
};
const Panel = {
  name: 'Panel',
  setup: () => ({}),
  render: () => runtime.createVNode('div', { class: 'panel' }, 'panel'),
};
const Row = {
  name: 'Row',
  setup: () => ({}),
  render: () => runtime.createVNode('div', { class: 'row' }, 'row'),
};
const COMPONENTS = { MyComp, 'my-comp': MyComp, Panel, Row };

/** 插槽填充物：所有插槽都返回同一个可辨识节点，便于断言。 */
function makeSlots(names) {
  const slots = {};
  for (const n of names) slots[n] = () => [runtime.createVNode('span', null, 'slot-ok')];
  return slots;
}

/**
 * 5 个最小模板 = 评估报告里「静默丢内容」的具体形态（A04/D1 建立，保留）。
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
let passed = 0;
const fail = (msg, extra) => {
  failed += 1;
  console.log(`  ❌ ${msg}`);
  if (extra) console.log(`     ${extra}`);
};
const pass = (msg) => {
  passed += 1;
  console.log(`  ✅ ${msg}`);
};

console.log('\n🔍 编译器一致性 check-compiler-parity（signal/vapor 默认路径 + 100 模板对拍）\n');
console.log('   ① 5 个最小模板：默认选项编译 → 真实执行 → 断言 DOM + 更新 + 默认关闭棘轮');
console.log('   ② 100 模板：optimizeSignal false/true 双编译 → 双执行 → innerHTML 逐字对拍\n');

// ============================================================
// ① 默认路径语义正确性（原 A04/D1 用例）
// ============================================================
for (const fx of FIXTURES) {
  const ctx = fx.state();
  let ok = true;
  // 默认必须等于基础实现（D1：优化默认关闭）
  const defaultCode = compile(fx.template, { rendererMode: 'signal' }).code;
  const baseCode = compile(fx.template, { rendererMode: 'signal', optimizeSignal: false }).code;
  if (defaultCode !== baseCode) {
    ok = false;
    fail(
      `${fx.name}: 默认产物 ≠ optimizeSignal:false —— 优化器又被默认启用了`,
      'D1 决策：默认必须走基础实现（见 keel/decisions）',
    );
  }

  // 真实执行 + DOM 断言（走 renderer 的真实路径）
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
    if (ok) pass(fx.name);
    r.unmount();
  } catch (e) {
    fail(`${fx.name}: 执行抛错`, e instanceof Error ? e.message : String(e));
  }
}

// ============================================================
// ② 100 模板对拍（B01 前置）
// ============================================================
const templatesFile = JSON.parse(
  readFileSync(new URL('./compiler-parity-templates.json', import.meta.url), 'utf8'),
);
const TEMPLATES = templatesFile.templates;
const baselinePath = new URL('./compiler-parity-baseline.json', import.meta.url);
const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
if (!Array.isArray(baseline.templateParity?.divergent)) {
  console.log('  ❌ 基线缺少 templateParity.divergent 段');
  process.exit(1);
}
if (!Array.isArray(baseline.templateParity?.expectedMismatch)) {
  console.log('  ❌ 基线缺少 templateParity.expectedMismatch 段');
  process.exit(1);
}

function makeCtx(entry) {
  const data = { ...(entry.state ?? {}) };
  if (entry.components) {
    for (const tag of entry.components) {
      if (!(tag in COMPONENTS)) throw new Error(`脚本未内置组件：${tag}`);
      data[tag] = COMPONENTS[tag];
    }
  }
  if (entry.slots) data.$slots = makeSlots(entry.slots);
  return reactive(data);
}

/** 跑一个模板的两种实现；返回 {a:{dom,err}, b:{dom,err}} */
function runPair(entry) {
  const out = {};
  for (const opt of [false, true]) {
    const key = opt ? 'b' : 'a';
    const ctx = makeCtx(entry);
    const container = document.createElement('div');
    try {
      const code = compile(entry.template, { rendererMode: 'signal', optimizeSignal: opt }).code;
      out[key] = { dom: execSignal(code, ctx, container), err: null, ctx, container };
    } catch (e) {
      out[key] = { dom: null, err: e instanceof Error ? e.message : String(e), ctx, container };
    }
  }
  return out;
}

/**
 * 当前不一致的根因归类（启发式；最终以基线里的 kind/note 为准）。
 * 只用于输出摘要，不参与判定。
 */
function classify(pair) {
  const { a, b } = pair;
  if (a.err && b.err) return 'both-throw';
  if (b.err) return 'opt-throws';
  if (a.err) return 'base-throws';
  if (b.dom === '' && a.dom !== '') return 'opt-empty-dom';
  if (a.dom.length > b.dom.length && b.dom && a.dom.includes(b.dom)) return 'opt-content-loss';
  return 'opt-other-diff';
}

const divergentIds = baseline.templateParity.divergent.map((x) =>
  typeof x === 'string' ? x : x.id,
);
const expectedMismatchIds = baseline.templateParity.expectedMismatch.map((x) =>
  typeof x === 'string' ? x : x.id,
);
const observedDivergent = [];
const observedExpectedMismatch = [];
const report = { total: TEMPLATES.length, divergent: [], expectedMismatch: [], groups: {} };

for (const entry of TEMPLATES) {
  const pair = runPair(entry);
  const same = pair.a.err === pair.b.err && pair.a.dom === pair.b.dom;
  let sameAfterUpdate = same;
  let afterDom = null;
  let afterErr = null;

  if (entry.update) {
    if (!pair.a.err && !pair.b.err) {
      try {
        Object.assign(pair.a.ctx, entry.update);
        Object.assign(pair.b.ctx, entry.update);
        await tick();
        const da = pair.a.container.innerHTML.trim();
        const db = pair.b.container.innerHTML.trim();
        afterDom = { a: da, b: db };
        sameAfterUpdate = da === db;
      } catch (e) {
        afterErr = e instanceof Error ? e.message : String(e);
        sameAfterUpdate = false;
      }
    } else {
      sameAfterUpdate = false;
    }
  }

  const isSame = same && sameAfterUpdate && afterErr === null;
  const kind = isSame ? 'same' : classify(pair);

  report.groups[entry.group] = report.groups[entry.group] ?? { total: 0, same: 0, divergent: 0 };
  const g = report.groups[entry.group];
  g.total += 1;

  if (isSame) {
    g.same += 1;
    if (divergentIds.includes(entry.id)) {
      fail(
        `${entry.id}（${entry.group}）已在两实现间一致，请从 compiler-parity-baseline.json 移除`,
        '棘轮只允许减少；修好后不收基线会让棘轮失效',
      );
    }
  } else {
    g.divergent += 1;
    observedDivergent.push(entry.id);
    report.divergent.push({
      id: entry.id,
      group: entry.group,
      kind,
      a: pair.a.err ? `THROW: ${pair.a.err}` : pair.a.dom,
      b: pair.b.err ? `THROW: ${pair.b.err}` : pair.b.dom,
      after: afterDom,
      afterErr,
    });
    if (!divergentIds.includes(entry.id)) {
      fail(
        `${entry.id}（${entry.group}）新增分叉：${kind}`,
        `A(false): ${pair.a.err ?? JSON.stringify(pair.a.dom)}\n     B(true): ${pair.b.err ?? JSON.stringify(pair.b.dom)}`,
      );
    }
  }

  // 人工语义基准（可选）：只对基础实现 A 断言，避免拿某一实现当标准
  if (entry.expected !== undefined && !pair.a.err && pair.a.dom !== entry.expected) {
    observedExpectedMismatch.push(entry.id);
    report.expectedMismatch.push({
      id: entry.id,
      group: entry.group,
      actual: pair.a.dom,
      expected: entry.expected,
    });
    if (!expectedMismatchIds.includes(entry.id)) {
      fail(
        `${entry.id}（${entry.group}）基础实现≠人工语义基准`,
        `实际: ${JSON.stringify(pair.a.dom)}\n     基准: ${JSON.stringify(entry.expected)}`,
      );
    }
  } else if (entry.expected !== undefined && expectedMismatchIds.includes(entry.id)) {
    fail(
      `${entry.id} 已符合人工语义基准，请从 compiler-parity-baseline.json 的 expectedMismatch 移除`,
      '棘轮只允许减少',
    );
  }

  // 更新后语义基准（可选）：只对基础实现 A 断言更新后的 DOM。
  // 仅靠 A/B 对拍无法发现“两实现同样错”的情况，这里是修复类语料的真实语义断言。
  if (entry.expectedAfter !== undefined) {
    const actualAfter = afterErr ? `THROW: ${afterErr}` : afterDom?.a;
    if (actualAfter !== entry.expectedAfter) {
      fail(
        `${entry.id}（${entry.group}）更新后≠人工语义基准`,
        `实际: ${JSON.stringify(actualAfter)}\n     基准: ${JSON.stringify(entry.expectedAfter)}`,
      );
    }
  }
}

// 基线里记录、但本轮已消失的项（正常修复）
for (const id of divergentIds) {
  if (!observedDivergent.includes(id)) {
    // 若模板已一致，上面的 per-entry 分支已报红；这里只兜底 id 不在模板集合的情况
    if (!TEMPLATES.some((t) => t.id === id)) {
      fail(`基线里的 ${id} 不在 templates 集合中`, '请清理基线或补回模板');
    }
  }
}

const sameCount = TEMPLATES.length - observedDivergent.length;
const kindCounts = {};
for (const d of report.divergent) kindCounts[d.kind] = (kindCounts[d.kind] ?? 0) + 1;
console.log(
  `\n  ↪ 100 模板对拍：一致 ${sameCount} / 不一致 ${observedDivergent.length}（基线 ${divergentIds.length}）`,
);
if (observedDivergent.length > 0) {
  console.log(`     不一致根因分布: ${JSON.stringify(kindCounts)}`);
  for (const d of report.divergent) {
    console.log(`     · ${d.id}（${d.group}）${d.kind}`);
  }
}
if (observedExpectedMismatch.length > 0) {
  console.log(
    `     基础实现≠人工语义基准: ${observedExpectedMismatch.length} 项（基线 ${expectedMismatchIds.length}）`,
  );
}
console.log('     分组：');
for (const [group, v] of Object.entries(report.groups)) {
  console.log(`       ${group}: ${v.same}/${v.total} 一致`);
}

// ============================================================
// ③ 原 5 模板的显式 optimizeSignal:true 分叉棘轮（保留）
// ============================================================
console.log(
  `\n  ↪ 5 个最小模板的显式 optimizeSignal:true 分叉（基线 ${baseline.divergent.length} 项，只允许减少）`,
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
    fail(`${fx.name}: 优化器已不再分叉，请从 compiler-parity-baseline.json 移除`);
  } else if (divergent) {
    console.log(`     · ${fx.name} 仍分叉（已记录基线）`);
  }
}

// ============================================================
// ④ vnode / SSR 模式安全网（B01a 补齐，B01b 前置）
//
// 为什么需要：B01b 会把 codegen-signal / codegen-signal-optimized / codegen /
// codegen-ssr 里重复的工具函数抽成共享模块。signal 模式已有真实执行对拍，
// **vnode 与 SSR 两条产物链路此前没有任何门禁** —— 抽取一旦改坏它们，
// 只有等下游用例偶然覆盖才会发现。这里补两层：
//
//   a) **产物逐字快照**：每条模板的 vnode / SSR 编译产物存进
//      `scripts/compiler-mode-snapshot.json`，重构后必须逐字不变
//      （有意变更时用 `--update-mode-snapshot` 重生成，diff 即评审点）。
//   b) **执行冒烟**：vnode 产物真实 render + mount、SSR 产物真实求值，
//      断言不抛错（语义/结构差异不在此断言，避免把运行时差异当编译缺陷）。
//
// 已知的 SSR 抛错（动态组件名的表达式中引用了未注入的 `comp`）记在
// `compiler-parity-baseline.json` 的 `modeParity` 段，同样**只允许减少**。
// ============================================================
const MODE_RUNTIME = {
  ...vdomRuntime,
  ...domRuntimeModules,
  ...(await import(COMPONENT)),
  ...(await import(RENDERER)),
  ...(await import(REACTIVITY)),
};
const MODE_NAMES = Object.keys(MODE_RUNTIME).filter((n) => /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(n));

/** 构造模板执行上下文（组件映射与插槽占位，与 signal 对拍保持一致） */
function buildModeCtx(entry) {
  const data = { ...(entry.state ?? {}) };
  if (entry.slots) data.$slots = makeSlots(entry.slots);
  if (entry.components) {
    for (const tag of entry.components) {
      if (COMPONENTS[tag]) data[tag] = COMPONENTS[tag];
    }
  }
  return data;
}

function execVNodeMode(code, ctx) {
  const factory = new Function(...MODE_NAMES, `${code}\n;return render;`);
  const render = factory(...MODE_NAMES.map((n) => MODE_RUNTIME[n]));
  const vnode = render(ctx, []);
  const host = document.createElement('div');
  document.body.appendChild(host);
  mountVNode(vnode, host);
  const html = host.innerHTML.trim();
  host.remove();
  return html;
}

function execSSRMode(code, ctx) {
  const factory = new Function(
    '_ctx',
    'sanitizeHTML',
    'normalizeClass',
    'normalizeStyle',
    'renderComponentVNode',
    '__DEV__',
    `${code}\n;return render(_ctx);`,
  );
  return factory(
    ctx,
    runtime.sanitizeHTML,
    runtime.normalizeClass,
    runtime.normalizeStyle,
    runtime.renderComponentVNode,
    false,
  );
}

const modeSnapshotPath = new URL('./compiler-mode-snapshot.json', import.meta.url);
const updateModeSnapshot = process.argv.includes('--update-mode-snapshot');
const modeSnapshot = updateModeSnapshot
  ? { vnode: {}, ssr: {} }
  : JSON.parse(readFileSync(modeSnapshotPath, 'utf8'));
const modeBaseline = baseline.modeParity ?? { vnodeThrows: [], ssrThrows: [] };
const observedModeThrows = { vnode: [], ssr: [] };
const nextModeSnapshot = { vnode: {}, ssr: {} };

console.log('\n  ↪ vnode / SSR 模式安全网：产物逐字快照 + 执行冒烟');
for (const entry of TEMPLATES) {
  let vnodeCode = '';
  let ssrCode = '';
  try {
    vnodeCode = compile(entry.template, {}).code;
  } catch (e) {
    fail(`${entry.id}: vnode 编译抛错`, e instanceof Error ? e.message : String(e));
  }
  try {
    ssrCode = compile(entry.template, { ssrMode: true }).code;
  } catch (e) {
    fail(`${entry.id}: SSR 编译抛错`, e instanceof Error ? e.message : String(e));
  }
  nextModeSnapshot.vnode[entry.id] = vnodeCode;
  nextModeSnapshot.ssr[entry.id] = ssrCode;

  if (!updateModeSnapshot) {
    for (const mode of ['vnode', 'ssr']) {
      const code = mode === 'vnode' ? vnodeCode : ssrCode;
      const expected = modeSnapshot[mode]?.[entry.id];
      if (expected === undefined) {
        fail(
          `${entry.id}: ${mode} 产物缺少快照`,
          '请运行 node scripts/check-compiler-parity.mjs --update-mode-snapshot',
        );
      } else if (expected !== code) {
        const a = expected.split('\n');
        const b = code.split('\n');
        let line = 0;
        while (line < a.length && line < b.length && a[line] === b[line]) line++;
        fail(
          `${entry.id}: ${mode} 产物与快照不一致（首个差异行 ${line + 1}）`,
          `快照: ${JSON.stringify(a[line] ?? '<EOF>')}\n     实际: ${JSON.stringify(b[line] ?? '<EOF>')}`,
        );
      }
    }
  }

  // 执行冒烟（组件/插槽上下文齐全）
  const ctx = buildModeCtx(entry);
  try {
    execVNodeMode(vnodeCode, { ...ctx });
  } catch (e) {
    observedModeThrows.vnode.push(entry.id);
    if (!modeBaseline.vnodeThrows.includes(entry.id)) {
      fail(`${entry.id}: vnode 产物执行抛错`, e instanceof Error ? e.message : String(e));
    }
  }
  try {
    const html = execSSRMode(ssrCode, { ...ctx });
    if (typeof html !== 'string') throw new Error(`SSR 产物返回 ${typeof html}`);
  } catch (e) {
    observedModeThrows.ssr.push(entry.id);
    if (!modeBaseline.ssrThrows.includes(entry.id)) {
      fail(`${entry.id}: SSR 产物执行抛错`, e instanceof Error ? e.message : String(e));
    }
  }
}

// 棘轮：基线里记录、但本轮已不再抛错的项必须移除
for (const id of modeBaseline.vnodeThrows) {
  if (!observedModeThrows.vnode.includes(id)) {
    fail(`${id}: vnode 产物已不再抛错，请从 baseline.modeParity.vnodeThrows 移除`);
  }
}
for (const id of modeBaseline.ssrThrows) {
  if (!observedModeThrows.ssr.includes(id)) {
    fail(`${id}: SSR 产物已不再抛错，请从 baseline.modeParity.ssrThrows 移除`);
  }
}
console.log(
  `     产物快照: ${updateModeSnapshot ? '已重生成' : `${TEMPLATES.length} 条 × 2 模式逐字一致`}；` +
    `执行冒烟：vnode 抛错 ${observedModeThrows.vnode.length}、SSR 抛错 ${observedModeThrows.ssr.length}`,
);

if (updateModeSnapshot) {
  writeFileSync(modeSnapshotPath, `${JSON.stringify(nextModeSnapshot, null, 2)}\n`);
  console.log(`     已写入 ${modeSnapshotPath.pathname}`);
}

const reportIdx = process.argv.indexOf('--report');
if (reportIdx !== -1 && process.argv[reportIdx + 1]) {
  writeFileSync(process.argv[reportIdx + 1], `${JSON.stringify(report, null, 2)}\n`);
  console.log(`\n  ↪ 对拍报告已写入 ${process.argv[reportIdx + 1]}`);
}

console.log(
  failed === 0
    ? `\n✅ check-compiler-parity 通过：默认路径 ${passed} 个最小模板语义正确；100 模板对拍无新增分叉\n`
    : `\n❌ check-compiler-parity 失败：${failed} 项\n`,
);
process.exit(failed === 0 ? 0 : 1);
