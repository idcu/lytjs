#!/usr/bin/env node
/**
 * 门禁：锁文件与 workspace 依赖声明一致（P0-1）
 *
 * ## 为什么需要这一项
 *
 * `pnpm install --frozen-lockfile` 是验证链的第一环。它一失败，
 * type-check / lint / test 全都起不来 —— 而失败原因是「package.json 改了、
 * pnpm-lock.yaml 没跟着提交」。这类漂移不会有任何测试发现，只会在别人
 * （或 CI）跑安装时炸掉。
 *
 * 本门禁直接比对 **workspace 每个 package.json 的依赖 specifier** 与
 * **pnpm-lock.yaml 的 importers 段**，不依赖网络、不改 node_modules。
 *
 * ## 判据（任一成立即失败）
 *
 * 1. package.json 里声明的依赖在 lockfile importer 里缺失；
 * 2. specifier 不一致（例如 package.json 写 `workspace:^`，lockfile 仍是 `workspace:*`）；
 * 3. lockfile importer 里有、package.json 里已删除的依赖（删依赖没刷新锁文件）；
 * 4. workspace 里的 package.json 在 lockfile 里没有对应 importer（新包没刷新锁文件）。
 *
 * ## 用法
 *
 *   node scripts/check-lockfile.mjs                # 语义一致性（fast 档）
 *   node scripts/check-lockfile.mjs --require-clean # 额外要求锁文件无未提交改动（CI 用）
 *
 * ## 注入验证（硬约束 2/8）
 *
 * 手动给任一包 package.json 增删依赖而不刷新锁文件，本门禁必须变红：
 *   node scripts/check-lockfile.mjs   # 退出码 1，并打印包名与依赖名
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
const DEP_FIELDS = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'];

const problems = [];
const addProblem = (msg) => problems.push(msg);

/** 去掉 YAML 的单/双引号包裹（lockfile 里的包名与 specifier 可能被引号包住） */
function unquote(raw) {
  const s = raw.trim();
  if (s.length >= 2 && ((s[0] === "'" && s.at(-1) === "'") || (s[0] === '"' && s.at(-1) === '"'))) {
    return s.slice(1, -1).replace(/''/g, "'");
  }
  return s;
}

/** 解析 pnpm-lock.yaml 的 importers 段（lockfileVersion 9.0 的固定缩进结构） */
function parseImporters(lockText) {
  const importers = new Map();
  let inImporters = false;
  let importer = null;
  let field = null;
  let dep = null;

  for (const line of lockText.split('\n')) {
    if (!inImporters) {
      if (line.trimEnd() === 'importers:') inImporters = true;
      continue;
    }
    // 顶层键（顶格且非空行）标志 importers 段结束
    if (line.length > 0 && line[0] !== ' ') break;
    if (line.trim() === '') continue;

    const indent = line.length - line.trimStart().length;
    const text = line.trim();

    if (indent === 2 && text.endsWith(':')) {
      importer = Object.fromEntries(DEP_FIELDS.map((f) => [f, {}]));
      importers.set(unquote(text.slice(0, -1)), importer);
      field = null;
      dep = null;
    } else if (indent === 4 && text.endsWith(':')) {
      const name = text.slice(0, -1);
      field = DEP_FIELDS.includes(name) ? name : null;
      dep = null;
    } else if (indent === 6 && text.endsWith(':') && importer && field) {
      dep = unquote(text.slice(0, -1));
      importer[field][dep] = { specifier: null };
    } else if (indent === 8 && importer && field && dep) {
      const m = text.match(/^specifier:\s*(.*)$/);
      if (m) importer[field][dep].specifier = unquote(m[1]);
    }
  }
  return importers;
}

/** 读取 pnpm-workspace.yaml 的 packages 段（只支持本仓使用的「字面量 + 单层 *」形态） */
function parseWorkspacePatterns(workspaceYaml) {
  const patterns = [];
  let inPackages = false;
  for (const line of workspaceYaml.split('\n')) {
    if (/^packages:\s*$/.test(line)) {
      inPackages = true;
      continue;
    }
    if (!inPackages) continue;
    if (line.length > 0 && !line.startsWith(' ')) break; // 下一个顶层键
    const m = line.match(/^\s*-\s*(.*)$/);
    if (m) patterns.push(unquote(m[1]));
  }
  return patterns;
}

