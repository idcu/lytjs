#!/usr/bin/env node
/**
 * 7.0.0 本地发布脚本（唯一远端为 Gitee，CI release workflow 不触发）。
 *
 * 默认 --dry-run：只打印将要执行的确切命令序列，不落盘、不发布。
 * --execute / --write：真跑；任一步失败立即停止，不续跑、不吞错误。
 *
 * 固定步骤：changeset version → build → fast 档 → slow 档 → pack 核对 76 →
 *           逐包 npm publish → git tag v<version> → push tag。
 *
 * 发布前核对：HEAD sha、@{u}..HEAD、工作树是否干净；任一不符，实跑直接拒绝。
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ROOT, getReleasePackages } from './release-set.mjs';

const EXECUTE = process.argv.includes('--execute') || process.argv.includes('--write');
const MODE = EXECUTE ? 'EXECUTE' : 'DRY-RUN';
const packages = getReleasePackages();
const expected = packages.length;

function capture(cmd, args) {
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf-8' });
  return { status: r.status ?? 1, out: (r.stdout || '').trim(), err: (r.stderr || '').trim() };
}

function fail(msg) {
  console.error(`\n❌ ${msg}`);
  process.exit(1);
}

function run(cmd, args, display) {
  const line = display || [cmd, ...args].join(' ');
  console.log(`\n$ ${line}`);
  if (!EXECUTE) return;
  const r = spawnSync(cmd, args, { cwd: ROOT, stdio: 'inherit', env: process.env });
  if (r.status !== 0) {
    console.error(`\n❌ 停止：命令失败（exit ${r.status ?? 'null'}）：${line}`);
    process.exit(r.status ?? 1);
  }
}

/** 发布前三项核对；实跑时任一不符即拒绝。 */
function preflight() {
  const head = capture('git', ['rev-parse', 'HEAD']).out || '<unknown>';
  const dirty = capture('git', ['status', '--porcelain']).out;
  const counts = capture('git', ['rev-list', '--left-right', '--count', '@{u}...HEAD']);
  let behind = '?';
  let ahead = '?';
  if (counts.status === 0) {
    [behind, ahead] = counts.out.split(/\s+/);
  }

  console.log(`\n发布前核对（${MODE}）`);
  console.log(`  HEAD        : ${head}`);
  console.log(`  @{u}..HEAD  : ${ahead} 个未推送提交（落后 ${behind}）`);
  console.log(`  工作树      : ${dirty ? '有未提交改动' : '干净'}`);

  const problems = [];
  if (dirty) problems.push('工作树不干净');
  if (ahead !== '0') problems.push(`@{u}..HEAD 非空（${ahead}）`);
  if (behind !== '0') problems.push(`落后远端（${behind}）`);
  if (problems.length) {
    if (EXECUTE) fail(`拒绝执行：${problems.join('；')}`);
    console.log(`  ⚠️ 实跑会拒绝：${problems.join('；')}`);
  }
  return head;
}

/** 目标版本：dry-run 用 changeset status 推导；execute 在 version 后读 core。 */
function dryRunVersion() {
  const dir = mkdtempSync(join(tmpdir(), 'lytjs-changeset-status-'));
  const outFile = join(dir, 'status.json');
  try {
    capture('pnpm', ['changeset', 'status', '--output', outFile]);
    const status = JSON.parse(readFileSync(outFile, 'utf-8'));
    const core = (status.releases || []).find((r) => r.name === '@lytjs/core');
    if (core?.newVersion) return core.newVersion;
  } catch {
    // 推导失败则退回当前版本，仅影响 dry-run 展示
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  return JSON.parse(readFileSync(join(ROOT, 'packages/core/package.json'), 'utf-8')).version;
}

preflight();
const version = EXECUTE ? null : dryRunVersion();
const tagPreview = `v${version ?? '<changeset version 后的版本>'}`;

console.log(`\n计划：${expected} 个发布包 → ${version ?? '<version>'}（tag ${tagPreview}）`);
console.log('\n步骤（失败即停）：');
run('pnpm', ['changeset', 'version']);
run('pnpm', ['build']);
run('node', ['scripts/gate.mjs', '--tier', 'fast']);
run('node', ['scripts/gate.mjs', '--tier', 'slow']);

const packDir = mkdtempSync(join(tmpdir(), 'lytjs-publish-'));
const filters = packages.flatMap((p) => ['--filter', p.name]);
run(
  'pnpm',
  ['-r', ...filters, 'pack', '--pack-destination', packDir],
  `pnpm -r --filter <${expected} 个发布包> pack --pack-destination ${packDir}`,
);

if (EXECUTE) {
  const tgz = readdirSync(packDir).filter((f) => f.endsWith('.tgz'));
  console.log(`\n核对 tarball：${tgz.length} / 期望 ${expected}`);
  if (tgz.length !== expected) {
    fail(`tarball 数量不符（${tgz.length} ≠ ${expected}），拒绝发布`);
  }
  const finalVersion = JSON.parse(
    readFileSync(join(ROOT, 'packages/core/package.json'), 'utf-8'),
  ).version;
  for (const f of tgz) run('npm', ['publish', join(packDir, f), '--access public']);
  run('git', ['tag', `v${finalVersion}`]);
  run('git', ['push', 'origin', `v${finalVersion}`]);
  console.log(`\n✅ 发布完成：${tgz.length} 包 / v${finalVersion}`);
} else {
  console.log(`\n核对 tarball：期望 ${expected} 个 .tgz（实跑时才 pack）`);
  console.log('$ npm publish <每个 .tgz> --access public');
  run('git', ['tag', tagPreview]);
  run('git', ['push', 'origin', tagPreview]);
  console.log(`\n✅ DRY-RUN 完成：未执行任何命令、未改版本、未打 tag、未 publish。`);
}
