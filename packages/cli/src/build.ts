/**
 * Lyt CLI 生产构建模块
 * 实现 `lyt build` 命令，将项目构建为生产可用的静态文件
 * 使用 esbuild 进行 TypeScript 编译和模块打包
 *
 * 功能：
 *   - 读取入口文件
 *   - esbuild 打包（编译 TypeScript、模块内联、tree-shaking）
 *   - 去除 console.log（生产模式）
 *   - 输出到 dist/ 目录
 *   - 生成 source map
 *   - 可选压缩（esbuild minify）
 */

import * as fs from 'fs';
import * as path from 'path';
import { ensureDir, writeFile, readFile, colorText, logger } from './utils';

// ============================================================
// esbuild 加载（带友好错误提示）
// ============================================================
let esbuild: any;
try {
  esbuild = require('esbuild');
} catch {
  logger.error('缺少依赖: esbuild');
  logger.error('');
  logger.error('  Lyt CLI 的构建功能需要 esbuild。');
  logger.error('');
  logger.error('  请执行以下命令安装:');
  logger.error(`    ${colorText('npm install esbuild --save-dev', 'brightGreen')}`);
  logger.error('');
  logger.error('  如果您使用 pnpm:');
  logger.error(`    ${colorText('pnpm add esbuild -D', 'brightGreen')}`);
  logger.error('');
  process.exit(1);
}

// ============================================================
// 类型定义
// ============================================================

/** 构建选项 */
export interface BuildOptions {
  /** 输出目录（默认 'dist'） */
  outDir?: string;
  /** 是否压缩（默认 false） */
  minify?: boolean;
  /** 项目根目录（默认当前工作目录） */
  root?: string;
  /** 入口文件路径（默认 'index.html'） */
  entry?: string;
}

/** 构建结果统计 */
interface BuildStats {
  /** 输入文件数量 */
  inputFiles: number;
  /** 输出文件数量 */
  outputFiles: number;
  /** 总大小（字节） */
  totalSize: number;
  /** 构建耗时（毫秒） */
  buildTime: number;
}

// ============================================================
// 核心构建流程
// ============================================================

/**
 * 构建项目
 * 使用 esbuild 将源代码编译、打包、压缩后输出到指定目录
 */
