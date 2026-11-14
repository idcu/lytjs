#!/usr/bin/env node
/**
 * 7.0.0 迁移 codemod（6.9.6 → 7.0.0）
 *
 * 只做**机械可判定**的 import 改写；语义变化的条目会打印成 TODO，不猜。
 *
 * 用法：
 *   node scripts/codemod-v7.mjs <目录或文件...> --dry-run   # 默认
 *   node scripts/codemod-v7.mjs <目录或文件...> --write
 *
 * 覆盖：
 *   1. @lytjs/reactivity/{scope,async,signal}  → @lytjs/reactivity
 *   2. @lytjs/compiler 的 generateSignalOptimized → @lytjs/compiler/signal-optimized
 *      （并注入 registerSignalOptimizedGenerator()）
 *   3. @lytjs/shared-types 的 EventEmitter → @lytjs/common-events
 *   4. 删除 @lytjs/devtools/style.css 副作用导入
 *
 * 人工处理（仅提示）：
 *   - @lytjs/reactivity/signal-component（无替代）
 *   - @lytjs/vdom/transition 的 globalTransitionPrefix（读改 get / 写改 set）
 *   - @lytjs/shared-types 的 createEventEmitter（改 new EventEmitter()）
 *   - @lytjs/bundler 的 createWebpackPlugin（删除调用）
 *   - combineMiddlewares() 返回值（审计调用点）
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.vue']);
const WRITE = process.argv.includes('--write');
const roots = process.argv.slice(2).filter((a) => !a.startsWith('--'));

if (roots.length === 0) {
  console.error('用法：node scripts/codemod-v7.mjs <目录或文件...> [--write]');
  process.exit(2);
}

const stats = {
  files: 0,
  changed: 0,
  reactivity: 0,
  compiler: 0,
  sharedTypes: 0,
  devtoolsCss: 0,
  todos: 0,
};

/** 递归收集待处理文件 */
function walk(p, acc = []) {
  const st = statSync(p);
  if (st.isDirectory()) {
    for (const name of readdirSync(p)) {
      if (name === 'node_modules' || name === 'dist' || name === '.git') continue;
      walk(join(p, name), acc);
    }
  } else if (EXTS.has(extname(p))) {
    acc.push(p);
  }
  return acc;
}

const files = roots.flatMap((r) => walk(r));

function rewriteReactivity(src) {
  let out = src;
  for (const sub of ['scope', 'async', 'signal']) {
    const re = new RegExp(`(['"])@lytjs/reactivity/${sub}\\1`, 'g');
    if (re.test(out)) {
      out = out.replace(re, "'@lytjs/reactivity'");
      stats.reactivity += 1;
    }
  }
  return out;
}

function rewriteCompiler(src) {
  let out = src;
  const re = /import\s*\{([^}]*)\}\s*from\s*['"]@lytjs\/compiler['"];?/g;
  out = out.replace(re, (whole, names) => {
    const list = names
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!list.some((n) => n.split(/\s+as\s+/)[0] === 'generateSignalOptimized')) return whole;
    const rest = list.filter((n) => n.split(/\s+as\s+/)[0] !== 'generateSignalOptimized');
    let replacement = rest.length ? `import { ${rest.join(', ')} } from '@lytjs/compiler';\n` : '';
    replacement += `import { registerSignalOptimizedGenerator } from '@lytjs/compiler/signal-optimized';\n\nregisterSignalOptimizedGenerator();`;
    stats.compiler += 1;
    return replacement;
  });
  return out;
}

function rewriteSharedTypes(src) {
  let out = src;
  const re = /import\s*\{([^}]*)\}\s*from\s*['"]@lytjs\/shared-types['"];?/g;
  out = out.replace(re, (whole, names) => {
    const list = names
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!list.some((n) => n.split(/\s+as\s+/)[0] === 'EventEmitter')) return whole;
    const rest = list.filter((n) => n.split(/\s+as\s+/)[0] !== 'EventEmitter');
    const keep = rest.length ? `import { ${rest.join(', ')} } from '@lytjs/shared-types';\n` : '';
    stats.sharedTypes += 1;
    return `${keep}import { EventEmitter } from '@lytjs/common-events';`;
  });
  return out;
}

function removeDevtoolsCss(src) {
  const re = /^[ \t]*import\s+['"]@lytjs\/devtools\/style\.css['"];?[ \t]*\r?\n/gm;
  if (re.test(src)) {
    stats.devtoolsCss += 1;
    return src.replace(re, '');
  }
  return src;
}

const TODO_RULES = [
  [/@lytjs\/reactivity\/signal-component/, '反应式 signal-component 子路径已删除，无直接替代'],
  [
    /globalTransitionPrefix/,
    'globalTransitionPrefix 已删除：读用 getTransitionPrefix()，写用 setTransitionPrefix()',
  ],
  [/createEventEmitter/, 'createEventEmitter 已删除：改用 new EventEmitter()'],
  [/createWebpackPlugin/, 'createWebpackPlugin 已删除（Webpack 通路从未实现），删除调用'],
  [/combineMiddlewares/, 'combineMiddlewares() 现在可能返回 Response：审计返回值用法'],
];

for (const file of files) {
  stats.files += 1;
  let src = readFileSync(file, 'utf-8');
  const original = src;
  src = rewriteReactivity(src);
  src = rewriteCompiler(src);
  src = rewriteSharedTypes(src);
  src = removeDevtoolsCss(src);

  const todos = TODO_RULES.filter(([re]) => re.test(original)).map(([, msg]) => msg);
  if (todos.length) {
    stats.todos += todos.length;
    for (const msg of todos) console.log(`  [todo] ${file}: ${msg}`);
  }

  if (src !== original) {
    stats.changed += 1;
    console.log(`  ${WRITE ? '[write]' : '[diff]'} ${file}`);
    if (WRITE) writeFileSync(file, src);
  }
}

console.log(
  `\n${WRITE ? '已写入' : '预览'}：${stats.changed}/${stats.files} 个文件；` +
    `reactivity ${stats.reactivity}、compiler ${stats.compiler}、` +
    `shared-types ${stats.sharedTypes}、devtools-css ${stats.devtoolsCss}；` +
    `人工 TODO ${stats.todos} 条`,
);
if (!WRITE) console.log('加 --write 才会落盘。');
