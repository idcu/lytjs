#!/usr/bin/env node
/**
 * 门禁：已被真跑证伪的能力结论不得回写（N10 / N11）
 *
 * ## 起因
 *
 * 11-09 的全维度评估把「Suspense fallback 从未出现」「signal 路径内置组件
 * 渲染为空」列为未修缺口，依据是 `suspense.ts` 与测试文件里的**过时注释**。
 * 2026-11-10 真跑复核：
 *   · `e2e-suspense-fallback.test.ts` 7 例 + `e2e-suspense-vnode.test.ts` 4 例绿；
 *   · `signal-codegen-e2e-component.test.ts` 22 例绿（KNOWN_FAIL 已空）。
 * ⇒ 这两条是「注释没跟上代码」，不是缺陷。本门禁防止有人把旧结论再写回
 *    README / API 文档 / 源码注释，也防止把已转正向的判据降级成 `it.fails`。
 *
 * ## 判据（精确字符串，避免假阳性）
 *
 * 1. 三处公开口径不得出现已证伪的表述；
 * 2. `docs/api/component.md` 不得再把 fallback 写成 `SuspenseProps` 字段；
 * 3. 两个 e2e 判据文件存在，且不含 `it.fails`（判据不得被降级）；
 * 4. signal 组件测试必须保留「历史·已修复」标注（信息不丢）。
 *
 * 用法：`node scripts/check-stale-capability-claims.mjs`
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

let ok = true;
const check = (name, passed, detail) => {
  console.log(`  ${passed ? '✅' : '❌'} ${name}${passed || !detail ? '' : ` — ${detail}`}`);
  if (!passed) ok = false;
};

console.log('\n🔍 过时能力结论回写守卫 check-stale-capability-claims\n');

// ── 1. 已证伪表述不得回写 ────────────────────────────────────
const FORBIDDEN = [
  ['README.md', ['fallback 从未出现', '只支持数组形态 children']],
  ['docs/api/component.md', ['fallback 从未出现']],
  ['packages/component/src/suspense.ts', ['fallback 从未出现', '勿当已修']],
];
for (const [file, needles] of FORBIDDEN) {
  const text = read(file);
  for (const needle of needles) {
    check(`${file} 不含「${needle}」`, !text.includes(needle), '已由真跑证伪，勿回写');
  }
}

// ★ 判据必须按**小节作用域**：`ErrorBoundaryProps` 合法地拥有
// `default?` / `fallback?` slot 字段，全文件级 contains 会把它们误判成假承诺。
const componentDoc = read('docs/api/component.md');
const suspenseSection =
  componentDoc.split(/^#### SuspenseProps\s*$/m)[1]?.split(/^#### /m)[0] ?? '';
check(
  'SuspenseProps 小节不含 fallback prop',
  suspenseSection.length > 0 && !suspenseSection.includes('fallback?: SlotFunction'),
  'fallback 是 child / slot，不是 prop',
);
check(
  'SuspenseProps 小节写明 timeout',
  suspenseSection.includes('timeout?: number'),
  '小节解析失败或与真实类型不符',
);

// ── 2. 判据存在且未被降级 ────────────────────────────────────
const JUDGEMENTS = [
  'packages/core/tests/e2e-suspense-fallback.test.ts',
  'packages/core/tests/e2e-suspense-vnode.test.ts',
  'packages/renderer/tests/signal-codegen-e2e-component.test.ts',
];
for (const file of JUDGEMENTS) {
  check(`${file} 存在`, existsSync(join(ROOT, file)));
  if (!existsSync(join(ROOT, file))) continue;
  // 只禁**实际调用** `it.fails(`：文件里 `KNOWN_FAIL.has(...) ? it.fails : it`
  // 是设计如此的分支选择，注释里提到 `it.fails` 也只是留痕，两者都不是降级。
  check(
    `${file} 无实际 it.fails( 调用`,
    !/it\.fails\s*\(/.test(read(file)),
    '已修能力的判据必须保持正向断言',
  );
}

// ── 3. 历史注释须显式标注，避免再次被当成现状 ────────────────
const signalTest = read(JUDGEMENTS[2]);
check(
  'signal 组件测试保留「历史·已修复」标注',
  signalTest.includes('【历史·已修复】'),
  '保留留痕但必须标明已修复',
);
check(
  'signal 组件测试的 KNOWN_FAIL 仍为空',
  /KNOWN_FAIL = new Set<string>\(\[\]\)/.test(signalTest),
);

console.log(
  ok ? '\n✅ check-stale-capability-claims 通过\n' : '\n❌ check-stale-capability-claims 失败\n',
);
process.exit(ok ? 0 : 1);
