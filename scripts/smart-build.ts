#!/usr/bin/env tsx
/**
 * 智能构建脚本 - 增强版
 *
 * 功能：
 * 1. 使用预定义的正确构建顺序
 * 2. 支持增量构建（跳过已构建的包）
 * 3. 提供详细的构建进度和错误反馈
 * 4. 遇到错误时可以选择继续或停止
 *
 * 用法:
 *   tsx scripts/smart-build.ts                    # 构建所有包
 *   tsx scripts/smart-build.ts --continue-on-error  # 遇到错误继续构建
 *   tsx scripts/smart-build.ts --skip-built         # 跳过已构建的包
 *   tsx scripts/smart-build.ts --filter common      # 只构建名称包含 common 的包
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// 命令行参数解析
const args = process.argv.slice(2);
const CONTINUE_ON_ERROR = args.includes('--continue-on-error');
const SKIP_BUILT = args.includes('--skip-built');
const FILTER = args.find((a) => a.startsWith('--filter='))?.split('=')[1];

// 正确的构建顺序 - 按依赖关系严格排序（与 final-publish.ts 保持一致）
// 构建顺序统一由 scripts/build-order.ts 提供（单一真相源），
// 新增包后运行 `pnpm check-build-order` 校验集合与依赖拓扑。
import { BUILD_ORDER } from './build-order';

// 包信息接口
interface PackageInfo {
  name: string;
  path: string;
  hasBuildScript: boolean;
  isBuilt: boolean;
}

// 构建状态
interface BuildState {
  success: string[];
  failed: string[];
  skipped: string[];
}

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
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

function logWarning(message: string): void {
  console.log(colorText(colors.yellow, `⚠️  ${message}`));
}

function logError(message: string): void {
  console.error(colorText(colors.red, `❌ ${message}`));
}

function logSection(title: string): void {
  console.log(`\n${colors.bold}${colors.blue}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bold}${colors.blue}${title}${colors.reset}`);
  console.log(`${colors.bold}${colors.blue}${'='.repeat(60)}${colors.reset}\n`);
}

// 检查包信息
function getPackageInfo(pkg: { name: string; path: string }): PackageInfo {
  const pkgPath = join(ROOT, pkg.path);

  if (!existsSync(pkgPath)) {
    return { ...pkg, hasBuildScript: false, isBuilt: false };
  }

  const pkgJsonPath = join(pkgPath, 'package.json');
  let hasBuildScript = false;

  if (existsSync(pkgJsonPath)) {
    const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
    hasBuildScript = !!pkgJson.scripts?.build;
  }

  const distPath = join(pkgPath, 'dist');
  const isBuilt = existsSync(distPath);

  return { ...pkg, hasBuildScript, isBuilt };
}

// 检查包是否需要构建
function shouldBuild(pkg: PackageInfo): boolean {
  // 检查过滤器
  if (FILTER && !pkg.name.includes(FILTER)) {
    return false;
  }

  // 检查是否有 build 脚本
  if (!pkg.hasBuildScript) {
    return false;
  }

  // 检查是否跳过已构建的包
  if (SKIP_BUILT && pkg.isBuilt) {
    return false;
  }

  return true;
}

// 构建单个包
function buildPackage(pkg: PackageInfo): boolean {
  const pkgPath = join(ROOT, pkg.path);
  const tsupPath = join(ROOT, 'node_modules', 'tsup', 'dist', 'cli-default.js');

  logInfo(`正在构建: ${colorText(colors.bold, pkg.name)}`);
  logInfo(`路径: ${pkg.path}`);

  try {
    // 使用根目录的 node_modules 运行 tsup，确保找到所有依赖
    execSync(`node ${tsupPath}`, {
      cwd: pkgPath,
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'production',
      },
    });

    logSuccess(`构建成功: ${pkg.name}`);
    return true;
  } catch (error) {
    logError(`构建失败: ${pkg.name}`);

    if (CONTINUE_ON_ERROR) {
      logWarning('继续构建下一个包...');
      return false;
    } else {
      throw error;
    }
  }
}

// 主函数
function main(): void {
  console.log(colorText(colors.bold, '\n🚀 LytJS 智能构建系统\n'));

  // 步骤 1: 准备构建列表
  logSection('步骤 1: 准备构建列表');
  const allPackages = BUILD_ORDER.map(getPackageInfo);
  logInfo(`共 ${allPackages.length} 个包`);

  // 步骤 2: 筛选需要构建的包
  logSection('步骤 2: 筛选构建目标');
  const packagesToBuild = allPackages.filter(shouldBuild);
  const packagesToSkip = allPackages.filter((p) => !shouldBuild(p));

  logInfo(`需要构建: ${packagesToBuild.length} 个包`);
  logInfo(`跳过: ${packagesToSkip.length} 个包`);

  if (packagesToSkip.length > 0) {
    console.log('\n跳过的包:');
    packagesToSkip.forEach((pkg) => {
      let reason = '';
      if (!pkg.hasBuildScript) reason = ' (无 build 脚本)';
      else if (SKIP_BUILT && pkg.isBuilt) reason = ' (已构建)';
      else if (FILTER && !pkg.name.includes(FILTER)) reason = ' (不匹配过滤器)';
      console.log(`  - ${pkg.name}${reason}`);
    });
  }

  if (packagesToBuild.length === 0) {
    logInfo('没有需要构建的包，退出');
    return;
  }

  // 步骤 3: 执行构建
  logSection('步骤 3: 开始构建');

  const state: BuildState = {
    success: [],
    failed: [],
    skipped: [],
  };

  for (let i = 0; i < packagesToBuild.length; i++) {
    const pkg = packagesToBuild[i];
    const progress = `[${i + 1}/${packagesToBuild.length}]`;

    console.log(`\n${colorText(colors.bold, progress)}`);

    try {
      const success = buildPackage(pkg);
      if (success) {
        state.success.push(pkg.name);
      } else {
        state.failed.push(pkg.name);
      }
    } catch (_error) {
      state.failed.push(pkg.name);
      if (!CONTINUE_ON_ERROR) {
        logError('构建过程遇到错误，停止构建');
        break;
      }
    }
  }

  // 步骤 4: 总结
  logSection('构建总结');

  console.log(`📊 统计:`);
  console.log(`  ${colorText(colors.green, '✅ 成功:')} ${state.success.length} 个包`);
  console.log(`  ${colorText(colors.red, '❌ 失败:')} ${state.failed.length} 个包`);
  console.log(`  ${colorText(colors.yellow, 'ℹ️  跳过:')} ${packagesToSkip.length} 个包`);

  if (state.success.length > 0) {
    console.log(`\n${colorText(colors.green, '✅ 成功构建:')}`);
    state.success.forEach((name) => console.log(`  - ${name}`));
  }

  if (state.failed.length > 0) {
    console.log(`\n${colorText(colors.red, '❌ 构建失败:')}`);
    state.failed.forEach((name) => console.log(`  - ${name}`));
  }

  // 最终状态
  console.log('\n' + '='.repeat(60));
  if (state.failed.length === 0 && state.success.length > 0) {
    console.log(colorText(colors.bold, colors.green, '🎉 所有包构建成功！'));
  } else if (state.failed.length > 0) {
    console.log(
      colorText(colors.bold, colors.yellow, `⚠️  构建完成，但有 ${state.failed.length} 个包失败`),
    );
    if (!CONTINUE_ON_ERROR) {
      process.exit(1);
    }
  } else {
    console.log(colorText(colors.bold, '构建完成'));
  }
  console.log('='.repeat(60) + '\n');
}

// 运行主函数
try {
  main();
} catch (error) {
  logError(`构建过程出错: ${error}`);
  process.exit(1);
}
