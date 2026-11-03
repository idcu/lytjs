/**
 * 真实产物体积门禁（棘轮）
 *
 * ## 为什么需要它
 *
 * 2026-10-26 评估里的「体量对比」用的是**单个包的 dist 文件 gzip**（core 11.9KB）。
 * 但用户实际交付的是**打包后的 app**：`createApp` 静态依赖 `@lytjs/compiler`
 * （运行时模板编译），所以一个最小应用的真实体积远大于单包数字。
 *
 * 实测（本脚本，2026-10-28 整改后）：
 *   - `@lytjs/core` 只取 `ref/computed/h`（不调 createApp）→ **8.7 KB gzip**
 *   - `@lytjs/core` 的 `createApp`（支持 template）        → **82.6 KB gzip**
 *   - `@lytjs/core/runtime` 的 `createApp`（不含编译器）    → **80.7 KB gzip**
 *   - 只用 `@lytjs/vdom` 的 `createVNode` + `h`             → **1.6 KB gzip**
 *
 * ## 2026-11-03 的一次**主动**上调（+2.6 / +2.4 KB），理由写在下面
 *
 * 这一批不是单个改动，而是 2026-11-02 ~ 11-03 连续几轮**修正确性缺陷**的累积：
 *
 *   · `patch-component` 改用 `cloneVNode` 合并 attrs（修「静态模板的 attrs 在实例
 *     之间累积」—— 第 2 个实例会继承上一个的 class）；
 *   · 过渡引擎新增 `safeGetComputedStyle`（修「宿主缺少 getComputedStyle 时
 *     `<Transition>` 的离开钩子抛错、元素永不移除」）；
 *   · 编译器新增提升引用的可达性分析（修「生成代码里有未被引用的提升声明」）。
 *
 * 实测 87.4 → 90.2 KB（minimal-app）/ 85.4 → 87.9 KB（runtime-app）。
 * 预算随之从 89 500 / 87 500 上调到 **94 000 / 92 000**（仍留 ~2 KB 余量）。
 *
 * ## ⚠️ 更正（2026-11-03）：上面那句「runtime 入口本该不含编译器」是**误判**
 *
 * 我一度以为只要把 renderer 里对 `@lytjs/compiler` 的**静态** import 改成动态，
 * 就能让 `runtime-app` 掉到 ~35 KB。**实测不成立**，原因有两条：
 *
 * 1. **编译器对每个 `createApp` 用户都可达**，与入口无关。实测依赖链（esbuild
 *    metafile 的 BFS）：
 *      `@lytjs/core/runtime` → `core/web-component` → `@lytjs/core-vnode`
 *                            → `@lytjs/renderer` → `vapor/vapor-ssr` → `@lytjs/compiler`
 *    以及 `create-app` 里对 renderer 的**动态** import 也会把它带进来。
 *    即使把 `core-vnode` 里 `export { compile }` 那行删掉、把 `vapor-ssr` 改成
 *    `await import('@lytjs/compiler')`，本脚本口径下的数字**反而变大**
 *    （87.9 → 92.8 KB：不开代码分割时动态 import 会被**内联**，还多出包装开销）。
 *    ⇒ 已回退这两处改动，不留无收益的 API 变更。
 *
 * 2. **本脚本的口径（`splitting: false`）不代表用户实际体验**。
 *    真实构建（Vite / webpack / Rollup）默认**按动态 import 切分**。实测开分割后：
 *      minimal-app 首屏 chunk **7.4 KB**（共 5 个 chunk，合计 95.2 KB）
 *      runtime-app 首屏 chunk **6.1 KB**（共 6 个 chunk，合计 92.7 KB）
 *    ⇒ 编译器落在**懒加载 chunk** 里，首屏并不下载它。架构上是可接受的。
 *
 * 为此本脚本新增 `[切分模式]` 一节，专门盯**首屏 chunk**——这才是用户感知的数字，
 * 也能挡住「某次改动把编译器拖进首屏」这类回归。
 *
 * 若将来真要让 `runtime` 入口彻底不含编译器，唯一的路是把 vapor/signal 的模板编译
 * 从 renderer 的**主入口**里拆出去（独立子路径），属于结构性改造，需单独立项。
 *
 * ## 2026-10-29 的一次**主动**上调（+2.2 KB），理由写在下面
 *
 * 修「`<Transition>` 根本不播动画」（报告 §27）时，过渡引擎（`vdom/transition.ts`
 * 的 enter / leave / 等待结束 / FLIP）第一次真正被 patch 调用 ⇒ 它从**死代码**
 * 变成**必然进产物**的代码。实测 83.1 → 85.3 KB（+2.2）。
 *
 * 这是**用体积换正确性**：不修的代价是 `<Transition>` 一个类名、一个钩子都不发生
 * （子元素照常渲染，所以看起来"只是动画没生效"，极难归因）。
 * Vue 的 runtime 同样始终包含 BaseTransition。
 *
 * 预算（按 `kb()` 的 /1024 口径显示）85.4 / 83.5 → **87.4 / 85.4**，
 * 留 ~2 KB 余量而不是贴着实测值 —— 贴太紧会变成噪声源（上一次就是这么定的规矩）。
 *
 * ## 2026-10-28 的一次**主动**上调（+1.8 KB），理由写在下面
 *
 * 修「内置组件在模板里全部渲染为空」（报告 §20）时，组件实例代理必须能按名字解析
 * `Teleport` / `Suspense` / `Transition` / `TransitionGroup` / `KeepAlive`，
 * 于是这五个组件**必然**进入每个应用的产物 —— 实测 +1.8 KB gzip（80.8 → 82.6）。
 *
 * 这是**用体积换正确性**，而且价格合理（Vue 的 runtime 同样始终包含这几个内置组件）。
 * 不修的代价是：模板里写 `<Teleport>` 静默渲染为空，且不报错。
 * 预算随之从 83.0 / 81.1 上调到 84.9 / 83.0 —— 留 2.3 KB 余量，
 * 否则下一个 0.4 KB 的改动就会误报。
 *
 * ## 三个数字分别锁住什么
 *
 * - **barrel-only 9.5 KB**：锁「顶层副作用不能拖垮 tree-shaking」。
 *   整改前，`create-app.ts` 模块顶层那句 `setTemplateCompiler(...)` 是一条有副作用的
 *   顶层语句 ⇒ 打包器无法删除 ⇒ 只 import 一个 `ref` 也会把 createApp + renderer +
 *   compiler 全部拖进来（实测 82 KB）。现在注入挪进函数体，这条降到 9.5 KB。
 *
 *   ⚠️ 2026-11-04 预算 9.5 → 9.7 KB：`@lytjs/common-error` 的 `warn` 从
 *   `function warn(message) { return; }`（构建把 `__DEV__` 编译成 `false`）
 *   改成运行时判定 `getDevMode()`，**整个框架的诊断通道才重新活过来**。
 *   代价是 barrel-only +32 字节 gzip（实测 9 532）。原来的 9 500 预算只剩 32 字节余量，
 *   任何无关改动都会误报，因此给到 9 700。
 * - **minimal-app vs runtime-app**：锁「两个入口的分工」。
 *   ⚠️ 目前两者只差 2 KB，因为 `@lytjs/renderer` 的 `signal-renderer.ts` **静态** import 了
 *   编译器，而 renderer 从 core 的 `createApp` 动态可达。这项留作下一批（见评估报告）。
 * - **vdom-only 1.6 KB**：锁「不用 createApp 时的极致轻量」这条卖点。
 *
 * 包体必须**被测量、被盯住**，否则会在一次次的「顺手加个依赖」里悄悄膨胀。
 *
 * ## 判据
 *
 * 用 esbuild 真的打一次包（minify + esm + browser），取 **gzip 后**的字节数：
 *   - 超过预算 ⇒ 红（并要求在提交里解释为什么变大）；
 *   - 明显低于预算（< 90%）⇒ 提示「可收紧预算」。
 *
 * ## 用法
 *   tsx scripts/check-bundle-size.ts
 *   tsx scripts/check-bundle-size.ts --verbose   # 打印 raw / gzip 明细
 *
 * 退出码：任一入口超预算 ⇒ 1。
 */
