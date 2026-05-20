#!/usr/bin/env node

import { readdir, readFile, writeFile, stat } from 'fs/promises';
import { join } from 'path';

const ROOT = process.cwd();
const VERSION = '6.4.0';

const PACKAGE_DIRS = [
  'packages/core',
  'packages/core-signal',
  'packages/core-vnode',
  'packages/reactivity',
  'packages/vdom',
  'packages/compiler',
  'packages/component',
  'packages/renderer',
  'packages/dom',
  'packages/web',
  'packages/dom-runtime',
  'packages/adapter-web',
  'packages/shared-types',
  'packages/host-contract',
  'packages/common',
  'packages/plugins',
  'packages/ecosystem/packages/router',
  'packages/ecosystem/packages/store',
  'packages/ecosystem/packages/ssr',
  'packages/ecosystem/packages/ui',
  'packages/ecosystem/packages/devtools',
  'packages/ecosystem/packages/compat',
  'packages/ecosystem/packages/platform-adapter',
];

async function checkPackage(pkgDir) {
  const results = {
    name: '',
    path: pkgDir,
    hasReadme: false,
    hasChangelog: false,
    readmeChinese: false,
    changelogChinese: false,
    versionInReadme: null,
    versionInChangelog: null,
    needsUpdate: [],
  };

  // 读取 package.json
  try {
    const pkgPath = join(ROOT, pkgDir, 'package.json');
    const pkg = JSON.parse(await readFile(pkgPath, 'utf-8'));
    results.name = pkg.name || 'unknown';
  } catch (e) {
    results.name = 'N/A';
  }

  // 检查 README.md
  const readmePath = join(ROOT, pkgDir, 'README.md');
  try {
    await stat(readmePath);
    results.hasReadme = true;
    const content = await readFile(readmePath, 'utf-8');

    // 检查是否中文
    const chineseRatio = (content.match(/[\u4e00-\u9fa5]/g) || []).length / content.length;
    results.readmeChinese = chineseRatio > 0.3;

    // 检查版本号
    const versionMatch = content.match(/(?:v)?(\d+\.\d+\.\d+)/);
    if (versionMatch) {
      results.versionInReadme = versionMatch[1];
      if (versionMatch[1] !== VERSION) {
        results.needsUpdate.push('README.md 版本号');
      }
    }

    if (!results.readmeChinese) {
      results.needsUpdate.push('README.md 需要翻译成中文');
    }
  } catch (e) {
    // README 不存在
  }

  // 检查 CHANGELOG.md
  const changelogPath = join(ROOT, pkgDir, 'CHANGELOG.md');
  try {
    await stat(changelogPath);
    results.hasChangelog = true;
    const content = await readFile(changelogPath, 'utf-8');

    // 检查是否中文
    const chineseRatio = (content.match(/[\u4e00-\u9fa5]/g) || []).length / content.length;
    results.changelogChinese = chineseRatio > 0.3;

    // 检查版本号
    const versionMatch = content.match(/#{1,3}\s*\[?(\d+\.\d+\.\d+)\]?/);
    if (versionMatch) {
      results.versionInChangelog = versionMatch[1];
      if (versionMatch[1] !== VERSION) {
        results.needsUpdate.push('CHANGELOG.md 版本号');
      }
    }

    if (!results.changelogChinese) {
      results.needsUpdate.push('CHANGELOG.md 需要翻译成中文');
    }
  } catch (e) {
    // CHANGELOG 不存在
  }

  return results;
}

async function main() {
  console.log('📋 LytJS 文档检查报告\n');
  console.log('='.repeat(80));

  const allResults = [];

  for (const pkgDir of PACKAGE_DIRS) {
    const result = await checkPackage(pkgDir);
    allResults.push(result);
  }

  // 输出检查结果
  let needsUpdate = 0;

  for (const r of allResults) {
    const status = r.needsUpdate.length > 0 ? '⚠️' : '✅';
    console.log(`\n${status} ${r.name}`);
    console.log(`   路径: ${r.path}`);

    if (r.hasReadme) {
      console.log(
        `   README: ${r.readmeChinese ? '中文' : '英文'} ${r.versionInReadme ? `(v${r.versionInReadme})` : ''}`,
      );
    } else {
      console.log(`   README: ❌ 不存在`);
      r.needsUpdate.push('缺少 README.md');
    }

    if (r.hasChangelog) {
      console.log(
        `   CHANGELOG: ${r.changelogChinese ? '中文' : '英文'} ${r.versionInChangelog ? `(v${r.versionInChangelog})` : ''}`,
      );
    } else {
      console.log(`   CHANGELOG: ❌ 不存在`);
      r.needsUpdate.push('缺少 CHANGELOG.md');
    }

    if (r.needsUpdate.length > 0) {
      needsUpdate++;
      console.log(`   需要更新:`);
      r.needsUpdate.forEach((u) => console.log(`      - ${u}`));
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log(`\n📊 统计:`);
  console.log(`   总包数: ${allResults.length}`);
  console.log(`   需要更新: ${needsUpdate}`);
  console.log(`   无需更新: ${allResults.length - needsUpdate}`);

  // 统计缺少文档的包
  const noReadme = allResults.filter((r) => !r.hasReadme).map((r) => r.name);
  const noChangelog = allResults.filter((r) => !r.hasChangelog).map((r) => r.name);

  if (noReadme.length > 0) {
    console.log(`\n⚠️ 缺少 README.md 的包 (${noReadme.length}):`);
    noReadme.forEach((n) => console.log(`   - ${n}`));
  }

  if (noChangelog.length > 0) {
    console.log(`\n⚠️ 缺少 CHANGELOG.md 的包 (${noChangelog.length}):`);
    noChangelog.forEach((n) => console.log(`   - ${n}`));
  }

  console.log('\n✅ 检查完成！\n');
}

main().catch(console.error);
