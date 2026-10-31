#!/usr/bin/env tsx
/**
 * scripts/check-dist-freshness.ts
 *
 * 判据：**`dist` 必须比 `src` 新**。
 *
 * ## 为什么需要这条门禁（2026-10-31 新增）
 *
 * `vitest.config.ts` 的 47 条 `@lytjs/*` alias 全部指向 **dist**。
 * 于是「改了 src 不 build 就跑测试」时，测试跑的是**旧产物**：
 * 实测曾出现 `dist` 停在 10-27、`src` 已到 10-30 —— 27 批整改后
 * 全量测试仍然全绿，而发布物里 `v-html` 依然会崩。
 *
 * 也就是说：**测试绿证明的是产物，不是源码**。本守卫把这个缺口堵上。
 *
 * 退出码：0 = 全部新鲜；1 = 存在过期产物（列出具体包与时间差）。
 */
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const PACKAGES_DIR = join(ROOT, 'packages');

interface Stale {
  pkg: string;
  dist: string;
  srcNewest: string;
  lagHours: number;
}

function findPackageJson(dir: string, acc: string[] = [], depth = 0): string[] {
  if (depth > 4) return acc;
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return acc;
  }
  if (entries.includes('package.json') && entries.includes('src')) {
    acc.push(dir);
  }
  for (const name of entries) {
    if (name === 'node_modules' || name === 'dist' || name === 'src' || name.startsWith('.')) {
      continue;
    }
    const full = join(dir, name);
    try {
      if (statSync(full).isDirectory()) findPackageJson(full, acc, depth + 1);
    } catch {
      /* 忽略不可读目录 */
    }
  }
  return acc;
}

function newestMtime(dir: string): number {
  let newest = 0;
  const walk = (d: string) => {
    for (const name of readdirSync(d)) {
      const full = join(d, name);
      const st = statSync(full);
      if (st.isDirectory()) walk(full);
      else newest = Math.max(newest, st.mtimeMs);
    }
  };
  walk(dir);
  return newest;
}

const stale: Stale[] = [];
const checked: string[] = [];
const skipped: string[] = [];

for (const pkgDir of findPackageJson(PACKAGES_DIR)) {
  const distEntry = join(pkgDir, 'dist', 'index.mjs');
  if (!existsSync(distEntry)) {
    skipped.push(relative(ROOT, pkgDir));
    continue;
  }
  const distTime = statSync(distEntry).mtimeMs;
  const srcTime = newestMtime(join(pkgDir, 'src'));
  checked.push(relative(ROOT, pkgDir));
  if (srcTime > distTime + 1000) {
    stale.push({
      pkg: relative(ROOT, pkgDir),
      dist: new Date(distTime).toISOString().slice(0, 16).replace('T', ' '),
      srcNewest: new Date(srcTime).toISOString().slice(0, 16).replace('T', ' '),
      lagHours: Math.round(((srcTime - distTime) / 3600_000) * 10) / 10,
    });
  }
}

console.log('\n🔍 产物新鲜度守卫 check-dist-freshness\n');
console.log(
  `   已检查 ${checked.length} 个含 dist/index.mjs 的包（跳过 ${skipped.length} 个未构建包）`,
);

if (stale.length === 0) {
  console.log('\n✅ 通过：所有 dist 均不早于其 src\n');
  process.exit(0);
}

stale.sort((a, b) => b.lagHours - a.lagHours);
console.log(`\n❌ ${stale.length} 个包的 dist 落后于 src（测试会跑旧产物）：\n`);
for (const s of stale) {
  console.log(`   ${s.pkg}`);
  console.log(`     dist: ${s.dist}   src 最新: ${s.srcNewest}   落后 ${s.lagHours}h`);
}
console.log('\n   修法：`pnpm build`（或 `pnpm --filter <包名> run build`）\n');
process.exit(1);
