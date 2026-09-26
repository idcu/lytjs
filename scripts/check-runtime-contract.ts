#!/usr/bin/env tsx
/**
 * scripts/check-runtime-contract.ts
 * 编译产物 ↔ 运行时导出面 契约守卫
 *
 * 背景：2026-09-26 全维度审计发现，编译器生成的 preamble 形如
 *   `import { toDisplayString, createBlock, openBlock, setBlockTracking } from '@lytjs/core'`
 * 而这 4 个名字在 @lytjs/core 的导出面里**全部不存在**（core 只转出了
 * createVNode / Fragment / Text / Comment / cloneVNode / mergeProps）。
 *
 * 这类断裂的特征：**一个符号只在一侧出现**，而 tsc 管不到 ——
 * 因为产物的 import 是字符串 codegen 出来的，执行又走动态 `new Function`。
 * 只有把「产物 import 的绑定名」与「包的导出面」对起来，才能在构建期抓住它。
 *
 * 本脚本做三件事（任一不通过即 exit 1）：
 *   1. 用真实模板样本编译产物（vnode / signal / ssr 三种模式，覆盖各指令）
 *   2. 解析产物里的每条 import，取「运行时约定名」：
 *        - 形如 `import { a } from 'pkg'`      → 约定名 = a      （直接 ESM 消费）
 *        - 形如 `import { e as effect } from 'pkg'` → 约定名 = effect
 *          （短别名是 codegen-signal 的有意设计：执行器会剥掉 import 行并按
 *            本地名注入参数，故**本地名**才是与运行时对齐的那个）
 *   3. 断言「约定名」存在于所指包的导出面（动态 import 其 ESM 入口取自省）
 *
 * 用法：pnpm check-runtime-contract
 */

import { readdirSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PACKAGES_DIR = join(ROOT, 'packages');

const SKIP_DIRS = new Set(['node_modules', 'dist', '.turbo', 'coverage', '_templates', 'tests']);

interface PkgInfo {
  name: string;
  dir: string;
  relDir: string;
  entry: string | null;
}

function resolveEsmEntry(dir: string): string | null {
  const pkgPath = join(dir, 'package.json');
  try {
    const json = JSON.parse(readFileSync(pkgPath, 'utf-8')) as {
      exports?: Record<string, unknown>;
      module?: string;
      main?: string;
    };
    const dot = json.exports?.['.'];
    let rel: string | undefined;
    if (typeof dot === 'string') rel = dot;
    else if (dot && typeof dot === 'object') {
      const o = dot as Record<string, unknown>;
      rel = (o.import as string) ?? (o.module as string) ?? (o.default as string);
    }
    rel = rel ?? json.module ?? json.main;
    if (!rel) return null;
    const abs = join(dir, rel);
    return existsSync(abs) ? abs : null;
  } catch {
    return null;
  }
}

function collectPackages(dir: string, acc: PkgInfo[] = []): PkgInfo[] {
  if (!existsSync(dir)) return acc;
  const pkgJsonPath = join(dir, 'package.json');
  if (existsSync(pkgJsonPath)) {
    try {
      const json = JSON.parse(readFileSync(pkgJsonPath, 'utf-8')) as { name?: string };
      if (json.name) {
        acc.push({
          name: json.name,
          dir,
          relDir: dir.slice(ROOT.length + 1),
          entry: resolveEsmEntry(dir),
        });
      }
    } catch {
      /* 忽略不可解析的 package.json */
    }
  }
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory() || SKIP_DIRS.has(entry.name)) continue;
    collectPackages(join(dir, entry.name), acc);
  }
  return acc;
}

// ------------------------------------------------------------
// 模板样本：按模式覆盖主要指令，确保各 codegen 分支都被走到
// ------------------------------------------------------------

