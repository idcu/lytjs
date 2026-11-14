#!/usr/bin/env node
/**
 * 门禁：逐文件覆盖率棘轮（ADR 0034）
 *
 * ★ 本门禁**只读**两个文件，不生成任何东西：
 *   · `scripts/coverage-baseline.json` —— 受版本控制的静态基线（只能由 `--update` 写入）
 *   · `coverage/coverage-final.json`    —— 本次 `test:coverage` 的现场产物
 *
 *   门禁档内不存在「生成基线 → 校验基线」的自比对；基线在版本控制里，
 *   与本次运行无关，所以「产物跟基线比」是有意义的比较。
 *
 * ## 判据
 *
 *   1. 逐文件 covered ≥ 基线值（statements / functions / lines）
 *   2. 全局 covered ≥ 基线值（statements / functions / lines）
 *   3. 未插桩文件集合不新增成员；基线与冻结清单
 *      `scripts/coverage-uninstrumented.json` 保持一致（现有 7 条保持）
 *   4. 产物必须晚于最新源码（防止拿旧产物冒充本次结论）
 *
 *   branches **不参与判据**：两次同码树运行的分支分母与命中数都会抖动
 *   （`branchMap` 行号移位、分支数 ±5），只打印信息项。见 ADR 0034。
 *
 * ## 用法
 *
 *   node scripts/check-coverage-baseline.mjs
 *
 * 退出码：0 = 通过；1 = 有失败。
 */

import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  BASELINE_PATH,
  ENFORCED_KEYS,
  FINAL_JSON,
  MANIFEST_PATH,
  METRIC_KEYS,
  ROOT,
  collectSrcFiles,
  findUninstrumented,
  formatMetric,
  pct,
  readCoverage,
} from './coverage-count.mjs';

const fail = (msg) => {
  console.log(`  ❌ ${msg}`);
  return false;
};

console.log('\n🔍 覆盖率基线门禁 check-coverage-baseline（逐文件棘轮）\n');

if (!existsSync(FINAL_JSON)) {
  fail(
    '缺少 coverage/coverage-final.json —— 本门禁只读本次现场产物，请先运行 ' +
      'pnpm run test:coverage',
  );
  process.exit(1);
}
if (!existsSync(BASELINE_PATH)) {
  fail(
    '缺少基线 scripts/coverage-baseline.json —— 基线是受版本控制的静态文件，' +
      '首次生成请运行 node scripts/coverage-baseline.mjs --update',
  );
  process.exit(1);
}
if (!existsSync(MANIFEST_PATH)) {
  fail('缺少冻结清单 scripts/coverage-uninstrumented.json');
  process.exit(1);
}

const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
const live = readCoverage(FINAL_JSON);

// ── 0. 产物新鲜度 ───────────────────────────────────────────
const artifactMtime = statSync(FINAL_JSON).mtimeMs;
const srcFiles = collectSrcFiles();
const newestSrc = srcFiles.reduce(
  (acc, f) => {
    const mtime = statSync(join(ROOT, f)).mtimeMs;
    return mtime > acc.mtime ? { file: f, mtime } : acc;
  },
  { file: '', mtime: 0 },
);

console.log(
  `  基线          ${baseline.updatedAt}（HEAD ${baseline.head?.slice(0, 8) ?? '(缺失)'}）`,
);
console.log(`  取值规则      ${baseline.rule}`);
console.log(`  现场产物      coverage/coverage-final.json`);
console.log(`  产物时间      ${new Date(artifactMtime).toISOString()}`);
console.log(`  最新源码      ${newestSrc.file}（${new Date(newestSrc.mtime).toISOString()}）`);

let ok = true;
if (artifactMtime < newestSrc.mtime) {
  ok = fail(
    '覆盖率产物早于最新源码（数据早于当前树）—— 请重跑 pnpm run test:coverage，' +
      '不要用旧产物下结论',
  );
}

// ── 1. 逐文件棘轮 ───────────────────────────────────────────
const baselineFiles = baseline.files ?? {};
const missing = Object.keys(baselineFiles).filter((f) => !(f in live.perFile));
const regressions = [];
let checkedFiles = 0;

