#!/usr/bin/env node

/**
 * Lyt.js CLI 入口文件
 * 命令行工具的主入口，负责解析命令并分发到对应的处理模块
 *
 * 支持的命令：
 *   - lytx create <name> [--template spa|ssr|ssg] [--ts] [--router] [--store]  创建新项目
 *   - lytx dev [--port <port>] [--hmr]                                      启动开发服务器
 *   - lytx build [--mode spa|ssr|ssg]                                        构建生产版本
 *   - lytx preview [--port <port>]                                           预览构建结果
 *
 * 全局选项：
 *   - --help, -h   显示帮助信息
 *   - --version, -v 显示版本号
 *
 * 纯 Node.js 原生实现，不依赖任何第三方包
 */

import * as fs from 'fs';
import * as path from 'path';
import { parseArgs, colorText, logger } from './utils';
import { createProject as createProjectOld } from './create';
import { createProject, type ScaffoldOptions, getAvailableTemplates, isValidTemplate } from './scaffold';
import { startDevServer } from './dev';
import { buildProject } from './build';
import { createHMRServer, getHMRClientScript, type HMRUpdate, type HMRServer } from './hmr';
import { handleGenerateCommand, GENERATE_HELP } from './generate';

// ============================================================
// 常量定义
// ============================================================

/** CLI 版本号 */
const VERSION = '4.2.0';

/** CLI 名称 */
const CLI_NAME = 'lytx';

/** CLI 描述 */
const CLI_DESCRIPTION = 'Lyt.js 框架命令行工具（增强版）';

// ============================================================
// 帮助信息
// ============================================================

/** 全局帮助信息 */
const HELP_TEXT = `
${colorText(CLI_NAME, 'brightCyan')} - ${CLI_DESCRIPTION}

${colorText('用法:', 'brightGreen')}
  lytx <command> [options] [args]

${colorText('命令:', 'brightGreen')}
  ${colorText('create', 'brightYellow')} <name>    创建一个新的 Lyt 项目
  ${colorText('dev', 'brightYellow')}              启动本地开发服务器
  ${colorText('build', 'brightYellow')}            构建生产版本
  ${colorText('preview', 'brightYellow')}          预览构建结果
  ${colorText('generate', 'brightYellow')} <type> <name> 生成代码（组件、Store、页面、API）

${colorText('全局选项:', 'brightGreen')}
  ${colorText('-h, --help', 'brightYellow')}       显示帮助信息
  ${colorText('-v, --version', 'brightYellow')}    显示版本号

${colorText('示例:', 'brightGreen')}
  ${colorText('$', 'dim')} lytx create my-app
  ${colorText('$', 'dim')} lytx create my-app --template spa --ts --router --store
  ${colorText('$', 'dim')} lytx create my-todo --template todo-app
  ${colorText('$', 'dim')} lytx create my-admin --template admin-dashboard
  ${colorText('$', 'dim')} lytx dev
  ${colorText('$', 'dim')} lytx dev --port 8080 --hmr
  ${colorText('$', 'dim')} lytx build
  ${colorText('$', 'dim')} lytx build --mode ssr
  ${colorText('$', 'dim')} lytx preview --port 4173

`;

/** create 命令帮助信息 */
function buildCreateHelp(): string {
  const templates = getAvailableTemplates();
  let templateList = '';
  for (const [key, desc] of Object.entries(templates)) {
    templateList += `                              ${colorText(key, 'brightYellow')}  — ${desc}\n`;
  }

  return `
${colorText('lytx create', 'brightCyan')} - 创建新的 Lyt 项目

${colorText('用法:', 'brightGreen')}
  lytx create <name> [options]

${colorText('参数:', 'brightGreen')}
  ${colorText('<name>', 'brightYellow')}              项目名称（同时作为目录名）

${colorText('选项:', 'brightGreen')}
  ${colorText('--template <tpl>', 'brightYellow')}    项目模板（默认: spa）
${templateList}
  ${colorText('--ts', 'brightYellow')}                使用 TypeScript（仅内置模板）
  ${colorText('--router', 'brightYellow')}            包含路由（仅内置模板）
  ${colorText('--store', 'brightYellow')}             包含状态管理（仅内置模板）
  ${colorText('--eslint', 'brightYellow')}            包含 ESLint 配置（仅内置模板）

${colorText('示例:', 'brightGreen')}
  ${colorText('$', 'dim')} lytx create my-app
  ${colorText('$', 'dim')} lytx create my-app --template spa --ts --router --store
  ${colorText('$', 'dim')} lytx create my-todo --template todo-app
  ${colorText('$', 'dim')} lytx create my-admin --template admin-dashboard
  ${colorText('$', 'dim')} lytx create my-app --template ssr --ts

`;
}

