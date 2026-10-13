/**
 * 守卫：`.github/workflows/keel.yml` 里 keel 的三个关卡**都在**
 *
 * ## 为什么需要它（2026-10-11 实测）
 *
 * 发现一处**治理层自身的监管缺口**：`keel-lint.sh` 的"守卫的守卫"是
 * `keel/checks/test-lint.sh`（注入 42 类故障、断言 lint 真的会判死）。但它此前
 * **只在 `install.sh` 安装时跑一次**——`keel-doctor.sh` 只打印"怎么跑"、不真跑，
 * CI（`keel.yml`）里**根本没有这一步**。也就是说：**改 `keel-lint.sh` 判据可以
 * 静默腐烂**（用例随判据漂移而失效，"全绿"却什么都没拦住），没有任何自动关卡拦得住。
 *
 * 修法是把 `test-lint.sh` 接进 CI。但**接线本身也会被后来者删掉**（一次重构、
 * 一次"优化 CI 时长"）——于是这个缺口会复发。本守卫就是拦这一次复发：
 * **把"三个关卡都在 CI 里"从口头约定变成判死**。
 *
 * ## 判据
 *
 * 解析 `keel.yml`，断言三个 `run:` 至少各命中一次：
 *   - `keel-lint.sh`   —— 基座一致性（预算 / frontmatter / 登记 / 死链 / 孤儿 / 循环 / 钩子）
 *   - `test-lint.sh`   —— 判据自测（守卫的守卫）
 *   - `verify-hooks.sh`—— 闭环钩子"验谎"
 *
 * 快档：只读一个文件、毫秒级。
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const WF = resolve(ROOT, '.github/workflows/keel.yml');

/** 三个必须出现在 keel CI 里的关卡（缺一即 fail） */
const REQUIRED: Array<{ script: string; why: string }> = [
  { script: 'keel/checks/keel-lint.sh', why: '基座一致性校验' },
  { script: 'keel/checks/test-lint.sh', why: '判据自测（守卫的守卫）' },
  { script: 'keel/checks/verify-hooks.sh', why: '闭环钩子验谎' },
];

function main(): void {
  if (!existsSync(WF)) {
    console.error(`❌ 找不到 ${WF} —— keel 的 CI 关卡整体缺失`);
    process.exit(1);
  }
  const src = readFileSync(WF, 'utf-8');

  // 只在 `run:` 行里找，避免把注释/说明里的提及当成"已接线"
  const runLines = src
    .split('\n')
    .filter((l) => /^\s*run:/.test(l))
    .join('\n');

  const missing = REQUIRED.filter((r) => !runLines.includes(r.script));

  if (missing.length === 0) {
    console.log(
      `✅ 通过：keel CI 三关卡齐全（${REQUIRED.map((r) => r.script.replace('keel/checks/', '')).join(' / ')}）`,
    );
    process.exit(0);
  }

  console.error(
    `❌ keel CI（.github/workflows/keel.yml）缺 ${missing.length} 个关卡 —— 治理接线被破坏：\n`,
  );
  for (const m of missing) {
    console.error(`  ${m.script}   （${m.why}）`);
  }
  console.error(
    `\n  为什么要拦：这些关卡若不在 CI 里，就只在有人"记得手动跑"时才生效 ——\n` +
      `  等于没有。尤其 test-lint：它是 keel-lint 判据的唯一回归护栏，缺了它，\n` +
      `  改判据就是盲改（判据会静默腐烂成摆设）。\n` +
      `  修法：在 keel.yml 的 steps 里补上对应 run 步骤。`,
  );
  process.exit(1);
}

main();
