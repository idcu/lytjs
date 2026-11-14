#!/usr/bin/env node
/**
 * 门禁：覆盖率现场产物 + 双指纹 + 逐文件冻结清单（A11，2026-11-14 判据口径变更）
 *
 * ## 与旧版的关键差异
 *
 * 旧版读**受版本控制**的 `scripts/coverage-snapshot.json`，从不打开 `coverage/`：
 * 现场产物被删掉它照样绿，快照可以无限期陈旧；97.5% 的总额阈值等价于
 * 「最多 11 个文件可以整体不插桩」而结论不变。
 *
 * 现在本门禁**只读本次 test:coverage 生成的现场产物**，断言：
 *
 * 1. `coverage/coverage-final.json` 存在（否则红，提示重跑 test:coverage）；
 * 2. 其 sha256 == `coverage/snapshot.json` 里的 coverageSha256；
 * 3. 当前 `git rev-parse HEAD` == 快照里的 commit；
 *    —— 2/3 任一不符即红：「覆盖率产物与当前提交不匹配，请重跑 test:coverage」；
 * 4. 当前 src 文件集合中，所有**未被插桩**的文件必须全部出现在冻结清单
 *    `scripts/coverage-uninstrumented.json` 里；清单之外任何一个即红；
 * 5. 冻结清单里的每一条仍须处于「未插桩」状态（防清单腐烂）。
 *
 * 不再有总额阈值，也不再校验快照年龄 —— commit 必须等于当前 HEAD，
 * 年龄判定已由指纹判定取代。
 *
 * ## 用法
 *
 *   node scripts/check-coverage-snapshot.mjs
 *
 * 退出码：0 = 通过；1 = 有失败。
 */

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const COVERAGE_DIR = join(ROOT, 'coverage');
const FINAL_JSON = join(COVERAGE_DIR, 'coverage-final.json');
const SNAPSHOT_PATH = join(COVERAGE_DIR, 'snapshot.json');
const MANIFEST_PATH = join(ROOT, 'scripts', 'coverage-uninstrumented.json');

const fail = (msg) => {
  console.log(`  ❌ ${msg}`);
  return false;
};

console.log('\n🔍 覆盖率门禁 check-coverage-snapshot（现场产物口径）\n');

if (!existsSync(FINAL_JSON)) {
  fail(
    '缺少 coverage/coverage-final.json —— 本门禁只读本次现场产物，请先运行 ' +
      'pnpm run test:coverage -- --maxWorkers=2',
  );
  process.exit(1);
}
if (!existsSync(SNAPSHOT_PATH)) {
  fail(
    '缺少 coverage/snapshot.json —— 在 test:coverage 之后运行 node scripts/coverage-snapshot.mjs',
  );
  process.exit(1);
}
if (!existsSync(MANIFEST_PATH)) {
  fail('缺少冻结清单 scripts/coverage-uninstrumented.json');
  process.exit(1);
}

const coverageBytes = readFileSync(FINAL_JSON);
const coverage = JSON.parse(coverageBytes.toString('utf8'));
const snapshot = JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf8'));
const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();

let ok = true;

// ── 1. 双指纹 ────────────────────────────────────────────────
const coverageSha256 = createHash('sha256').update(coverageBytes).digest('hex');
console.log(`  产物 sha256     ${coverageSha256}`);
console.log(`  快照 sha256     ${snapshot.coverageSha256 ?? '(缺失)'}`);
console.log(`  当前 HEAD       ${head}`);
console.log(`  快照 commit     ${snapshot.commit ?? '(缺失)'}`);

const fingerprintMismatch = snapshot.coverageSha256 !== coverageSha256 || snapshot.commit !== head;
if (fingerprintMismatch) {
  ok = fail('覆盖率产物与当前提交不匹配，请重跑 test:coverage（并重新生成快照）');
}

// ── 2. 逐文件口径 ────────────────────────────────────────────
function collectSrcFiles(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', 'dist', 'coverage', '.tmp'].includes(entry.name)) continue;
      collectSrcFiles(full, acc);
      continue;
    }
    if (!entry.name.endsWith('.ts')) continue;
    if (
      entry.name.endsWith('.d.ts') ||
      entry.name.endsWith('.test.ts') ||
      entry.name.endsWith('.spec.ts')
    ) {
      continue;
    }
    if (!/[\\/]src[\\/]/.test(full)) continue;
    acc.push(relative(ROOT, full));
  }
  return acc;
}

const srcFiles = collectSrcFiles(join(ROOT, 'packages')).sort();
const instrumented = new Set(Object.keys(coverage).map((p) => relative(ROOT, p)));
const uninstrumented = srcFiles.filter((f) => !instrumented.has(f)).sort();
const frozen = new Set((manifest.files ?? []).map((e) => e.file));

console.log(`  src 文件        ${srcFiles.length}`);
console.log(`  已插桩          ${srcFiles.length - uninstrumented.length}`);
console.log(`  未插桩          ${uninstrumented.length}（冻结清单 ${frozen.size}）`);

const outside = uninstrumented.filter((f) => !frozen.has(f));
if (outside.length > 0) {
  ok = fail(
    `${outside.length} 个未插桩文件不在冻结清单内（清单外不允许整体不插桩）：\n      ` +
      outside.join('\n      '),
  );
}

const staleEntries = [...frozen].filter((f) => !uninstrumented.includes(f));
if (staleEntries.length > 0) {
  ok = fail(
    `${staleEntries.length} 个冻结清单条目已不再是未插桩状态（请更新清单，避免腐烂）：\n      ` +
      staleEntries.join('\n      '),
  );
}

// ── 3. 口径声明（N01 / ADR 0028）────────────────────────────
const { COVERAGE_BASIS, VALID_AUTHORITATIVE } = await import('./coverage-basis.mjs');
const declared = snapshot.basis;
console.log(`  口径声明        ${declared?.authoritative ?? '(缺失)'}`);
if (!declared || !VALID_AUTHORITATIVE.includes(declared.authoritative)) {
  ok = fail(
    `快照缺少合法 basis.authoritative（应为 ${VALID_AUTHORITATIVE.join(' / ')}）—— 重新运行 node scripts/coverage-snapshot.mjs`,
  );
} else if (
  declared.authoritative !== COVERAGE_BASIS.authoritative ||
  declared.rule !== COVERAGE_BASIS.rule
) {
  ok = fail('快照口径声明与 scripts/coverage-basis.mjs 真相源不一致（禁止手改快照）');
} else {
  console.log(`  对外口径        ${COVERAGE_BASIS.authoritativeLabel}`);
  console.log(`  辅助口径        ${COVERAGE_BASIS.auxiliaryLabel}`);
}

console.log(ok ? '\n✅ check-coverage-snapshot 通过\n' : '\n❌ check-coverage-snapshot 失败\n');
process.exit(ok ? 0 : 1);
