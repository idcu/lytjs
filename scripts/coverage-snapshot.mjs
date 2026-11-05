#!/usr/bin/env node
/**
 * 覆盖率快照生成器（A11）
 *
 * 覆盖率产物 `coverage/coverage-final.json` 被 `.gitignore` 忽略，
 * 所以「覆盖率到底覆盖了哪些文件」在仓库里没有任何可追溯记录 ——
 * 快照可能停留在几周前，而所有门禁照样绿。
 *
 * 本脚本把一次真实覆盖率运行的结果固化成**受版本控制**的快照：
 *
 *   node scripts/coverage-snapshot.mjs            # 用 coverage/ 下的产物生成快照
 *   node scripts/coverage-snapshot.mjs --coverage-dir=/tmp/coverage
 *
 * 快照字段：
 *   · commit       —— 生成时的 `git rev-parse HEAD`（覆盖范围对应的源码版本）
 *   · generatedAt  —— 生成时间（UTC，ISO）
 *   · totalSrcFiles / coveredSrcFiles —— 分母与分子（分子 = 出现在覆盖率产物中的文件数）
 *   · threshold    —— 覆盖率的硬阈值（与 check-coverage-snapshot 一致）
 *   · files        —— 全部 src 文件的逐文件覆盖布尔值（**包含未覆盖的文件**）
 *
 * 为什么把未覆盖文件也列进去：这样「新增了一个 src 文件但没写测试」会让
 * 快照的文件集合与仓库不一致，门禁立即变红，而不是被分母悄悄放大。
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SNAPSHOT_PATH = join(ROOT, 'scripts', 'coverage-snapshot.json');
const THRESHOLD = 0.975;

const argDir = process.argv.find((a) => a.startsWith('--coverage-dir='))?.split('=')[1];
const coverageDir = argDir ? resolve(ROOT, argDir) : join(ROOT, 'coverage');
const finalJson = join(coverageDir, 'coverage-final.json');

if (!existsSync(finalJson)) {
  console.error(`❌ 找不到覆盖率产物：${relative(ROOT, finalJson)}`);
  console.error('   请先运行：pnpm run test:coverage -- --maxWorkers=2');
  process.exit(1);
}

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

const srcFiles = collectSrcFiles(join(ROOT, 'packages')).sort();
const coverage = JSON.parse(readFileSync(finalJson, 'utf8'));

const covered = new Set();
for (const absPath of Object.keys(coverage)) {
  // 判据：该文件出现在 coverage-final.json 中（vitest 已插桩它）。
  // 纯类型文件（无语句）不会被插桩 ⇒ 自然为 false，这正是我们要看见的缺口。
  // 注意不要用「语句执行次数 > 0」：大量被 import 但分支未走到的文件会全部记为未覆盖，
  // 得到 86% 这种与「有没有为该文件建测试」无关的数字（2026-11-05 实测）。
  covered.add(relative(ROOT, absPath));
}

const files = {};
for (const rel of srcFiles) files[rel] = covered.has(rel);

const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
const snapshot = {
  commit,
  generatedAt: new Date().toISOString(),
  totalSrcFiles: srcFiles.length,
  coveredSrcFiles: srcFiles.filter((f) => files[f]).length,
  threshold: THRESHOLD,
  files,
};

writeFileSync(SNAPSHOT_PATH, `${JSON.stringify(snapshot, null, 2)}\n`);

// 覆盖率产物旁边也留一份元信息，避免「拿到 coverage-final.json 却不知道它对应哪个提交」
mkdirSync(coverageDir, { recursive: true });
writeFileSync(
  join(coverageDir, 'snapshot-meta.json'),
  `${JSON.stringify({ commit, generatedAt: snapshot.generatedAt }, null, 2)}\n`,
);

const ratio = snapshot.coveredSrcFiles / snapshot.totalSrcFiles;
console.log('覆盖率快照已生成\n');
console.log(`  commit          ${commit}`);
console.log(`  src 文件        ${snapshot.totalSrcFiles}`);
console.log(`  已插桩          ${snapshot.coveredSrcFiles}（${(ratio * 100).toFixed(2)}%）`);
console.log(`  硬阈值          ${(THRESHOLD * 100).toFixed(1)}%`);
console.log(`  写入            ${relative(ROOT, SNAPSHOT_PATH)}\n`);
