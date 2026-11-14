#!/usr/bin/env node
/**
 * scripts/check-runtime-version.mjs
 * 运行时版本号一致性：
 *   1. `@lytjs/ui` 的 dist 产物导出的 `version` 必须等于其 package.json.version；
 *   2. 发布集内任何包的 src 不得把**自己的当前版本号**写成 `version: '<x.y.z>'` 字面量。
 *
 * 背景：ui 的插件对象曾手写 `version: '6.9.6'`，发版后必然漂移；改为 tsup define
 * 从 package.json 注入 `__UI_VERSION__`。判据 2 防止同类常量再次出现（协议版本、
 * 模板版本等与包版本无关的字面量不受影响）。
 *
 * 负控：只改 ui/package.json.version 而不重建 dist ⇒ 本门禁必须 exit 1。
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { extname, join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { getReleasePackages, ROOT } from './release-set.mjs';

const failures = [];
const uiDir = join(ROOT, 'packages/ecosystem/packages/ui');
const uiPkg = JSON.parse(readFileSync(join(uiDir, 'package.json'), 'utf-8'));

function exportedVersion(mod, label) {
  const plugin = mod.LytUI ?? mod.default;
  if (!plugin || typeof plugin.version !== 'string') {
    failures.push(`${label} 产物未导出 LytUI.version`);
    return undefined;
  }
  return plugin.version;
}

let esmVersion;
try {
  esmVersion = exportedVersion(
    await import(pathToFileURL(join(uiDir, 'dist/index.mjs')).href),
    'ESM',
  );
} catch (error) {
  failures.push(`ESM 产物无法导入：${error.message}`);
}

let cjsVersion;
try {
  const require = createRequire(import.meta.url);
  cjsVersion = exportedVersion(require(join(uiDir, 'dist/index.cjs')), 'CJS');
} catch (error) {
  failures.push(`CJS 产物无法导入：${error.message}`);
}

for (const [label, actual] of [
  ['ESM', esmVersion],
  ['CJS', cjsVersion],
]) {
  if (actual !== undefined && actual !== uiPkg.version) {
    failures.push(
      `${label} 导出版本 ${actual} ≠ package.json ${uiPkg.version}（只改版本未重建？）`,
    );
  }
}

function walk(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(file));
    else if (['.ts', '.tsx'].includes(extname(entry.name)) && !entry.name.endsWith('.d.ts')) {
      out.push(file);
    }
  }
  return out;
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const offenders = [];
for (const pkg of getReleasePackages()) {
  if (!pkg.version) continue;
  const re = new RegExp(`\\bversion\\s*:\\s*['"\`]${escapeRegExp(pkg.version)}['"\`]`);
  for (const file of walk(join(pkg.dir, 'src'))) {
    if (re.test(readFileSync(file, 'utf-8'))) {
      offenders.push(`${pkg.name} (${relative(ROOT, file)})`);
    }
  }
}
for (const item of offenders) {
  failures.push(`src 内硬编码自身版本号：${item}`);
}

if (failures.length > 0) {
  console.error(`\n❌ 运行时版本号门禁失败（${failures.length} 项）`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(
  `✅ @lytjs/ui dist 版本 ${uiPkg.version} 与 package.json 一致（ESM + CJS）；` +
    `发布集 ${getReleasePackages().length} 包 src 无自身版本号硬编码`,
);
