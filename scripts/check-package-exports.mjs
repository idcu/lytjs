#!/usr/bin/env node
/**
 * 发布产物体检：**每个包是否真的能被消费者使用**。
 *
 * 门禁里已有「dist 不早于 src」（`check-dist-freshness`），但那只保证**时间**新，
 * 不保证**能导入** —— 入口文件写错、`exports` 指向不存在的路径、产物导出为空，
 * 都会让消费者 `import` 直接失败，而单元测试（走源码 alias）完全发现不了。
 *
 * 本脚本对每个非 private 包检查四件事：
 *   1. `main` / `module` / `types` / `exports` 里声明的每个相对路径**文件存在**；
 *   2. 有类型声明入口（`.d.ts`）；
 *   3. CJS `require(name)` 成功；
 *   4. 导出非空（纯类型包除外 —— 见 `TYPE_ONLY_PACKAGES`）。
 *
 * 包目录从 `pnpm-workspace.yaml` 的 globs 派生（`release-set.mjs`），按绝对路径导入，
 * **不经过根 `node_modules/@lytjs`** —— 那个目录是 gitignored 的一次性手工链接，
 * 任何依赖它的判据都无法在干净 clone / CI / worktree 上复现（坑 gate-depends-on-manual-env）。
 *
 * 用法：`node scripts/check-package-exports.mjs`
 * 退出码 0 = 全部通过。
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { getReleasePackages } from './release-set.mjs';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const require = createRequire(join(ROOT, 'package.json'));

/**
 * 只导出类型、没有运行时值的包 —— 产物为空属**预期**。
 * 新增这类包时在这里登记，并在注释里写明原因。
 */
const TYPE_ONLY_PACKAGES = new Set([
  '@lytjs/host-contract', // 只有 interface，运行时无值
]);

/** CJS 入口：优先 `main`，退化到 `exports["."].require`；返回绝对路径 */
function cjsEntry(dir, pkg) {
  const dot = pkg.exports?.['.'];
  const fromExports =
    typeof dot === 'string' ? dot : dot && typeof dot.require === 'string' ? dot.require : null;
  const rel = typeof pkg.main === 'string' ? pkg.main : fromExports;
  // `main` 允许写成 `dist/index.cjs`（无 `./` 前缀，Node 同样接受）
  return rel && !rel.startsWith('/') ? join(dir, rel) : null;
}

const problems = [];
let checked = 0;

for (const { dir } of getReleasePackages(ROOT)) {
  const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf-8'));
  const name = pkg.name;
  checked++;

  // 1) 声明的入口文件必须存在
  const targets = [];
  for (const key of ['main', 'module', 'types', 'typings']) {
    if (typeof pkg[key] === 'string') targets.push(pkg[key]);
  }
  const stack = pkg.exports ? [pkg.exports] : [];
  while (stack.length) {
    const cur = stack.pop();
    if (typeof cur === 'string') targets.push(cur);
    else if (cur && typeof cur === 'object') stack.push(...Object.values(cur));
  }
  for (const t of targets) {
    if (typeof t !== 'string' || !t.startsWith('.')) continue;
    if (!existsSync(join(dir, t))) problems.push(`${name}: 声明的入口不存在 → ${t}`);
  }

  // 2) 类型声明入口
  const hasTypes =
    typeof pkg.types === 'string' ||
    typeof pkg.typings === 'string' ||
    (pkg.exports && JSON.stringify(pkg.exports).includes('.d.ts'));
  if (!hasTypes) problems.push(`${name}: 没有类型声明入口（types / exports.types）`);

  // 3) + 4) 能否 require，导出是否为空
  const entry = cjsEntry(dir, pkg);
  if (!entry) {
    problems.push(`${name}: 找不到 CJS 入口（main / exports["."].require）`);
    continue;
  }
  try {
    const mod = require(entry);
    const keys = Object.keys(mod || {});
    if (keys.length === 0 && !TYPE_ONLY_PACKAGES.has(name)) {
      problems.push(`${name}: require 成功但**导出为空**`);
    }
  } catch (err) {
    problems.push(`${name}: require 失败 → ${err.message.split('\n')[0].slice(0, 120)}`);
  }
}

if (problems.length === 0) {
  console.log(`✅ 通过：${checked} 个包的入口文件 / 类型声明 / 可导入性全部正常`);
  process.exit(0);
}

console.error(`❌ ${problems.length} 处问题（共检查 ${checked} 个包）：`);
for (const p of problems) console.error(`   ${p}`);
process.exit(1);
