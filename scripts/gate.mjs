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
    name: 'check-dead-packages',
    tier: 'fast',
    cmd: ['tsx', 'scripts/check-dead-packages.ts'],
    approx: '~2s',
    desc:
      '死包棘轮：packages/common 下的内部工具包若「零生产引用」即红（清单见脚本，' +
      '16 个已确认死包已钉住；阻止新增死代码，2026-10-27 新增）',
  },
  {
    name: 'check-e2e-assertions',
    tier: 'fast',
    cmd: ['tsx', 'scripts/check-e2e-assertions.ts'],
    approx: '~1.5s',
    desc:
      '端到端断言强度：禁止 toBeDefined() / toContain("createBlock") / typeof==="object" ' +
      '这类「形状断言」冒充「行为断言」（2026-10-27 新增，起因：5,889 条用例全绿却有丢内容 P0）',
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
    desc: '棘轮红门禁：声明了却从未被引用的 props（基线 scripts/ui-props-wiring-baseline.txt，只拦新增；2026-10-10 由报告型升级）',
  },
  {
    name: 'check-keel-wiring',
    tier: 'fast',
    cmd: ['tsx', 'scripts/check-keel-wiring.ts'],
    approx: '~0.3s',
    desc: '治理接线：keel CI 三关卡（keel-lint / test-lint / verify-hooks）必须在 .github/workflows/keel.yml 里 —— 防判据自测被静默移除（2026-10-11）',
  },
  {
    name: 'check-ui-styles',
    tier: 'fast',
    cmd: ['tsx', 'scripts/check-ui-styles.ts'],
    approx: '~0.4s',
    desc:
      '★ UI 样式覆盖：每个组件至少有一个自己发出的类名在 styles/index.css 里有规则' +
      ' —— 评估时 18 个组件零命中（Modal/Drawer 变裸 div、Message 出现在页面底部）（2026-10-31）',
  },
  {
    name: 'check-dist-freshness',
    tier: 'fast',
    cmd: ['tsx', 'scripts/check-dist-freshness.ts'],
    approx: '~0.5s',
    desc:
      '★ 产物新鲜度：dist 必须比 src 新 —— vitest 的 47 条 alias 指向 dist，' +
      'dist 过期时「测试全绿」证明的是旧产物（2026-10-31）',
  },
  {
    name: 'check-package-exports',
    tier: 'fast',
    cmd: ['node', 'scripts/check-package-exports.mjs'],
    approx: '~1s',
    desc:
      '发布产物体检：每个包的 main/module/types/exports 指向的文件存在、有类型声明、' +
      '能被 require 且导出非空（单测走源码 alias，发现不了"消费者 import 不到"，2026-11-01 新增）',
  },
  {
    name: 'check-consumer-demo',
    tier: 'fast',
    cmd: ['node', 'scripts/check-consumer-demo.mjs'],
    approx: '~2s',
    desc:
      '消费者视角端到端：只用公开 API（dist 导入）写一个真实小应用 —— ' +
      'SSR → 客户端挂载 → v-for / v-if / 子组件 props+emit / 点击响应式 → ' +
      'SSR 与客户端初始结构一致（hydrate 前提）。单测走源码 alias，测不到"装起来能不能用"',
  },
  {
    name: 'check-examples',
    tier: 'fast',
    cmd: ['node', 'scripts/check-examples.mjs'],
    approx: '~0.3s',
    desc:
      '★ 示例可用性：examples/ 里所有 @lytjs/* 裸导入必须能在本仓解析，' +
      '且不得用相对路径穿透到包源码。' +
      '（实测 2026-11-02：28 个示例文件里 15 个有问题、10 个「高」，' +
      '含 8 个已迁出主仓的 @lytjs/plugin-* ⇒ 打开即 Failed to resolve import，' +
      '而此前没有任何门禁覆盖 examples/）',
  },
  {
    name: 'check-render-shapes',
    tier: 'fast',
    cmd: ['node', 'scripts/check-render-shapes.mjs'],
    approx: '~3s',
    desc:
      '★ 模板形态电池：用真实用户会写的模板组合（v-for 与动态兄弟 / 多列表 / ' +
      '嵌套列表 / v-if 与 v-for 混合 / 列表增删重排 / 组件与插槽内列表 / computed 列表）' +
      '逐条驱动**多次更新**，既断言内容也断言**节点位置**。' +
      '（2026-11-02：单特性都测过但组合没测，导致两个 P0 在 8432 用例 + 12 门禁下存活）',
  },
  {
    name: 'check-component-shapes',
    tier: 'fast',
    cmd: ['node', 'scripts/check-component-shapes.mjs'],
    approx: '~4s',
    desc:
      '★ 组件级形态电池：KeepAlive / Teleport / Transition / TransitionGroup / ' +
      'Suspense / 异步组件 / 动态组件 / v-model / provide-inject / 具名插槽 / ' +
      '组件 v-for keyed 重排 —— 每个都单独测过，但「和 v-if / v-for / 状态更新组合」' +
      '的形态才是用户真正会写的。末尾含「宿主缺少 getComputedStyle」的健壮性断言' +
      '（2026-11-02：该缺口会让 Transition 离开钩子抛错、元素永不移除）',
  },
  {
    name: 'check-render-cost',
    tier: 'fast',
    cmd: ['node', 'scripts/check-render-cost.mjs'],
    approx: '~3s',
    desc:
      '★ 渲染成本：统计 **DOM 操作次数**（不是耗时，避免 flaky），锁住算法复杂度 —— ' +
      '追加 1 项必须 ≤5 次操作且与列表长度无关（O(1)，不是 O(N)）、改文本 0 次结构操作、' +
      '倒序 ≤2N、N=400 与 N=200 追加成本同量级。含阳性对照（计数器有效）与负向对照' +
      '（全换 key 必然 O(N)，证明阈值有区分力）。' +
      '（2026-11-02 停用 block 快速路径时**没有任何成本度量**，此门禁补上这个缺口）',
  },
  {
    name: 'check-ssr-client-parity',
    tier: 'fast',
    cmd: ['node', 'scripts/check-ssr-client-parity.mjs'],
    approx: '~3s',
    desc:
      '★ SSR ↔ 客户端一致性：同一组件分别走 renderToString 与 createApp().mount()，' +
      '断言两端 HTML **语义等价**（只归一化空白/属性顺序/布尔属性/style 尾分号）。' +
      '「两端不一致」是反复出现的缺陷族（属性透传、组件分发、redirectResponse 漏改），' +
      '单点断言覆盖不住。首次运行抓到 3 个真缺陷：v-html 被当属性转义、' +
      '<component :is> 把组件名当标签、静态模板 attrs 在实例间累积',
  },
  {
    name: 'check-integration',
    tier: 'slow',
    cmd: ['node', 'scripts/check-integration.mjs'],
    approx: '~3s',
    desc:
      '★ 集成链路：UI（Input/Select/Tabs/Form）+ HTTP（CORS/401/429/JSON body）+ 生态（plugin install / edge Response）' +
      ' —— 这些链路都曾在「单测全绿」时静默失效（2026-10-31）',
  },
  {
    name: 'check-runtime-render',
    tier: 'slow',
    cmd: ['node', 'scripts/check-runtime-render.mjs'],
    approx: '~2s',
    desc:
      '★ 执行编译产物：在裸 Node（无 __DEV__ / 无 vitest define）里挂载真实模板并断言 DOM —— ' +
      '本仓此前没有一条门禁执行过产物，导致 v-html 的 ReferenceError 长期不可见（2026-10-31）',
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
    name: 'check-bundle-size',
    tier: 'slow',
    cmd: ['tsx', 'scripts/check-bundle-size.ts'],
    approx: '~8s',
    desc:
      '★ 真实产物体积（esbuild 真打包 + gzip）：vdom-only 与 minimal-app 两条入口的棘轮。' +
      '单包 dist 体积会低估真实成本 —— createApp 静态带编译器，实测最小 app 约 94 KB gzip',
    needsDist: true,
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
