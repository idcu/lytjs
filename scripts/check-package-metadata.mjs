#!/usr/bin/env node
/**
 * 包元数据口径门禁（S28）
 *
 * ## 为什么需要它
 *
 * 76 个内部包的 `package.json` 长期各写各的：`exports` 的键序、`sideEffects` 的取值、
 * `files` 的清单都在包之间漂移。这些字段**不会让任何单测或行为门禁变红** ——
 * 打包器仍能解析、消费者仍能 import，坏处只在边缘：tree-shaking 少一个包、
 * 发布产物多/少文件、审阅时无法一眼看出差异。所以口径必须机械化。
 *
 * ## 判据（每条都写清判断依据）
 *
 * 1. **exports 键序**
 *    - `"."` 必须是第一个键（消费者默认入口，先读它才有可预期的 fallback 顺序）；
 *    - 其余子路径按 ASCII 字典序（不按业务重要性排序，才能稳定判死）；
 *    - `"./package.json"` 必须最后（它是元数据逃生门，不属于业务子路径）；
 *    - 每个条件对象必须是 `types → import → require`（类型解析优先，CJS/ESM 双入口）。
 * 2. **sideEffects**
 *    - 纯 JS 包必须是 `false`：允许打包器安全 tree-shake；
 *    - 产物含 `.css`（exports 里出现 `.css` 路径）的包必须是 `["**\/*.css"]`：
 *      CSS 导入是真实副作用，不能声明 false；
 *    - 本仓只有 `@lytjs/ui` 属于后者（`src/index.ts` 导入 `styles/index.css`）。
 * 3. **files**
 *    - 统一 `["dist", "src", ...bin 入口]`：`dist` 是发布产物、`src` 让 sourcemap
 *      的 `sources` 路径可解析；`README.md` / `LICENSE` 由 npm 自动包含，不重复列；
 *    - `bin` 声明的可执行文件必须显式列入（否则 `lyt create` 装完后命令不存在）。
 * 4. **pnpm 版本单源**
 *    - 只允许 root `package.json` 的 `packageManager` 出现 `pnpm@x.y.z`；
 *    - root `engines.pnpm` 不得与 `packageManager` 重复声明；
 *    - workflow / gate / 本地验证脚本 / keel 操作手册不得硬编码版本，
 *      一律用 `corepack pnpm` 或 `pnpm/action-setup@v4` 读取 `packageManager`。
 *
 * 用法：`node scripts/check-package-metadata.mjs`（fast 档，只读源码）
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const problems = [];
const add = (msg) => problems.push(msg);
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

/** 收集 packages/ 下所有含 package.json 的包目录（与 check-package-exports 同口径） */
function collectPackageDirs() {
  const dirs = [];
  const walk = (dir, depth) => {
    if (depth > 5 || !existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (['node_modules', 'dist', '.git'].includes(entry.name)) continue;
      const p = join(dir, entry.name);
      if (!entry.isDirectory()) continue;
      if (existsSync(join(p, 'package.json'))) dirs.push(p);
      walk(p, depth + 1);
    }
  };
  walk(join(ROOT, 'packages'), 0);
  return dirs.sort();
}

/** 递归收集 exports 里的所有字符串值（判断是否声明了 `.css` 子路径） */
function collectStrings(value, out = []) {
  if (typeof value === 'string') out.push(value);
  else if (value && typeof value === 'object') {
    for (const v of Object.values(value)) collectStrings(v, out);
  }
  return out;
}

// ── 4. pnpm 版本单源 ───────────────────────────────────────────
const rootPkg = readJson(join(ROOT, 'package.json'));
const packageManager = rootPkg.packageManager;
if (typeof packageManager !== 'string' || !/^pnpm@\d+\.\d+\.\d+$/.test(packageManager)) {
  add('root package.json 的 packageManager 必须是 pnpm@x.y.z（pnpm 版本的唯一真源）');
}
if (rootPkg.engines && Object.prototype.hasOwnProperty.call(rootPkg.engines, 'pnpm')) {
  add('root package.json 的 engines.pnpm 与 packageManager 重复声明，删除 engines.pnpm');
}

const HARDCODE_RE = /pnpm@\d+\.\d+\.\d+/;
const SINGLE_SOURCE_FILES = [
  'scripts/gate.mjs',
  'scripts/verify-baseline.sh',
  'keel/checks/rules.md',
  'keel/env/setup.md',
  'keel/skills/gate-runner.md',
  'keel/skills/no-global-pnpm-commit.md',
  'keel/decisions/0008-env-failure-not-code-defect.md',
];
for (const rel of SINGLE_SOURCE_FILES) {
  const path = join(ROOT, rel);
  if (!existsSync(path)) continue;
  if (HARDCODE_RE.test(readFileSync(path, 'utf8'))) {
    add(
      `${rel}: 硬编码 pnpm 版本，改为引用 root packageManager（corepack pnpm / action-setup 默认读取）`,
    );
  }
}

