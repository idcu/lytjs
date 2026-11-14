#!/usr/bin/env node
/**
 * 覆盖率基线生成器（ADR 0034）
 *
 * ★ 基线是**受版本控制的静态文件** `scripts/coverage-baseline.json`，
 *   只有显式 `--update` 才会写入，且写入前必须人工确认。
 *   门禁档内**不存在**「生成基线 → 校验基线」的组合 —— 那是拿产物跟自己比。
 *
 * ## 判据（由 check-coverage-baseline.mjs 执行）
 *
 *   1. 逐文件 statements.covered ≥ 基线值
 *   2. 全局 statements.covered ≥ 基线值
 *   3. 未插桩文件集合不新增成员（冻结清单 scripts/coverage-uninstrumented.json）
 *   functions / lines 同步执行；branches 只记录、不参与判据（见 ADR 0034）。
 *
 * ## 取值规则：三次运行取逐文件最小值（下界），不设人为容差
 *
 *   容差会掩盖真实下降；下界只防「单次抖动向上」。做法是连跑三次
 *   `test:coverage`，逐文件对 statements / functions / lines 的 covered 取最小值。
 *   代价：覆盖率提升不会自动入账，必须显式 `--update` —— 这是有意的，
 *   否则数字自然上涨会让棘轮失效。
 *
 * ## 用法
 *
 *   node scripts/coverage-baseline.mjs --update
 *
 * 退出码：0 = 已写入；1 = 拒绝写入（工作树脏 / 运行失败 / 未确认）。
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
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

const RUNS = 3;

function refuse(msg) {
  console.error(`\n❌ 拒绝写入覆盖率基线：${msg}\n`);
  process.exit(1);
}

function runCoverage(index) {
  console.log(`\n▶ 第 ${index}/${RUNS} 次 test:coverage（基线取值来源）`);
  const r = spawnSync('corepack', ['pnpm', 'run', 'test:coverage'], {
    cwd: ROOT,
    stdio: 'inherit',
    env: process.env,
  });
  if (r.status !== 0) {
    refuse(`第 ${index} 次 test:coverage 未通过（退出码 ${r.status}）—— 基线只能来自全绿的运行`);
  }
  return readCoverage(FINAL_JSON);
}

function metricLine(name, metric) {
  return `${name.padEnd(10)} ${String(metric.covered).padStart(6)}/${String(metric.total).padEnd(6)} ${pct(metric)}%`;
}

/** 逐文件、全局合并三次运行：covered 取最小值，total 取最大值（更保守的分母）。 */
function mergeRuns(runs) {
  const files = Object.keys(runs[0].perFile).sort();
  for (const run of runs.slice(1)) {
    const missing = files.filter((f) => !(f in run.perFile));
    const extra = Object.keys(run.perFile).filter((f) => !files.includes(f));
    if (missing.length || extra.length) {
      refuse(
        `三次运行的插桩文件集合不一致（缺失 ${missing.length} / 新增 ${extra.length}）—— ` +
          '这是产物层的非确定性，不能用取 min 掩盖，请先查清',
      );
    }
  }

  const perFile = {};
  for (const file of files) {
    perFile[file] = {};
    for (const key of METRIC_KEYS) {
      perFile[file][key] = {
        covered: Math.min(...runs.map((r) => r.perFile[file][key].covered)),
        total: Math.max(...runs.map((r) => r.perFile[file][key].total)),
      };
    }
  }

  const global = {};
  for (const key of METRIC_KEYS) {
    global[key] = {
      covered: Math.min(...runs.map((r) => r.global[key].covered)),
      total: Math.max(...runs.map((r) => r.global[key].total)),
    };
  }
  return { perFile, global };
}

/**
 * 三次运行之间逐文件 covered 的抖动。
 * 这是「取 min」能挡住什么、挡不住什么的证据：某文件若在三次运行里相差 ≥1，
 * 它的一次 1 点真实下降可能被向上抖动掩盖 —— 必须如实记录，不允许用容差抹平。
 */
function collectJitter(runs, srcSet) {
  const jitter = {};
  for (const key of METRIC_KEYS) {
    const entries = [];
    for (const file of Object.keys(runs[0].perFile)) {
      if (!srcSet.has(file)) continue;
      const values = runs.map((r) => r.perFile[file][key].covered);
      if (new Set(values).size > 1) entries.push({ file, values });
    }
    if (entries.length) jitter[key] = entries;
  }
  return jitter;
}