/** dev 命令帮助信息 */
const DEV_HELP = `
${colorText('lytx dev', 'brightCyan')} - 启动本地开发服务器

${colorText('用法:', 'brightGreen')}
  lytx dev [options]

${colorText('选项:', 'brightGreen')}
  ${colorText('-p, --port <port>', 'brightYellow')}   服务端口（默认: 3000）
  ${colorText('--hmr', 'brightYellow')}               开启热更新（默认: 开启）
  ${colorText('--no-hmr', 'brightYellow')}            关闭热更新

${colorText('功能:', 'brightGreen')}
  - 静态文件服务
  - TypeScript 即时编译
  - 热模块替换（HMR）
  - WebSocket 实时通信

${colorText('示例:', 'brightGreen')}
  ${colorText('$', 'dim')} lytx dev
  ${colorText('$', 'dim')} lytx dev --port 8080
  ${colorText('$', 'dim')} lytx dev --no-hmr

`;

/** build 命令帮助信息 */
const BUILD_HELP = `
${colorText('lytx build', 'brightCyan')} - 构建生产版本

${colorText('用法:', 'brightGreen')}
  lytx build [options]

${colorText('选项:', 'brightGreen')}
  ${colorText('--mode <mode>', 'brightYellow')}       构建模式（默认: spa）
                              可选值: spa, ssr, ssg
  ${colorText('--minify', 'brightYellow')}            压缩代码（去除空白和注释）
  ${colorText('-o, --outDir <dir>', 'brightYellow')}  输出目录（默认: dist）
  ${colorText('--entry <file>', 'brightYellow')}      入口文件（默认: index.html）

${colorText('功能:', 'brightGreen')}
  - TypeScript 编译
  - 模块打包（内联依赖）
  - 去除 console.log
  - Source Map 生成
  - 静态资源复制

${colorText('示例:', 'brightGreen')}
  ${colorText('$', 'dim')} lytx build
  ${colorText('$', 'dim')} lytx build --mode ssr
  ${colorText('$', 'dim')} lytx build --minify --outDir ./output

`;

/** preview 命令帮助信息 */
const PREVIEW_HELP = `
${colorText('lytx preview', 'brightCyan')} - 预览构建结果

${colorText('用法:', 'brightGreen')}
  lytx preview [options]

${colorText('选项:', 'brightGreen')}
  ${colorText('-p, --port <port>', 'brightYellow')}   服务端口（默认: 4173）

${colorText('示例:', 'brightGreen')}
  ${colorText('$', 'dim')} lytx preview
  ${colorText('$', 'dim')} lytx preview --port 5000

`;

// ============================================================
// 命令处理
// ============================================================

/**
 * 显示版本号
 */
function showVersion(): void {
  console.log('');
  console.log(
    `  ${colorText(CLI_NAME, 'brightCyan')} v${colorText(VERSION, 'brightWhite')}`
  );
  console.log('');
}

/**
 * 显示未知命令提示
 * @param command - 未知的命令名称
 */
function showUnknownCommand(command: string): void {
  logger.error(`未知命令: ${colorText(command, 'brightRed')}`);
  console.log('');
  console.log(`  运行 ${colorText('lytx --help', 'brightCyan')} 查看可用命令`);
  console.log('');
}

/**
 * 解析模板类型
 */
function parseTemplate(template: string | boolean | undefined): 'spa' | 'ssr' | 'ssg' | 'todo-app' | 'admin-dashboard' {
  if (typeof template === 'string' && isValidTemplate(template)) {
    return template as 'spa' | 'ssr' | 'ssg' | 'todo-app' | 'admin-dashboard';
  }
  return 'spa';
}

/**
 * 处理 create 命令（增强版）
 * @param args - 解析后的命令行参数
 */
async function handleCreateCommand(args: ReturnType<typeof parseArgs>): Promise<void> {
  // 显示 create 命令帮助
  if (args.options.help) {
    console.log(buildCreateHelp());
    return;
  }

  // 检查是否提供了项目名称
  if (args.args.length === 0) {
    logger.error('请提供项目名称');
    console.log('');
    console.log(`  用法: ${colorText('lytx create <name>', 'brightCyan')}`);
    console.log('');
    console.log(`  运行 ${colorText('lytx create --help', 'brightCyan')} 查看更多选项`);
    console.log('');
    process.exit(1);
  }

  const name = args.args[0];
  const templateValue = typeof args.options.template === 'string' ? args.options.template : 'spa';

  // 验证模板名称
  if (!isValidTemplate(templateValue)) {
    logger.error(`未知模板: ${colorText(templateValue, 'brightRed')}`);
    console.log('');
    console.log(`  可用模板：`);
    const templates = getAvailableTemplates();
    for (const [key, desc] of Object.entries(templates)) {
      console.log(`    ${colorText(key, 'brightYellow')}  — ${desc}`);
    }
    console.log('');
    process.exit(1);
  }

  // 检查是否使用了增强选项或示例模板
  const hasEnhancedOptions =
    args.options.ts === true ||
    args.options.router === true ||
    args.options.store === true ||
    args.options.eslint === true ||
    (typeof args.options.template === 'string' && ['ssr', 'ssg', 'todo-app', 'admin-dashboard'].includes(args.options.template));

  if (hasEnhancedOptions) {
    // 使用增强版脚手架
    const scaffoldOptions: ScaffoldOptions = {
      name,
      template: parseTemplate(args.options.template),
      ts: args.options.ts === true,
      router: args.options.router === true,
      store: args.options.store === true,
      eslint: args.options.eslint === true,
    };

    await createProject(scaffoldOptions);
  } else {
    // 使用原始脚手架（向后兼容）
    const options = {
      template: typeof args.options.template === 'string' ? args.options.template : 'spa',
    };

    await createProjectOld(name, options);
  }
}

