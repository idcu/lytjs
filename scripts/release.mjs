#!/usr/bin/env node
/**
 * 7.0.0 本地发布脚本（唯一远端为 Gitee，CI release workflow 不触发）。
 *
 * 默认 --dry-run：打印将要执行的确切命令序列与发布前核对结果，不落盘、不发布。
 * --execute / --write：真跑；任一步失败立即停止，不续跑、不吞错误。
 * --otp <6 位>：账号要求写操作 2FA 时必填；缺失会在发布前被拒绝。
 *
 * 固定步骤：changeset version → build → fast → slow → pack 核对 76 →
 *           逐包 npm publish → git tag v<version> → push tag。
 *
 * 发布前核对：
 *   · git：HEAD sha、@{u}..HEAD、工作树是否干净（断点续跑时放宽工作树）；
 *   · npm：whoami 成功、registry 必须是 https://registry.npmjs.org/；
 *   · 76 个包的 <version> 均未在 npm 上存在（任一存在即整体中止）；
 *   · 账号若要求写操作 2FA，必须显式 --otp。
 *
 * 幂等：publish 前比对各包 dist.integrity 与本地 tgz 的 sha512；
 * 一致则跳过，不一致则中止。进度写 .release-progress.json，重跑从断点继续。
 */
import { spawnSync, execFile } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdtempSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { ROOT, getReleasePackages } from './release-set.mjs';

const EXPECTED_REGISTRY = 'https://registry.npmjs.org/';
const STATE_FILE = join(ROOT, '.release-progress.json');
const NPM_CONCURRENCY = 8;

const EXECUTE = process.argv.includes('--execute') || process.argv.includes('--write');
const MODE = EXECUTE ? 'EXECUTE' : 'DRY-RUN';
const otpIndex = process.argv.indexOf('--otp');
const OTP = otpIndex >= 0 ? process.argv[otpIndex + 1] : undefined;

const packages = getReleasePackages();
const expected = packages.length;

function fail(msg) {
  console.error(`\n❌ ${msg}`);
  process.exit(1);
}

if (otpIndex >= 0 && !OTP) fail('--otp 需要一个 6 位验证码，例如 `--otp 123456`');

function capture(cmd, args) {
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf-8' });
  return { status: r.status ?? 1, out: (r.stdout || '').trim(), err: (r.stderr || '').trim() };
}

/** 异步跑 npm（用于 76 次并发查询，避免串行几分钟） */
function npmAsync(args, timeout = 30000) {
  return new Promise((resolve) => {
    execFile(
      'npm',
      args,
      { cwd: ROOT, encoding: 'utf-8', timeout, maxBuffer: 4 * 1024 * 1024 },
      (err, stdout, stderr) => {
        resolve({
          status: err ? (typeof err.code === 'number' ? err.code : 1) : 0,
          out: (stdout || '').trim(),
          err: (stderr || '').trim(),
        });
      },
    );
  });
}

