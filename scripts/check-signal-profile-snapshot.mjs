#!/usr/bin/env node
/**
 * scripts/check-signal-profile-snapshot.mjs
 *
 * **门禁（B01c）：signal 两个 profile 的产物必须逐字等于快照**
 *
 * ## 为什么需要它
 *
 * `codegen-signal` 与 `codegen-signal-optimized` 目前是两套发射器，语义已抽进
 * `codegen-signal-shared`，但仍保留 5 类**有意的输出形态差异**（短别名 / 上下文前缀 /
 * 临时变量名 / 版式 / 静态 HTML 序列化）。`check-compiler-parity` 只断言「执行后 DOM
 * 一致」，**不锁产物文本** —— 一次看似无害的重构（改空格、改变量名、丢一个 hoist）
 * 可以让 DOM 仍然正确、体积或运行时契约却已变化，而门禁全绿。
 *
 * 本门禁把 100 个模板在**两个 profile** 下的编译产物逐字钉住：
 *   - `base`      ：`{ rendererMode: 'signal' }`（默认，语义主干）
 *   - `optimized` ：`{ rendererMode: 'signal', optimizeSignal: true }`
 *
 * 任何一侧产物变化都必须显式 `--update`，diff 就是评审点。B01d 的每一步合并都以
 * 「合并前后产物逐字一致」为验收；不逐字就整块回退，不用「语义等价」替代。
 *
 * ## 覆盖
 *
 * 模板来源与 `check-compiler-parity` 相同（`scripts/compiler-parity-templates.json`，
 * 100 条），因此覆盖率可对照：parity 100/100 是行为面，本门禁 100×2 是文本面。
 *
 * ## 用法
 *
 *   node scripts/check-signal-profile-snapshot.mjs            # 比对，不一致退出 1
 *   node scripts/check-signal-profile-snapshot.mjs --update   # 显式重写快照
 *
 * 退出码：0 = 200 份产物全部逐字一致；1 = 有差异 / 缺快照 / 编译抛错。
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SNAPSHOT_PATH = join(ROOT, 'scripts/signal-profile-snapshot.json');
const TEMPLATES_PATH = join(ROOT, 'scripts/compiler-parity-templates.json');
const COMPILER_PATH = join(ROOT, 'packages/compiler/dist/index.mjs');

const update = process.argv.includes('--update');

/** 两个 profile：名字进入快照键，options 原样传给 compile */
const PROFILES = [
  { name: 'base', options: { rendererMode: 'signal' } },
  { name: 'optimized', options: { rendererMode: 'signal', optimizeSignal: true } },
];

const loaded = JSON.parse(readFileSync(TEMPLATES_PATH, 'utf-8'));
const templates = Array.isArray(loaded) ? loaded : loaded.templates;
if (!Array.isArray(templates) || templates.length === 0) {
  console.error('❌ 模板清单为空或格式不符（scripts/compiler-parity-templates.json）');
  process.exit(1);
}

const { compile } = await import(pathToFileURL(COMPILER_PATH).href);

const actual = Object.fromEntries(PROFILES.map((p) => [p.name, {}]));
const compileErrors = [];
for (const entry of templates) {
  for (const profile of PROFILES) {
    try {
      actual[profile.name][entry.id] = compile(entry.template, profile.options).code;
    } catch (err) {
      compileErrors.push(
        `${entry.id}/${profile.name} 编译抛错：${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
if (compileErrors.length > 0) {
  console.error(`❌ ${compileErrors.length} 份产物编译失败：`);
  for (const line of compileErrors.slice(0, 10)) console.error(`   · ${line}`);
  process.exit(1);
}

if (update) {
  writeFileSync(
    SNAPSHOT_PATH,
    `${JSON.stringify(
      {
        updatedAt: new Date().toISOString().slice(0, 10),
        count: templates.length,
        ...actual,
      },
      null,
      2,
    )}\n`,
  );
  console.log(`已更新 ${SNAPSHOT_PATH}：${templates.length} 模板 × ${PROFILES.length} profile`);
  process.exit(0);
}

let snapshot;
try {
  snapshot = JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf-8'));
} catch (err) {
  console.error(`❌ 读不到快照 ${SNAPSHOT_PATH}：${err instanceof Error ? err.message : err}`);
  console.error('   首次建立请运行：node scripts/check-signal-profile-snapshot.mjs --update');
  process.exit(1);
}

/** 首个差异位置 + 双侧片段，用于人工定位（截断到 48 字符） */
function describeDiff(expected, got) {
  let i = 0;
  while (i < expected.length && i < got.length && expected[i] === got[i]) i += 1;
  const lo = Math.max(0, i - 16);
  const clip = (s) => JSON.stringify(s.slice(lo, i + 32));
  return `位置 ${i}，快照=${clip(expected)} 实际=${clip(got)}`;
}

let mismatches = 0;
const details = [];
for (const profile of PROFILES) {
  const expectedMap = snapshot[profile.name] ?? {};
  const ids = new Set([...Object.keys(expectedMap), ...Object.keys(actual[profile.name])]);
  for (const id of ids) {
    const expected = expectedMap[id];
    const got = actual[profile.name][id];
    if (expected === undefined) {
      mismatches += 1;
      details.push(`${id}/${profile.name}：快照缺少该模板`);
    } else if (got === undefined) {
      mismatches += 1;
      details.push(`${id}/${profile.name}：快照里有、本次未产出`);
    } else if (expected !== got) {
      mismatches += 1;
      details.push(`${id}/${profile.name}：${describeDiff(expected, got)}`);
    }
  }
}

const expectedCount = snapshot.count;
if (expectedCount !== templates.length) {
  console.error(`❌ 模板数量变化：快照 ${expectedCount ?? '未知'} 条，当前 ${templates.length} 条`);
  mismatches += 1;
}

if (mismatches > 0) {
  console.error(
    `❌ ${mismatches} 处产物与快照不一致（${templates.length} 模板 × ${PROFILES.length} profile）`,
  );
  for (const line of details.slice(0, 10)) console.error(`   · ${line}`);
  if (details.length > 10) console.error(`   · …其余 ${details.length - 10} 处省略`);
  console.error(
    '   如为有意变更，请显式运行：node scripts/check-signal-profile-snapshot.mjs --update',
  );
  process.exit(1);
}

const bytes = PROFILES.reduce(
  (sum, p) => sum + Object.values(actual[p.name]).reduce((n, code) => n + code.length, 0),
  0,
);
console.log(
  `✅ ${templates.length} 模板 × ${PROFILES.length} profile 产物逐字一致（共 ${bytes} B）`,
);