function printDiff(before, after) {
  const beforeFiles = before?.files ?? {};
  const afterFiles = after.files;

  console.log('\n── 全局 ───────────────────────────────────────────────');
  for (const key of METRIC_KEYS) {
    const b = before?.global?.[key];
    const a = after.global[key];
    const delta = b ? a.covered - b.covered : a.covered;
    const tag = key === 'branches' ? '（信息项，不参与判据）' : '';
    console.log(`  ${metricLine(key, a)}  Δcovered ${delta >= 0 ? '+' : ''}${delta}${tag}`);
  }

  const addedSections = [];
  const droppedSections = [];
  const totalChanged = [];

  for (const [file, metrics] of Object.entries(afterFiles)) {
    const old = beforeFiles[file];
    if (!old) {
      addedSections.push(
        `  + ${file}  ${ENFORCED_KEYS.map((k) => `${k} ${metrics[k].covered}/${metrics[k].total}`).join(' · ')}`,
      );
      continue;
    }
    const ups = [];
    const downs = [];
    for (const key of METRIC_KEYS) {
      const d = metrics[key].covered - old[key].covered;
      if (d > 0) ups.push(`${key} +${d}`);
      if (d < 0) downs.push(`${key} ${d}`);
      if (metrics[key].total !== old[key].total && key !== 'branches') {
        totalChanged.push(`  ~ ${file}  ${key}.total ${old[key].total} → ${metrics[key].total}`);
      }
    }
    if (downs.length) droppedSections.push(`  - ${file}  ${downs.join(' · ')}`);
    if (ups.length) addedSections.push(`  + ${file}  ${ups.join(' · ')}`);
  }

  for (const file of Object.keys(beforeFiles)) {
    if (!(file in afterFiles)) {
      droppedSections.push(`  - ${file}  （文件已删除或不再插桩）`);
    }
  }

  console.log('\n── 逐文件下降 ─────────────────────────────────────────');
  console.log(droppedSections.length ? droppedSections.join('\n') : '  （无）');
  console.log('\n── 逐文件新增覆盖 ─────────────────────────────────────');
  console.log(addedSections.length ? addedSections.join('\n') : '  （无）');
  console.log('\n── 文件增删（含分母变化）──────────────────────────────');
  console.log(totalChanged.length ? totalChanged.join('\n') : '  （无）');

  console.log('\n── 未插桩集合 ─────────────────────────────────────────');
  const beforeSet = new Set(before?.uninstrumented ?? []);
  const afterSet = new Set(after.uninstrumented);
  const addedUninstrumented = after.uninstrumented.filter((f) => !beforeSet.has(f));
  const removedUninstrumented = [...beforeSet].filter((f) => !afterSet.has(f));
  console.log(`  当前未插桩 ${after.uninstrumented.length} 条`);
  console.log(
    addedUninstrumented.length
      ? `  新增未插桩（不得入基线，先修）：\n${addedUninstrumented.map((f) => `  + ${f}`).join('\n')}`
      : '  新增未插桩：无',
  );
  console.log(
    removedUninstrumented.length
      ? `  移出未插桩（已插桩）：\n${removedUninstrumented.map((f) => `  - ${f}`).join('\n')}`
      : '  移出未插桩：无',
  );
}

