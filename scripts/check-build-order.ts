#!/usr/bin/env tsx
/**
 * scripts/check-build-order.ts
 * 构建顺序守卫 —— 防止「新增包忘了登记 BUILD_ORDER」这类断链复发
 *
 * 背景：2026-08-18/19 抽出 @lytjs/config | di | plugin 后未登记构建顺序，
 * 导致这三个包的 dist 永不产出 → @lytjs/component 的 DTS 构建失败 →
 * @lytjs/core 失去 AppContext 类型 → 21 个包构建失败、38 个测试文件无法加载，
 * 而 build 脚本因为 --continue-on-error 仍然 exit 0，问题静默了 32 天。
 *
 * 本脚本做四件事（任一不通过即 exit 1）：
 *   1. 集合一致性：workspace 里的包必须都在 BUILD_ORDER 中
 *   2. 幽灵条目：BUILD_ORDER 中的条目必须真实存在且 package.json 的 name 对得上
 *   3. 依赖拓扑：任何 workspace 依赖必须排在自己之前
 *   4. 重复条目：同名包不得出现两次
 *
 * 用法：pnpm check-build-order
 */

import { readdirSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BUILD_ORDER } from './build-order';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PACKAGES_DIR = join(ROOT, 'packages');

const SKIP_DIRS = new Set(['node_modules', 'dist', '.turbo', 'coverage', '_templates', 'tests']);

interface PkgInfo {
  name: string;
  dir: string;
  relDir: string;
  deps: string[];
}

function collectPackages(dir: string, acc: PkgInfo[] = []): PkgInfo[] {
  if (!existsSync(dir)) return acc;

  const pkgJsonPath = join(dir, 'package.json');
  if (existsSync(pkgJsonPath)) {
    try {
      const json = JSON.parse(readFileSync(pkgJsonPath, 'utf-8')) as {
        name?: string;
        dependencies?: Record<string, string>;
        peerDependencies?: Record<string, string>;
      };
      if (json.name) {
        acc.push({
          name: json.name,
          dir,
          relDir: dir.slice(ROOT.length + 1),
          deps: [
            ...Object.keys(json.dependencies ?? {}),
            ...Object.keys(json.peerDependencies ?? {}),
          ],
        });
      }
    } catch {
      // 忽略无法解析的 package.json
    }
  }

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory() || SKIP_DIRS.has(entry.name)) continue;
    collectPackages(join(dir, entry.name), acc);
  }
  return acc;
}

const workspacePkgs = collectPackages(PACKAGES_DIR);
const byName = new Map(workspacePkgs.map((p) => [p.name, p]));
const orderIndex = new Map<string, number>();
const problems: string[] = [];

// 4. 重复条目
const seen = new Set<string>();
for (const [i, entry] of BUILD_ORDER.entries()) {
  if (seen.has(entry.name)) {
    problems.push(`[重复条目] ${entry.name} 在 BUILD_ORDER 中出现多次（第 ${i + 1} 条再次出现）`);
  }
  seen.add(entry.name);
  if (!orderIndex.has(entry.name)) orderIndex.set(entry.name, i);
}

// 1. 集合一致性：workspace → BUILD_ORDER
const missing = workspacePkgs.filter((p) => !orderIndex.has(p.name)).map((p) => p);
for (const p of missing) {
  problems.push(
    `[漏登记] ${p.name}（${p.relDir}）不在 BUILD_ORDER 中 —— 它的 dist 永远不会产出，` +
      `依赖它的包会拿到缺失的 .d.ts 而构建失败`,
  );
}

// 2. 幽灵条目：BUILD_ORDER → 磁盘
for (const [i, entry] of BUILD_ORDER.entries()) {
  const abs = join(ROOT, entry.path);
  if (!existsSync(abs)) {
    problems.push(`[路径不存在] 第 ${i + 1} 条 ${entry.name} → ${entry.path} 目录不存在`);
    continue;
  }
  const jsonPath = join(abs, 'package.json');
  if (!existsSync(jsonPath)) {
    problems.push(
      `[缺 package.json] 第 ${i + 1} 条 ${entry.name} → ${entry.path} 下没有 package.json`,
    );
    continue;
  }
  try {
    const actual = (JSON.parse(readFileSync(jsonPath, 'utf-8')) as { name?: string }).name;
    if (actual !== entry.name) {
      problems.push(
        `[名称不符] 第 ${i + 1} 条写的是 ${entry.name}，但 ${entry.path}/package.json 的 name 是 ${actual}`,
      );
    }
  } catch {
    problems.push(`[解析失败] ${entry.path}/package.json 无法解析`);
  }
}

// 3. 依赖拓扑
const violations: string[] = [];
for (const [i, entry] of BUILD_ORDER.entries()) {
  const pkg = byName.get(entry.name);
  if (!pkg) continue;
  for (const dep of pkg.deps) {
    if (!byName.has(dep)) continue;
    const depIdx = orderIndex.get(dep);
    if (depIdx === undefined) continue;
    if (depIdx > i) {
      violations.push(
        `[顺序倒置] ${entry.name}（第 ${i + 1} 条）依赖 ${dep}（第 ${depIdx + 1} 条），` +
          `依赖应排在前面；冷构建时 ${entry.name} 会因拿不到 ${dep} 的类型声明而失败`,
      );
    }
  }
}

const color = {
  red: (s: string) => `\u001b[31m${s}\u001b[0m`,
  green: (s: string) => `\u001b[32m${s}\u001b[0m`,
  yellow: (s: string) => `\u001b[33m${s}\u001b[0m`,
  cyan: (s: string) => `\u001b[36m${s}\u001b[0m`,
};

console.log(color.cyan('\n🔍 构建顺序守卫 check-build-order\n'));
console.log(
  `   packages/ 下共 ${workspacePkgs.length} 个包，BUILD_ORDER 共 ${BUILD_ORDER.length} 条\n`,
);

const all = [...problems, ...violations];
if (all.length === 0) {
  console.log(color.green('✅ 通过：集合一致、无幽灵条目、无顺序倒置、无重复\n'));
  process.exit(0);
}

console.log(color.red(`❌ 发现 ${all.length} 处问题：\n`));
for (const p of all) console.log(`  ${p}`);
console.log(
  color.yellow(
    '\n修复方式：编辑 scripts/build-order.ts（构建顺序单一真相源），' +
      '把漏掉的包按依赖关系插到正确位置；改完重新运行 `pnpm check-build-order`。\n',
  ),
);
process.exit(1);
