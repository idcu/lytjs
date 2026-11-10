#!/usr/bin/env node
/**
 * 示例可用性守卫 check-examples
 *
 * ## 为什么需要它
 *
 * `examples/` 是用户「第一眼看到的代码」。它比 README 更有说服力 ——
 * 用户会直接复制粘贴。但示例**不在任何门禁覆盖范围内**：
 *   · check-package-exports 只看 packages/ 的产物
 *   · check-consumer-demo 只看一个内联的合成应用
 *   · 全仓测试不跑 examples/
 *
 * 后果实测（2026-11-02 审查）：28 个示例文件里 15 个有问题，
 * 其中 10 个「高」——包括 import 了 8 个**已被迁出主仓**的插件包
 * （@lytjs/plugin-theme / plugin-form / ... 现位于独立仓库 lytjs-plugins）。
 * 这类示例打开就是 `Failed to resolve import`，但没有任何门禁会红。
 *
 * ## 本守卫检查什么（只做**可判定**的事）
 *
 * 1. 示例里所有 `@lytjs/*` 裸导入，必须能在本仓 `node_modules/@lytjs/` 下解析到
 *    （`@lytjs/plugin-*` 已迁出 ⇒ 引用了就是断的，必须改掉或标注）。
 * 2. 示例不得用相对路径穿透到包源码（`../../src/...`）——那绕过了发布产物，
 *    用户复制过去必然跑不起来。
 *
 * ## 刻意**不**检查什么
 *
 * 「是否用 createApp 挂载」这类风格问题**不做自动判定**：
 * 用 `@lytjs/reactivity` + 手写 DOM 在语义上是合法的（响应式是独立可用的），
 * 自动判「必须 createApp」会产生大量误报。这类问题写进 examples/README.md 说明。
 *
 * ## 判据
 *
 * 退出码 0 = 所有示例的 @lytjs 导入均可解析，且无穿透源码的相对导入。
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = dirname(dirname(fileURLToPath(import.meta.url)));
const EXAMPLES = join(REPO, 'examples');
const NM_SCOPE = join(REPO, 'node_modules', '@lytjs');

const EXTS = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx', '.html']);
// 扫描时跳过的目录（构建产物、依赖）
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git']);

/** 递归收集示例源文件 */
function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else if (EXTS.has(entry.name.slice(entry.name.lastIndexOf('.')))) {
      out.push(full);
    }
  }
  return out;
}

/**
 * 提取一个文件里所有的模块说明符。
 * 覆盖：ESM import / export from / 动态 import() / CJS require()
 */
function extractSpecifiers(src) {
  const specs = new Set();
  const patterns = [
    // import ... from 'x'  /  import 'x'
    /\bfrom\s*['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /\bimport\s+['"]([^'"]+)['"]/g,
    /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(src)) !== null) specs.add(m[1]);
  }
  return specs;
}

/** 取 @lytjs 包名（含 scope），非 @lytjs 返回 null */
function lytjsPackageOf(spec) {
  if (!spec.startsWith('@lytjs/')) return null;
  const parts = spec.split('/');
  return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : spec;
}

const files = walk(EXAMPLES);
const missingPkg = new Map(); // pkg -> Set(file)
const srcPenetration = new Map(); // file -> Set(spec)
const resolvedPkgs = new Set();

for (const file of files) {
  const src = readFileSync(file, 'utf8');
  for (const spec of extractSpecifiers(src)) {
    // ① @lytjs 裸导入必须能解析
    const pkg = lytjsPackageOf(spec);
    if (pkg) {
      const dir = join(NM_SCOPE, pkg.slice('@lytjs/'.length));
      if (existsSync(dir)) {
        resolvedPkgs.add(pkg);
      } else {
        if (!missingPkg.has(pkg)) missingPkg.set(pkg, new Set());
        missingPkg.get(pkg).add(file);
      }
      continue;
    }

    // ② 不得相对穿透到 packages/ 源码
    if (spec.startsWith('.')) {
      const target = join(dirname(file), spec);
      // 解析到 packages/ 下、且不是 dist 产物 ⇒ 穿透源码
      if (/[/\\]packages[/\\]/.test(target) && !/[/\\]dist[/\\]/.test(target)) {
        if (!srcPenetration.has(file)) srcPenetration.set(file, new Set());
        srcPenetration.get(file).add(spec);
      }
    }
  }
}

