#!/usr/bin/env node
/**
 * 门禁：包依赖声明完整性
 *
 * ## 为什么需要这一项
 *
 * `tsup` 的默认行为：**`dependencies` / `peerDependencies` 里声明的包 → external；
 * 没声明的 → 打包进产物**。
 *
 * 于是一个「在源码里 import 了、但忘了写进 package.json」的包会被**静默内联**。
 * 后果不只是体积，而是**运行时出现两份模块实例**：
 *
 * ```ts
 * import { queuePreFlushCb } from '@lytjs/common-scheduler';   // 源码里有
 * // package.json 里没有 ⇒ tsup 内联一份到 vdom/dist
 * // ⇒ 应用里同时存在「vdom 内联的 scheduler」和「独立的 scheduler」
 * ```
 *
 * 两份实例意味着**所有模块级状态都不共享**：
 *   · `nextTick()` 的队列
 *   · `setErrorHandler()` 注册的处理器
 *   · `setMaxIterations()` 的上限
 *   · 任何 `let xxx = ...` 形式的单例
 *
 * ## 这个缺陷是怎么被发现的
 *
 * 2026-11-03 给 scheduler 加了「未处理错误必须留痕」的修复，重建 scheduler 后
 * **完全没生效**：`flushJobs` 里的新代码根本没跑。排查后才发现
 * `packages/vdom/dist/index.mjs` 里有一份 `function queuePreFlushCb` 的副本 ——
 * 因为 `@lytjs/common-scheduler` **不在 vdom 的 dependencies 里**。
 *
 * 这个缺陷极难察觉：所有测试都过（两份实例各跑各的，行为恰好一致），
 * 只有「跨包设置的状态」才会失效 —— 而那种失效是静默的。
 *
 * ## 为什么用 TypeScript 的 AST 而不是正则
 *
 * 第一版用正则扫 `from '@lytjs/...'`，18 条结果里一半是假阳性：
 *   · **codegen 里把 import 语句当字符串生成**（`const code = "import ... from '@lytjs/x'"`）
 *   · **注释里举例**的 import
 *   · `import type { X } from '@lytjs/core'` —— 类型导入在编译后**完全消失**，不产生实例
 * AST 能把这三类区分干净。
 *
 * ## 判据
 *
 * - **运行时导入**（`import ... from` / `import()` / `require()`）⇒ 必须在
 *   `dependencies` 或 `peerDependencies` 里，否则**报错**
 * - **纯类型导入**（`import type ...`，且该文件没有其它运行时导入）⇒ 只**提示**，
 *   不算失败（它不会造成实例重复，但确实缺少类型依赖声明）
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import ts from 'typescript';

const ROOT = process.cwd();
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', '.turbo', '.trash', 'coverage']);

// ── 收集所有包 ────────────────────────────────────────────
function findPackages() {
  const out = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    if (dir !== ROOT && entries.some((e) => e.name === 'package.json')) {
      try {
        const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
        if (pkg.name) out.push({ dir, name: pkg.name, pkg });
      } catch {
        /* ignore */
      }
    }
    for (const e of entries) {
      if (!e.isDirectory() || SKIP_DIRS.has(e.name)) continue;
      walk(join(dir, e.name));
    }
  };
  walk(join(ROOT, 'packages'));
  return out;
}

function collectSourceFiles(dir) {
  const srcDir = join(dir, 'src');
  if (!existsSync(srcDir)) return [];
  const files = [];
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (e.isDirectory()) {
        if (e.name === 'node_modules' || e.name === 'dist') continue;
        walk(join(d, e.name));
      } else if (/\.(ts|tsx|mts)$/.test(e.name) && !e.name.endsWith('.d.ts')) {
        files.push(join(d, e.name));
      }
    }
  };
  walk(srcDir);
  return files;
}

/** `@lytjs/foo/bar` → `@lytjs/foo` */
const pkgOf = (spec) => {
  const parts = spec.split('/');
  return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : spec;
};

/**
 * 解析一个文件里的模块引用。
 * @returns {{ runtime: Set<string>, typeOnly: Set<string> }}
 */
function collectImports(file) {
  const code = readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const runtime = new Set();
  const typeOnly = new Set();

  const visit = (node) => {
    // import ... from 'x'
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const spec = node.moduleSpecifier.text;
      if (spec.startsWith('@lytjs/')) {
        // `import type { X } from` ⇒ 纯类型；`import { type X } from` 仍是运行时导入（可能混有值）
        if (node.importClause?.isTypeOnly) typeOnly.add(pkgOf(spec));
        else runtime.add(pkgOf(spec));
      }
    }
    // import x = require('y')
    if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference) &&
      ts.isStringLiteral(node.moduleReference.expression)
    ) {
      const spec = node.moduleReference.expression.text;
      if (spec.startsWith('@lytjs/')) runtime.add(pkgOf(spec));
    }
    // import('y') / require('y')
    if (ts.isCallExpression(node) && node.arguments.length > 0) {
      const arg = node.arguments[0];
      const isDynamicImport = node.expression.kind === ts.SyntaxKind.ImportKeyword;
      const isRequire = ts.isIdentifier(node.expression) && node.expression.text === 'require';
      if ((isDynamicImport || isRequire) && ts.isStringLiteral(arg) && arg.text.startsWith('@lytjs/')) {
        runtime.add(pkgOf(arg.text));
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sf);
  return { runtime, typeOnly };
}

