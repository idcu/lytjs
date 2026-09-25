#!/usr/bin/env node
/**
 * 为仓库根目录建立 `@lytjs/*` 符号链接（供 examples/ 等「仓库内消费方」解析）。
 *
 * 背景：本仓库是 **private 聚合仓**，根 package.json 并不依赖任何子包，
 * 因此 pnpm 不会在**根** node_modules 下创建 `@lytjs/*`；
 * 子包之间靠各自的 `workspace:*` 依赖互相链接。
 * 结果是：在 `examples/xxx` 里 `import '@lytjs/core-signal'` 会解析失败。
 *
 * 本脚本扫描所有 workspace 包的 name（如 `@lytjs/core-signal`），
 * 在 `node_modules/@lytjs/` 下建立同名符号链接指向对应包目录。
 * 幂等：已存在则跳过。
 *
 * 用法：
 *   node scripts/link-workspace-packages.mjs
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const LINK_DIR = path.join(ROOT, 'node_modules', '@lytjs');

/** 递归收集 package.json 路径（跳过 node_modules / dist） */
function collectPackageJsons(dir, out = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    if (e.name === 'node_modules' || e.name === 'dist' || e.name === '.git') continue;
    const full = path.join(dir, e.name);
    if (fs.existsSync(path.join(full, 'package.json'))) out.push(path.join(full, 'package.json'));
    collectPackageJsons(full, out);
  }
  return out;
}

const pkgs = new Map(); // name -> dir
for (const pj of collectPackageJsons(path.join(ROOT, 'packages'))) {
  try {
    const d = JSON.parse(fs.readFileSync(pj, 'utf-8'));
    if (typeof d.name === 'string' && d.name.startsWith('@lytjs/')) {
      pkgs.set(d.name, path.dirname(pj));
    }
  } catch {
    /* 忽略无法解析的 package.json */
  }
}

fs.mkdirSync(LINK_DIR, { recursive: true });

let made = 0;
let skipped = 0;
for (const [name, dir] of pkgs) {
  const short = name.slice('@lytjs/'.length);
  const link = path.join(LINK_DIR, short);
  if (fs.existsSync(link) || fs.lstatSync(link, { throwIfNoEntry: false })) {
    skipped++;
    continue;
  }
  try {
    fs.symlinkSync(path.resolve(ROOT, dir), link, 'dir');
    made++;
  } catch (err) {
    console.warn(`  跳过 ${name}: ${err.message}`);
  }
}

console.log(
  `[link-workspace] @lytjs 包 ${pkgs.size} 个 —— 新建链接 ${made}，已存在 ${skipped}（目录 ${path.relative(ROOT, LINK_DIR)}）`,
);
if (pkgs.size === 0) {
  console.warn('[link-workspace] 未发现任何 @lytjs 包，请确认在仓库根目录执行。');
}