async function askConfirmation() {
  if (!process.stdin.isTTY) {
    console.log('\n（stdin 不是 TTY：无法交互确认。请手工输入 yes，或在终端里重跑）');
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise((res) =>
    rl.question('\n以上 diff 是否落盘为基线？输入 yes 确认：', res),
  );
  rl.close();
  return answer.trim() === 'yes';
}

async function main() {
  if (!process.argv.includes('--update')) {
    console.error(
      '用法：node scripts/coverage-baseline.mjs --update\n\n' +
        '基线只能通过 --update 显式写入（连跑三次 test:coverage 取逐文件最小值）。\n' +
        '日常校验用：node scripts/check-coverage-baseline.mjs',
    );
    process.exit(1);
  }

  const dirty = execFileSync('git', ['status', '--porcelain', '--', 'packages'], {
    cwd: ROOT,
    encoding: 'utf8',
  }).trim();
  if (dirty) {
    refuse(`packages/ 下有未提交改动，基线不得来自一棵只存在于工作树的树：\n${dirty}`);
  }
  if (!existsSync(MANIFEST_PATH)) refuse('缺少冻结清单 scripts/coverage-uninstrumented.json');

  const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
  const runs = [];
  for (let i = 1; i <= RUNS; i += 1) {
    runs.push(runCoverage(i));
    console.log(
      `  本次总数：${METRIC_KEYS.map((k) => formatMetric(k, runs[i - 1].global[k])).join(' | ')}`,
    );
  }

  const merged = mergeRuns(runs);
  const uninstrumented = findUninstrumented(merged.perFile);
  const srcSet = new Set(collectSrcFiles());
  const jitter = collectJitter(runs, srcSet);
  merged.perFile = Object.fromEntries(
    Object.entries(merged.perFile).filter(([file]) => srcSet.has(file)),
  );
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
  const frozen = new Set((manifest.files ?? []).map((e) => e.file));
  const outside = uninstrumented.filter((f) => !frozen.has(f));
  if (outside.length) {
    refuse(
      `实测未插桩集合出现冻结清单之外的成员（先修覆盖率，不写基线）：\n  ${outside.join('\n  ')}`,
    );
  }

  const { COVERAGE_BASIS } = await import('./coverage-basis.mjs');
  for (const metrics of Object.values(merged.perFile)) {
    metrics.branches.informational = true;
  }
  merged.global.branches.informational = true;

  const baseline = {
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    head,
    rule:
      '逐文件 covered 取三次 test:coverage 运行的最小值（下界，不设容差）；' +
      'branches 只记录、不参与判据；提升需显式 --update 才会入账',
    runs: runs.map((run, i) => ({
      run: i + 1,
      ...Object.fromEntries(METRIC_KEYS.map((k) => [k, run.global[k]])),
    })),
    global: merged.global,
    files: merged.perFile,
    jitter,
    uninstrumented,
    basis: COVERAGE_BASIS,
  };

  const before = existsSync(BASELINE_PATH) ? JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) : null;
  printDiff(before, baseline);

  console.log('\n── 三次运行总数（证明下界不是拍出来的）──────────────');
  for (const run of baseline.runs) {
    console.log(`  run${run.run}: ${METRIC_KEYS.map((k) => formatMetric(k, run[k])).join(' | ')}`);
  }

  console.log('\n── 三次运行逐文件抖动（取 min 的边界）────────────────');
  for (const key of METRIC_KEYS) {
    const entries = jitter[key] ?? [];
    const tag = key === 'branches' ? '（不参与判据）' : '';
    console.log(`  ${key}: ${entries.length} 个文件${tag}`);
    for (const entry of entries.slice(0, 20)) {
      console.log(`    ${entry.file}  ${entry.values.join(' → ')}`);
    }
    if (entries.length > 20) console.log(`    …另有 ${entries.length - 20} 个`);
  }
  const enforcedJitter = ENFORCED_KEYS.filter((k) => (jitter[k] ?? []).length > 0);
  if (enforcedJitter.length) {
    console.log(
      `\n⚠️ ${enforcedJitter.join(' / ')} 存在逐文件抖动：这些文件的 1 点真实下降` +
        '可能被单次向上抖动掩盖（ADR 0034 记录的边界，禁止用容差抹平）',
    );
  }

  if (!(await askConfirmation())) {
    console.log('\n未确认，基线未写入。');
    process.exit(1);
  }

  writeFileSync(BASELINE_PATH, `${JSON.stringify(baseline, null, 2)}\n`);
  // 落盘后立刻按仓库 prettier 规则格式化：`JSON.stringify` 会把短数组拆成多行，
  // 直接进版本控制会让 `format:check` 变红（不是判据红，是格式红，2026-11-15 实测）。
  const prettierBin = resolve(ROOT, 'node_modules/.bin/prettier');
  if (existsSync(prettierBin)) {
    execFileSync(prettierBin, ['--write', BASELINE_PATH], { stdio: 'ignore' });
  }
  console.log(
    `\n✅ 基线已写入 scripts/coverage-baseline.json（${Object.keys(merged.perFile).length} 个文件）\n`,
  );
}

await main();
