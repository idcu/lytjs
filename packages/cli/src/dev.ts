/**
 * Lyt CLI 开发服务器模块
 * 实现 `lyt dev` 命令，启动本地开发服务器
 * 使用 esbuild 进行 TypeScript 即时编译
 *
 * 功能：
 *   - 静态文件服务（读取本地文件返回）
 *   - MIME 类型识别
 *   - TypeScript 文件即时编译（esbuild transformSync）
 *   - 热更新（HMR）：文件变化时通过 WebSocket 通知浏览器
 *   - 简易 WebSocket 服务（用 HTTP upgrade 实现）
 */

import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { colorText, getMIMEType, logger } from './utils';
// esbuild 安装在项目根目录，通过 require 引用以兼容 pnpm workspace 链接
const esbuild = require('esbuild');

// ============================================================
// 类型定义
// ============================================================

/** 开发服务器选项 */
export interface DevServerOptions {
  /** 服务端口（默认 3000） */
  port?: number;
  /** 项目根目录（默认当前工作目录） */
  root?: string;
  /** 是否开启 HMR（默认 true） */
  hmr?: boolean;
}

/** WebSocket 客户端连接 */
interface WSConnection {
  /** HTTP socket 对象 */
  socket: import('net').Socket;
  /** 是否已建立连接 */
  isAlive: boolean;
}

// ============================================================
// TypeScript 即时编译
// ============================================================

/**
 * TypeScript → JavaScript 编译器（基于 esbuild）
 * 使用 esbuild 的 transformSync 进行即时编译，替代正则替换方案
 *
 * @param tsCode - TypeScript 源代码
 * @param filename - 文件名（用于错误提示）
 * @returns 编译后的 JavaScript 代码
 */
export function compileTS(tsCode: string, filename?: string): string {
  try {
    const result = esbuild.transformSync(tsCode, {
      loader: 'ts',
      target: 'es2018',
      format: 'esm',
      sourcemap: 'inline',
    });
    return result.code;
  } catch (e: unknown) {
    const errMsg = e instanceof Error ? e.message : String(e);
    console.error(`[Lyt CLI] 编译错误 ${filename || ''}:`, errMsg);
    return tsCode; // fallback: 返回原始代码
  }
}

// ============================================================
// WebSocket 服务
// ============================================================

/**
 * 简易 WebSocket 服务
 * 基于 HTTP upgrade 请求实现，用于 HMR 热更新通知
 */
class SimpleWebSocketServer {
  /** 已连接的客户端列表 */
  private clients: WSConnection[] = [];

  /**
   * 处理 HTTP upgrade 请求，建立 WebSocket 连接
   * @param req - HTTP 请求对象
   * @param socket - 网络 socket
   * @param head - upgrade head 数据
   */
  handleUpgrade(
    req: http.IncomingMessage,
    socket: import('net').Socket,
    head: Buffer
  ): void {
    // 验证 WebSocket 握手请求
    const key = req.headers['sec-websocket-key'];
    if (!key) {
      socket.destroy();
      return;
    }

    // 计算 Sec-WebSocket-Accept 值
    const acceptKey = crypto
      .createHash('sha1')
      .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
      .digest('base64');

    // 发送握手响应
    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\n' +
        'Upgrade: websocket\r\n' +
        'Connection: Upgrade\r\n' +
        `Sec-WebSocket-Accept: ${acceptKey}\r\n` +
        '\r\n'
    );

    const client: WSConnection = {
      socket,
      isAlive: true,
    };

    // 监听连接关闭
    socket.on('close', () => {
      this.clients = this.clients.filter((c) => c !== client);
    });

    // 监听错误
    socket.on('error', () => {
      this.clients = this.clients.filter((c) => c !== client);
    });