export async function buildProject(options: BuildOptions = {}): Promise<void> {
  const startTime = Date.now();
  const rootDir = path.resolve(options.root || process.cwd());
  const outDir = path.resolve(rootDir, options.outDir || 'dist');
  const entryFile = options.entry || 'index.html';
  const shouldMinify = options.minify || false;

  logger.info(`开始构建项目...`);
  logger.info(`  根目录: ${colorText(rootDir, 'brightCyan')}`);
  logger.info(`  输出目录: ${colorText(outDir, 'brightCyan')}`);
  logger.info(`  压缩: ${colorText(shouldMinify ? '开启' : '关闭', shouldMinify ? 'brightGreen' : 'brightYellow')}`);

  // 读取入口 HTML
  const entryPath = path.join(rootDir, entryFile);
  if (!fs.existsSync(entryPath)) {
    logger.error(`入口文件不存在: ${entryPath}`);
    process.exit(1);
  }

  let indexHtml = readFile(entryPath);

  // 查找 HTML 中的脚本引用
  const scriptRegex = /<script\s+type="module"\s+src="([^"]+)"\s*><\/script>/g;
  let scriptMatch: RegExpExecArray | null;
  const scriptEntries: string[] = [];

  while ((scriptMatch = scriptRegex.exec(indexHtml)) !== null) {
    scriptEntries.push(scriptMatch[1]);
  }

  if (scriptEntries.length === 0) {
    logger.warn('未在入口 HTML 中找到模块脚本引用');
  }

  // 构建统计
  const stats: BuildStats = {
    inputFiles: 0,
    outputFiles: 0,
    totalSize: 0,
    buildTime: 0,
  };

  // 创建输出目录
  ensureDir(outDir);
  ensureDir(path.join(outDir, 'assets'));

  // 处理每个脚本入口
  for (const scriptEntry of scriptEntries) {
    const scriptAbsPath = path.join(rootDir, scriptEntry);

    if (!fs.existsSync(scriptAbsPath)) {
      logger.warn(`脚本文件不存在: ${scriptEntry}`);
      continue;
    }

    logger.info(`正在打包: ${colorText(scriptEntry, 'brightYellow')}`);

    // 生成输出文件名
    const scriptBasename = path.basename(scriptEntry, path.extname(scriptEntry));
    const outputJsName = `${scriptBasename}.bundle.js`;
    const outputJsPath = path.join(outDir, 'assets', outputJsName);

    try {
      // 使用 esbuild 进行打包
      await esbuild.build({
        entryPoints: [scriptAbsPath],
        bundle: true,
        minify: shouldMinify,
        target: 'es2018',
        format: 'esm',
        outfile: outputJsPath,
        sourcemap: true,
        // 将 @lytjs/* 标记为 external
        external: (id: string) => id.startsWith('@lytjs/'),
        // 生产模式：去除 console.log 和 console.debug
        drop: shouldMinify ? ['console'] : [],
        // 构建元信息回调，用于统计输入文件数
        metafile: true,
      });

      // 统计输入文件（通过 metafile）
      const outputContent = fs.readFileSync(outputJsPath, 'utf-8');
      stats.totalSize += Buffer.byteLength(outputContent, 'utf-8');
      stats.outputFiles++;

      // 检查 source map 文件
      const sourceMapPath = outputJsPath + '.map';
      if (fs.existsSync(sourceMapPath)) {
        const mapContent = fs.readFileSync(sourceMapPath, 'utf-8');
        stats.totalSize += Buffer.byteLength(mapContent, 'utf-8');
        stats.outputFiles++;
      }

      // 更新 HTML 中的脚本引用
      indexHtml = indexHtml.replace(
        `<script type="module" src="${scriptEntry}"></script>`,
        `<script src="/assets/${outputJsName}"></script>`
      );

      stats.inputFiles++;
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : String(e);
      logger.error(`打包失败 ${scriptEntry}: ${errMsg}`);
      process.exit(1);
    }
  }

  // 复制其他静态资源文件
  copyStaticFiles(rootDir, outDir, stats);

  // 输出 HTML
  const htmlOutputPath = path.join(outDir, 'index.html');
  writeFile(htmlOutputPath, indexHtml);
  stats.outputFiles++;
  stats.totalSize += Buffer.byteLength(indexHtml, 'utf-8');

  // 计算构建耗时
  stats.buildTime = Date.now() - startTime;

  // 输出构建结果
  console.log('');
  logger.success('构建完成！');
  console.log('');
  console.log(`  ${colorText('输入文件:', 'brightWhite')} ${stats.inputFiles} 个`);
  console.log(`  ${colorText('输出文件:', 'brightWhite')} ${stats.outputFiles} 个`);
  console.log(`  ${colorText('总大小:', 'brightWhite')} ${formatBytes(stats.totalSize)}`);
  console.log(`  ${colorText('构建耗时:', 'brightWhite')} ${stats.buildTime}ms`);
  console.log(`  ${colorText('输出目录:', 'brightWhite')} ${colorText(outDir, 'brightCyan')}`);
  console.log('');
}

// ============================================================
// 辅助函数
// ============================================================

/**
 * 复制静态资源文件到输出目录
 * 包括 CSS、图片、字体等非 JS/TS 文件
 */
function copyStaticFiles(rootDir: string, outDir: string, stats: BuildStats): void {
  const srcDir = path.join(rootDir, 'src');
  if (!fs.existsSync(srcDir)) return;

  function copyDir(dir: string, base: string): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules') continue;
        copyDir(fullPath, base);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) continue;
        const relativePath = path.relative(base, fullPath);
        const outputPath = path.join(outDir, relativePath);
        writeFile(outputPath, fs.readFileSync(fullPath).toString('utf-8'));
        stats.outputFiles++;
        stats.totalSize += fs.statSync(fullPath).size;
      }
    }
  }

  copyDir(srcDir, srcDir);
}

/**
 * 格式化字节数为人类可读的字符串
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = bytes / Math.pow(k, i);
  return `${size.toFixed(2)} ${units[i]}`;
}
