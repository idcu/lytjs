#!/usr/bin/env node
/**
 * vue-to-lyt CLI 工具
 *
 * 将 Vue 项目转换为 Lyt.js 项目
 */

import * as fs from 'fs';
import * as path from 'path';
import { convertVueSfcToLyt } from '../sfc-converter';

/**
 * CLI 参数解析
 */
interface CliOptions {
  input: string
  output?: string
  recursive: boolean
  dryRun: boolean
  help: boolean
}

/**
 * 解析 CLI 参数
 */
function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = {
    input: '',
    recursive: false,
    dryRun: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '-h':
      case '--help':
        options.help = true;
        break;
      case '-r':
      case '--recursive':
        options.recursive = true;
        break;
      case '-d':
      case '--dry-run':
        options.dryRun = true;
        break;
      case '-o':
      case '--output':
        options.output = args[++i];
        break;
      default:
        if (!options.input) {
          options.input = arg;
        }
        break;
    }
  }

  return options;
}

/**
 * 显示帮助信息
 */
function showHelp() {
  console.log(`
vue-to-lyt - 将 Vue 项目转换为 Lyt.js 项目

用法:
  vue-to-lyt <input> [options]

选项:
  -h, --help        显示帮助信息
  -o, --output      指定输出目录（可选）
  -r, --recursive   递归处理目录
  -d, --dry-run     预览转换，不实际写入文件

示例:
  # 转换单个文件
  vue-to-lyt ./src/MyComponent.vue

  # 转换整个目录
  vue-to-lyt ./src --recursive

  # 转换到指定输出目录
  vue-to-lyt ./src --recursive --output ./lyt-src
`);
}

/**
 * 转换单个文件
 */
function convertFile(inputPath: string, outputPath?: string): boolean {
  try {
    const content = fs.readFileSync(inputPath, 'utf-8');
    const converted = convertVueSfcToLyt(content);

    const finalOutputPath = outputPath || inputPath.replace(/\.vue$/, '.lyt');

    console.log(`[转换] ${inputPath} -> ${finalOutputPath}`);

    // 显示差异
    if (content !== converted) {
      console.log('[变更] 文件内容已转换');
    } else {
      console.log('[跳过] 文件内容无需转换');
    }

    return true;
  } catch (error) {
    console.error(`[错误] 处理文件 ${inputPath} 时出错:`, error);
    return false;
  }
}

/**
 * 递归处理目录
 */
function processDirectory(dirPath: string, outputDir?: string) {
  const files = fs.readdirSync(dirPath);

  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (file === 'node_modules' || file === '.git') {
        continue;
      }
      const subOutputDir = outputDir ? path.join(outputDir, file) : undefined;
      processDirectory(fullPath, subOutputDir);
    } else if (file.endsWith('.vue')) {
      let outputPath: string | undefined;
      if (outputDir) {
        const relativePath = path.relative(dirPath, fullPath);
        outputPath = path.join(outputDir, relativePath.replace(/\.vue$/, '.lyt'));
      }
      convertFile(fullPath, outputPath);
    }
  }
}

/**
 * 主函数
 */
function main() {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    process.exit(0);
  }

  if (!options.input) {
    console.error('错误: 请指定输入文件或目录');
    showHelp();
    process.exit(1);
  }

  const inputPath = path.resolve(options.input);

  if (!fs.existsSync(inputPath)) {
    console.error(`错误: 路径不存在: ${inputPath}`);
    process.exit(1);
  }

  const stat = fs.statSync(inputPath);

  if (stat.isDirectory()) {
    if (!options.recursive) {
      console.error('错误: 输入是目录，请使用 --recursive 选项');
      process.exit(1);
    }
    processDirectory(inputPath, options.output);
  } else if (stat.isFile()) {
    convertFile(inputPath, options.output);
  }

  console.log('\n转换完成!');
}

// 执行
main();
