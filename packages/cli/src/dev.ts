/**
 * Lyt CLI 开发服务器模块
 * 实现 `lyt dev` 命令，提供静态文件服务和 HMR 热更新
 * 纯 Node.js 原生实现
 */

import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { colorText, logger, ensureDir, readFile, writeFile } from './utils';
import { createHMREndpoint, getHMRClientScript, type HMRUpdate } from './hmr';

// ============================================================
// esbuild 加载（带友好错误提示）
// ============================================================
let esbuild: any;
try {
  esbuild = require('esbuild');
} catch {
  logger.error('缺少依赖: esbuild');
  logger.error('');
  logger.error('  Lyt CLI 的开发服务器需要 esbuild 来实时编译 TypeScript。');
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

/** 开发服务器选项 */
export interface DevServerOptions {
  /** 服务端口（默认 3000） */
  port?: number;
  /** 项目根目录（默认当前工作目录） */
  root?: string;
  /** 是否启用 HMR（默认 true） */
  hmr?: boolean;
}

// ============================================================
// TypeScript 实时编译
// ============================================================

/**
 * 使用 esbuild 实时编译 TypeScript 为 JavaScript
 *
 * @param source - TypeScript 源码
 * @param filePath - 文件路径（用于错误提示）
 * @returns 编译后的 JavaScript 代码
 */
function compileTS(source: string, filePath?: string): string {
  try {
    return esbuild.transformSync(source, {
      loader: 'ts',
      target: 'es2018',
      format: 'esm',
      sourcemap: 'inline',
    }).code;
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    console.error(`[Lyt CLI] 编译错误 ${filePath || ''}:`, errMsg);
    return source; // 编译失败时返回原始代码
  }
}

// ============================================================
// 静态文件服务
// ============================================================

/**
 * 处理静态文件请求
 */
function serveStatic(
  req: http.IncomingMessage,
  rootDir: string
): { statusCode: number; headers: Record<string, string>; body: string } {
  let urlPath = req.url?.split('?')[0] || '/';

  // 默认返回 index.html
  if (urlPath === '/') {
    urlPath = '/index.html';
  }

  // 处理 npm 包导入请求
  if (urlPath.startsWith('/node_modules/') || urlPath.startsWith('/@')) {
    // 首先尝试项目根目录的 node_modules
    let packageFilePath: string;

    // 如果是直接以 /@ 开头的包名（如 /@lytjs/lytjs）
    if (urlPath.startsWith('/@') && !urlPath.startsWith('/node_modules/')) {
      // 先尝试使用完整的 node_modules 路径
      packageFilePath = path.join(rootDir, 'node_modules', urlPath.slice(1));
    } else {
      // 已经是 /node_modules/... 格式
      packageFilePath = path.join(rootDir, urlPath.slice(1));
    }

    // 检查 package.json 中的 main/module/exports 字段来找到正确的入口文件
    if (urlPath.match(/^\/(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/) && !urlPath.includes('.')) {
      // 这是一个包名，不是具体文件
      const packageJsonPath = path.join(packageFilePath, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        try {
          const pkgJson = JSON.parse(readFile(packageJsonPath));
          let entryFile = pkgJson.module || pkgJson.main || 'index.js';
          
          // 处理 exports 字段（如果存在）
          if (pkgJson.exports) {
            if (typeof pkgJson.exports === 'string') {
              entryFile = pkgJson.exports;
            } else if (typeof pkgJson.exports === 'object') {
              if (pkgJson.exports['.']) {
                if (typeof pkgJson.exports['.'] === 'string') {
                  entryFile = pkgJson.exports['.'];
                } else if (pkgJson.exports['.'].import) {
                  entryFile = pkgJson.exports['.'].import;
                } else if (pkgJson.exports['.'].default) {
                  entryFile = pkgJson.exports['.'].default;
                } else if (Object.values(pkgJson.exports['.'])[0]) {
                  entryFile = Object.values(pkgJson.exports['.'])[0];
                }
              }
            }
          }

          // 清理路径中的 ./
          if (entryFile.startsWith('./')) {
            entryFile = entryFile.slice(2);
          }

          packageFilePath = path.join(packageFilePath, entryFile);
        } catch {
          // 如果解析 package.json 失败，使用默认
        }
      }
    }

    // 检查文件是否存在
    if (fs.existsSync(packageFilePath) && fs.statSync(packageFilePath).isFile()) {
      const ext = path.extname(packageFilePath).toLowerCase();
      const contentTypes: Record<string, string> = {
        '.js': 'application/javascript; charset=utf-8',
        '.mjs': 'application/javascript; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
      };

      const contentType = contentTypes[ext] || 'application/octet-stream';
      const content = readFile(packageFilePath);

      return {
        statusCode: 200,
        headers: { 'Content-Type': contentType },
        body: content,
      };
    }
  }

  const filePath = path.join(rootDir, urlPath);

  // 安全检查：防止路径遍历
  if (!filePath.startsWith(rootDir)) {
    return {
      statusCode: 403,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      body: '403 Forbidden',
    };
  }

  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      body: '404 Not Found',
    };
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentTypes: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.mjs': 'application/javascript; charset=utf-8',
    '.ts': 'application/typescript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.txt': 'text/plain; charset=utf-8',
  };

  const contentType = contentTypes[ext] || 'application/octet-stream';
  let content = readFile(filePath);

  // TypeScript 文件实时编译
  if (ext === '.ts' || ext === '.tsx') {
    content = compileTS(content, urlPath);
  }

  // HTML 文件注入 HMR 客户端脚本
  if (ext === '.html') {
    content = content.replace(
      '</head>',
      `<script>${getHMRClientScript()}</script>\n</head>`
    );
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': contentType },
    body: content,
  };
}