// ── 报告 ────────────────────────────────────────────────────
console.log('🔍 示例可用性守卫 check-examples\n');
console.log(`   扫描 ${files.length} 个示例源文件`);
console.log(`   解析到 ${resolvedPkgs.size} 个 @lytjs 包\n`);

let fail = 0;

if (missingPkg.size > 0) {
  fail += missingPkg.size;
  console.log('❌ 引用了本仓不存在的 @lytjs 包（打开即 Failed to resolve import）：\n');
  for (const [pkg, fileSet] of [...missingPkg].sort()) {
    console.log(`   ${pkg}`);
    for (const f of [...fileSet].sort()) {
      console.log(`     ← ${relative(REPO, f)}`);
    }
  }
  console.log(
    '\n   修法：改用主仓已有包，或删除该依赖。\n' +
      '   注：@lytjs/plugin-* 已于 2026-09-21 迁出主仓（见 packages/plugins/README.md），\n' +
      '   主仓示例不应再 import 它们。\n',
  );
}

if (srcPenetration.size > 0) {
  fail += srcPenetration.size;
  console.log('❌ 用相对路径穿透到包源码（绕过发布产物，用户复制必跑不起来）：\n');
  for (const [file, specs] of [...srcPenetration].sort()) {
    console.log(`   ${relative(REPO, file)}`);
    for (const s of [...specs].sort()) console.log(`     ← ${s}`);
  }
  console.log('');
}

// ── N18：独立示例工程必须真的加载主入口，且有行为判据 ──────────
// `vite build` 绿不代表应用跑起来了：2026-11-10 实测 using-lytjs-as-dep 的
// index.html 只有内联计数器，main.js 从未被引用，产物 10.88 KB、TodoApp 完全
// 缺席。这类「自证式假绿」必须靠结构判据拦住，而不是等用户打开页面才发现。
const standalone = [];
for (const entry of readdirSync(EXAMPLES, { withFileTypes: true })) {
  if (!entry.isDirectory() || SKIP_DIRS.has(entry.name)) continue;
  const dir = join(EXAMPLES, entry.name);
  if (existsSync(join(dir, 'package.json'))) standalone.push(dir);
}
for (const dir of standalone) {
  const label = relative(REPO, dir);
  const htmlPath = join(dir, 'index.html');
  const html = existsSync(htmlPath) ? readFileSync(htmlPath, 'utf8') : '';
  const srcs = [...html.matchAll(/<script[^>]*\bsrc=["']([^"']+)["']/g)].map((m) => m[1]);
  const local = srcs.filter((s) => s.startsWith('/') && !s.startsWith('//'));

  if (local.length === 0) {
    fail += 1;
    console.log(`❌ ${label}/index.html 没有加载任何项目内主入口（构建绿但应用不加载）\n`);
  }
  for (const s of local) {
    if (!existsSync(join(dir, s.slice(1)))) {
      fail += 1;
      console.log(`❌ ${label}/index.html 引用了不存在的入口 ${s}\n`);
    }
  }

  const tests = readdirSync(dir).filter((f) => /\.test\.(ts|js|mjs)$/.test(f));
  if (tests.length === 0) {
    fail += 1;
    console.log(`❌ ${label} 是独立示例工程却没有行为判据（*.test.ts）\n`);
  } else {
    console.log(
      `   ✅ ${label} 主入口 ${local.join(', ') || '(无)'}，行为判据 ${tests.join(', ')}`,
    );
  }
}

if (fail === 0) {
  console.log('✅ 通过：所有示例的 @lytjs 导入均可解析，无穿透源码的相对导入\n');
} else {
  console.log(`❌ ${fail} 类问题\n`);
}

process.exit(fail === 0 ? 0 : 1);