/** 把 workspace 模式展开成实际目录（只支持整段 `*`，避免引入 glob 依赖） */
function expandPatterns(patterns) {
  const dirs = new Set();
  const walk = (segments, base) => {
    if (segments.length === 0) {
      dirs.add(base);
      return;
    }
    const [head, ...rest] = segments;
    if (head === '*') {
      let entries = [];
      try {
        entries = readdirSync(base);
      } catch {
        return;
      }
      for (const entry of entries) {
        if (entry === 'node_modules') continue;
        const next = join(base, entry);
        try {
          if (!statSync(next).isDirectory()) continue;
        } catch {
          continue;
        }
        walk(rest, next);
      }
      return;
    }
    walk(rest, join(base, head));
  };
  for (const p of patterns) walk(p.split('/').filter(Boolean), ROOT);
  return dirs;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

const lockPath = join(ROOT, 'pnpm-lock.yaml');
let lockText;
try {
  lockText = readFileSync(lockPath, 'utf8');
} catch {
  console.error('❌ 找不到 pnpm-lock.yaml');
  process.exit(1);
}

const importers = parseImporters(lockText);
const patterns = parseWorkspacePatterns(readFileSync(join(ROOT, 'pnpm-workspace.yaml'), 'utf8'));
const workspaceDirs = expandPatterns(patterns);
workspaceDirs.add(ROOT);

const seenImporters = new Set();
const projectKeys = [];
for (const dir of workspaceDirs) {
  const pkgPath = join(dir, 'package.json');
  let pkg;
  try {
    pkg = readJson(pkgPath);
  } catch {
    continue; // 模式命中了目录但没有 package.json
  }
  if (!pkg.name) continue;
  const key = relative(ROOT, dir) || '.';
  projectKeys.push(key);
  const importer = importers.get(key);
  if (!importer) {
    addProblem(
      `workspace 包 ${pkg.name}（${key}）在 pnpm-lock.yaml 中没有 importer —— 新增包后未刷新锁文件`,
    );
    continue;
  }
  seenImporters.add(key);

  for (const field of DEP_FIELDS) {
    const declared = pkg[field] ?? {};
    const locked = importer[field] ?? {};
    for (const [name, specifier] of Object.entries(declared)) {
      const entry = locked[name];
      if (!entry) {
        addProblem(
          `${pkg.name} 的 ${field} 声明了 ${name}@${specifier}，但锁文件里没有 —— 请运行 pnpm install 并同提交`,
        );
      } else if (entry.specifier !== specifier) {
        addProblem(
          `${pkg.name} 的 ${field}.${name} specifier 不一致：package.json=${specifier}，lockfile=${entry.specifier}`,
        );
      }
    }
    for (const name of Object.keys(locked)) {
      if (!(name in declared)) {
        addProblem(
          `${pkg.name} 的锁文件 ${field} 里仍有 ${name}，但 package.json 已删除 —— 删依赖后未刷新锁文件`,
        );
      }
    }
  }
}

for (const key of importers.keys()) {
  if (!seenImporters.has(key) && !projectKeys.includes(key)) {
    addProblem(`pnpm-lock.yaml 有 importer ${key}，但 workspace 里找不到对应 package.json`);
  }
}

if (process.argv.includes('--require-clean')) {
  const r = spawnSync('git', ['diff', '--quiet', '--', 'pnpm-lock.yaml'], { cwd: ROOT });
  if (r.status !== 0) {
    addProblem(
      'pnpm-lock.yaml 在工作区有未提交改动（--require-clean）—— 锁文件必须与 package.json 同提交',
    );
  }
}

console.log('锁文件一致性检查（package.json 依赖声明 ↔ pnpm-lock.yaml importers）\n');
console.log(`  workspace 包：${projectKeys.length} · lockfile importers：${importers.size}`);

if (problems.length === 0) {
  console.log('\n✅ 通过：锁文件与所有 package.json 依赖声明一致\n');
  process.exit(0);
}

console.log(`\n❌ 失败：${problems.length} 处不一致\n`);
for (const p of problems) console.log(`   • ${p}`);
console.log('');
process.exit(1);
