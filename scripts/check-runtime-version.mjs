#!/usr/bin/env node
/**
 * scripts/check-runtime-version.mjs
 * 运行时版本号一致性：
 *   1. `@lytjs/ui` 的 dist 产物导出的 `version` 必须等于其 package.json.version；
 *   2. `@lytjs/cli` 的 dist 产物执行 `--version`（ESM 与 CJS 各一次）的输出必须等于
 *      `LytJS CLI v<package.json.version>`；
 *   3. 发布集内任何包的 src 不得把**自己的当前版本号**写成 `version: '<x.y.z>'` 字面量。
 *
 * 背景：ui 的插件对象曾手写 `version: '6.9.6'`，发版后必然漂移；改为 tsup define
 * 从 package.json 注入 `__UI_VERSION__`。cli 的 `--version` 曾因运行时读 package.json
 * 失败而静默回落到 `FALLBACK_VERSION = '6.9.6'`，同类修法改用 `__CLI_VERSION__`
 * 构建期注入并删掉回落常量。判据 3 防止同类常量再次出现（协议版本、模板版本等与
 * 包版本无关的字面量不受影响）。
 *
 * 负控：只改 ui 或 cli 的 package.json.version 而不重建 dist ⇒ 本门禁必须 exit 1。
 */
import { spawnSync } from 'node:child_process';
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

// ---- @lytjs/cli：在 dist 上执行 `--version`，ESM / CJS 各一次 ----
const cliDir = join(ROOT, 'packages/tools/packages/cli');
const cliPkg = JSON.parse(readFileSync(join(cliDir, 'package.json'), 'utf-8'));
const expectedCliVersion = `LytJS CLI v${cliPkg.version}`;

function checkCliVersion(kind) {
  // ESM 产物的入口守卫在 ESM 作用域下恒为 false（`module` 不存在），直接执行不会跑 CLI；
  // 因此显式 import dist 后调用 runCli(['--version'])，判的仍是 dist 产物本身。
  const args =
    kind === 'CJS'
      ? [join(cliDir, 'dist/index.cjs'), '--version']
      : [
          '--input-type=module',
          '-e',
          `const m = await import(${JSON.stringify(
            pathToFileURL(join(cliDir, 'dist/index.mjs')).href,
          )}); await m.runCli(['--version']);`,
        ];
  const r = spawnSync(process.execPath, args, { cwd: cliDir, encoding: 'utf-8' });
  if (r.status !== 0) {
    failures.push(
      `cli ${kind} \`--version\` 执行失败（exit ${r.status ?? 'null'}）：` +
        `${(r.stderr || r.stdout || '').trim() || '<无输出>'}`,
    );
    return;
  }
  const actual = (r.stdout || '').trim();
  if (actual !== expectedCliVersion) {
    failures.push(
      `cli ${kind} \`--version\` 输出 "${actual}" ≠ "${expectedCliVersion}"（只改版本未重建？）`,
    );
  }
}

checkCliVersion('ESM');
checkCliVersion('CJS');

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
    `@lytjs/cli dist \`--version\` = "${expectedCliVersion}"（ESM + CJS）；` +
    `发布集 ${getReleasePackages().length} 包 src 无自身版本号硬编码`,
);
