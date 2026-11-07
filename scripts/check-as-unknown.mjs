#!/usr/bin/env node
/**
 * `as unknown as` 棘轮（S22）
 *
 * ## 为什么需要它
 *
 * 双断言 `as unknown as` 是类型系统的旁路：它让类型不匹配静默通过，且不会在
 * `type-check` 里留下任何痕迹。S22 目标是「只减不增」，但一次性改 300 多处不现实，
 * 所以先把现状固化为基线，拦住新增。
 *
 * ## 判定口径
 *
 * - 范围：`packages/<pkg>/src/<file>.ts`（不含 `*.test.ts` / `*.d.ts` / tests 目录）；
 * - 每个文件次数与 `scripts/as-unknown-baseline.json` 比较；
 * - 任何文件次数**高于**基线 ⇒ 红；总数高于基线 ⇒ 红；
 * - 次数下降不报红，但提示可下调基线（`--update` 手动刷新）。
 *
 * 用法：
 *   node scripts/check-as-unknown.mjs            # 校验
 *   node scripts/check-as-unknown.mjs --update   # 按当前状态刷新基线（只应在减少时执行）
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const BASELINE = join(ROOT, 'scripts/as-unknown-baseline.json');
const SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  'coverage',
  '.turbo',
  'cache',
  'tests',
  '__tests__',
]);

function walk(dir, out = []) {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    if (ent.name.startsWith('.')) continue;
    const p = join(dir, ent.name);
    if (ent.isDirectory()) {
      if (!SKIP_DIRS.has(ent.name)) walk(p, out);
    } else {
      out.push(p);
    }
  }
  return out;
}

function isCandidate(p) {
  const rel = relative(ROOT, p).split('\\').join('/');
  return (
    rel.startsWith('packages/') &&
    rel.includes('/src/') &&
    p.endsWith('.ts') &&
    !/\.test\.ts$/.test(p) &&
    !/\.d\.ts$/.test(p)
  );
}

const counts = {};
let total = 0;
for (const file of walk(join(ROOT, 'packages')).filter(isCandidate)) {
  const rel = relative(ROOT, file).split('\\').join('/');
  const n = (readFileSync(file, 'utf-8').match(/as unknown as/g) ?? []).length;
  if (n > 0) {
    counts[rel] = n;
    total += n;
  }
}

if (process.argv.includes('--update')) {
  const files = Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(
    BASELINE,
    `${JSON.stringify({ updatedAt: new Date().toISOString().slice(0, 10), total, files }, null, 2)}\n`,
  );
  console.log(
    `已更新 ${relative(ROOT, BASELINE)}：${Object.keys(files).length} 个文件 / ${total} 处`,
  );
  process.exit(0);
}

if (!existsSync(BASELINE)) {
  console.error(`❌ 缺少基线：${relative(ROOT, BASELINE)}（先运行 --update）`);
  process.exit(1);
}
const baseline = JSON.parse(readFileSync(BASELINE, 'utf-8'));

console.log(`🔍 as unknown as 棘轮`);
console.log(`  当前：${total} 处 / ${Object.keys(counts).length} 个文件`);
console.log(`  基线：${baseline.total} 处 / ${Object.keys(baseline.files).length} 个文件`);

const increases = [];
for (const [file, now] of Object.entries(counts)) {
  const base = baseline.files[file] ?? 0;
  if (now > base) increases.push(`${file}：${base} → ${now}`);
}

if (increases.length > 0 || total > baseline.total) {
  console.error(`❌ 只减不增被破坏：`);
  if (total > baseline.total) console.error(`   - 总数：${baseline.total} → ${total}`);
  for (const line of increases) console.error(`   - ${line}`);
  process.exit(1);
}

if (total < baseline.total) {
  console.log(`ℹ️ 已少于基线（${baseline.total} → ${total}），可运行 --update 下调`);
}
console.log('✅ 通过：未新增 as unknown as');