/** 固定并发的 map */
async function mapLimit(items, limit, worker) {
  const out = new Array(items.length);
  let next = 0;
  async function pump() {
    while (next < items.length) {
      const i = next++;
      out[i] = await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, pump));
  return out;
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

function isNotFound(r) {
  return /E404|404 Not Found|not found/i.test(`${r.out} ${r.err}`);
}

function firstLine(text) {
  return (
    (text || '')
      .split('\n')
      .find((l) => l.trim())
      ?.trim() ?? '<无输出>'
  );
}

function normalizeRegistry(url) {
  return (url || '').trim().replace(/\/+$/, '');
}

// ============================================================
// 进度（断点续跑）
// ============================================================

function loadState(version) {
  if (!existsSync(STATE_FILE)) return null;
  try {
    const state = JSON.parse(readFileSync(STATE_FILE, 'utf-8'));
    return state.version === version ? state : null;
  } catch {
    return null;
  }
}

function saveState(state) {
  if (!EXECUTE) return;
  writeFileSync(STATE_FILE, `${JSON.stringify(state, null, 2)}\n`);
}

function newState(version) {
  return { version, phases: [], packDir: null, published: {}, skipped: {} };
}

function completedCount(state) {
  return Object.keys(state.published ?? {}).length + Object.keys(state.skipped ?? {}).length;
}

function printProgress(state, remaining) {
  console.log(
    `\n已完成：publish ${Object.keys(state.published ?? {}).length} / ` +
      `跳过 ${Object.keys(state.skipped ?? {}).length}；未完成：${remaining.length}`,
  );
  if (remaining.length > 0) console.log(`未完成清单：${remaining.join(', ')}`);
  console.log(`进度文件：${relative(ROOT, STATE_FILE)}（重跑会从这里继续）`);
}

// ============================================================
// 发布前核对
// ============================================================

/** 目标版本：优先用 changeset status 推导；断点续跑时 changeset 已被消费，回退读 core。 */
function deriveVersion() {
  const dir = mkdtempSync(join(tmpdir(), 'lytjs-changeset-status-'));
  const outFile = join(dir, 'status.json');
  try {
    capture('pnpm', ['changeset', 'status', '--output', outFile]);
    if (existsSync(outFile)) {
      const status = JSON.parse(readFileSync(outFile, 'utf-8'));
      const core = (status.releases || []).find((r) => r.name === '@lytjs/core');
      if (core?.newVersion) return core.newVersion;
    }
  } catch {
    // 推导失败则退回当前版本
  }
  return JSON.parse(readFileSync(join(ROOT, 'packages/core/package.json'), 'utf-8')).version;
}

function gitPreflight(version) {
  const head = capture('git', ['rev-parse', 'HEAD']).out || '<unknown>';
  const dirty = capture('git', ['status', '--porcelain']).out;
  const counts = capture('git', ['rev-list', '--left-right', '--count', '@{u}...HEAD']);
  let behind = '?';
  let ahead = '?';
  if (counts.status === 0) [behind, ahead] = counts.out.split(/\s+/);

  const resuming = (loadState(version)?.phases ?? []).length > 0;
  const problems = [];
  // 断点续跑时工作树必然带着 changeset version 的落盘改动，不能要求干净
  if (!resuming && dirty) problems.push('工作树不干净');
  if (ahead !== '0') problems.push(`@{u}..HEAD 非空（${ahead}）`);
  if (behind !== '0') problems.push(`落后远端（${behind}）`);

  console.log(`\n发布前核对（git · ${MODE}${resuming ? ' · 断点续跑' : ''}）`);
  console.log(`  HEAD        : ${head}`);
  console.log(`  @{u}..HEAD  : ${ahead} 个未推送提交（落后 ${behind}）`);
  console.log(
    `  工作树      : ${dirty ? '有未提交改动' : '干净'}${resuming && dirty ? '（断点续跑，已放宽）' : ''}`,
  );
  if (problems.length > 0) {
    if (EXECUTE) fail(`拒绝执行：${problems.join('；')}`);
    console.log(`  ⚠️ 实跑会拒绝：${problems.join('；')}`);
  }
  return { head, resuming };
}

async function detectTfa() {
  const r = await npmAsync(['profile', 'get', '--json'], 15000);
  if (r.status !== 0) return { known: false };
  try {
    const data = JSON.parse(r.out);
    const mode = typeof data.tfa === 'string' ? data.tfa : data.tfa?.mode;
    return mode ? { known: true, mode } : { known: false };
  } catch {
    return { known: false };
  }
}

async function npmPreflight(version) {
  console.log(`\n发布前核对（npm · ${MODE}）`);
  const problems = [];

  const registry = capture('npm', ['config', 'get', 'registry']).out;
  const registryOk = normalizeRegistry(registry) === normalizeRegistry(EXPECTED_REGISTRY);
  console.log(
    `  registry    : ${registry || '<空>'}${registryOk ? ' ✅' : ` ❌ 期望 ${EXPECTED_REGISTRY}`}`,
  );
  if (!registryOk) problems.push(`registry 不是官方源（当前 ${registry || '<空>'}）`);

  const who = capture('npm', ['whoami']);
  const whoOk = who.status === 0 && who.out.length > 0;
  console.log(
    `  npm whoami  : ${whoOk ? who.out : firstLine(who.err || who.out)}${whoOk ? ' ✅' : ' ❌'}`,
  );
  if (!whoOk) problems.push('npm whoami 失败（未登录或凭据失效）');

  const views = await mapLimit(packages, NPM_CONCURRENCY, async (p) => ({
    name: p.name,
    ...(await npmAsync(['view', `${p.name}@${version}`, 'version'])),
  }));
  const taken = views.filter((r) => r.status === 0 && r.out);
  const unknown = views.filter((r) => r.status !== 0 && !isNotFound(r));
  console.log(
    `  版本占用    : ${taken.length === 0 ? `0 个（${version} 未被占用）✅` : `${taken.length} 个已存在 ❌`}`,
  );
  if (taken.length > 0) {
    console.log(`    已存在：${taken.map((r) => r.name).join(', ')}`);
    problems.push(`${version} 已被占用：${taken.map((r) => r.name).join(', ')}`);
  }
  if (unknown.length > 0) {
    console.log(
      `  无法判定    : ${unknown.length} 个（示例 ${unknown[0].name}: ` +
        `${firstLine(unknown[0].err || unknown[0].out).slice(0, 100)}）`,
    );
    problems.push(`${unknown.length} 个包的版本查询失败，无法确认 ${version} 未被占用`);
  }

  const tfa = await detectTfa();
  if (!tfa.known) {
    console.log('  2FA         : 无法判定（未登录/网络）；若 publish 报 OTP 会提示 --otp');
  } else if (tfa.mode === 'auth-and-writes') {
    console.log(`  2FA         : ${tfa.mode}${OTP ? ' ✅ 已提供 --otp' : ' ❌ 需要 --otp <6 位>'}`);
    if (!OTP) problems.push('账号要求写操作 2FA：需要 --otp <6 位>');
  } else {
    console.log(`  2FA         : ${tfa.mode}（写操作无需 --otp）`);
  }

  if (problems.length > 0) {
    if (EXECUTE) fail(`拒绝执行：${problems.join('；')}`);
    console.log(`  ⚠️ 实跑会拒绝：${problems.join('；')}`);
  }
  return problems;
}

// ============================================================
// 打包与发布
// ============================================================

function tgzName(name, version) {
  return `${name.replace(/^@/, '').replace(/\//g, '-')}-${version}.tgz`;
}

function sha512Of(file) {
  return `sha512-${createHash('sha512').update(readFileSync(file)).digest('base64')}`;
}

function ensurePack(state) {
  const cachedDir = state.packDir;
  if (cachedDir && existsSync(cachedDir)) {
    const count = readdirSync(cachedDir).filter((f) => f.endsWith('.tgz')).length;
    if (count === expected) {
      console.log(`\n↩︎ 复用已有 tarball：${cachedDir}（${count} 个）`);
      return cachedDir;
    }
  }
  const packDir = mkdtempSync(join(tmpdir(), 'lytjs-publish-'));
  state.packDir = packDir;
  saveState(state);
  const filters = packages.flatMap((p) => ['--filter', p.name]);
  run(
    'pnpm',
    ['-r', ...filters, 'pack', '--pack-destination', packDir],
    `pnpm -r --filter <${expected} 个发布包> pack --pack-destination ${packDir}`,
  );
  const tgz = readdirSync(packDir).filter((f) => f.endsWith('.tgz'));
  console.log(`\n核对 tarball：${tgz.length} / 期望 ${expected}`);
  if (tgz.length !== expected) {
    fail(`tarball 数量不符（${tgz.length} ≠ ${expected}），拒绝发布`);
  }
  return packDir;
}

async function publishAll(state, version, packDir) {
  const local = new Map();
  for (const p of packages) {
    const file = join(packDir, tgzName(p.name, version));
    if (!existsSync(file)) fail(`缺少 tarball：${tgzName(p.name, version)}（pack 结果不完整）`);
    local.set(p.name, { file, integrity: sha512Of(file) });
  }

  const done = new Set([
    ...Object.keys(state.published ?? {}),
    ...Object.keys(state.skipped ?? {}),
  ]);
  const pending = packages.filter((p) => !done.has(p.name));
  if (done.size > 0) {
    console.log(`\n断点续跑：已完成 ${done.size}/${packages.length}，剩余 ${pending.length}`);
  }

  let finished = done.size;
  for (const p of pending) {
    const { file, integrity } = local.get(p.name);
    const remote = await npmAsync(['view', `${p.name}@${version}`, 'dist.integrity']);
    const exists = remote.status === 0 && remote.out;

    if (exists) {
      if (remote.out === integrity) {
        state.skipped[p.name] = integrity;
        saveState(state);
        finished += 1;
        console.log(
          `↩︎ [${finished}/${packages.length}] ${p.name}@${version} 已发布且 integrity 一致，跳过`,
        );
        continue;
      }
      saveState(state);
      const remaining = packages.filter((x) => !state.published[x.name] && !state.skipped[x.name]);
      printProgress(
        state,
        remaining.map((x) => x.name),
      );
      fail(
        `integrity 不一致：${p.name}@${version}\n  本地 ${integrity}\n  远端 ${remote.out}\n` +
          '  同一版本已存在但内容不同 —— 拒绝覆盖，也不能把两种内容混发。',
      );
    }

    if (remote.status !== 0 && !isNotFound(remote)) {
      saveState(state);
      const remaining = packages.filter((x) => !state.published[x.name] && !state.skipped[x.name]);
      printProgress(
        state,
        remaining.map((x) => x.name),
      );
      fail(`无法确认 ${p.name}@${version} 是否已发布：${firstLine(remote.err || remote.out)}`);
    }

    const args = ['publish', file, '--access', 'public'];
    if (OTP) args.push('--otp', OTP);
    console.log(`\n$ npm ${args.join(' ')}`);
    const r = spawnSync('npm', args, { cwd: ROOT, encoding: 'utf-8', env: process.env });
    process.stdout.write(r.stdout || '');
    process.stderr.write(r.stderr || '');
    if (r.status !== 0) {
      saveState(state);
      const remaining = packages.filter((x) => !state.published[x.name] && !state.skipped[x.name]);
      printProgress(
        state,
        remaining.map((x) => x.name),
      );
      const blob = `${r.stdout ?? ''}${r.stderr ?? ''}`;
      if (!OTP && /one-time password|EOTP|\botp\b/i.test(blob)) {
        fail('需要 --otp：账号要求写操作验证码。重跑时加 `--otp <6 位>`，已完成部分会跳过。');
      }
      fail(`npm publish 失败（exit ${r.status ?? 'null'}）：${p.name}@${version}`);
    }
    state.published[p.name] = integrity;
    saveState(state);
    finished += 1;
    console.log(`✅ [${finished}/${packages.length}] ${p.name}@${version}`);
  }

  console.log(
    `\n发布汇总：新发 ${Object.keys(state.published).length} / ` +
      `跳过 ${Object.keys(state.skipped).length} / 共 ${packages.length}`,
  );
  if (finished !== packages.length) fail(`发布未完成：${finished}/${packages.length}`);
}

// ============================================================
// 计划输出
// ============================================================

function printPlan(version, packDir) {
  console.log(`\n计划：${expected} 个发布包 → ${version}（tag v${version}）`);
  console.log(`\n步骤（失败即停；进度写 ${relative(ROOT, STATE_FILE)}）：`);
  console.log('\n$ pnpm changeset version');
  console.log('\n$ pnpm build');
  console.log('\n$ node scripts/gate.mjs --tier fast');
  console.log('\n$ node scripts/gate.mjs --tier slow');
  console.log(
    `\n$ pnpm -r --filter <${expected} 个发布包> pack --pack-destination ${
      packDir ?? '<临时目录>'
    }`,
  );
  console.log(`\n核对 tarball：${EXECUTE ? '已核对' : `期望 ${expected} 个 .tgz`}`);
  console.log(`\n$ npm view <name>@${version} dist.integrity   # 与本地 tgz sha512 比对`);
  console.log('  一致 ⇒ 跳过；不一致 ⇒ 中止；不存在 ⇒ 发布');
  console.log(
    `\n$ npm publish <每个 .tgz> --access public${OTP ? ' --otp <已提供>' : ' [--otp <6 位>]'}`,
  );
  console.log(`\n$ git tag v${version}        # 仅在 ${expected} 个包全部发布成功后`);
  console.log(`\n$ git push origin v${version}`);
}

// ============================================================
// 主流程
// ============================================================

const version = deriveVersion();

if (!EXECUTE) {
  gitPreflight(version);
  await npmPreflight(version);
  printPlan(version, null);
  console.log('\n✅ DRY-RUN 完成：未执行任何命令、未改版本、未打 tag、未 publish。');
} else {
  gitPreflight(version);
  await npmPreflight(version);

  const state = loadState(version) ?? newState(version);
  if (completedCount(state) > 0 || state.phases.length > 0) {
    console.log(`\n↩︎ 发现进度文件：已完成 ${completedCount(state)}/${expected}，从断点继续`);
  }
  saveState(state);
  const done = new Set(state.phases);

  const step = async (name, fn) => {
    if (done.has(name)) {
      console.log(`\n↩︎ 跳过（断点续跑）：${name}`);
      return;
    }
    await fn();
    state.phases.push(name);
    saveState(state);
  };

  await step('version', () => {
    run('pnpm', ['changeset', 'version']);
    const actual = JSON.parse(
      readFileSync(join(ROOT, 'packages/core/package.json'), 'utf-8'),
    ).version;
    if (actual !== version) {
      fail(`changeset version 后版本为 ${actual}，与预检推导的 ${version} 不一致`);
    }
  });
  await step('build', () => run('pnpm', ['build']));
  await step('fast', () => run('node', ['scripts/gate.mjs', '--tier', 'fast']));
  await step('slow', () => run('node', ['scripts/gate.mjs', '--tier', 'slow']));

  const packDir = ensurePack(state);
  await publishAll(state, version, packDir);

  await step('tag', () => run('git', ['tag', `v${version}`]));
  await step('push', () => run('git', ['push', 'origin', `v${version}`]));

  console.log(`\n✅ 发布完成：${expected} 包 / v${version}`);
}
