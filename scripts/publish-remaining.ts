#!/usr/bin/env tsx
/**
 * 发布剩余的包
 */

import { execSync } from 'child_process';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync, unlinkSync, existsSync, readFileSync } from 'fs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');

const REMAINING_PACKAGES = [
  { name: '@lytjs/router', path: 'packages/ecosystem/packages/web-framework/packages/router' },
  { name: '@lytjs/ssr', path: 'packages/ecosystem/packages/ssr-kit/packages/ssr' },
  { name: '@lytjs/router-fs', path: 'packages/ecosystem/packages/web-framework/packages/router-fs' },
  { name: '@lytjs/api', path: 'packages/ecosystem/packages/web-framework/packages/api' },
  { name: '@lytjs/hmr', path: 'packages/ecosystem/packages/ssr-kit/packages/hmr' },
];

console.log('🚀 发布剩余的包\n');

function getToken(): string {
  const npmrcPublishPath = join(ROOT, '.npmrc_for_publish');
  if (existsSync(npmrcPublishPath)) {
    const content = readFileSync(npmrcPublishPath, 'utf-8');
    const tokenMatch = content.match(/\/\/registry\.npmjs\.org\/:_authToken=([^\s]+)/);
    if (tokenMatch) {
      console.log('✅ 从 .npmrc_for_publish 读取 token');
      return tokenMatch[1];
    }
  }

  if (process.env.NPM_TOKEN) {
    console.log('✅ 从环境变量 NPM_TOKEN 读取 token');
    return process.env.NPM_TOKEN;
  }

  throw new Error('未找到 npm token');
}

const success: string[] = [];
const failed: string[] = [];
const skipped: string[] = [];
const token = getToken();

const tempNpmrcPaths: string[] = [];

try {
  for (let i = 0; i < REMAINING_PACKAGES.length; i++) {
    const pkg = REMAINING_PACKAGES[i];
    const pkgPath = join(ROOT, pkg.path);
    const npmrcPath = join(pkgPath, '.npmrc');

    console.log(`\n📦 [${i + 1}/${REMAINING_PACKAGES.length}] 正在发布: ${pkg.name}`);
    console.log(`📍 路径: ${pkg.path}`);

    try {
      writeFileSync(
        npmrcPath,
        `registry=https://registry.npmjs.org/\n//registry.npmjs.org/:_authToken=${token}\n`,
      );
      tempNpmrcPaths.push(npmrcPath);

      execSync('npm publish --access=public --registry=https://registry.npmjs.org/', {
        cwd: pkgPath,
        stdio: 'inherit',
        env: {
          ...process.env,
          npm_config_registry: 'https://registry.npmjs.org/',
        },
      });

      console.log(`✅ 发布成功: ${pkg.name}`);
      success.push(pkg.name);
    } catch (e: unknown) {
      const errorMsg = (e as { message?: string }).message || String(e);
      if (errorMsg.includes('cannot publish over the previously published')) {
        console.log(`ℹ️  版本已存在，跳过: ${pkg.name}`);
        skipped.push(pkg.name);
      } else {
        console.log(`❌ 发布失败: ${pkg.name}`);
        console.log(`   ${errorMsg}`);
        failed.push(pkg.name);
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 800));
  }
} finally {
  console.log('\n🧹 清理临时文件...');
  for (const npmrcPath of tempNpmrcPaths) {
    if (existsSync(npmrcPath)) {
      try {
        unlinkSync(npmrcPath);
      } catch (_e) {
        // 忽略删除错误
      }
    }
  }
  console.log('✅ 临时文件已清理');
}

console.log('\n' + '='.repeat(80));
console.log('📊 发布结果汇总:');
console.log(`✅ 成功: ${success.length} 个包`);
console.log(`ℹ️  跳过: ${skipped.length} 个包`);
console.log(`❌ 失败: ${failed.length} 个包`);
if (success.length > 0) {
  console.log('\n✅ 成功的包:');
  console.log(success.map((name) => `  - ${name}`).join('\n'));
}
if (failed.length > 0) {
  console.log('\n❌ 失败的包:');
  console.log(failed.map((name) => `  - ${name}`).join('\n'));
}
console.log('='.repeat(80));
