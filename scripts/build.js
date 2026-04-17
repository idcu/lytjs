#!/usr/bin/env node

/**
 * Lyt.js Build Script — 构建脚本
 *
 * 纯 Node.js 实现的简单构建脚本：
 * - 读取各包的 src/index.ts
 * - 使用 TypeScript 编译器 API 输出到 dist/ 目录
 * - 支持 --watch 模式（文件变化时自动重新编译）
 * - 支持 --clean 清理 dist 目录
 *
 * 用法：
 *   node scripts/build.js              # 构建所有包
 *   node scripts/build.js --watch      # 监听模式
 *   node scripts/build.js --clean      # 清理后构建
 *   node scripts/build.js --pkg core   # 只构建指定包
 *
 * 纯原生零依赖实现（仅使用 Node.js 内置模块 + 项目已安装的 typescript）。
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

// ============================================================
// 配置
// ============================================================

const ROOT_DIR = path.resolve(__dirname, '..');
const PACKAGES_DIR = path.join(ROOT_DIR, 'packages');

/** 所有包名列表 */
const ALL_PACKAGES = [
  'core',
  'reactivity',
  'vdom',
  'renderer',
  'component',
  'compiler',
  'router',
  'store',
  'devtools',
  'cli',
];

/** 包名 -> 入口文件映射 */
const PACKAGE_ENTRIES = {
  core: 'src/index.ts',
  reactivity: 'src/index.ts',
  vdom: 'src/index.ts',
  renderer: 'src/index.ts',
  component: 'src/index.ts',
  compiler: 'src/index.ts',
  router: 'src/index.ts',
  store: 'src/index.ts',
  devtools: 'src/index.ts',
  cli: 'src/index.ts',
};

// ============================================================
// 工具函数
// ============================================================

/**
 * 解析命令行参数
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    watch: false,
    clean: false,
    packages: [],
  };

  for (const arg of args) {
    if (arg === '--watch' || arg === '-w') {
      options.watch = true;
    } else if (arg === '--clean' || arg === '-c') {
      options.clean = true;
    } else if (arg === '--pkg' || arg === '-p') {
      // 下一个参数是包名
    } else if (arg.startsWith('--pkg=')) {
      options.packages.push(arg.split('=')[1]);
    } else if (!arg.startsWith('-')) {
      // 非选项参数，可能是 --pkg 后面的包名
      if (options.packages.length === 0 || args[args.indexOf(arg) - 1] === '--pkg' || args[args.indexOf(arg) - 1] === '-p') {
        options.packages.push(arg);
      }
    }
  }

  return options;
}

/**
 * 打印带颜色的日志
 */
function log(message, color = 'reset') {
  const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    red: '\x1b[31m',
    gray: '\x1b[90m',
    bold: '\x1b[1m',
  };
  const c = colors[color] || colors.reset;
  console.log(`${c}${message}\x1b[0m`);
}

/**
 * 递归创建目录
 */
function mkdirp(dir) {
  if (fs.existsSync(dir)) return;
  const parent = path.dirname(dir);
  if (!fs.existsSync(parent)) mkdirp(parent);
  fs.mkdirSync(dir, { recursive: true });
}

/**
 * 删除目录
 */
function rmrf(dir) {
  if (!fs.existsSync(dir)) return;
  fs.rmSync(dir, { recursive: true, force: true });
}

/**
 * 获取包的源文件列表
 */
function getPackageSourceFiles(packageName) {
  const srcDir = path.join(PACKAGES_DIR, packageName, 'src');
  if (!fs.existsSync(srcDir)) return [];

  const files = [];
  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
        files.push(fullPath);
      }
    }
  }
  walk(srcDir);
  return files;
}

/**
 * 获取包的 dist 目录
 */
function getPackageDistDir(packageName) {
  return path.join(PACKAGES_DIR, packageName, 'dist');
}

// ============================================================
// TypeScript 编译
// ============================================================