for (const [file, expected] of Object.entries(baselineFiles)) {
  const actual = live.perFile[file];
  if (!actual) continue; // 已在上面的 missing 里单列
  checkedFiles += 1;
  const drops = [];
  for (const key of ENFORCED_KEYS) {
    if (actual[key].covered < expected[key].covered) {
      drops.push(`${key} ${expected[key].covered} → ${actual[key].covered}`);
    }
  }
  if (drops.length) regressions.push(`  ${file}  ${drops.join(' · ')}`);
}

if (missing.length) {
  ok = fail(
    `${missing.length} 个基线文件不在本次产物中（被删除或挤出插桩范围）：\n` +
      missing
        .slice(0, 20)
        .map((f) => `      ${f}`)
        .join('\n') +
      (missing.length > 20 ? `\n      …另有 ${missing.length - 20} 个` : ''),
  );
}
if (regressions.length) {
  ok = fail(
    `${regressions.length} 个文件的 covered 低于基线（逐文件棘轮）：\n` +
      regressions.slice(0, 20).join('\n') +
      (regressions.length > 20 ? `\n      …另有 ${regressions.length - 20} 个` : ''),
  );
} else if (missing.length === 0) {
  console.log(
    `  ✅ 判据 1 逐文件 ${checkedFiles} 个文件：statements / functions / lines 均不低于基线`,
  );
}

// ── 2. 全局棘轮 ─────────────────────────────────────────────
const globalDrops = [];
for (const key of ENFORCED_KEYS) {
  const b = baseline.global?.[key];
  const a = live.global[key];
  console.log(
    `  ${key.padEnd(10)} 现场 ${String(a.covered).padStart(6)}/${a.total}（${pct(a)}%）  基线 ${b.covered}/${b.total}`,
  );
  if (!b || a.covered < b.covered) {
    globalDrops.push(`${key} 基线 ${b?.covered ?? '(缺失)'} → 现场 ${a.covered}`);
  }
}
if (globalDrops.length) {
  ok = fail(`全局 covered 低于基线：\n      ${globalDrops.join('\n      ')}`);
} else {
  console.log('  ✅ 判据 2 全局 covered 不低于基线');
}

// ── 3. 未插桩集合 ───────────────────────────────────────────
const liveUninstrumented = findUninstrumented(live.perFile);
const baselineSet = new Set(baseline.uninstrumented ?? []);
const manifestSet = new Set((manifest.files ?? []).map((e) => e.file));

console.log(
  `  未插桩        现场 ${liveUninstrumented.length} 条 / 基线 ${baselineSet.size} 条 / 冻结清单 ${manifestSet.size} 条`,
);

const newUninstrumented = liveUninstrumented.filter((f) => !baselineSet.has(f));
if (newUninstrumented.length) {
  ok = fail(
    `未插桩集合新增成员（不允许整体不插桩）：\n      ` + newUninstrumented.join('\n      '),
  );
} else {
  console.log('  ✅ 判据 3 未插桩集合未新增成员');
}

const baselineVsManifest = [
  ...[...baselineSet].filter((f) => !manifestSet.has(f)),
  ...[...manifestSet].filter((f) => !baselineSet.has(f)),
];
if (baselineVsManifest.length) {
  ok = fail(
    '基线与冻结清单不一致（禁止单改一侧；变更冻结集合需显式 --update）：\n      ' +
      baselineVsManifest.join('\n      '),
  );
}

// ── 4. branches：仅信息项 ───────────────────────────────────
const branchBaseline = baseline.global?.branches;
const branchLive = live.global.branches;
console.log(
  `  ℹ️ branches（不参与判据）现场 ${formatMetric('', branchLive).trim()} · ` +
    `基线 ${branchBaseline ? formatMetric('', branchBaseline).trim() : '(缺失)'}`,
);

// ── 汇总 ────────────────────────────────────────────────────
console.log(
  `\n  指标口径      ${baseline.basis?.authoritative ?? '(缺失)'}：${baseline.basis?.authoritativeLabel ?? ''}`,
);
if (baseline.basis?.authoritative !== 'vitest-thresholds') {
  ok = fail('基线 basis.authoritative 非法（应为 vitest-thresholds，见 coverage-basis.mjs）');
}
console.log(`  参与判据      ${METRIC_KEYS.filter((k) => k !== 'branches').join(' / ')}`);
console.log(`  branches      informational（见 ADR 0034）`);

console.log(ok ? '\n✅ check-coverage-baseline 通过\n' : '\n❌ check-coverage-baseline 失败\n');
process.exit(ok ? 0 : 1);
