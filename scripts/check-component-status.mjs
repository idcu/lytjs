#!/usr/bin/env node
/**
 * scripts/check-component-status.mjs
 *
 * **门禁：`@lytjs/ui` 的成熟度标注必须诚实**（A14 / D2，2026-11-05）。
 *
 * ## 判据
 *
 * 1. `src/index.ts` 的每一个组件导出都在 `COMPONENT_STATUS` 有登记（漏登记 = 红）；
 * 2. `COMPONENT_STATUS` 不能有已删除的导出（表不能变垃圾场）；
 * 3. `stable` 集合 **必须且只能**等于 `GOLDEN_COMPONENTS`（冻结 20）；
 *    `mislabeled_stable` 统计「标了 stable 却不在 Golden 20」的组件数，必须为 0；
 * 4. `GOLDEN_COMPONENTS` 长度固定 20，且每个成员都是真实导出；
 * 5. `experimental` 必须带 `note`（说清缺口），且数量 = 导出总数 - 20；
 * 6. 允许 `experimental` 组件保留导出 —— D2 明确**不移出默认导出**。
 *
 * 直接读源码（不依赖 dist），避免构建顺序把门禁变成「测产物」。
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const UI_SRC = fileURLToPath(new URL('../packages/ecosystem/packages/ui/src/', import.meta.url));
const indexSrc = readFileSync(`${UI_SRC}index.ts`, 'utf8');
const statusSrc = readFileSync(`${UI_SRC}component-status.ts`, 'utf8');

/** 从 index.ts 抽取组件导出名（与 tests/component-status.test.ts 同一口径） */
function exportedNames(src) {
  const names = new Set();
  for (const m of src.matchAll(/^export \{ ([^}]+) \} from '\.\/components\//gm)) {
    for (const raw of m[1].split(',')) {
      const item = raw.trim();
      if (!item || item.startsWith('type ')) continue;
      const alias = item.match(/^default as (\w+)$/);
      names.add(alias ? alias[1] : item);
    }
  }
  return [...names].sort();
}

/** 从 GOLDEN_COMPONENTS 数组字面量抽取名字 */
function goldenNames(src) {
  const block = src.match(/export const GOLDEN_COMPONENTS[^=]*=\s*\[([\s\S]*?)\];/);
  if (!block) return [];
  return [...block[1].matchAll(/['"](\w+)['"]/g)].map((m) => m[1]).sort();
}

/** 从 COMPONENT_STATUS 字面量抽取 `{ status, note? }` */
function statusEntries(src) {
  const block = src.match(/export const COMPONENT_STATUS[^=]*=\s*\{([\s\S]*?)\n\};/);
  if (!block) return [];
  const out = [];
  for (const line of block[1].split('\n')) {
    const m = line.match(/^ {2}(\w+): \{ status: '(stable|experimental)'(?:, note: (\w+))? \}/);
    if (m) out.push({ name: m[1], status: m[2], noteToken: m[3] ?? null });
  }
  return out;
}

const exported = exportedNames(indexSrc);
const golden = goldenNames(statusSrc);
const entries = statusEntries(statusSrc);

const problems = [];
const stable = entries.filter((e) => e.status === 'stable');
const experimental = entries.filter((e) => e.status === 'experimental');

// ① 导出 ↔ 登记 一一对应
const missing = exported.filter((n) => !entries.some((e) => e.name === n));
const stale = entries.filter((e) => !exported.includes(e.name)).map((e) => e.name);

// ③ mislabeled_stable：标了 stable 但不在 Golden 20
const mislabeledStable = stable.filter((e) => !golden.includes(e.name)).map((e) => e.name);

// ④ Golden 名单自洽
const goldenNotExported = golden.filter((n) => !exported.includes(n));
const goldenLen = golden.length;

// ⑤ experimental 必须带 note 且数量自洽
const expWithoutNote = experimental.filter((e) => !e.noteToken).map((e) => e.name);
const expCountMismatch = experimental.length !== exported.length - goldenLen;

console.log('\n🔍 组件成熟度 check-component-status（A14 / D2）\n');
console.log(`  导出组件数: ${exported.length}`);
console.log(`  Golden 20 : ${goldenLen}（${golden.join(', ')}）`);
console.log(`  stable    : ${stable.length}`);
console.log(`  experimental: ${experimental.length}`);
console.log(`  mislabeled_stable = ${mislabeledStable.length}`);

if (missing.length) problems.push(`未登记导出: ${missing.join(', ')}`);
if (stale.length) problems.push(`已删除但仍登记: ${stale.join(', ')}`);
if (goldenLen !== 20) problems.push(`Golden 名单长度 ${goldenLen} ≠ 20（冻结约定）`);
if (goldenNotExported.length)
  problems.push(`Golden 成员不是真实导出: ${goldenNotExported.join(', ')}`);
if (mislabeledStable.length) problems.push(`mislabeled_stable > 0: ${mislabeledStable.join(', ')}`);
if (stable.length !== 20) problems.push(`stable 数量 ${stable.length} ≠ 20（stable ⇔ Golden 20）`);
if (expWithoutNote.length) problems.push(`experimental 缺少 note: ${expWithoutNote.join(', ')}`);
if (expCountMismatch) {
  problems.push(
    `experimental 数量 ${experimental.length} ≠ 导出总数 - 20 = ${exported.length - 20}`,
  );
}

if (problems.length) {
  console.log('\n❌ 失败：');
  for (const p of problems) console.log(`  - ${p}`);
  console.log('');
  process.exit(1);
}

console.log(
  '\n✅ check-component-status 通过：mislabeled_stable = 0，其余 41 个如实标注 experimental\n',
);
