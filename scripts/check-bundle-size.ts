/**
 * 真实产物体积门禁（基线 + 2% 波动，A15 重写）
 *
 * ## 规则（A15 起生效，owner 已签字）
 *
 * 1. **预算不再是脚本里的手写数字**，而是数据文件 `scripts/bundle-baseline.json`：
 *      `预算 = floor(基线字节 × (1 + tolerance))`，`tolerance = 0.02`；
 *      若该入口声明了 `ceilingBytes`（本阶段硬上限），再取二者较小值。
 * 2. **不允许「实测后上调」**。基线只会因为体积变小而下调；要上调必须：
 *      ① 停下来报 owner 签字；② 在 `keel/decisions/` 写入决策记录；
 *      ③ 把 `approval.decisionRecord` 指向该文件。三者缺一，本项直接红。
 * 3. 本阶段（A15）硬上限：`minimal-app ≤ 93.7 KiB`（= 95 948 B），`ceilingBytes` 里写明。
 *
 * ## 为什么改成这样
 *
 * 2026-10-26 ~ 11-05 期间，本脚本的预算被**五次**上调（8.3 → 8.7 → 8.9 → 9.4 → 9.6 万字节），
 * 每次都是「先实测、再按实测值改预算」。这条路径的终点是预算永远追着实测跑，
 * 门禁从「棘轮」退化成「上次数字的复印件」。评估 §38.10 把这定性为「预算上调掩盖增长」。
 *
 * 现在基线是**数据**（可审查的 diff）、上限是**契约**（owner 签字 + 决策记录），
 * 脚本只负责算账，不再提供「上调预算」的建议文案。
 *
 * ## 口径
 *
 * 用 esbuild 真打包（minify + esm + browser），取 **gzip 后**的字节数：
 *
 *   · `vdom-only`        只用 `createVNode` / `h`，不用 `createApp`
 *   · `barrel-only`      只取 `ref/computed/h` —— 锁 tree-shaking 不被顶层副作用拖垮
 *   · `minimal-app`      `createApp` + `h`（主入口，运行时模板编译器静态可达）
 *   · `runtime-app`      `createApp` 来自 `@lytjs/core/runtime`
 *   · `first-screen`     切分模式下的**首屏 chunk**（编译器必须落在懒加载 chunk）
 *   · `first-screen-runtime` 同上，runtime 入口
 *
 * 前四个是 `splitting: false` —— 所有动态 import 会被内联，是「最坏情况」口径；
 * 后两个只量首屏 chunk，才是用户真正先下载的那一块。
 *
 * ## 用法
 *
 *   tsx scripts/check-bundle-size.ts            # 校验（CI / 门禁）
 *   tsx scripts/check-bundle-size.ts --verbose  # 附带 raw / gzip 明细
 *   tsx scripts/check-bundle-size.ts --record   # 记录**当前实测**为新基线（只在体积变小或首次记录时允许）
 *
 * 退出码：任一入口超预算、或基线/上限不自洽 ⇒ 1。
 */
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const VERBOSE = process.argv.includes('--verbose');
const RECORD = process.argv.includes('--record');
const BASELINE_PATH = join(ROOT, 'scripts', 'bundle-baseline.json');

interface Case {
  name: string;
  /** 说明这个入口代表什么用户场景 */
  scenario: string;
  contents: string;
  /** `splitting: true` 时只量入口 chunk */
  split?: boolean;
}

interface BaselineEntry {
  /** 上次记录的实测 gzip 字节数（受版本控制，越小越好） */
  baselineBytes: number;
  /** 本阶段 owner 批准的硬上限；null = 只受基线 +2% 约束 */
  ceilingBytes: number | null;
}

interface Baseline {
  tolerance: number;
  stage: string;
  recordedOn: string;
  /** 记录时的提交（`--record` 自动写入），用于追溯「这个基线对应哪份代码」 */
  measuredCommit?: string;
  approval: {
    signer: string;
    on: string;
    scope: string;
    decisionRecord: string | null;
  };
  entries: Record<string, BaselineEntry>;
}

