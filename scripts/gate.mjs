#!/usr/bin/env node
/**
 * 门禁运行器（独立于 `verify-baseline.sh` 的单一真相源）
 *
 * ## 为什么要它
 *
 * 2026-10-05 实测发现：把慢门禁从快反馈路径里「抽出来」之后，**它们不能消失** ——
 * 仍必须在发布前 / CI / 定时任务里跑，只是不该挡着日常开发。
 * 所以这里把**每一项门禁定义成一条可独立调用的记录**：
 *
 *   node scripts/gate.mjs --list              # 看有哪些门禁、属于哪一档、实测耗时
 *   node scripts/gate.mjs --tier fast         # 只跑快档（秒级，日常开发用）
 *   node scripts/gate.mjs --tier slow         # 只跑慢档（分钟级，发布前 / 定时任务用）
 *   node scripts/gate.mjs build format:check  # 按名字跑指定几项
 *   node scripts/gate.mjs --tier slow --dry   # 只打印将要执行的命令，不真跑
 *
 * ## 两种调用方式
 *
 * - **开发内循环**：`pnpm check:fast`（直连 tsx，6.1s）或
 *   `bash scripts/verify-baseline.sh --fast`（18.3s，含 pnpm 启动开销）；
 * - **定时任务 / CI**：`node scripts/gate.mjs --tier slow`
 *   （可放进 cron / CI job，**不占用本地开发的反馈路径**）。
 *
 * ## 档位划分依据（实测，2026-10-05）
 *
 * 快档 = 只读源码、不需要 dist ⇒ 结论会随每次改动快速变化，适合日常反馈。
 * 慢档 = 全仓级 / 需要 dist ⇒ 结论不随单次改动变化，适合发布前与定时任务。
 */

import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

/** @typedef {'fast'|'slow'} Tier */

const ROOT = new URL('..', import.meta.url).pathname;
// ★ 子进程必须能拿到 node_modules/.bin —— 否则 spawnSync 找不到 `tsx` / `pnpm`，
//   退出码会是 **null**（不是 1！）⇒ 表现为「所有门禁瞬间失败」。
//   这条是被实测抓到的：直接 `node scripts/gate.mjs --tier fast` 全部瞬间失败。
const BIN = resolve(ROOT, 'node_modules/.bin');
const ENV = { ...process.env, PATH: `${BIN}:${process.env.PATH ?? ''}` };

/**
 * 门禁登记表（单一真相源）
 * @type {Array<{
 *   name: string, tier: Tier, cmd: string[],
 *   needsDist?: boolean, approx: string, desc: string
 * }>}
 */