    this.clients.push(client);
    logger.info('WebSocket 客户端已连接');
  }

  /**
   * 向所有已连接的客户端广播消息
   * @param data - 要发送的数据字符串
   */
  broadcast(data: string): void {
    const deadClients: WSConnection[] = [];

    for (const client of this.clients) {
      try {
        if (!client.isAlive) {
          deadClients.push(client);
          continue;
        }
        // 构造 WebSocket 数据帧（文本帧，opcode=1）
        const payload = Buffer.from(data, 'utf-8');
        const frame = this.createFrame(0x81, payload);
        client.socket.write(frame);
      } catch {
        deadClients.push(client);
      }
    }

    // 清理已断开的连接
    for (const dead of deadClients) {
      this.clients = this.clients.filter((c) => c !== dead);
      dead.socket.destroy();
    }
  }

  /**
   * 创建 WebSocket 数据帧
   * @param opcode - 操作码（0x81=文本帧，0x89=ping）
   * @param payload - 负载数据
   * @returns 完整的 WebSocket 帧 Buffer
   */
  private createFrame(opcode: number, payload: Buffer): Buffer {
    const mask = false; // 服务器到客户端不需要掩码
    const len = payload.length;

    let headerLen: number;
    if (len < 126) {
      headerLen = 2;
    } else if (len < 65536) {
      headerLen = 4;
    } else {
      headerLen = 10;
    }

    const frame = Buffer.alloc(headerLen + len);
    frame[0] = opcode;

    if (len < 126) {
      frame[1] = len;
    } else if (len < 65536) {
      frame[1] = 126;
      frame.writeUInt16BE(len, 2);
    } else {
      frame[1] = 127;
      // 写入 64 位长度（高 4 字节为 0）
      frame.writeUInt32BE(0, 2);
      frame.writeUInt32BE(len, 6);
    }

    payload.copy(frame, headerLen);
    return frame;
  }

  /**
   * 获取当前连接的客户端数量
   */
  getClientCount(): number {
    return this.clients.length;
  }
}

// ============================================================
// 文件监听（HMR）
// ============================================================

/**
 * 使用 fs.watch 监听文件变化，触发 HMR 更新
 * @param rootDir - 要监听的根目录
 * @param wsServer - WebSocket 服务实例，用于通知客户端
 */
function watchFiles(rootDir: string, wsServer: SimpleWebSocketServer): void {
  // 需要监听的文件扩展名
  const watchExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.css', '.html', '.json']);

  /**
   * 递归监听目录
   * @param dir - 目录路径
   */
  function watchDirectory(dir: string): void {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          // 跳过 node_modules 和 .git 目录
          if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') {
            continue;
          }
          // 递归监听子目录
          watchDirectory(fullPath);
        } else if (entry.isFile()) {
          // 只监听特定扩展名的文件
          const ext = path.extname(entry.name);
          if (watchExtensions.has(ext)) {
            fs.watch(fullPath, { persistent: false }, (eventType) => {
              if (eventType === 'change') {
                const relativePath = path.relative(rootDir, fullPath);
                logger.info(`文件变化: ${colorText(relativePath, 'brightYellow')}`);

                // 通过 WebSocket 通知浏览器重新加载
                const hmrMessage = JSON.stringify({
                  type: 'hmr-update',
                  path: `/${relativePath}`,
                  timestamp: Date.now(),
                });
                wsServer.broadcast(hmrMessage);
              }
            });
          }
        }
      }
    } catch {
      // 忽略无权限访问的目录
    }
  }

  watchDirectory(rootDir);
  logger.info(`正在监听 ${colorText(rootDir, 'brightCyan')} 目录的文件变化...`);
}

// ============================================================
// HTTP 请求处理
// ============================================================

/**
 * 处理 HTTP 请求
 * 提供静态文件服务和 TypeScript 即时编译
 *
 * @param req - HTTP 请求对象
 * @param rootDir - 项目根目录
 * @returns HTTP 响应内容 { statusCode, headers, body }
 */
