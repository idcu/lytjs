/**
 * 覆盖率计数的**单一实现**（基线与校验共用）。
 *
 * ## 为什么单独一个模块
 *
 * 生成侧（`coverage-baseline.mjs --update`）与校验侧（`check-coverage-baseline.mjs`）
 * 必须用**同一套**计数规则，否则「基线里的数」和「现场比对的数」口径漂移，
 * 门禁就会在无关紧要的地方红/绿。这里只做纯读取 + 计数，不写任何文件。
 *
 * ## 计数口径（与 v8→istanbul 产物字段一一对应）
 *
 *   · statements —— `s` 的条目数 / 命中数
 *   · functions  —— `f` 的条目数 / 命中数
 *   · lines      —— 按 `statementMap[*].start.line` 去重，同一行任一语句命中即该行覆盖
 *   · branches   —— `b` 的每个数组元素逐个累加（★ 不参与判据，见 ADR 0034）
 *
 * branches 单独说明：两次同码树运行的分支分母与命中数都会抖动（`branchMap` 行号移位、
 * 分支数 ±5），因此它只作为信息项记录，任何比较都不得据此判红。
 */

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const FINAL_JSON = join(ROOT, 'coverage', 'coverage-final.json');
export const BASELINE_PATH = join(ROOT, 'scripts', 'coverage-baseline.json');
export const MANIFEST_PATH = join(ROOT, 'scripts', 'coverage-uninstrumented.json');

export const METRIC_KEYS = ['statements', 'functions', 'lines', 'branches'];

/** 参与判据的指标（branches 不参与） */
export const ENFORCED_KEYS = ['statements', 'functions', 'lines'];

const emptyMetric = () => ({ covered: 0, total: 0 });

export function createMetrics() {
  return {
    statements: emptyMetric(),
    functions: emptyMetric(),
    lines: emptyMetric(),
    branches: emptyMetric(),
  };
}

/** 对 coverage-final.json 的单个文件条目计数。 */
export function countEntry(entry) {
  const m = createMetrics();

  for (const hit of Object.values(entry.s ?? {})) {
    m.statements.total += 1;
    if (hit > 0) m.statements.covered += 1;
  }

  for (const hit of Object.values(entry.f ?? {})) {
    m.functions.total += 1;
    if (hit > 0) m.functions.covered += 1;
  }

  for (const hits of Object.values(entry.b ?? {})) {
    for (const hit of hits) {
      m.branches.total += 1;
      if (hit > 0) m.branches.covered += 1;
    }
  }

  const lineHits = new Map();
  for (const [id, loc] of Object.entries(entry.statementMap ?? {})) {
    const line = loc.start.line;
    const hit = entry.s?.[id] ?? 0;
    lineHits.set(line, Math.max(lineHits.get(line) ?? 0, hit));
  }
  for (const hit of lineHits.values()) {
    m.lines.total += 1;
    if (hit > 0) m.lines.covered += 1;
  }

  return m;
}

/**
 * 读取 `coverage/coverage-final.json`，返回逐文件指标与全局合计。
 * `perFile` 的键是从仓库根算起的相对路径。
 */
export function readCoverage(finalJsonPath = FINAL_JSON) {
  const raw = JSON.parse(readFileSync(finalJsonPath, 'utf-8'));
  const perFile = {};
  const global = createMetrics();

  for (const [absPath, entry] of Object.entries(raw)) {
    const rel = relative(ROOT, absPath);
    const m = countEntry(entry);
    perFile[rel] = m;
    for (const key of METRIC_KEYS) {
      global[key].covered += m[key].covered;
      global[key].total += m[key].total;
    }
  }

  return { perFile, global };
}

/** 收集全部 src 下的 TypeScript 源文件（排除测试与声明文件），与覆盖率 include 的分母对齐。 */
export function collectSrcFiles(dir = join(ROOT, 'packages'), acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', 'dist', 'coverage', '.tmp'].includes(entry.name)) continue;
      collectSrcFiles(full, acc);
      continue;
    }
    if (!entry.name.endsWith('.ts')) continue;
    if (
      entry.name.endsWith('.d.ts') ||
      entry.name.endsWith('.test.ts') ||
      entry.name.endsWith('.spec.ts')
    ) {
      continue;
    }
    if (!/[\\/]src[\\/]/.test(full)) continue;
    acc.push(relative(ROOT, full));
  }
  return acc;
}

/** src 文件里未被 coverage-final.json 收录（未插桩）的集合。 */
export function findUninstrumented(perFile) {
  const instrumented = new Set(Object.keys(perFile));
  return collectSrcFiles()
    .filter((f) => !instrumented.has(f))
    .sort();
}

export function pct(metric) {
  if (metric.total === 0) return '—';
  return ((metric.covered / metric.total) * 100).toFixed(3);
}

export function formatMetric(name, metric) {
  return `${name} ${metric.covered}/${metric.total}（${pct(metric)}%）`;
}
