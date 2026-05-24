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
  { name: '@lytjs/router', path: 'packages/ecosystem/packages/router' },
  { name: '@lytjs/ssr', path: 'packages/ecosystem/packages/ssr' },
  { name: '@lytjs/router-fs', path: 'packages/ecosystem/packages/router-fs' },
  { name: '@lytjs/api', path: 'packages/ecosystem/packages/api' },
  { name: '@lytjs/hmr', path: 'packages/ecosystem/packages/hmr' },
  { name: '@lytjs/plugin-chart', path: 'packages/plugins/packages/plugin-chart' },
];

const results: Array<{ name: string; success: boolean }> = [];

console.log(colorText(colors.bold, '\n🚀 构建失败的包\n'));

for (const pkg of failedPackages) {
  const fullPath = join(ROOT, pkg.path);
  
  logInfo(`正在构建: ${colorText(colors.bold, pkg.name)}`);
  
  try {
    const tsupEntry = join(ROOT, 'node_modules', 'tsup', 'dist', 'cli-default.js');
    execSync(`node "${tsupEntry}"`, {
      cwd: fullPath,
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'production',
      },
    });
    
    logSuccess(`构建成功: ${pkg.name}`);
    results.push({ name: pkg.name, success: true });
  } catch (error) {
    logError(`构建失败: ${pkg.name}`);
    results.push({ name: pkg.name, success: false });
  }
}

console.log('\n' + '='.repeat(60));
const successCount = results.filter(r => r.success).length;
const failCount = results.filter(r => !r.success).length;
console.log(`📊 统计: ${successCount} 成功, ${failCount} 失败`);
console.log('='.repeat(60) + '\n');

if (successCount === 6) {
  console.log(colorText(colors.bold, colors.green, '🎉 所有失败的包都构建成功！'));
}