const CASES: Case[] = [
  {
    name: 'vdom-only',
    scenario: '只用 `createVNode` / `h` 手写渲染函数（不用 createApp）',
    contents: `import { createVNode, h } from '@lytjs/vdom';
export { createVNode, h };`,
  },
  {
    name: 'barrel-only',
    scenario:
      '只从 `@lytjs/core` 取 `ref/computed/h`（**不调** createApp）—— 锁 tree-shaking 不被顶层副作用拖垮',
    contents: `import { ref, computed, h } from '@lytjs/core';
const count = ref(0);
const double = computed(() => count.value * 2);
export { count, double, h };`,
  },
  {
    name: 'minimal-app',
    scenario: '`createApp` + `h` + `ref` + `computed`（最典型的起步用法，主入口）',
    contents: `import { createApp, h, ref, computed } from '@lytjs/core';
const count = ref(0);
const double = computed(() => count.value * 2);
export const app = createApp({ render: () => h('div', null, [String(count.value), String(double.value)]) });
export { count, double };`,
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
  },
  {
    name: 'first-screen',
    scenario: '`createApp` 起步用法的**首屏 chunk**（开代码分割；编译器应在懒加载 chunk 里）',
    contents: `import { createApp, h, ref, computed } from '@lytjs/core';
const count = ref(0);
const double = computed(() => count.value * 2);
export const app = createApp({ render: () => h('div', null, [String(count.value), String(double.value)]) });
export { count, double };`,
    split: true,
  },
  {
    name: 'first-screen-runtime',
    scenario: '`@lytjs/core/runtime` 起步用法的**首屏 chunk**（开代码分割）',
    contents: `import { createApp, h, ref, computed } from '@lytjs/core/runtime';
const count = ref(0);
const double = computed(() => count.value * 2);
export const app = createApp({ render: () => h('div', null, [String(count.value), String(double.value)]) });
export { count, double };`,
    split: true,
  },
];

interface Result {
  name: string;
  raw: number;
  gzip: number;
  baseline: number;
  ceiling: number | null;
  /** 实际预算 = min(基线 × (1 + tolerance), ceiling) */
  budget: number;
  over: boolean;
  shrinkable: boolean;
  entryOnlyGzip?: number;
  closureChunks?: number;
  /** 首屏静态闭包里是否含编译器（只对切分模式有意义） */
  compilerInClosure?: boolean;
}

if (!existsSync(BASELINE_PATH)) {
  console.error(`\n❌ 缺少 ${BASELINE_PATH}（体积基线必须受版本控制，不能写在脚本里）\n`);
  process.exit(1);
}
const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) as Baseline;

let ok = true;
let assertions = 0;
const failures: string[] = [];
const kb = (n: number): string => `${(n / 1024).toFixed(1)} KB`;
const check = (name: string, passed: boolean, detail?: string): boolean => {
  assertions++;
  if (passed) {
    console.log(`  ✅ ${name}`);
  } else {
    ok = false;
    failures.push(name);
    console.log(`  ❌ ${name}`);
    if (detail) console.log(`     ${detail}`);
  }
  return passed;
};

// ── 声明自洽：用例与基线一一对应；基线为正且不超过上限 ──────────────
console.log('\n📦 真实产物体积 check-bundle-size');
console.log(
  `\n   规则：预算 = 基线 × (1 + ${(baseline.tolerance * 100).toFixed(0)}%)，再受本阶段上限约束`,
);
console.log(`   阶段：${baseline.stage}（记录于 ${baseline.recordedOn}）\n`);

// 本阶段 owner 批准的硬上限（写死在脚本里 ⇒ 改 baseline 的 ceiling 突破不了它）
const STAGE_CEILINGS: Record<string, number> = { 'minimal-app': 95948 };
const hasDecision = baseline.approval.decisionRecord !== null;

for (const [name, cap] of Object.entries(STAGE_CEILINGS)) {
  const e = baseline.entries[name];
  if (!e) continue;
  check(
    `${name} 的基线/上限不超过 A15 阶段上限 ${kb(cap)}`,
    hasDecision || (e.ceilingBytes !== null && e.baselineBytes <= cap && e.ceilingBytes <= cap),
    `baselineBytes=${e.baselineBytes}·ceilingBytes=${e.ceilingBytes}·阶段上限=${cap}` +
      (hasDecision
        ? `（已引用决策 ${baseline.approval.decisionRecord}）`
        : '（无决策记录 ⇒ 禁止上调）'),
  );
}

if (baseline.approval.decisionRecord !== null) {
  const recordPath = join(ROOT, baseline.approval.decisionRecord);
  check(
    '预算上调引用的决策记录存在',
    existsSync(recordPath),
    `${baseline.approval.decisionRecord} 不存在 —— 签字必须对应一份真实入库的决策`,
  );
}

const caseNames = new Set(CASES.map((c) => c.name));
const entryNames = new Set(Object.keys(baseline.entries));
const missingEntries = [...caseNames].filter((n) => !entryNames.has(n));
const staleEntries = [...entryNames].filter((n) => !caseNames.has(n));
check(
  '用例与基线条目一一对应',
  missingEntries.length === 0 && staleEntries.length === 0,
  `缺少基线：${missingEntries.join(', ') || '无'}；多余条目：${staleEntries.join(', ') || '无'}`,
);