// ── 主流程 ────────────────────────────────────────────────
const packages = findPackages();
console.log(`扫描 ${packages.length} 个包（AST 解析）…\n`);

const errors = [];
const warnings = [];

for (const { dir, name, pkg } of packages) {
  const declared = new Set([
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.peerDependencies ?? {}),
  ]);

  for (const file of collectSourceFiles(dir)) {
    let imports;
    try {
      imports = collectImports(file);
    } catch {
      continue;
    }

    for (const spec of imports.runtime) {
      if (spec === name) continue;
      if (!declared.has(spec)) {
        errors.push({ pkg: name, spec, file: relative(ROOT, file), dir: relative(ROOT, dir) });
      }
    }
    for (const spec of imports.typeOnly) {
      if (spec === name) continue;
      if (imports.runtime.has(spec)) continue; // 已被运行时那条覆盖
      if (!declared.has(spec)) {
        warnings.push({ pkg: name, spec, file: relative(ROOT, file), dir: relative(ROOT, dir) });
      }
    }
  }
}

// ── 第二层：直接看产物里有没有**内联进来的单例包** ──────
//
// 第一层查的是「声明缺失」这个**成因**；这一层查的是「产物里真的多了一份」这个**症状**。
// 两者都要有：有人可能把声明补上了、但 tsup 的 external 漏了，产物照样内联。
//
// 只查「模块级状态」的包 —— 内联它们会造成**两份实例**，是真正的静默故障源。
// 纯函数包（common-is / common-string）内联只是体积问题，不在此列。
const SINGLETONS = [
  {
    name: '@lytjs/common-scheduler',
    // 该包内部函数名，内联后会以定义形式出现在别人产物里
    markers: ['function queuePreFlushCb', 'function flushJobs'],
    ownDir: 'packages/common/packages/scheduler',
  },
  {
    name: '@lytjs/reactivity',
    markers: ['class ReactiveEffect', 'function triggerRefValue'],
    ownDir: 'packages/reactivity',
  },
];

const inlined = [];

function scanDistForSingletons() {
  for (const pkg of packages) {
    for (const distName of ['index.mjs', 'index.cjs']) {
      const distPath = join(pkg.dir, 'dist', distName);
      if (!existsSync(distPath)) continue;
      const code = readFileSync(distPath, 'utf8');
      for (const single of SINGLETONS) {
        // 自己就是那个包 ⇒ 当然有，跳过
        if (relative(ROOT, pkg.dir) === single.ownDir) continue;
        const hit = single.markers.find((m) => code.includes(m));
        if (hit) {
          inlined.push({
            pkg: pkg.name,
            dep: single.name,
            file: relative(ROOT, distPath),
            marker: hit,
          });
        }
      }
    }
  }
}

scanDistForSingletons();

const group = (list) => {
  const m = new Map();
  for (const v of list) {
    const key = v.pkg;
    if (!m.has(key)) m.set(key, []);
    m.get(key).push(v);
  }
  return m;
};

if (warnings.length > 0) {
  console.log(`提示：${warnings.length} 处**纯类型**导入未声明（不产生实例重复，不判失败）：\n`);
  for (const [pkgName, list] of group(warnings)) {
    console.log(`  ${pkgName}  (${list[0].dir})`);
    for (const v of list) console.log(`    · ${v.spec}   ← ${v.file}`);
  }
  console.log('');
}

if (inlined.length > 0) {
  console.log(`❌ 发现 ${inlined.length} 处**单例包被内联**（产物里存在第二份实例）：\n`);
  for (const v of inlined) {
    console.log(`  ${v.pkg}`);
    console.log(`    · 产物里出现了 ${v.dep} 的实现（命中 \`${v.marker}\`）`);
    console.log(`      文件：${v.file}`);
  }
  console.log('');
}

if (errors.length === 0 && inlined.length === 0) {
  console.log('✅ 所有包的**运行时**导入都已在 package.json 中声明，且无单例包被内联');
  process.exit(0);
}

if (errors.length > 0) console.log(`❌ 发现 ${errors.length} 处「运行时 import 了、但没声明」的依赖：\n`);
for (const [pkgName, list] of group(errors)) {
  console.log(`  ${pkgName}  (${list[0].dir})`);
  for (const v of list) console.log(`    · ${v.spec}   ← ${v.file}`);
  console.log('');
}

console.log(
  [
    '为什么必须修：',
    '  tsup 会把**未声明**的依赖打包进产物 ⇒ 运行时出现第二份模块实例。',
    '  模块级状态（nextTick 队列 / setErrorHandler / 任何 let 单例）不再共享，',
    '  且这种失效是**静默**的 —— 所有测试都可能照常通过。',
    '',
    '修法：把缺失的包写进该包的 dependencies（workspace:*），并加进 tsup 的 external 列表。',
  ].join('\n'),
);

process.exit(1);