import { build } from 'esbuild';
import { gzipSync } from 'node:zlib';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const VERBOSE = process.argv.includes('--verbose');

interface Case {
  name: string;
  /** 说明这个入口代表什么用户场景 */
  scenario: string;
  contents: string;
  /** gzip 字节预算（棘轮：只能降不能升，升要在提交里写理由） */
  budget: number;
}

const CASES: Case[] = [
  {
    name: 'vdom-only',
    scenario: '只用 `createVNode` / `h` 手写渲染函数（不用 createApp）',
    contents: `import { createVNode, h } from '@lytjs/vdom';
export { createVNode, h };`,
    budget: 1800,
  },
  {
    name: 'barrel-only',
    scenario:
      '只从 `@lytjs/core` 取 `ref/computed/h`（**不调** createApp）—— 锁 tree-shaking 不被顶层副作用拖垮',
    contents: `import { ref, computed, h } from '@lytjs/core';
const count = ref(0);
const double = computed(() => count.value * 2);
export { count, double, h };`,
    budget: 9_700,
  },
  {
    name: 'minimal-app',
    scenario: '`createApp` + `h` + `ref` + `computed`（最典型的起步用法，主入口）',
    contents: `import { createApp, h, ref, computed } from '@lytjs/core';
const count = ref(0);
const double = computed(() => count.value * 2);
export const app = createApp({ render: () => h('div', null, [String(count.value), String(double.value)]) });
export { count, double };`,
    budget: 94_000,
  },
  {
    name: 'runtime-app',
    scenario:
      '`createApp` 来自 `@lytjs/core/runtime`（不含运行时模板编译器；靠 AOT 预编译 / 手写 render）',
    contents: `import { createApp, h, ref, computed } from '@lytjs/core/runtime';
const count = ref(0);
const double = computed(() => count.value * 2);
export const app = createApp({ render: () => h('div', null, [String(count.value), String(double.value)]) });
export { count, double };`,
    budget: 92_000,
  },
];