/**
 * 使用 TypeScript 编译器 API 编译
 */
function compileWithTSC(packages, watch) {
  const tscPath = path.join(ROOT_DIR, 'node_modules', 'typescript', 'bin', 'tsc');

  if (!fs.existsSync(tscPath)) {
    log('Error: TypeScript not found. Run "npm install" first.', 'red');
    process.exit(1);
  }

  // 构建 tsc 参数
  const args = ['--build'];

  if (watch) {
    args.push('--watch');
  }

  // 指定要编译的包
  for (const pkg of packages) {
    const tsconfigPath = path.join(PACKAGES_DIR, pkg, 'tsconfig.json');
    if (fs.existsSync(tsconfigPath)) {
      args.push(tsconfigPath);
    } else {
      // 如果包没有独立的 tsconfig，使用根 tsconfig
      args.push('--force');
    }
  }

  log(`Running: tsc ${args.join(' ')}`, 'gray');

  if (watch) {
    // Watch 模式：使用 spawn 保持进程
    const child = spawn(process.execPath, [tscPath, ...args], {
      cwd: ROOT_DIR,
      stdio: 'inherit',
      env: { ...process.env },
    });

    child.on('error', (err) => {
      log(`Failed to start TypeScript compiler: ${err.message}`, 'red');
      process.exit(1);
    });

    child.on('exit', (code) => {
      if (code !== null && code !== 0) {
        log(`TypeScript compiler exited with code ${code}`, 'red');
      }
    });

    // 保持进程运行
    process.on('SIGINT', () => {
      child.kill('SIGINT');
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      child.kill('SIGTERM');
      process.exit(0);
    });
  } else {
    // 单次编译
    try {
      execSync(`${process.execPath} "${tscPath}" ${args.join(' ')}`, {
      cwd: ROOT_DIR,
      stdio: 'inherit',
    });
      log('Build completed successfully.', 'green');
    } catch (err) {
      log('Build failed.', 'red');
      process.exit(1);
    }
  }
}

/**
 * 简易文件监听器（不依赖 chokidar）
 */
function watchFiles(packages, onChange) {
  const watchers = new Map();

  function watchDir(dir) {
    if (!fs.existsSync(dir)) return;

    try {
      const watcher = fs.watch(dir, { recursive: true }, (eventType, filename) => {
        if (filename && (filename.endsWith('.ts') || filename.endsWith('.tsx'))) {
          onChange(path.join(dir, filename));
        }
      });
      watchers.set(dir, watcher);
    } catch {
      // 递归监听可能在某些系统上不支持，忽略
    }
  }

  for (const pkg of packages) {
    const srcDir = path.join(PACKAGES_DIR, pkg, 'src');
    watchDir(srcDir);
  }

  return {
    close() {
      for (const [, watcher] of watchers) {
        watcher.close();
      }
      watchers.clear();
    },
  };
}

// ============================================================
// 主流程
// ============================================================