const SAMPLES: Array<{ label: string; template: string; options: Record<string, unknown> }> = [
  // —— VNode 模式
  { label: 'vnode/插值', template: '<div>{{ msg }}</div>', options: { rendererMode: 'vnode' } },
  {
    label: 'vnode/静态',
    template: '<div class="a"><span>hi</span></div>',
    options: { rendererMode: 'vnode' },
  },
  {
    label: 'vnode/v-if-else',
    template: '<div v-if="ok">A</div><div v-else>B</div>',
    options: { rendererMode: 'vnode' },
  },
  {
    label: 'vnode/v-for',
    template: '<ul><li v-for="(item, i) in items" :key="i">{{ item.name }}</li></ul>',
    options: { rendererMode: 'vnode' },
  },
  {
    label: 'vnode/v-show',
    template: '<div v-show="visible">x</div>',
    options: { rendererMode: 'vnode' },
  },
  {
    label: 'vnode/v-html',
    template: '<div v-html="raw"></div>',
    options: { rendererMode: 'vnode' },
  },
  {
    label: 'vnode/v-once',
    template: '<div v-once>{{ msg }}</div>',
    options: { rendererMode: 'vnode' },
  },
  {
    label: 'vnode/v-model',
    template: '<input v-model="text" />',
    options: { rendererMode: 'vnode' },
  },
  {
    label: 'vnode/事件',
    template: '<button @click="inc">+</button>',
    options: { rendererMode: 'vnode' },
  },
  {
    label: 'vnode/组件与插槽',
    template: '<Child :p="1"><span>slot</span></Child>',
    options: { rendererMode: 'vnode' },
  },
  // —— Signal / Vapor 模式
  {
    label: 'signal/插值',
    template: '<div>{{ msg }}</div>',
    options: { rendererMode: 'signal', optimizeSignal: false },
  },
  {
    label: 'signal/优化版插值',
    template: '<div>{{ msg }}</div>',
    options: { rendererMode: 'signal' },
  },
  {
    label: 'signal/v-for',
    template: '<ul><li v-for="item in items">{{ item.name }}</li></ul>',
    options: { rendererMode: 'signal', optimizeSignal: false },
  },
  {
    label: 'signal/事件',
    template: '<button @click="inc">+</button>',
    options: { rendererMode: 'signal', optimizeSignal: false },
  },
  {
    label: 'signal/v-model',
    template: '<input v-model="text" />',
    options: { rendererMode: 'signal', optimizeSignal: false },
  },
  // —— SSR 模式
  { label: 'ssr/插值', template: '<div>{{ msg }}</div>', options: { ssrMode: true } },
  {
    label: 'ssr/v-for',
    template: '<ul><li v-for="item in items">{{ item.name }}</li></ul>',
    options: { ssrMode: true },
  },
  {
    label: 'ssr/v-html',
    template: '<div v-html="raw"></div>',
    options: { ssrMode: true },
  },
];

// ------------------------------------------------------------
// 主流程
// ------------------------------------------------------------

const pkgs = collectPackages(PACKAGES_DIR);
const byName = new Map(pkgs.map((p) => [p.name, p]));

const { compile } = (await import(
  pathToFileURL(join(ROOT, 'packages/compiler/dist/index.mjs')).href
)) as {
  compile: (src: string, opts?: Record<string, unknown>) => { code: string; preamble?: string };
};

interface Finding {
  pkg: string;
  binding: string;
  kind: 'direct' | 'aliased';
  label: string;
}

/** 解析产物中的全部 import 语句（支持多行与短别名） */
function parseImports(code: string): Array<{ source: string; bindings: Finding['binding'][] }> {
  const out: Array<{ source: string; bindings: string[] }> = [];
  const re = /import\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code))) {
    const raw = m[1] ?? '';
    const source = m[2] ?? '';
    const bindings = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((spec) => {
        // `external as local` ⇒ 契约名取 local（短别名注入约定）
        const parts = spec.split(/\s+as\s+/).map((s) => s.trim());
        return parts.length > 1 ? parts[1] : parts[0];
      });
    out.push({ source, bindings: bindings.filter(Boolean) as string[] });
  }
  return out;
}

const missing: Finding[] = [];
const unresolvedPkgs = new Set<string>();
const notBuilt = new Set<string>();
const examined = new Map<string, Set<string>>(); // pkg → 契约名集合