/**
 * 处理 dev 命令
 * @param args - 解析后的命令行参数
 */
function handleDevCommand(args: ReturnType<typeof parseArgs>): void {
  // 显示 dev 命令帮助
  if (args.options.help) {
    console.log(DEV_HELP);
    return;
  }

  const options = {
    port: typeof args.options.port === 'string'
      ? parseInt(args.options.port, 10)
      : typeof args.options.p === 'string'
        ? parseInt(args.options.p, 10)
        : 3000,
    hmr: args.options['no-hmr'] !== true,
  };

  // 验证端口号
  if (isNaN(options.port) || options.port < 1 || options.port > 65535) {
    logger.error(`无效的端口号: ${args.options.port || args.options.p}`);
    process.exit(1);
  }

  startDevServer(options);
}

/**
 * 处理 build 命令
 * @param args - 解析后的命令行参数
 */
async function handleBuildCommand(args: ReturnType<typeof parseArgs>): Promise<void> {
  // 显示 build 命令帮助
  if (args.options.help) {
    console.log(BUILD_HELP);
    return;
  }

  const options = {
    minify: args.options.minify === true,
    outDir: typeof args.options.outDir === 'string'
      ? args.options.outDir
      : typeof args.options.o === 'string'
        ? args.options.o
        : 'dist',
    entry: typeof args.options.entry === 'string' ? args.options.entry : 'index.html',
  };

  await buildProject(options);
}

/**
 * 处理 preview 命令
 * @param args - 解析后的命令行参数
 */
function handlePreviewCommand(args: ReturnType<typeof parseArgs>): void {
  // 显示 preview 命令帮助
  if (args.options.help) {
    console.log(PREVIEW_HELP);
    return;
  }

  const port = typeof args.options.port === 'string'
    ? parseInt(args.options.port, 10)
    : typeof args.options.p === 'string'
      ? parseInt(args.options.p, 10)
      : 4173;

  // 验证端口号
  if (isNaN(port) || port < 1 || port > 65535) {
    logger.error(`无效的端口号: ${args.options.port || args.options.p}`);
    process.exit(1);
  }

  // 预览模式：使用 dist 目录作为根目录启动静态文件服务器
  const previewRoot = path.resolve(process.cwd(), 'dist');

  if (!fs.existsSync(previewRoot)) {
    logger.error('未找到构建输出目录 dist/，请先运行 lytx build');
    process.exit(1);
  }

  startDevServer({ port, root: previewRoot, hmr: false });
}

// ============================================================
// 主入口
// ============================================================

/**
 * CLI 主函数
 * 解析命令行参数，分发到对应的命令处理函数
 */
async function main(): Promise<void> {
  // 解析命令行参数
  const args = parseArgs(process.argv);

  // 处理全局选项（无命令时）
  if (args.options.version) {
    showVersion();
    return;
  }

  if (args.options.help && !args.command) {
    console.log(HELP_TEXT);
    return;
  }

  // 无命令时显示帮助
  if (!args.command) {
    console.log(HELP_TEXT);
    process.exit(1);
  }

  // 分发命令
  try {
    switch (args.command) {
      case 'create':
        await handleCreateCommand(args);
        break;

      case 'dev':
        handleDevCommand(args);
        break;

      case 'build':
        await handleBuildCommand(args);
        break;

      case 'preview':
        handlePreviewCommand(args);
        break;

      case 'generate':
        if (args.options.help) {
          console.log(GENERATE_HELP);
          break;
        }
        await handleGenerateCommand(args.args);
        break;

      default:
        showUnknownCommand(args.command);
        process.exit(1);
    }
  } catch (err: unknown) {
    // 全局错误处理
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`执行失败: ${message}`);
    console.log('');
    console.log(`  ${colorText('提示:', 'brightYellow')} 请检查输入参数或运行 ${colorText('lytx --help', 'brightCyan')} 查看帮助`);
    console.log('');
    process.exit(1);
  }
}

// 执行主函数
main();

// ============================================================
// 模块导出（供外部使用）
// ============================================================

// 脚手架相关
export { createProject, type ScaffoldOptions } from './scaffold';

// HMR 相关
export { createHMRServer, createHMREndpoint, getHMRClientScript, type HMRUpdate, type HMRServer } from './hmr';
