#!/usr/bin/env node
/**
 * 覆盖率快照生成器（A11，2026-11-14 判据口径变更）
 *
 * ## 与旧版的关键差异
 *
 * 旧版把一次覆盖率运行的结果固化到**受版本控制**的 `scripts/coverage-snapshot.json`，
 * 并且无论产物多旧都把**当前** HEAD 写进快照 ⇒ 门禁读到的 commit 永远等于 HEAD，
 * 「快照过期」这件事从判据上消失了。
 *
 * 现在快照写在 gitignore 的 `coverage/snapshot.json`，只记录**现场产物**的两个指纹：
 *
 *   · coverageSha256 —— 本次 `coverage/coverage-final.json` 的 sha256
 *   · commit         —— 生成时刻的 `git rev-parse HEAD`
 *
 * 校验侧要求两者都与现场一致，因此快照不可能脱离这次运行独立存在。
 *
 * ## 拒绝写入的条件
 *
 * 以下任一成立即**拒绝写入**（退出 1），不产生任何"看起来新鲜"的元数据：
 *   1. `packages/` 下有未提交改动 —— 产物与 HEAD 不是同一棵树；
 *   2. 有 src 文件比覆盖率产物更新 —— 数据早于当前树；
 *   3. 覆盖率产物生成于 HEAD 提交之前 —— 数据早于当前提交；
 *   4. 实测未插桩集合 ≠ 冻结清单 scripts/coverage-uninstrumented.json。
 *
 * ## 用法
 *
 *   node scripts/coverage-snapshot.mjs
 *   node scripts/coverage-snapshot.mjs --coverage-dir=/tmp/coverage
 */

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST_PATH = join(ROOT, 'scripts', 'coverage-uninstrumented.json');

const argDir = process.argv.find((a) => a.startsWith('--coverage-dir='))?.split('=')[1];
const coverageDir = argDir ? resolve(ROOT, argDir) : join(ROOT, 'coverage');
const finalJson = join(coverageDir, 'coverage-final.json');
const snapshotPath = join(coverageDir, 'snapshot.json');

/** 收集全部 src 下的 TypeScript 源文件（排除测试与声明文件） */
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

function refuse(msg) {
  console.error(`\n❌ 拒绝写入覆盖率快照：${msg}\n`);
  console.error('   覆盖率数据必须来自当前工作树的现场产物，请重跑：');
  console.error('   pnpm run test:coverage -- --maxWorkers=2\n');
  process.exit(1);
}

if (!existsSync(finalJson)) {
  console.error(`❌ 找不到覆盖率产物：${relative(ROOT, finalJson)}`);
  console.error('   请先运行：pnpm run test:coverage -- --maxWorkers=2');
  process.exit(1);
}
if (!existsSync(MANIFEST_PATH)) {
  console.error(`❌ 找不到冻结清单：${relative(ROOT, MANIFEST_PATH)}`);
  process.exit(1);
}

const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
const commitTime = new Date(
  execFileSync('git', ['show', '-s', '--format=%cI', 'HEAD'], {
    cwd: ROOT,
    encoding: 'utf8',
  }).trim(),
);

// ── 拒绝条件 1：工作树与 HEAD 不一致 ─────────────────────────
const dirty = execFileSync('git', ['status', '--porcelain', '--', 'packages'], {
  cwd: ROOT,
  encoding: 'utf8',
}).trim();
if (dirty) {
  refuse(
    `packages/ 下有未提交改动，覆盖率产物无法绑定到 ${commit}：\n${dirty
      .split('\n')
      .slice(0, 5)
      .join('\n')}`,
  );
}

const srcFiles = collectSrcFiles(join(ROOT, 'packages')).sort();
const artifactMtime = statSync(finalJson).mtimeMs;

// ── 拒绝条件 2：数据早于当前树 ───────────────────────────────
const newestSrc = srcFiles.reduce((max, f) => Math.max(max, statSync(join(ROOT, f)).mtimeMs), 0);
if (newestSrc > artifactMtime) {
  refuse('有 src 文件比覆盖率产物更新（数据早于当前树）');
}

// ── 拒绝条件 3：数据早于当前提交 ─────────────────────────────
if (artifactMtime < commitTime.getTime()) {
  refuse(`覆盖率产物生成于当前提交 ${commit} 之前（${commitTime.toISOString()}）`);
}

// ── 拒绝条件 4：未插桩集合偏离冻结清单 ───────────────────────
const coverageBytes = readFileSync(finalJson);
const coverage = JSON.parse(coverageBytes.toString('utf8'));
const instrumented = new Set(Object.keys(coverage).map((p) => relative(ROOT, p)));
const uninstrumented = srcFiles.filter((f) => !instrumented.has(f)).sort();

const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
const frozen = new Set((manifest.files ?? []).map((e) => e.file));
const outside = uninstrumented.filter((f) => !frozen.has(f));
const staleEntries = [...frozen].filter((f) => !uninstrumented.includes(f));
if (outside.length > 0) {
  refuse(`出现冻结清单之外的未插桩文件：\n  ${outside.join('\n  ')}`);
}
if (staleEntries.length > 0) {
  refuse(`冻结清单里的文件已不再是未插桩状态，请更新清单：\n  ${staleEntries.join('\n  ')}`);
}

// ── 写入现场快照 ─────────────────────────────────────────────
const coverageSha256 = createHash('sha256').update(coverageBytes).digest('hex');
// 口径声明取单一真相源（N01 / ADR 0028）：生成侧与校验侧共用，禁止两处各写一遍。
const { COVERAGE_BASIS } = await import('./coverage-basis.mjs');
const snapshot = {
  commit,
  coverageSha256,
  generatedAt: new Date().toISOString(),
  uninstrumented,
  basis: COVERAGE_BASIS,
};
writeFileSync(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`);

console.log('覆盖率快照已生成（现场产物口径）\n');
console.log(`  commit          ${commit}`);
console.log(`  产物 sha256     ${coverageSha256}`);
console.log(`  src 文件        ${srcFiles.length}`);
console.log(`  已插桩          ${srcFiles.length - uninstrumented.length}`);
console.log(`  未插桩          ${uninstrumented.length}（全部在冻结清单内）`);
console.log(`  写入            ${relative(ROOT, snapshotPath)}\n`);