// ============================================================
// 开发服务器
// ============================================================

/**
 * 启动开发服务器
 *
 * @param options - 开发服务器选项
 * @param options.port - 服务端口（默认 3000）
 * @param options.root - 项目根目录（默认当前工作目录）
 * @param options.hmr - 是否启用 HMR（默认 true）
 */
export function startDevServer(options: DevServerOptions = {}): void {
  const port = options.port || 3000;
  const rootDir = path.resolve(options.root || process.cwd());
  const enableHMR = options.hmr !== false;

  // 创建 HMR WebSocket 端点
  // 创建 HTTP 服务器
  const server = http.createServer((req, res) => {
    const result = serveStatic(req, rootDir);
    res.writeHead(result.statusCode, result.headers);
    res.end(result.body);
  });

  // 注册 HMR WebSocket（在 server 创建之后）
  const hmr = enableHMR ? createHMREndpoint(server) : null;

  server.listen(port, () => {
    console.log('');
    console.log(colorText('  ╔══════════════════════════════════════════╗', 'brightCyan'));
    console.log(colorText('  ║', 'brightCyan') + colorText('        Lyt 开发服务器已启动          ', 'brightWhite') + colorText('║', 'brightCyan'));
    console.log(colorText('  ╚══════════════════════════════════════════╝', 'brightCyan'));
    console.log('');
    console.log(`  ${colorText('➜', 'brightGreen')}  本地访问:   ${colorText(`http://localhost:${port}`, 'brightBlue')}`);
    console.log(`  ${colorText('➜', 'brightGreen')}  网络访问:   ${colorText(`http://127.0.0.1:${port}`, 'brightBlue')}`);
    console.log(`  ${colorText('➜', 'brightGreen')}  项目目录:   ${colorText(rootDir, 'brightBlue')}`);
    console.log(`  ${colorText('➜', 'brightGreen')}  热更新:     ${colorText(enableHMR ? '已开启' : '已关闭', enableHMR ? 'brightGreen' : 'brightRed')}`);
    console.log('');
    console.log(`  ${colorText('按 Ctrl+C 停止服务器', 'dim')}`);
    console.log('');
  });

  server.on('error', (e: NodeJS.ErrnoException) => {
    if (e.code === 'EADDRINUSE') {
      logger.error(`端口 ${port} 已被占用，请使用 --port 指定其他端口`);
      process.exit(1);
    } else {
      logger.error(`服务器启动失败: ${e.message}`);
      process.exit(1);
    }
  });

  // 优雅关闭
  const shutdown = () => {
    logger.info('正在关闭开发服务器...');
    server.close(() => {
      logger.success('服务器已关闭');
      process.exit(0);
    });
    setTimeout(() => {
      logger.warn('服务器关闭超时，强制退出');
      process.exit(1);
    }, 5000);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