const WORKFLOW_DIR = join(ROOT, '.github/workflows');
if (existsSync(WORKFLOW_DIR)) {
  for (const name of readdirSync(WORKFLOW_DIR)) {
    if (!/\.(yml|yaml)$/.test(name)) continue;
    const text = readFileSync(join(WORKFLOW_DIR, name), 'utf8');
    if (HARDCODE_RE.test(text)) {
      add(
        `.github/workflows/${name}: 硬编码 pnpm 版本，改为省略 version（action-setup 读取 packageManager）`,
      );
    }
    if (text.includes('PNPM_VERSION')) {
      add(`.github/workflows/${name}: 不允许 PNPM_VERSION 多源，删除该 env`);
    }
    if (/uses:\s*pnpm\/action-setup@[^\n]*\n(?:[ \t]*with:\n)?[ \t]+version:/.test(text)) {
      add(`.github/workflows/${name}: pnpm/action-setup 不得显式指定 version`);
    }
  }
}

// ── 1~3. 76 个包的 exports / sideEffects / files ───────────────
let checked = 0;
for (const dir of collectPackageDirs()) {
  const pkg = readJson(join(dir, 'package.json'));
  if (pkg.private) continue;
  checked += 1;
  const label = `${pkg.name}（${relative(ROOT, dir)}）`;

  // 1. exports 键序与条件顺序
  const exp = pkg.exports;
  if (!exp || typeof exp !== 'object' || Array.isArray(exp)) {
    add(`${label}: 缺少 exports 对象`);
  } else {
    const keys = Object.keys(exp);
    if (!keys.includes('.')) add(`${label}: exports 缺少 "." 默认入口`);
    else if (keys[0] !== '.') add(`${label}: exports 的 "." 必须是第一个键`);

    const middle = keys.filter((k) => k !== '.' && k !== './package.json');
    if (middle.join('\u0000') !== [...middle].sort(cmp).join('\u0000')) {
      add(`${label}: exports 子路径必须按字典序，实际 ${middle.join(' → ')}`);
    }
    if (keys.includes('./package.json') && keys[keys.length - 1] !== './package.json') {
      add(`${label}: exports 的 "./package.json" 必须是最后一个键`);
    }

    const WANTED = ['types', 'import', 'require'];
    for (const [key, value] of Object.entries(exp)) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
      const ck = Object.keys(value);
      if (ck.length !== WANTED.length || !WANTED.every((k, i) => ck[i] === k)) {
        add(
          `${label}: exports["${key}"] 条件键必须是 ${WANTED.join(' → ')}，实际 ${ck.join(' → ')}`,
        );
      }
    }
  }

  // 2. sideEffects：纯包 false；发 CSS 的包 ["**/*.css"]
  const hasCss = collectStrings(exp ?? {}).some((s) => s.endsWith('.css'));
  if (hasCss) {
    if (JSON.stringify(pkg.sideEffects) !== '["**/*.css"]') {
      add(`${label}: 含 CSS 产物，sideEffects 必须是 ["**/*.css"]`);
    }
  } else if (pkg.sideEffects !== false) {
    add(`${label}: 纯 JS 包 sideEffects 必须是 false（实际 ${JSON.stringify(pkg.sideEffects)}）`);
  }

  // 3. files：["dist","src",...bin]
  const binTargets = Object.values(pkg.bin ?? {}).map((s) => String(s).replace(/^\.\//, ''));
  const expectedFiles = ['dist', 'src', ...binTargets];
  if (!Array.isArray(pkg.files)) {
    add(`${label}: 缺少 files 字段`);
  } else if (JSON.stringify(pkg.files) !== JSON.stringify(expectedFiles)) {
    add(
      `${label}: files 必须为 ${JSON.stringify(expectedFiles)}（README/LICENSE 由 npm 自动包含），实际 ${JSON.stringify(pkg.files)}`,
    );
  }
}

if (problems.length === 0) {
  console.log(
    `✅ 通过：${checked} 个包的 exports / sideEffects / files 口径一致，pnpm 版本单源（${packageManager}）`,
  );
  process.exit(0);
}

console.error(`❌ ${problems.length} 处不一致（共检查 ${checked} 个包）：`);
for (const p of problems) console.error(`   ${p}`);
process.exit(1);