for (const c of CASES) {
  const e = baseline.entries[c.name];
  if (!e) continue;
  check(
    `${c.name} 的基线已记录且不超过上限`,
    Number.isFinite(e.baselineBytes) &&
      e.baselineBytes > 0 &&
      (e.ceilingBytes === null || e.baselineBytes <= e.ceilingBytes),
    e.ceilingBytes === null
      ? `baselineBytes=${e.baselineBytes}`
      : `baselineBytes=${e.baselineBytes} > ceilingBytes=${e.ceilingBytes}`,
  );
}

// ── 实测 ─────────────────────────────────────────────────────────
const measured: {
  name: string;
  raw: number;
  gzip: number;
  /** 切分模式：只量入口 chunk 时的 gzip（对照用，**不是**首屏成本） */
  entryOnlyGzip?: number;
  /** 切分模式：入口 + 静态 import 可达的 chunk 数 */
  closureChunks?: number;
  /** 切分模式：首屏静态闭包里是否含编译器 */
  compilerInClosure?: boolean;
}[] = [];

for (const c of CASES) {
  if (!c.split) {
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
    measured.push({ name: c.name, raw: code.length, gzip: gzipSync(code).length });
    continue;
  }

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

  const metas = out.metafile?.outputs ?? {};
  const fileByKey = new Map(
    out.outputFiles.map((f) => [f.path.replace(`${ROOT}/`, ''), f.contents] as const),
  );
  const entryKey = Object.keys(metas).find((k) => /(^|\/)stdin\.js$/.test(k));
  if (!entryKey) throw new Error(`无法定位 ${c.name} 的入口 chunk`);
  const entryOnlyGzip = gzipSync(fileByKey.get(entryKey) ?? new Uint8Array()).length;

  // ★ 首屏 = 入口 chunk + 入口**静态 import** 可达的全部 chunk。
  //   只量入口 chunk 会严重低估：esbuild 会把共享模块（例如编译器）挪进一个
  //   被入口 `import-statement` 引用的共享 chunk —— 浏览器启动时照样要下载它。
  //   （2026-11-06 实测：入口 8.5 KB，但静态闭包 69.3 KB，编译器就在闭包里。）
  const closure = new Set<string>([entryKey]);
  const queue = [entryKey];
  while (queue.length > 0) {
    const cur = queue.pop()!;
    for (const imp of metas[cur].imports ?? []) {
      if (imp.kind !== 'import-statement') continue;
      if (closure.has(imp.path)) continue;
      closure.add(imp.path);
      queue.push(imp.path);
    }
  }

  let raw = 0;
  let gzip = 0;
  let compilerInClosure = false;
  for (const key of closure) {
    raw += metas[key].bytes;
    gzip += gzipSync(fileByKey.get(key) ?? new Uint8Array()).length;
    if (Object.keys(metas[key].inputs).some((p) => p.includes('compiler/dist'))) {
      compilerInClosure = true;
    }
  }

  measured.push({
    name: c.name,
    raw,
    gzip,
    entryOnlyGzip,
    closureChunks: closure.size,
    compilerInClosure,
  });
}

// ── --record：只在体积变小（或首次记录）时写回 ────────────────────
if (RECORD) {
  const refusals: string[] = [];
  for (const m of measured) {
    const e = baseline.entries[m.name];
    if (!e) continue;
    if (e.ceilingBytes !== null && m.gzip > e.ceilingBytes) {
      refusals.push(`${m.name}: 实测 ${m.gzip} B > 上限 ${e.ceilingBytes} B`);
    } else if (e.baselineBytes > 0 && m.gzip > e.baselineBytes) {
      refusals.push(`${m.name}: 实测 ${m.gzip} B > 基线 ${e.baselineBytes} B（只能下调）`);
    }
  }
  if (refusals.length > 0) {
    console.log('\n❌ 拒绝记录：以下入口体积变大\n');
    for (const r of refusals) console.log(`   ${r}`);
    console.log('\n   体积增长必须归因（`--verbose` + metafile）。若确认是必要的功能增长：');
    console.log('   停止，报 owner 签字，并把决策写入 keel/decisions/，再更新 baseline 的');
    console.log('   approval.decisionRecord —— **不得自行上调**。\n');
    process.exit(1);
  }
  for (const m of measured) {
    const e = baseline.entries[m.name];
    if (!e) continue;
    if (e.baselineBytes !== m.gzip) {
      console.log(`   ${m.name}: ${e.baselineBytes} → ${m.gzip}`);
      e.baselineBytes = m.gzip;
    }
  }
  baseline.recordedOn = new Date().toISOString().slice(0, 10);
  baseline.measuredCommit = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: ROOT,
    encoding: 'utf8',
  }).trim();
  writeFileSync(BASELINE_PATH, `${JSON.stringify(baseline, null, 2)}\n`);
  console.log(`\n✅ 已写回基线 ${BASELINE_PATH.replace(`${ROOT}/`, '')}\n`);
  process.exit(0);
}

