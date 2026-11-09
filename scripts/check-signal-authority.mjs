#!/usr/bin/env node
/**
 * 门禁：signal codegen 的「单语义权威」（N07 / ADR 0028 / ADR 0011）
 *
 * ## 为什么需要这一项
 *
 * ADR 0015（owner 2026-11-07 方向 2）已把语义真源下沉到
 * `codegen-signal-shared.ts`，两个发射器只注入前缀与文本兜底，
 * 对拍 100/100、快照 115×2、parity 115/115。ADR 0028 据此把「双实现」
 * 改判为「单语义 + 双形态」，并决定 8.0.0 前保留实验开关、之后下线。
 *
 * 但「已达成」不等于「不会退化」：任何人把默认分支切回优化版、把某个
 * validator 复制回某个发射器、或悄悄摘掉 `@deprecated`，都会让语义重新分叉，
 * 而现有对拍只在显式跑快照时才报。本门禁把这些结构性不变量钉进 fast 档。
 *
 * ## 判据（全部静态、秒级）
 *
 * 1. `compile()` 的 signal 分支必须是「显式开关 → 优化版 / else → 基础版」；
 * 2. 默认分支不得出现 `generateSignalOptimized`（防静默切回分叉实现）；
 * 3. 四个共享校验器只在 `codegen-signal-shared.ts` 定义（防两版各写一份）；
 * 4. 两个发射器都必须 import 共享语义层；
 * 5. 公开 `optimizeSignal` 必须带 `@deprecated`（8.0.0 下线的可见承诺）。
 *
 * ## 负控
 *
 * 把 `if (options.optimizeSignal === true)` 改成 `if (true)`，或把 else 分支
 * 换成 `generateSignalOptimized`，或摘掉 `@deprecated` ⇒ 本门禁必须 exit 1。
 *
 * 用法：`node scripts/check-signal-authority.mjs`
 */

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'packages', 'compiler', 'src');
const read = (name) => readFileSync(join(SRC, name), 'utf8');

let ok = true;
const check = (name, passed, detail) => {
  console.log(`  ${passed ? '✅' : '❌'} ${name}${passed || !detail ? '' : ` — ${detail}`}`);
  if (!passed) ok = false;
};

console.log('\n🔍 signal 单语义权威 check-signal-authority\n');

const entry = read('index.ts');
const types = read('types.ts');
const shared = read('codegen-signal-shared.ts');
const base = read('codegen-signal.ts');
const optimized = read('codegen-signal-optimized.ts');

// ── 1/2. 默认路径不得走优化发射器 ─────────────────────────────
const branch = entry.match(
  /if \(options\.optimizeSignal === true\) \{([\s\S]*?)\} else \{([\s\S]*?)\n {2}\}/,
);
check('compile 存在显式开关与 else 默认分支', Boolean(branch));
if (branch) {
  check(
    '实验分支调用 generateSignalOptimized',
    /generateSignalOptimized\(ast, options\)/.test(branch[1]),
  );
  check(
    '默认分支只调用 generateSignal（无优化版）',
    /generateSignal\(ast, options\)/.test(branch[2]) && !/generateSignalOptimized/.test(branch[2]),
    '默认路径被切回优化发射器会让语义重新分叉',
  );
}

// ── 3. 共享校验器唯一定义 ────────────────────────────────────
const VALIDATORS = [
  'validateAttributeName',
  'validateEventName',
  'validateComponentName',
  'validateIslandDirective',
];
const emitters = [
  ['codegen-signal.ts', base],
  ['codegen-signal-optimized.ts', optimized],
];
for (const name of VALIDATORS) {
  const def = new RegExp(`export function ${name}\\b`);
  check(
    `${name} 只在 shared 定义`,
    def.test(shared) && emitters.every(([, src]) => !def.test(src)),
    '校验器被复制回发射器会让两版判据与错误文案分叉',
  );
}

// ── 4. 两发射器共用共享语义层 ────────────────────────────────
for (const [file, src] of emitters) {
  check(`${file} 引用 codegen-signal-shared`, /from '\.\/codegen-signal-shared'/.test(src));
}

// ── 5. 公开开关带弃用标注 ────────────────────────────────────
const optionDoc = types.match(/\/\*\*([\s\S]*?)\*\/\s*optimizeSignal\?: boolean;/);
check(
  'optimizeSignal 公开声明带 @deprecated',
  Boolean(optionDoc) && optionDoc[1].includes('@deprecated'),
  'ADR 0028 要求 8.0.0 下线前保持可见的弃用承诺',
);

console.log(ok ? '\n✅ check-signal-authority 通过\n' : '\n❌ check-signal-authority 失败\n');
process.exit(ok ? 0 : 1);
