const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 检查开发环境配置...\n');

function checkCommand(cmd, name, options = {}) {
  try {
    const result = execSync(cmd, { encoding: 'utf-8', stdio: 'pipe', ...options });
    console.log(`✅ ${name}: ${result.trim()}`);
    return { success: true, output: result.trim() };
  } catch (e) {
    console.log(`❌ ${name}: 未找到或配置错误`);
    return { success: false, error: e.message };
  }
}

function checkPath(p, name) {
  if (fs.existsSync(p)) {
    console.log(`✅ ${name}: ${p}`);
    return true;
  }
  console.log(`❌ ${name}: 路径不存在 - ${p}`);
  return false;
}

console.log('📦 Node.js 相关检查\n' + '─'.repeat(50));

// Node.js
const nodeCheck = checkCommand('node --version', 'Node.js');

// npm
if (nodeCheck.success) {
  checkCommand('npm --version', 'npm');
  try {
    console.log('   npm prefix:', execSync('npm config get prefix', { encoding: 'utf-8' }).trim());
    console.log('   npm cache:', execSync('npm config get cache', { encoding: 'utf-8' }).trim());
    console.log('   npm registry:', execSync('npm config get registry', { encoding: 'utf-8' }).trim());
  } catch (e) {
    console.log('   npm config: 无法获取配置');
  }
}

// pnpm
console.log('\n📦 pnpm 相关检查\n' + '─'.repeat(50));
const pnpmCheck = checkCommand('pnpm --version', 'pnpm');
if (pnpmCheck.success) {
  try {
    console.log('   pnpm global-dir:', execSync('pnpm config get global-dir', { encoding: 'utf-8' }).trim());
    console.log('   pnpm store-dir:', execSync('pnpm config get store-dir', { encoding: 'utf-8' }).trim());
    console.log('   pnpm registry:', execSync('pnpm config get registry', { encoding: 'utf-8' }).trim());
  } catch (e) {
    console.log('   pnpm config: 无法获取配置');
  }
}

// git
console.log('\n🔧 其他工具检查\n' + '─'.repeat(50));
const gitCheck = checkCommand('git --version', 'Git');
if (gitCheck.success) {
  try {
    console.log('   git user.name:', execSync('git config --global user.name', { encoding: 'utf-8' }).trim());
    console.log('   git user.email:', execSync('git config --global user.email', { encoding: 'utf-8' }).trim());
  } catch (e) {
    console.log('   git config: 无法获取用户配置');
  }
}

// 项目依赖
console.log('\n📋 项目相关检查\n' + '─'.repeat(50));
const nodeModulesPath = path.join(__dirname, '..', 'node_modules');
checkPath(nodeModulesPath, 'node_modules 目录');

const packageLockPath = path.join(__dirname, '..', 'pnpm-lock.yaml');
checkPath(packageLockPath, 'pnpm-lock.yaml');

// tsconfig
const tsconfigPath = path.join(__dirname, '..', 'tsconfig.json');
checkPath(tsconfigPath, 'tsconfig.json');

console.log('\n' + '='.repeat(60));
console.log('✅ 环境检查完成！');

if (!nodeCheck.success || !pnpmCheck.success) {
  console.log('\n💡 提示: 请运行 "node scripts/setup-env.js" 配置开发环境');
} else {
  console.log('\n🎉 开发环境配置正常！');
  console.log('💡 你可以运行 "pnpm install" 安装依赖');
  console.log('   或者运行 "pnpm type-check" 检查类型');
}