// ── 校验：实测 ≤ 预算 ────────────────────────────────────────────
const results: Result[] = [];
for (const m of measured) {
  const e = baseline.entries[m.name]!;
  const toleranceBudget = Math.floor(e.baselineBytes * (1 + baseline.tolerance));
  const budget =
    e.ceilingBytes === null ? toleranceBudget : Math.min(toleranceBudget, e.ceilingBytes);
  results.push({
    name: m.name,
    raw: m.raw,
    gzip: m.gzip,
    baseline: e.baselineBytes,
    ceiling: e.ceilingBytes,
    budget,
    over: m.gzip > budget,
    shrinkable: m.gzip < budget * 0.9,
    entryOnlyGzip: m.entryOnlyGzip,
    closureChunks: m.closureChunks,
    compilerInClosure: m.compilerInClosure,
  });
}

console.log('   用 esbuild 真打包（minify + esm + browser），取 gzip 字节数：\n');
for (const r of results) {
  const mark = r.over ? '❌' : '✅';
  console.log(
    `${mark} ${r.name.padEnd(22)} ${kb(r.gzip).padStart(8)}  ` +
      `(预算 ${kb(r.budget)} = 基线 ${kb(r.baseline)} +${(baseline.tolerance * 100).toFixed(0)}%` +
      `${r.ceiling === null ? '' : `，上限 ${kb(r.ceiling)}`})`,
  );
  if (VERBOSE) console.log(`     raw ${kb(r.raw)} → gzip ${kb(r.gzip)}（${r.gzip} B）`);
  if (r.closureChunks !== undefined) {
    console.log(
      `     首屏 = 入口 ${kb(r.entryOnlyGzip ?? 0)} + 静态闭包 ${r.closureChunks} 个 chunk` +
        `（编译器${r.compilerInClosure ? '在' : '不在'}闭包内）`,
    );
  }
}

for (const r of results.filter((x) => x.closureChunks !== undefined)) {
  check(
    `${r.name} 的首屏度量覆盖静态闭包（不是只量入口 chunk）`,
    r.closureChunks! >= 2 && r.gzip >= (r.entryOnlyGzip ?? 0),
    `closureChunks=${r.closureChunks}·gzip=${r.gzip}·entryOnly=${r.entryOnlyGzip}`,
  );
}

check(
  'first-screen-runtime 的首屏静态闭包不含编译器',
  results.find((r) => r.name === 'first-screen-runtime')?.compilerInClosure === false,
  '`@lytjs/core/runtime` 的静态闭包里出现了编译器 —— runtime 入口的意义就是不带编译器',
);

const firstScreen = results.find((r) => r.name === 'first-screen');
if (firstScreen?.compilerInClosure === true) {
  console.log(
    '\nℹ️  已知债务：`@lytjs/core` 首屏静态闭包包含编译器（A15 只记录不改，留给 B03 AOT 处理）',
  );
}

for (const r of results) {
  check(
    `${r.name} 在预算内`,
    !r.over,
    `${r.gzip} B > 预算 ${r.budget} B（基线 ${r.baseline} B${r.ceiling === null ? '' : `，上限 ${r.ceiling} B`}）`,
  );
}

const shrinkable = results.filter((r) => r.shrinkable);
if (shrinkable.length > 0) {
  console.log('\nℹ️  以下入口远低于预算（< 90%），可用 `--record` 下调基线：');
  for (const r of shrinkable) console.log(`   ${r.name}: ${kb(r.gzip)} / 预算 ${kb(r.budget)}`);
}

const passed = assertions - failures.length;
console.log(`\n共 ${assertions} 条断言：✅ ${passed} / ❌ ${failures.length}`);

if (ok && results.every((r) => !r.over)) {
  console.log('\n✅ 所有入口都在预算内（基线 + 2% 波动）\n');
  process.exit(0);
}

console.log('\n❌ check-bundle-size 失败：\n');
for (const f of failures) console.log(`   · ${f}`);
console.log('\n处置路径（**不要**按实测上调预算）：');
console.log('   1) 先归因：`--verbose` 看 raw/gzip，或用 esbuild metafile 按包/按源文件拆贡献；');
console.log('   2) 若增长来自「不必要的依赖进产物」⇒ 回退该依赖，而不是改基线；');
console.log('   3) 若确认是必要的功能增长 ⇒ 停下来报 owner 签字 + 写 keel/decisions/，');
console.log('      再更新 baseline 的 approval.decisionRecord。\n');
process.exit(1);