function handleRequest(
  req: http.IncomingMessage,
  rootDir: string
): { statusCode: number; headers: Record<string, string>; body: string | Buffer } {
  // 解析请求路径
  const url = req.url || '/';

  // 忽略 favicon 请求
  if (url === '/favicon.ico') {
    return {
      statusCode: 204,
      headers: {},
      body: '',
    };
  }

  // 解析 URL，去除查询参数
  const pathname = url.split('?')[0];

  // 构建文件路径（安全处理，防止目录遍历攻击）
  const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  let filePath = path.join(rootDir, safePath);

  // 如果路径是目录，尝试查找 index.html
  try {
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
  } catch {
    // 文件不存在，继续处理
  }

  // 读取文件
  try {
    const content = fs.readFileSync(filePath);

    // 检查是否是 TypeScript 文件，需要即时编译
    const ext = path.extname(filePath);
    if (ext === '.ts' || ext === '.tsx') {
      // 将 TypeScript 编译为 JavaScript
      const tsCode = content.toString('utf-8');
      const jsCode = compileTS(tsCode, filePath);

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/javascript; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Access-Control-Allow-Origin': '*',
        },
        body: jsCode,
      };
    }

    // 静态文件直接返回
    const mimeType = getMIMEType(filePath);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
      },
      body: content,
    };
  } catch (err: unknown) {
    const errorCode = (err as NodeJS.ErrnoException).code;

    if (errorCode === 'ENOENT') {
      // 文件不存在，返回 404
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
        body: `<!DOCTYPE html>
<html>
<head><title>404 Not Found</title></head>
<body>
  <h1>404 Not Found</h1>
  <p>找不到文件: ${pathname}</p>
</body>
</html>`,
      };
    }

    if (errorCode === 'EACCES') {
      // 无权限访问
      return {
        statusCode: 403,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        body: '403 Forbidden',
      };
    }

    // 其他错误
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      body: '500 Internal Server Error',
    };
  }
}

// ============================================================
// 开发服务器
// ============================================================

/**
 * 启动 Lyt 开发服务器
 *
 * @param options - 开发服务器选项
 * @param options.port - 服务端口（默认 3000）
 * @param options.root - 项目根目录（默认当前工作目录）
 * @param options.hmr - 是否开启 HMR（默认 true）
 */
export function startDevServer(options: DevServerOptions = {}): void {
  const port = options.port || 3000;
  const rootDir = path.resolve(options.root || process.cwd());
  const enableHmr = options.hmr !== false;

  // 创建 WebSocket 服务
  const wsServer = new SimpleWebSocketServer();

  // 创建 HTTP 服务器
  const server = http.createServer((req, res) => {
    const result = handleRequest(req, rootDir);

    // 设置响应头
    res.writeHead(result.statusCode, result.headers);
    res.end(result.body);
  });

  // 处理 WebSocket upgrade 请求
  if (enableHmr) {
    server.on('upgrade', (req, socket, head) => {
      wsServer.handleUpgrade(req, socket, head);
    });
  }

  // 启动服务器
  server.listen(port, () => {
    // 清屏并输出启动信息
    console.log('');
    console.log(
      colorText('  ╔══════════════════════════════════════╗', 'brightCyan')
    );
    console.log(
      colorText('  ║', 'brightCyan') +
        colorText('        Lyt 开发服务器已启动          ', 'brightWhite') +
        colorText('║', 'brightCyan')
    );
    console.log(
      colorText('  ╚══════════════════════════════════════╝', 'brightCyan')
    );
    console.log('');
    console.log(`  ${colorText('➜', 'brightGreen')}  本地访问:   ${colorText(`http://localhost:${port}`, 'brightBlue')}`);
    console.log(`  ${colorText('➜', 'brightGreen')}  网络访问:   ${colorText(`http://127.0.0.1:${port}`, 'brightBlue')}`);
    console.log(`  ${colorText('➜', 'brightGreen')}  项目目录:   ${colorText(rootDir, 'brightBlue')}`);
    console.log(`  ${colorText('➜', 'brightGreen')}  热更新:     ${colorText(enableHmr ? '已开启' : '已关闭', enableHmr ? 'brightGreen' : 'brightRed')}`);
    console.log('');
    console.log(`  ${colorText('按 Ctrl+C 停止服务器', 'dim')}`);
    console.log('');
  });

  // 错误处理
  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      logger.error(`端口 ${port} 已被占用，请使用 --port 指定其他端口`);
      process.exit(1);
    } else {
      logger.error(`服务器启动失败: ${err.message}`);
      process.exit(1);
    }
  });

  // 开启文件监听（HMR）
  if (enableHmr) {
    watchFiles(rootDir, wsServer);
  }

  // 优雅关闭
  const shutdown = () => {
    logger.info('正在关闭开发服务器...');
    server.close(() => {
      logger.success('服务器已关闭');
      process.exit(0);
    });

    // 强制退出超时
    setTimeout(() => {
      logger.warn('服务器关闭超时，强制退出');
      process.exit(1);
    }, 5000);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
