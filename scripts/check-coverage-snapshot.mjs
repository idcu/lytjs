#!/usr/bin/env node
/**
 * 门禁：覆盖率快照的时效性与覆盖面（A11）
 *
 * ## 为什么需要这一项
 *
 * 覆盖率是唯一一个「跑一次要两分钟」的指标，因此天然容易被搁置。
 * 2026-11-05 评估时，仓库里的覆盖率快照**无法追溯**：
 * `coverage/` 被 `.gitignore` 忽略，没人知道它对应哪个提交、覆盖了哪些文件，
 * 而「覆盖率 xx%」还被写进各种汇报。这类数字一旦失去因果，就会变成长期摆设。
 *
 * 本门禁对**受版本控制**的快照 `scripts/coverage-snapshot.json` 断言四件事：
 *
 * 1. 快照里的 commit 在仓库里真实存在（不是手写的假 sha）；
 * 2. 该提交距今不超过 7 天（否则「覆盖率」描述的是旧代码）；
 * 3. 快照列出的文件集合 == 当前仓库的全部 src 文件（新增文件必须补快照，
 *    否则分母被悄悄放大而结论不变）；
 * 4. 已插桩比例 ≥ 阈值（默认 97.5%）——「已插桩」= 出现在覆盖率的文件集合里，
 *    口径与评估报告的「437/448 文件」一致；**不是**「语句执行率」（那个是另一个指标）。
 *
 * ## 为什么不是「重新跑一遍覆盖率」
 *
 * 重跑要 100 秒以上，属于慢档。这里只校验快照的**元数据与覆盖面**，
 * 把「真实重跑」留给 `gate --tier slow` 的 `test:coverage`；
 * 两者配合才完整：慢档负责「数字是真的」，本门禁负责「数字不过期」。
 *
 * ## 用法
 *
 *   node scripts/check-coverage-snapshot.mjs
 *
 * 退出码：0 = 通过；1 = 有失败。
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SNAPSHOT_PATH = join(ROOT, 'scripts', 'coverage-snapshot.json');
const MAX_AGE_DAYS = 7;

const fail = (msg) => {
  console.log(`  ❌ ${msg}`);
  return false;
};

console.log('\n🔍 覆盖率快照 check-coverage-snapshot\n');

if (!existsSync(SNAPSHOT_PATH)) {
  console.log(
    fail('缺少 scripts/coverage-snapshot.json —— 运行 node scripts/coverage-snapshot.mjs'),
  );
  process.exit(1);
}

const snapshot = JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf8'));
let ok = true;

// ── 1. commit 真实存在 ────────────────────────────────────────
let commitDate = null;
try {
  execFileSync('git', ['cat-file', '-e', `${snapshot.commit}^{commit}`], { cwd: ROOT });
  commitDate = new Date(
    execFileSync('git', ['show', '-s', '--format=%cI', snapshot.commit], {
      cwd: ROOT,
      encoding: 'utf8',
    }).trim(),
  );
  console.log(`  commit          ${snapshot.commit}（${commitDate.toISOString()}）`);
} catch {
  ok = fail(`快照里的 commit ${snapshot.commit} 在仓库中不存在（快照被手改过？）`);
}

// ── 2. 时效性 ────────────────────────────────────────────────
if (commitDate) {
  const ageDays = (Date.now() - commitDate.getTime()) / 86400000;
  console.log(`  快照年龄        ${ageDays.toFixed(1)} 天（上限 ${MAX_AGE_DAYS} 天）`);
  if (ageDays > MAX_AGE_DAYS) {
    ok = fail(
      `快照落后 ${ageDays.toFixed(1)} 天（> ${MAX_AGE_DAYS}）—— 重新跑 test:coverage 并生成快照`,
    );
  }
}

// ── 3. 文件集合一致 ──────────────────────────────────────────
function collectSrcFiles(dir, acc = []) {
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

const currentFiles = collectSrcFiles(join(ROOT, 'packages')).sort();
const snapshotFiles = Object.keys(snapshot.files ?? {});
const currentSet = new Set(currentFiles);
const snapshotSet = new Set(snapshotFiles);

const added = currentFiles.filter((f) => !snapshotSet.has(f));
const removed = snapshotFiles.filter((f) => !currentSet.has(f));

console.log(`  src 文件        ${currentFiles.length}（快照 ${snapshotFiles.length}）`);
if (added.length > 0) {
  ok = fail(
    `${added.length} 个 src 文件不在快照里（新增文件必须重新生成快照）：${added.slice(0, 5).join(', ')}${added.length > 5 ? ' …' : ''}`,
  );
}
if (removed.length > 0) {
  ok = fail(
    `${removed.length} 个快照文件已从仓库删除：${removed.slice(0, 5).join(', ')}${removed.length > 5 ? ' …' : ''}`,
  );
}

// ── 4. 覆盖比例 ──────────────────────────────────────────────
const covered = snapshotFiles.filter((f) => snapshot.files[f]).length;
const ratio = snapshotFiles.length > 0 ? covered / snapshotFiles.length : 0;
const threshold = typeof snapshot.threshold === 'number' ? snapshot.threshold : 0.975;
console.log(
  `  已插桩          ${covered}/${snapshotFiles.length}（${(ratio * 100).toFixed(2)}%，阈值 ${(threshold * 100).toFixed(1)}%）`,
);
if (ratio < threshold) {
  ok = fail(
    `已插桩比例 ${(ratio * 100).toFixed(2)}% 低于阈值 ${(threshold * 100).toFixed(1)}% —— 覆盖率出现回退`,
  );
}

// ── 5. 口径声明（N01 / ADR 0028）────────────────────────────
// 防止「已插桩文件口径 87.9%」被当成「全仓覆盖率」对外引用。
// 真相源在 scripts/coverage-basis.mjs，生成侧与校验侧共用同一份常量。
const { COVERAGE_BASIS, VALID_AUTHORITATIVE } = await import('./coverage-basis.mjs');
const declared = snapshot.basis;
console.log(`  口径声明        ${declared?.authoritative ?? '(缺失)'}`);
if (!declared || !VALID_AUTHORITATIVE.includes(declared.authoritative)) {
  ok = fail(
    `快照缺少合法 basis.authoritative（应为 ${VALID_AUTHORITATIVE.join(' / ')}）—— 重新运行 node scripts/coverage-snapshot.mjs`,
  );
} else {
  if (
    declared.authoritative !== COVERAGE_BASIS.authoritative ||
    declared.rule !== COVERAGE_BASIS.rule
  ) {
    ok = fail('快照口径声明与 scripts/coverage-basis.mjs 真相源不一致（禁止手改快照）');
  }
  console.log(`  对外口径        ${COVERAGE_BASIS.authoritativeLabel}`);
  console.log(`  辅助口径        ${COVERAGE_BASIS.auxiliaryLabel}`);
}

console.log(ok ? '\n✅ check-coverage-snapshot 通过\n' : '\n❌ check-coverage-snapshot 失败\n');
process.exit(ok ? 0 : 1);
