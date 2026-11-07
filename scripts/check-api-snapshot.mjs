#!/usr/bin/env node
/**
 * scripts/check-api-snapshot.mjs
 *
 * API 快照门禁（S22 · slow 档）
 *
 * ## 判据
 *
 * 只比 **导出名**（不含签名）：对 14 个核心包 + 25 个生态包的
 * `dist/index.d.ts` 解析 `export { ... }` / `export type { ... }` 名单，
 * 与 `scripts/api-snapshot.json` 逐包比对。任何增删（含包级新增/缺失）
 * 都必须显式跑 `--update` 才能通过 —— 快照更新是一次需要 review 的动作，
 * 不允许「悄悄绿」。
 *
 * ## 为什么只比导出名
 *
 * 签名比对会随注释、类型别名展开、tsup 产物形态频繁漂移，噪声淹没信号；
 * 而「公开导出名消失」正是消费者 `import` 直接报错的那一类破坏。
 * 先锁名字，签名留给 type-check 与消费者 demo。
 *
 * ## 用法
 *
 *   node scripts/check-api-snapshot.mjs            # 比对，diff 即退出 1
 *   node scripts/check-api-snapshot.mjs --update   # 重写快照（需 review diff）
 *
 * 退出码：0 = 与快照一致；1 = 有 diff / 缺 dist。
 */

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SNAPSHOT = join(ROOT, 'scripts/api-snapshot.json');
const UPDATE = process.argv.includes('--update');

/** 解析 d.ts 的导出名：取 `as` 右侧公开名，剥掉 `type` 修饰，去重排序 */
function exportedNames(dts) {
  const names = new Set();
  for (const line of dts.split('\n')) {
    if (!/^export (?:type )?\{/.test(line)) continue;
    const m = line.match(/^export (?:type )?\{([\s\S]*?)\}/);
    if (!m) continue;
    for (let part of m[1].split(',')) {
      part = part.trim();
      if (!part) continue;
      part = part.replace(/^type\s+/, '');
      const i = part.lastIndexOf(' as ');
      names.add(i === -1 ? part : part.slice(i + 4).trim());
    }
  }
  return [...names].sort();
}

/** 收集范围内包：packages/<name>（14 核心）+ packages/ecosystem/**（25 生态） */
function collectPackages() {
  const hasSrc = (d) => existsSync(join(d, 'package.json')) && existsSync(join(d, 'src'));
  const core = readdirSync(join(ROOT, 'packages'))
    .map((n) => join(ROOT, 'packages', n))
    .filter((d) => {
      try {
        return statSync(d).isDirectory() && hasSrc(d);
      } catch {
        return false;
      }
    });
  const eco = [];
  const walk = (d) => {
    let entries;
    try {
      entries = readdirSync(d);
    } catch {
      return;
    }
    if (hasSrc(d)) eco.push(d);
    for (const n of entries) {
      if (n === 'node_modules' || n === 'dist' || n === 'src' || n.startsWith('.')) continue;
      const full = join(d, n);
      try {
        if (statSync(full).isDirectory()) walk(full);
      } catch {
        /* 忽略不可读目录 */
      }
    }
  };
  walk(join(ROOT, 'packages/ecosystem'));
  return [...core, ...eco]
    .map((d) => ({
      dir: d,
      name: JSON.parse(readFileSync(join(d, 'package.json'), 'utf-8')).name,
      dts: join(d, 'dist/index.d.ts'),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

const pkgs = collectPackages();
const current = {};
const missing = [];

for (const p of pkgs) {
  if (!existsSync(p.dts)) {
    missing.push(p.name);
    continue;
  }
  current[p.name] = exportedNames(readFileSync(p.dts, 'utf-8'));
}

if (missing.length > 0) {
  console.error(`\n❌ API 快照：${missing.length} 个包缺 dist/index.d.ts\n`);
  for (const n of missing) console.error(`   ${n}`);
  console.error('\n   修法：`pnpm build` 后重跑；快照不覆盖未构建包。\n');
  process.exit(1);
}

const totalNames = Object.values(current).reduce((n, names) => n + names.length, 0);

if (UPDATE) {
  const out = {
    updatedAt: new Date().toISOString().slice(0, 10),
    packages: current,
  };
  writeFileSync(SNAPSHOT, `${JSON.stringify(out, null, 2)}\n`);
  console.log(
    `\n✅ 已更新 ${SNAPSHOT}\n` +
      `   ${pkgs.length} 个包（核心 14 + 生态 25）/ ${totalNames} 个导出名\n` +
      '   ⚠️ 快照变更必须随提交 review：删名 = 破坏性变更。\n',
  );
  process.exit(0);
}

if (!existsSync(SNAPSHOT)) {
  console.error('\n❌ 缺少 scripts/api-snapshot.json —— 先跑 `--update` 并 review\n');
  process.exit(1);
}

const baseline = JSON.parse(readFileSync(SNAPSHOT, 'utf-8')).packages ?? {};
const diffs = [];

for (const name of Object.keys(current)) {
  if (!(name in baseline)) {
    diffs.push({ pkg: name, kind: '新增包', added: current[name], removed: [] });
    continue;
  }
  const now = new Set(current[name]);
  const before = new Set(baseline[name]);
  const added = [...now].filter((x) => !before.has(x));
  const removed = [...before].filter((x) => !now.has(x));
  if (added.length > 0 || removed.length > 0) {
    diffs.push({ pkg: name, kind: '导出面变更', added, removed });
  }
}
for (const name of Object.keys(baseline)) {
  if (!(name in current))
    diffs.push({ pkg: name, kind: '包已移除', added: [], removed: baseline[name] });
}

console.log(
  `\n🔍 API 快照：${pkgs.length} 个包（核心 14 + 生态 25）/ ${totalNames} 个导出名` +
    `（基线 ${Object.keys(baseline).length} 个包）\n`,
);

if (diffs.length === 0) {
  console.log('✅ 通过：导出名与 scripts/api-snapshot.json 完全一致\n');
  process.exit(0);
}

console.log(`❌ ${diffs.length} 个包的导出面与快照不一致：\n`);
for (const d of diffs) {
  console.log(`   ${d.pkg} — ${d.kind}`);
  for (const n of d.removed) console.log(`     - ${n}`);
  for (const n of d.added) console.log(`     + ${n}`);
}
console.log('\n   修法：确认变更符合预期后跑 `node scripts/check-api-snapshot.mjs --update`');
console.log('   （删名是破坏性变更，必须在提交说明里写清迁移方式）\n');
process.exit(1);
