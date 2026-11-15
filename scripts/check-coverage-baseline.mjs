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
 *   1. 逐文件 covered ≥ 基线 covered − max(0, 基线 total − 现场 total)
 *   2. 全局   covered ≥ 基线 covered − max(0, 基线 total − 现场 total)
 *      （statements / functions / lines；ADR 0034 2026-11-15 修订）
 *   3. 未插桩文件集合不新增成员；基线与冻结清单
 *      `scripts/coverage-uninstrumented.json` 保持一致（现有 7 条保持）
 *   4. 产物必须晚于最新源码（防止拿旧产物冒充本次结论）
 *
 *   ## 这条判据防什么
 *
 *   防的是「覆盖被削弱」，**不是**「绝对数只能涨」：
 *     · 删死代码 ⇒ total 与 covered 同步下降 ⇒ 通过（正例：cli/run.ts 104/104 → 91/91）；
 *     · 删测试 / 已覆盖语句失去覆盖 ⇒ total 不变、covered 下降 ⇒ 红；
 *     · 新增未覆盖代码 ⇒ total 上升、allowance 为 0、covered 持平 ⇒ 通过，
 *       但**比例下降必须显式打印**（不算红，不能不可见）。
 *   不允许改成「比例不低于基线」——那会让新增未覆盖代码永远合法。
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
    '缺少 coverage/coverage-final.json —— 本门禁只读本次现场产物。两种常见原因：' +
      '① 测试自己挂了（vitest 默认 coverage.reportOnFailure=false，失败即不落产物，' +
      '此时重跑 test:coverage 仍会挂）；② 覆盖率根本没跑。先看 pnpm run test:coverage ' +
      '的退出码与用例数；若要区分两者，可用 ' +
      'vitest run --coverage --coverage.reportOnFailure=true 强制出产物再判',
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
const fileAllowances = [];
const fileRatioDrops = [];
let checkedFiles = 0;

for (const [file, expected] of Object.entries(baselineFiles)) {
  const actual = live.perFile[file];
  if (!actual) continue; // 已在上面的 missing 里单列
  checkedFiles += 1;
  const drops = [];
  for (const key of ENFORCED_KEYS) {
    // 允许下限：删掉的 total 等于「本来就不可能再被覆盖」的部分，covered 可以同步下降。
    // 删测试 / 丢覆盖时 total 不变，allowance 为 0，covered 一降就红。
    const allowance = Math.max(0, expected[key].total - actual[key].total);
    const floor = expected[key].covered - allowance;
    if (actual[key].covered < floor) {
      drops.push(`${key} ${expected[key].covered} → ${actual[key].covered}（允许下限 ${floor}）`);
    } else if (allowance > 0) {
      fileAllowances.push(
        `  ${file}  ${key} ${expected[key].covered}/${expected[key].total} → ` +
          `${actual[key].covered}/${actual[key].total}（允许下限 ${floor}）`,
      );
    }
    // 新增未覆盖代码：total 上升、covered 持平 ⇒ 不判红，但比例下降必须可见。
    if (
      actual[key].total > expected[key].total &&
      Number(pct(actual[key])) < Number(pct(expected[key]))
    ) {
      fileRatioDrops.push(
        `  ${file}  ${key} ${pct(expected[key])}% → ${pct(actual[key])}%` +
          `（covered ${expected[key].covered} → ${actual[key].covered}，` +
          `total ${expected[key].total} → ${actual[key].total}）`,
      );
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
    `  ✅ 判据 1 逐文件 ${checkedFiles} 个文件：statements / functions / lines ` +
      '均不低于「基线 − max(0, 基线 total − 现场 total)」',
  );
}
if (fileAllowances.length) {
  console.log(`  ℹ️ 删码修正 ${fileAllowances.length} 处（total 与 covered 同步下降，不判红）：`);
  for (const line of fileAllowances.slice(0, 10)) console.log(line);
  if (fileAllowances.length > 10) console.log(`      …另有 ${fileAllowances.length - 10} 处`);
}
if (fileRatioDrops.length) {
  console.log(`  ℹ️ 比例下降（不判红，仅可见）${fileRatioDrops.length} 处：`);
  for (const line of fileRatioDrops.slice(0, 10)) console.log(line);
  if (fileRatioDrops.length > 10) console.log(`      …另有 ${fileRatioDrops.length - 10} 处`);
}

// ── 2. 全局棘轮 ─────────────────────────────────────────────
const globalDrops = [];
const globalRatioDrops = [];
for (const key of ENFORCED_KEYS) {
  const b = baseline.global?.[key];
  const a = live.global[key];
  const allowance = b ? Math.max(0, b.total - a.total) : 0;
  const floor = b ? b.covered - allowance : Infinity;
  console.log(
    `  ${key.padEnd(10)} 现场 ${String(a.covered).padStart(6)}/${a.total}（${pct(a)}%）  ` +
      `基线 ${b?.covered ?? '(缺失)'}/${b?.total ?? '(缺失)'}  允许下限 ${Number.isFinite(floor) ? floor : '(缺失)'}`,
  );
  if (!b || a.covered < floor) {
    globalDrops.push(
      `${key} 基线 ${b?.covered ?? '(缺失)'}/${b?.total ?? '(缺失)'} → 现场 ` +
        `${a.covered}/${a.total}（允许下限 ${Number.isFinite(floor) ? floor : '(缺失)'}）`,
    );
  } else if (a.total > b.total && Number(pct(a)) < Number(pct(b))) {
    globalRatioDrops.push(
      `${key} ${pct(b)}% → ${pct(a)}%（covered ${b.covered} → ${a.covered}，` +
        `total ${b.total} → ${a.total}）`,
    );
  }
}
if (globalDrops.length) {
  ok = fail(`全局 covered 低于按删码修正后的下限：\n      ${globalDrops.join('\n      ')}`);
} else {
  console.log('  ✅ 判据 2 全局 covered 不低于「基线 − max(0, 基线 total − 现场 total)」');
}
if (globalRatioDrops.length) {
  console.log(`  ℹ️ 全局比例下降（不判红，仅可见）：${globalRatioDrops.join('；')}`);
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