/**
 * 「切分模式」用例：**只量首屏 chunk**。
 *
 * 为什么需要：上面那组是 `splitting: false`，会把所有动态 import **内联**进单一产物 ——
 * 那是个「最坏情况」口径，不代表用户实际体验（Vite/webpack/Rollup 默认按动态 import
 * 切分）。用户真正先下载的是**入口 chunk**，所以这一组盯的是它。
 *
 * 实测（2026-11-03）：minimal-app 首屏 7.4 KB / runtime-app 首屏 6.1 KB，
 * 编译器落在懒加载 chunk 里 —— 这正是「runtime 入口不含编译器」在工程上的真实含义。
 *
 * 预算故意给得紧（~12 KB）：它能挡住「某次改动把编译器/渲染引擎拖进首屏」这类回归，
 * 而对「懒加载 chunk 变大」不敏感 —— 后者不增加首屏成本，不该被这里拦住。
 */
const SPLIT_CASES: Case[] = [
  {
    name: 'first-screen',
    scenario: '`createApp` 起步用法的**首屏 chunk**（开代码分割；编译器应在懒加载 chunk 里）',
    contents: `import { createApp, h, ref, computed } from '@lytjs/core';
const count = ref(0);
const double = computed(() => count.value * 2);
export const app = createApp({ render: () => h('div', null, [String(count.value), String(double.value)]) });
export { count, double };`,
    budget: 8_200,
  },
  {
    name: 'first-screen-runtime',
    scenario: '`@lytjs/core/runtime` 起步用法的**首屏 chunk**（开代码分割）',
    contents: `import { createApp, h, ref, computed } from '@lytjs/core/runtime';
const count = ref(0);
const double = computed(() => count.value * 2);
export const app = createApp({ render: () => h('div', null, [String(count.value), String(double.value)]) });
export { count, double };`,
    budget: 6_800,
  },
];

interface Result {
  name: string;
  raw: number;
  gzip: number;
  budget: number;
  over: boolean;
  shrinkable: boolean;
  /** 首屏 chunk 是否包含编译器（只对切分模式有意义） */
  containsCompiler?: boolean;
}

const results: Result[] = [];

for (const c of CASES) {
  const out = await build({
    stdin: { contents: c.contents, resolveDir: ROOT, loader: 'ts' },
    bundle: true,
    minify: true,
    format: 'esm',
    platform: 'browser',
    write: false,
    logLevel: 'error',
  });

  const code = out.outputFiles[0]?.contents ?? new Uint8Array();
  const gzip = gzipSync(code).length;

  results.push({
    name: c.name,
    raw: code.length,
    gzip,
    budget: c.budget,
    over: gzip > c.budget,
    shrinkable: gzip < c.budget * 0.9,
  });
}

// ── 切分模式：只量首屏 chunk ──────────────────────────────
const splitResults: Result[] = [];