const GATES = [
  // ── 快档：只读源码、不需要 dist ──────────────────────────────
  {
    name: 'check-build-order',
    tier: 'fast',
    cmd: ['tsx', 'scripts/check-build-order.ts'],
    approx: '~3.4s',
    desc: '构建顺序表与实际包集合一致、无顺序倒置（单一真相源：build-order.ts）',
  },
  {
    name: 'check-ui-slot-single-node',
    tier: 'fast',
    cmd: ['tsx', 'scripts/check-ui-slot-single-node.ts'],
    approx: '~2.3s',
    desc: '红门禁：组件是否只处理数组形态的 slot（单节点内容会被静默丢弃）',
  },
  {
    name: 'check-ui-props-wiring',
    tier: 'fast',
    cmd: ['tsx', 'scripts/check-ui-props-wiring.ts'],
    approx: '~2.3s',
    desc: '报告型：声明了却从未被引用的 props（清单已清零，保持棘轮）',
  },

  // ── 慢档：全仓级 / 需要 dist ────────────────────────────────
  {
    name: 'check-vitest-alias-dist',
    tier: 'fast',
    cmd: ['tsx', 'scripts/check-vitest-alias-dist.ts'],
    approx: '~2s',
    desc:
      '★ vitest alias 指向的文件必须存在 —— 否则对应包的测试在**收集阶段**就失败、' +
      '用例一个都不跑（但「Tests N passed」看起来仍像通过）',
  },
  {
    name: 'build',
    tier: 'slow',
    cmd: ['pnpm', 'run', 'build'],
    approx: '数分钟',
    desc: '构建 76 个包（慢档的第一项，其它依赖 dist 的门禁都排在它后面）',
  },
  {
    name: 'build:fallback',
    tier: 'slow',
    cmd: ['node', 'scripts/build-packages.mjs'],
    approx: '数分钟（串行；每包 10~35s）',
    desc:
      '★ **兜底构建**：不经过 smart-build，逐包 tsup + 拓扑排序。' +
      '在本机用它替代 `build`（后者被 safe-delete 守卫按轮次限额拦住）；' +
      '⚠️ 需在「干净的一轮」里跑，或在无该守卫的 CI 容器里跑',
  },
  {
    name: 'check-runtime-contract',
    tier: 'slow',
    needsDist: true,
    cmd: ['tsx', 'scripts/check-runtime-contract.ts'],
    approx: '~3.7s',
    desc: '产物 import 的绑定名必须在所指包的导出面存在（需要 dist）',
  },
  {
    name: 'check-doc-imports',
    tier: 'slow',
    needsDist: true,
    cmd: ['tsx', 'scripts/check-doc-imports.ts'],
    approx: '~6.9s',
    desc: 'README/docs 里的具名 import 必须真实存在（需要 dist）',
  },
  {
    name: 'check-circular',
    tier: 'slow',
    cmd: ['tsx', 'scripts/check-circular.ts'],
    approx: '~14s（src 模式 ~29s）',
    desc: '循环依赖。⚠️ 默认只扫 dist ⇒ 源码里的循环它查不到（详见审计文档 §五十七）',
  },
  {
    name: 'check-circular:src',
    tier: 'slow',
    cmd: ['tsx', 'scripts/check-circular.ts', '--src'],
    approx: '~29s',
    desc:
      '★ 源码循环依赖 + **棘轮基线**（scripts/circular-baseline.txt）：' +
      '只对**基线之外的新循环**报错；默认的 dist 模式查不到源码里的循环（务必跑这个）',
  },
  {
    name: 'type-check',
    tier: 'slow',
    cmd: ['pnpm', '-r', 'run', 'type-check'],
    approx: '数分钟',
    desc: '全仓类型检查',
  },
  {
    name: 'lint:check',
    tier: 'slow',
    cmd: ['pnpm', 'run', 'lint:check'],
    approx: '~27s',
    desc: '全仓 eslint（pre-commit 的 lint-staged 只查暂存文件，结论会滞后）',
  },
  {
    name: 'format:check',
    tier: 'slow',
    cmd: ['pnpm', 'run', 'format:check'],
    approx: '~89s',
    desc: '全仓 prettier —— ★ 单项最慢的门禁',
  },
  {
    name: 'test',
    tier: 'slow',
    cmd: ['pnpm', 'run', 'test'],
    approx: '数分钟',
    desc: '全量测试（不带覆盖率）',
  },
  {
    name: 'test:coverage',
    tier: 'slow',
    cmd: ['pnpm', 'run', 'test:coverage'],
    approx: '数分钟',
    desc: '全量测试 + 覆盖率（覆盖率棘轮：branches ≥ 85%）',
  },
];

/**
 * 解析真正要执行的命令。
 *
 * ★ 本机**没有全局 pnpm**（`which pnpm` = not found），而 `corepack` 随 node 自带
 *   ⇒ 凡是用到 `pnpm` 的门禁都会以「退出码 null」失败（进程没起来）。
 *   这里把 `pnpm` 映射成 `corepack pnpm@<版本>`，与仓库既有做法一致。
 */
const PNPM_VERSION = '11.3.0';
function resolveCmd(cmd) {
  if (cmd === 'pnpm') return 'corepack';
  return cmd;
}
function pnpmArgs(cmd) {
  return cmd === 'pnpm' ? [`pnpm@${PNPM_VERSION}`] : [];
}

