#!/usr/bin/env tsx

import { execSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function colorText(color: string, text: string): string {
  return `${color}${text}${colors.reset}`;
}

function logInfo(message: string): void {
  console.log(colorText(colors.cyan, `ℹ️  ${message}`));
}

function logSuccess(message: string): void {
  console.log(colorText(colors.green, `✅ ${message}`));
}

function logError(message: string): void {
  console.error(colorText(colors.red, `❌ ${message}`));
}

const failedPackages = [
  'packages/ecosystem/packages/router',
  'packages/ecosystem/packages/ssr',
  'packages/ecosystem/packages/api',
  'packages/ecosystem/packages/hmr',
  'packages/ecosystem/packages/router-fs',
];

interface BuildResult {
  name: string;
  path: string;
  success: boolean;
}

const results: BuildResult[] = [];

console.log(colorText(colors.bold, '\n🚀 构建之前失败的 5 个包\n'));

for (const pkgPath of failedPackages) {
  const fullPath = join(ROOT, pkgPath);
  const pkgName = pkgPath.split('/').pop() || pkgPath;
  
  logInfo(`正在构建: ${colorText(colors.bold, '@lytjs/' + pkgName)}`);
  logInfo(`路径: ${pkgPath}`);

  try {
    // 直接通过 node 运行根目录的 tsup
    const tsupEntry = join(ROOT, 'node_modules', 'tsup', 'dist', 'cli-default.js');
    execSync(`node "${tsupEntry}" --config tsup.config.ts`, {
      cwd: fullPath,
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'production',
      },
    });
    
    logSuccess(`构建成功: @lytjs/${pkgName}`);
    results.push({ name: '@lytjs/' + pkgName, path: pkgPath, success: true });
  } catch (error) {
    logError(`构建失败: @lytjs/${pkgName}`);
    results.push({ name: '@lytjs/' + pkgName, path: pkgPath, success: false });
  }
}

console.log('\n' + '='.repeat(60));
const successCount = results.filter(r => r.success).length;
const failCount = results.filter(r => !r.success).length;
console.log(`📊 统计: ${successCount} 成功, ${failCount} 失败`);
console.log('='.repeat(60) + '\n');

if (successCount === 5) {
  console.log(colorText(colors.bold, colors.green, '🎉 所有失败的包现在都构建成功！'));
}