for (const c of SPLIT_CASES) {
  const out = await build({
    stdin: { contents: c.contents, resolveDir: ROOT, loader: 'ts' },
    bundle: true,
    minify: true,
    format: 'esm',
    platform: 'browser',
    splitting: true,
    outdir: 'out',
    write: false,
    logLevel: 'error',
    metafile: true,
  });

  // 入口 chunk = 文件名里带 `stdin` 的那个（esbuild 用入口文件名命名）
  const entryChunk =
    out.outputFiles.find((f) => /(^|\/)stdin\.js$/.test(f.path)) ?? out.outputFiles[0];
  const code = entryChunk?.contents ?? new Uint8Array();
  const gzip = gzipSync(code).length;

  // ★ 内容断言（比体积更直接）：首屏 chunk 里**不得**包含编译器。
  //   体积只能间接说明问题；这条直接看「这个 chunk 由哪些模块组成」。
  //   它挡住的是「某次改动把编译器从懒加载 chunk 挪回首屏」这类回归 ——
  //   那会让首屏从 ~7 KB 变成 ~50 KB，而总量几乎不变（总量里本来就有）。
  let containsCompiler = false;
  if (out.metafile) {
    const entryKey = Object.keys(out.metafile.outputs).find((k) => /(^|\/)stdin\.js$/.test(k));
    const entryMeta = entryKey ? out.metafile.outputs[entryKey] : undefined;
    containsCompiler = Object.keys(entryMeta?.inputs ?? {}).some((p) =>
      p.includes('compiler/dist'),
    );
  }

  splitResults.push({
    name: c.name,
    raw: code.length,
    gzip,
    budget: c.budget,
    over: gzip > c.budget || containsCompiler,
    shrinkable: gzip < c.budget * 0.9,
    containsCompiler,
  });
}

const kb = (n: number): string => `${(n / 1024).toFixed(1)} KB`;

console.log('\n📦 真实产物体积 check-bundle-size');
console.log('\n   用 esbuild 真打包（minify + esm + browser），取 gzip 字节数：\n');

for (let i = 0; i < results.length; i++) {
  const r = results[i]!;
  const c = CASES[i]!;
  const mark = r.over ? '❌' : '✅';
  console.log(`${mark} ${r.name.padEnd(14)} ${kb(r.gzip).padStart(9)}  (预算 ${kb(r.budget)})`);
  console.log(`   ↳ ${c.scenario}`);
  if (VERBOSE) console.log(`     raw ${kb(r.raw)} → gzip ${kb(r.gzip)}`);
}

// ── 切分模式报告 ──────────────────────────────────────────
console.log('\n   [切分模式] 只量首屏 chunk（用户真正先下载的那一块）：\n');
for (let i = 0; i < splitResults.length; i++) {
  const r = splitResults[i]!;
  const c = SPLIT_CASES[i]!;
  const mark = r.over ? '❌' : '✅';
  console.log(`${mark} ${r.name.padEnd(14)} ${kb(r.gzip).padStart(9)}  (预算 ${kb(r.budget)})`);
  console.log(`   ↳ ${c.scenario}`);
  if (r.containsCompiler !== undefined) {
    console.log(
      r.containsCompiler
        ? '   ❌ 首屏 chunk 里包含编译器（应落在懒加载 chunk）'
        : '   ✅ 首屏 chunk 不含编译器（在懒加载 chunk 里）',
    );
  }
  if (VERBOSE) console.log(`     raw ${kb(r.raw)} → gzip ${kb(r.gzip)}`);
}

const over = [...results, ...splitResults].filter((r) => r.over);
const shrinkable = [...results, ...splitResults].filter((r) => r.shrinkable);

if (shrinkable.length > 0) {
  console.log('\nℹ️  预算可收紧（实际 < 预算的 90%）：');
  for (const r of shrinkable) {
    console.log(`   ${r.name}: 实际 ${kb(r.gzip)}，预算 ${kb(r.budget)} → 可改为 ${kb(r.gzip)}`);
  }
}

if (over.length === 0) {
  console.log('\n✅ 所有入口都在预算内\n');
  process.exit(0);
}

console.log(`\n❌ ${over.length} 个入口超出预算：\n`);
for (const r of over) {
  console.log(
    `   ${r.name}: ${kb(r.gzip)} > 预算 ${kb(r.budget)}（超出 ${kb(r.gzip - r.budget)}）`,
  );
}
console.log('\n两种处置：');
console.log(
  '  1) 查清是什么把体积撑大了（`--verbose` 看 raw/gzip；必要时用 esbuild --metafile 分析）；',
);
console.log('  2) 若确认是必要的功能增长，在 scripts/check-bundle-size.ts 里上调预算，');
console.log('     并在提交信息里写清「为什么值得多这几 KB」。');
process.exit(1);