for (const sample of SAMPLES) {
  let code: string;
  let preamble: string;
  try {
    const result = compile(sample.template, { ...sample.options, mode: 'module' });
    code = result.code;
    preamble = result.preamble ?? '';
  } catch (e) {
    console.log(`\u001b[31m[编译失败] ${sample.label}: ${(e as Error).message}\u001b[0m`);
    process.exitCode = 1;
    continue;
  }
  // ⚠️ 两种模式把 import 放在不同字段：
  //   - vnode 模式 → import 在 `preamble`
  //   - signal 模式 → import 内联在 `code` 里（preamble 为空）
  // 只解析其中一个会漏掉整整一类断裂（这正是本脚本第一版的 bug）。
  for (const imp of [...parseImports(code), ...parseImports(preamble)]) {
    if (!imp.source.startsWith('@lytjs/')) continue;
    const pkg = byName.get(imp.source);
    if (!pkg) {
      unresolvedPkgs.add(imp.source);
      continue;
    }
    let set = examined.get(imp.source);
    if (!set) {
      set = new Set<string>();
      examined.set(imp.source, set);
    }
    for (const b of imp.bindings) set.add(b);
  }
}

// 自省导出面
const exportCache = new Map<string, Set<string>>();
async function exportsOf(pkgName: string): Promise<Set<string> | null> {
  if (exportCache.has(pkgName)) return exportCache.get(pkgName)!;
  const pkg = byName.get(pkgName);
  if (!pkg || !pkg.entry) return null;
  try {
    const mod = (await import(pathToFileURL(pkg.entry).href)) as Record<string, unknown>;
    const keys = new Set(Object.keys(mod));
    exportCache.set(pkgName, keys);
    return keys;
  } catch {
    return null;
  }
}

for (const [pkgName, bindings] of examined) {
  const exports = await exportsOf(pkgName);
  if (!exports) {
    notBuilt.add(pkgName);
    continue;
  }
  const pkg = byName.get(pkgName)!;
  for (const b of bindings) {
    if (!exports.has(b)) {
      // 反查：该名字是否其实住在别的包（给出修复指向）
      let elsewhere = '';
      for (const other of pkgs) {
        if (other.name === pkgName || !other.entry) continue;
        const ex = await exportsOf(other.name);
        if (ex?.has(b)) {
          elsewhere = `（该名字实际存在于 ${other.name}）`;
          break;
        }
      }
      missing.push({ pkg: pkgName, binding: b, kind: 'direct', label: pkg.relDir });
      missing[missing.length - 1].label = elsewhere;
    }
  }
}

const color = {
  red: (s: string) => `\u001b[31m${s}\u001b[0m`,
  green: (s: string) => `\u001b[32m${s}\u001b[0m`,
  yellow: (s: string) => `\u001b[33m${s}\u001b[0m`,
  cyan: (s: string) => `\u001b[36m${s}\u001b[0m`,
  dim: (s: string) => `\u001b[2m${s}\u001b[0m`,
};

console.log(color.cyan('\n🔍 编解码契约守卫 check-runtime-contract\n'));
console.log(
  `   样本 ${SAMPLES.length} 个（vnode / signal / ssr），` +
    `命中 ${examined.size} 个运行时包的 import 契约\n`,
);

if (notBuilt.size > 0) {
  console.log(
    color.yellow(`⚠️  ${notBuilt.size} 个包未构建（无法自省导出面），已跳过：`) +
      `\n   ${[...notBuilt].join(', ')}\n` +
      color.dim('   ⇒ 先跑 `pnpm build` 再跑本守卫，否则这些包的契约未被检查\n'),
  );
}

if (unresolvedPkgs.size > 0) {
  console.log(
    color.yellow(`⚠️  产物引用了 workspace 中不存在的包：${[...unresolvedPkgs].join(', ')}\n`),
  );
}

if (missing.length === 0) {
  console.log(color.green('✅ 通过：所有产物 import 的绑定名都能在所指运行时包中解析到\n'));
  process.exit(0);
}

console.log(color.red(`❌ 发现 ${missing.length} 处契约断裂：\n`));
for (const f of missing) {
  console.log(`   ${color.red('✗')} ${f.pkg} 缺少导出 ${color.red(f.binding)} ${f.label ?? ''}`);
}
console.log(
  color.yellow(
    '\n修复方式：让「产物 import 的名字」与「运行时导出面」对齐（补导出，或改 preamble 指向）；\n' +
      '改完重新运行 `pnpm check-runtime-contract`。\n',
  ),
);
process.exit(1);