function main() {
  const options = parseArgs();

  // 确定要构建的包
  let packages = options.packages.length > 0
    ? options.packages
    : ALL_PACKAGES.filter(pkg => {
        // 只构建有 src 目录的包
        return fs.existsSync(path.join(PACKAGES_DIR, pkg, 'src'));
      });

  // 验证包是否存在
  for (const pkg of packages) {
    const pkgDir = path.join(PACKAGES_DIR, pkg);
    if (!fs.existsSync(pkgDir)) {
      log(`Warning: Package "${pkg}" not found, skipping.`, 'yellow');
    }
  }

  packages = packages.filter(pkg => fs.existsSync(path.join(PACKAGES_DIR, pkg)));

  if (packages.length === 0) {
    log('No packages to build.', 'yellow');
    process.exit(0);
  }

  // 打印构建信息
  log('');
  log('  Lyt.js Build', 'bold');
  log('  ' + '-'.repeat(40), 'gray');
  log(`  Packages: ${packages.join(', ')}`, 'blue');
  log(`  Mode: ${options.watch ? 'watch' : 'build'}`, 'blue');
  log('');

  // 清理模式
  if (options.clean) {
    log('Cleaning dist directories...', 'yellow');
    for (const pkg of packages) {
      const distDir = getPackageDistDir(pkg);
      if (fs.existsSync(distDir)) {
        rmrf(distDir);
        log(`  Cleaned: ${pkg}/dist`, 'gray');
      }
    }
    log('');
  }

  // 确保 dist 目录存在
  for (const pkg of packages) {
    const distDir = getPackageDistDir(pkg);
    mkdirp(distDir);
  }

  // 检查 TypeScript 是否可用
  const tscPath = path.join(ROOT_DIR, 'node_modules', 'typescript', 'bin', 'tsc');
  const hasTSC = fs.existsSync(tscPath);

  if (hasTSC) {
    // 使用 TypeScript 编译器
    compileWithTSC(packages, options.watch);
  } else {
    // 回退：简易复制 + 转译
    log('TypeScript not found. Using simple file copy mode.', 'yellow');
    log('Install TypeScript for full compilation: npm install typescript', 'gray');
    log('');

    if (options.watch) {
      log('Watch mode with simple copy:', 'blue');
      const watcher = watchFiles(packages, (filepath) => {
        log(`  Changed: ${path.relative(ROOT_DIR, filepath)}`, 'gray');
        buildSimple(packages);
      });

      process.on('SIGINT', () => {
        watcher.close();
        log('\nWatch stopped.', 'yellow');
        process.exit(0);
      });
    } else {
      buildSimple(packages);
    }
  }
}

/**
 * 简易构建模式（无 TypeScript 时使用）
 * 直接复制 .ts 文件到 dist 目录
 */
function buildSimple(packages) {
  for (const pkg of packages) {
    const srcDir = path.join(PACKAGES_DIR, pkg, 'src');
    const distDir = getPackageDistDir(pkg);

    if (!fs.existsSync(srcDir)) continue;

    const files = getPackageSourceFiles(pkg);
    for (const file of files) {
      const relativePath = path.relative(srcDir, file);
      const destPath = path.join(distDir, relativePath.replace(/\.ts$/, '.js'));

      mkdirp(path.dirname(destPath));

      // 读取源文件
      const content = fs.readFileSync(file, 'utf-8');

      // 简易去除 TypeScript 类型注解（非常基础的处理）
      const jsContent = stripTypes(content);

      fs.writeFileSync(destPath, jsContent, 'utf-8');
    }

    log(`  Built: ${pkg} (${files.length} files)`, 'green');
  }
}

/**
 * 极简的 TypeScript 类型剥离
 * 注意：这不是完整的 TypeScript 编译器，仅处理常见情况
 */
function stripTypes(source) {
  let result = source;

  // 移除 import type 语句
  result = result.replace(/^import\s+type\s+.*?from\s+['"].*?['"];?\s*$/gm, '');

  // 移除 export type 语句
  result = result.replace(/^export\s+type\s+.*?=\s*.*?;.*$/gm, '');

  // 移除行内类型注解 : Type（简单情况）
  result = result.replace(/:\s*(?:string|number|boolean|void|any|never|unknown|null|undefined|object)\b(?![\w])/g, '');

  // 移除泛型 <T>（简单情况）
  result = result.replace(/<\w+(?:\s*extends\s+\w+)?\s*>/g, '');

  // 移除 interface 声明
  result = result.replace(/^export\s+interface\s+[\s\S]*?^\}/gm, '');

  // 移除 type 声明
  result = result.replace(/^export\s+type\s+[\s\S]*?;/gm, '');

  // 移除 as 类型断言
  result = result.replace(/\s+as\s+\w+/g, '');

  // 移除 ! 非空断言
  result = result.replace(/(\w)!/g, '$1');

  return result;
}

// 运行
main();
