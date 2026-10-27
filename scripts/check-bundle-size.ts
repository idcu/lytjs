/**
 * 真实产物体积门禁（棘轮）
 *
 * ## 为什么需要它
 *
 * 2026-10-26 评估里的「体量对比」用的是**单个包的 dist 文件 gzip**（core 11.9KB）。
 * 但用户实际交付的是**打包后的 app**：`createApp` 静态依赖 `@lytjs/compiler`
 * （运行时模板编译），所以一个最小应用的真实体积远大于单包数字。
 *
 * 实测（本脚本，2026-10-27 整改后）：
 *   - `@lytjs/core` 只取 `ref/computed/h`（不调 createApp）→ **8.9 KB gzip**
 *   - `@lytjs/core` 的 `createApp`（支持 template）        → **82.5 KB gzip**
 *   - `@lytjs/core/runtime` 的 `createApp`（不含编译器）    → **80.5 KB gzip**
 *   - 只用 `@lytjs/vdom` 的 `createVNode` + `h`             → **1.6 KB gzip**
 *
 * ## 三个数字分别锁住什么
 *
 * - **barrel-only 8.9 KB**：锁「顶层副作用不能拖垮 tree-shaking」。
 *   整改前，`create-app.ts` 模块顶层那句 `setTemplateCompiler(...)` 是一条有副作用的
 *   顶层语句 ⇒ 打包器无法删除 ⇒ 只 import 一个 `ref` 也会把 createApp + renderer +
 *   compiler 全部拖进来（实测 82 KB）。现在注入挪进函数体，这条降到 8.9 KB。
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
    budget: 9_500,
  },
  {
    name: 'minimal-app',
    scenario: '`createApp` + `h` + `ref` + `computed`（最典型的起步用法，主入口）',
    contents: `import { createApp, h, ref, computed } from '@lytjs/core';
const count = ref(0);
const double = computed(() => count.value * 2);
export const app = createApp({ render: () => h('div', null, [String(count.value), String(double.value)]) });
export { count, double };`,
    budget: 85_000,
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
    budget: 83_000,
  },
];

interface Result {
  name: string;
  raw: number;
  gzip: number;
  budget: number;
  over: boolean;
  shrinkable: boolean;
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

const over = results.filter((r) => r.over);
const shrinkable = results.filter((r) => r.shrinkable);

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
