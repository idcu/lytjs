#!/usr/bin/env node
/**
 * 门禁：发布一致性（A12 / 评估 P1-10）
 *
 * ## 为什么需要这一项
 *
 * 2026-11-05 的实际情况是三方**互不相干**：
 *
 *   · npm 上 `@lytjs/core` 是 **6.9.6**（2025 年发布）；
 *   · 仓库在 `v7.0.0-dev` 上，76 个包的 `package.json` 也是 6.9.6；
 *   · `git tag --points-at HEAD` 为空（没有任何 tag 指向当前提交）；
 *   · `.changeset/` 只有 config 与 README，**没有任何变更实体**。
 *
 * 这种「版本号三个地方各说各话」的状态不会让任何测试变红，
 * 但它决定了「发出去的到底是什么」—— 发布链路一旦靠人记，就必然漂移。
 *
 * 本门禁把三方对齐成**可检查的契约**：
 *
 * 1. 76 个包的版本号必须完全一致（内部依赖用 `workspace:*`，版本不一致即消费不一致）；
 * 2. 指向当前 HEAD 的 tag 必须与 `release-parity-expectation.json` 声明的状态一致；
 * 3. npm 上的最新版本必须与声明的「预期已发布版本」一致（离线时退化为上次核对值并标注）；
 * 4. 自基线 tag 以来**改过的包**必须被 changeset 覆盖（所有变更可追溯）；
 * 5. 豁免（`reason` / `ownerSignOff` / `expiresOn`）必须存在且**未过期** ——
 *    防止「预期不一致」变成永久免检（评估 R5）。
 *
 * ## 明确不做的事
 *
 * **不发 npm、不改版本号、不执行 `changeset version`**。发布是不可逆动作，
 * 必须走 C01 的人审关卡（owner 授权）。本脚本只读。
 *
 * ## 用法
 *
 *   node scripts/check-release-parity.mjs
 *
 * 退出码：0 = 通过；1 = 有失败。
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const EXPECTATION = join(ROOT, 'scripts', 'release-parity-expectation.json');
const STATE = join(ROOT, 'scripts', 'release-state.json');
const BUMP_TYPES = new Set(['major', 'minor', 'patch', 'none']);
const VALID_BUMPS = new Set(['major', 'minor', 'patch']);

let ok = true;
const failures = [];
const check = (name, passed, detail) => {
  if (passed) {
    console.log(`  ✅ ${name}`);
  } else {
    ok = false;
    failures.push(name);
    console.log(`  ❌ ${name}`);
    if (detail) console.log(`     ${detail}`);
  }
};

const git = (args) =>
  execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

console.log('\n🔍 发布一致性 check-release-parity\n');

// ── 0. 期望声明 ──────────────────────────────────────────────
if (!existsSync(EXPECTATION)) {
  console.error(`❌ 缺少 ${relative(ROOT, EXPECTATION)}（豁免必须显式声明）`);
  process.exit(1);
}
const expect = JSON.parse(readFileSync(EXPECTATION, 'utf8'));

// ── 1. 76 个包的版本号一致 ───────────────────────────────────
function collectPackageDirs(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', 'dist', 'coverage', '.tmp'].includes(entry.name)) continue;
      collectPackageDirs(full, acc);
      continue;
    }
    if (entry.name === 'package.json') acc.push(dir);
  }
  return acc;
}

const packages = [];
for (const dir of collectPackageDirs(join(ROOT, 'packages'))) {
  const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  if (pkg.name) packages.push({ dir: relative(ROOT, dir), name: pkg.name, version: pkg.version });
}
packages.sort((a, b) => a.name.localeCompare(b.name));

const versions = [...new Set(packages.map((p) => p.version))];
console.log(`  包数量          ${packages.length}`);
console.log(`  版本集合        ${versions.join(', ')}`);
check(
  `${packages.length} 个包版本一致`,
  versions.length === 1,
  `实际版本：${versions.join(', ')}；不一致的包：${packages
    .filter((p) => p.version !== versions[0])
    .map((p) => `${p.name}@${p.version}`)
    .slice(0, 8)
    .join(', ')}`,
);
check(
  `包版本 == 声明的 ${expect.expectedPackageVersion}`,
  versions.length === 1 && versions[0] === expect.expectedPackageVersion,
  `实际 ${versions[0]}；若确实要改版本，请同步更新 release-parity-expectation.json 与发布计划`,
);
check(
  '声明的计划版本高于当前版本',
  typeof expect.plannedVersion === 'string' &&
    expect.plannedVersion !== expect.expectedPackageVersion,
  `plannedVersion=${expect.plannedVersion}`,
);

// ── 2. tag 与 HEAD ───────────────────────────────────────────
const tagsAtHead = git(['tag', '--points-at', 'HEAD']).trim().split('\n').filter(Boolean);
const expectedTags = expect.tagAtHead ? [expect.tagAtHead] : [];
console.log(`  HEAD tag        ${tagsAtHead.length > 0 ? tagsAtHead.join(', ') : '(无)'}`);
check(
  'HEAD 上的 tag 与声明一致',
  tagsAtHead.length === expectedTags.length && tagsAtHead.every((t) => expectedTags.includes(t)),
  `实际 [${tagsAtHead.join(', ')}] vs 声明 [${expectedTags.join(', ')}]`,
);

// ── 3. npm 上的最新版本 ──────────────────────────────────────
let npmVersion = null;
let npmSource = 'npm view';
try {
  npmVersion = execFileSync('npm', ['view', '@lytjs/core', 'version', '--fetch-timeout=8000'], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 15000,
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
} catch {
  // 离线 / registry 不可达：退化为上次核对值（必须存在，且明确标注不是本次实测）
  npmSource = 'release-state.json（离线回退）';
  if (existsSync(STATE)) {
    const state = JSON.parse(readFileSync(STATE, 'utf8'));
    npmVersion = state.lastKnownNpmVersion ?? null;
  }
}
console.log(`  npm 版本        ${npmVersion ?? '(未知)'}（来源：${npmSource}）`);
check(
  'npm 最新版本 == 声明的预期版本',
  npmVersion !== null && npmVersion === expect.expectedNpmVersion,
  npmVersion === null
    ? '无法确定 npm 版本：联网后重跑，或补 scripts/release-state.json 的 lastKnownNpmVersion'
    : `npm=${npmVersion}，声明=${expect.expectedNpmVersion}`,
);

// ── 4. changeset 覆盖 ────────────────────────────────────────
const changesetDir = join(ROOT, '.changeset');
const entities = readdirSync(changesetDir).filter((f) => f.endsWith('.md') && f !== 'README.md');
const changesetPackages = new Set();
const entityProblems = [];

for (const file of entities) {
  const text = readFileSync(join(changesetDir, file), 'utf8');
  const match = text.match(/^---\n([\s\S]*?)\n---/);
  if (!match) {
    entityProblems.push(`${file}: 缺少 frontmatter`);
    continue;
  }
  for (const line of match[1].split('\n')) {
    if (!line.trim()) continue;
    const m = line.match(/^\s*['"]?([^'":]+)['"]?\s*:\s*([a-z]+)\s*$/);
    if (!m) {
      entityProblems.push(`${file}: 无法解析 ${line}`);
      continue;
    }
    const [, name, bump] = m;
    if (!BUMP_TYPES.has(bump)) {
      entityProblems.push(`${file}: ${name} 的 bump 类型 "${bump}" 非法`);
      continue;
    }
    if (!packages.some((p) => p.name === name)) {
      entityProblems.push(`${file}: ${name} 不在 workspace 里`);
      continue;
    }
    if (VALID_BUMPS.has(bump)) changesetPackages.add(name);
  }
}

console.log(`  changeset 实体  ${entities.length} 个，覆盖 ${changesetPackages.size} 个包`);
check('至少存在一个 changeset 实体', entities.length > 0, '.changeset/ 只有 config 与 README');
check('changeset 实体格式合法', entityProblems.length === 0, entityProblems.slice(0, 5).join('; '));

// 自基线 tag 以来改过的包必须被 changeset 覆盖
let changedPackages = [];
if (expect.baselineTag) {
  try {
    const changed = git(['diff', '--name-only', `${expect.baselineTag}..HEAD`, '--', 'packages'])
      .trim()
      .split('\n')
      .filter(Boolean);
    for (const file of changed) {
      const m = file.match(/^(packages\/(?:.*\/)?[^/]+)\/package\.json$/);
      if (m && packages.some((p) => p.dir === m[1])) changedPackages.push(m[1]);
    }
    changedPackages = [...new Set(changedPackages)];
  } catch {
    check(`基线 tag ${expect.baselineTag} 可解析`, false, 'git diff 失败');
  }
}
const changedNames = changedPackages
  .map((dir) => packages.find((p) => p.dir === dir)?.name)
  .filter(Boolean);
const uncovered = changedNames.filter((n) => !changesetPackages.has(n));
const coverage =
  changedNames.length === 0 ? 1 : (changedNames.length - uncovered.length) / changedNames.length;
console.log(
  `  changeset 覆盖  ${changedNames.length - uncovered.length}/${changedNames.length}` +
    `（${(coverage * 100).toFixed(1)}%，基线 ${expect.baselineTag ?? '未声明'}）`,
);
check(
  '自基线以来改过的包都被 changeset 覆盖',
  uncovered.length === 0,
  `未覆盖：${uncovered.slice(0, 8).join(', ')}${uncovered.length > 8 ? ' …' : ''}`,
);

// ── 5. 豁免有效性（防止永久免检，评估 R5）────────────────────
const expiry = expect.expiresOn ? new Date(`${expect.expiresOn}T23:59:59Z`) : null;
const hasReason = typeof expect.reason === 'string' && expect.reason.trim().length >= 10;
const hasSignOff =
  typeof expect.ownerSignOff === 'string' && expect.ownerSignOff.trim().length >= 5;
console.log(`  豁免截止        ${expect.expiresOn ?? '(未声明)'}`);
check('豁免带说明（reason）', hasReason, 'reason 缺失或过短');
check('豁免带 owner 签字（ownerSignOff）', hasSignOff, 'ownerSignOff 缺失');
check(
  '豁免未过期',
  expiry !== null && !Number.isNaN(expiry.getTime()) && expiry.getTime() > Date.now(),
  expiry && !Number.isNaN(expiry.getTime()) && expiry.getTime() <= Date.now()
    ? `已于 ${expect.expiresOn} 过期 —— 要么发布（C01），要么重新申请豁免`
    : 'expiresOn 不是合法日期',
);

// ── 汇总 ────────────────────────────────────────────────────
// 「声明状态成立」（ok）与「三方真的一致」（parity）是两件事：
// 未发布阶段允许前者为 true、后者必须如实为 false（评估 M5：100% / false）。
const parity =
  npmVersion === expect.plannedVersion &&
  versions.length === 1 &&
  versions[0] === expect.plannedVersion &&
  tagsAtHead.includes(expect.plannedVersion);
console.log('');
console.log(`  机制与声明（declared） ${ok ? 'true' : 'false'}`);
console.log(`  三方一致（parity）     ${parity ? 'true' : 'false'}`);
console.log(
  `  changeset 覆盖率        ${(coverage * 100).toFixed(1)}%（${changedNames.length - uncovered.length}/${changedNames.length}）`,
);
console.log(
  `  npm / 包版本 / tag      ${npmVersion ?? '?'} / ${versions[0]} / ${tagsAtHead.join(',') || '无'}` +
    `（计划 ${expect.plannedVersion}）`,
);
console.log('');

if (!ok) {
  console.log(`❌ check-release-parity 失败：${failures.length} 项\n`);
  for (const f of failures) console.log(`   · ${f}`);
  console.log('');
  process.exit(1);
}
console.log('✅ check-release-parity 通过（机制在、声明明确、未发布状态如实记录）\n');
process.exit(0);