function diagnoseSpawnFailure(cmd, r) {
  if (r.error && r.error.code === 'ENOENT') {
    const via = cmd === 'pnpm' ? `（已自动改用 corepack pnpm@${PNPM_VERSION}，仍找不到）` : '';
    return `**命令找不到**：${cmd} ${via}`;
  }
  if (r.signal) return `被信号 ${r.signal} 终止`;
  return '进程未启动（无退出码）';
}

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const dry = has('--dry');
const listOnly = has('--list');

const tierArgIdx = argv.findIndex((a) => a === '--tier');
const tier = tierArgIdx !== -1 ? argv[tierArgIdx + 1] : undefined;
const names = argv.filter((a) => !a.startsWith('--') && a !== tier);

if (listOnly) {
  console.log('门禁登记表（tier: fast=快档 / slow=慢档）\n');
  for (const t of ['fast', 'slow']) {
    console.log(`── ${t} ──`);
    for (const g of GATES.filter((x) => x.tier === t)) {
      console.log(`  ${g.name.padEnd(28)} ${g.approx.padEnd(22)} ${g.desc}`);
    }
    console.log('');
  }
  console.log('用法：');
  console.log('  node scripts/gate.mjs --tier fast        # 日常开发（秒级）');
  console.log('  node scripts/gate.mjs --tier slow        # 发布前 / 定时任务（分钟级）');
  console.log('  node scripts/gate.mjs build format:check # 指定几项');
  process.exit(0);
}

let selected = [];
if (tier) {
  if (tier !== 'fast' && tier !== 'slow') {
    console.error(`--tier 只接受 fast | slow（收到：${tier}）`);
    process.exit(2);
  }
  selected = GATES.filter((g) => g.tier === tier);
} else if (names.length > 0) {
  selected = GATES.filter((g) => names.includes(g.name));
  const unknown = names.filter((n) => !GATES.some((g) => g.name === n));
  if (unknown.length > 0) {
    console.error(`未知门禁：${unknown.join(', ')}（用 --list 看全部）`);
    process.exit(2);
  }
} else {
  selected = GATES.filter((g) => g.tier === 'fast');
}

console.log(
  `门禁运行器：${selected.length} 项（${[...new Set(selected.map((g) => g.tier))].join('+')}）` +
    `${dry ? ' · dry-run' : ''}\n`,
);

let pass = 0;
const failed = [];
const started = Date.now();

for (const g of selected) {
  console.log('─'.repeat(60));
  console.log(`▶ ${g.name}  (${g.tier} · ${g.approx})`);
  console.log('─'.repeat(60));
  if (dry) {
    console.log(`  would run: ${g.cmd.join(' ')}\n`);
    continue;
  }
  const t0 = Date.now();
  const r = spawnSync(resolveCmd(g.cmd[0]), [...pnpmArgs(g.cmd[0]), ...g.cmd.slice(1)], {
    cwd: ROOT,
    stdio: 'inherit',
    env: ENV,
  });
  const dt = ((Date.now() - t0) / 1000).toFixed(1);
  if (r.status === 0) {
    pass += 1;
    console.log(`\n✅ ${g.name} 通过（${dt}s）\n`);
  } else {
    failed.push(g.name);
    // ★ 退出码 null = **进程根本没起来**（命令找不到 / 被信号杀死），
    //   绝大多数情况是「该命令不在 PATH」—— 直接说清楚，别只丢一个 null。
    const why = r.status === null ? diagnoseSpawnFailure(g.cmd[0], r) : `退出码 ${r.status}`;
    console.log(`\n❌ ${g.name} 失败（${dt}s，${why}）\n`);
  }
}

const total = ((Date.now() - started) / 1000).toFixed(1);
console.log('═'.repeat(60));
if (dry) {
  console.log(`dry-run：共 ${selected.length} 项，未实际执行。`);
} else {
  console.log(`结果：✅ ${pass} 项通过 · ❌ ${failed.length} 项失败 · 耗时 ${total}s`);
  if (failed.length > 0) console.log(`失败项：${failed.join(', ')}`);
}
console.log('═'.repeat(60));

process.exit(failed.length > 0 ? 1 : 0);
