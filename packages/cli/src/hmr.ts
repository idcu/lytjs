/**
 * Lyt CLI 热模块替换 (HMR) 模块
 * 实现 WebSocket 通信、文件监听和客户端注入
 * 纯 Node.js 原生实现，不依赖任何第三方包
 */

import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// ============================================================
// 类型定义
// ============================================================

/** HMR 更新类型 */
export interface HMRUpdate {
  /** 更新类型 */
  type: 'update' | 'reload' | 'css';
  /** 变更文件路径 */
  path: string;
  /** 更新内容（可选） */
  content?: string;
}

/** HMR 服务器接口 */
export interface HMRServer {
  /** 启动 HMR 服务 */
  start(port: number): void;
  /** 停止 HMR 服务 */
  stop(): void;
  /** 注册文件变更回调 */
  onFileChange(callback: (file: string) => void): void;
  /** 通知客户端更新 */
  notifyClient(update: HMRUpdate): void;
}

/** WebSocket 客户端连接 */
interface WSConnection {
  socket: import('net').Socket;
  isAlive: boolean;
}

/** 文件变更回调类型 */
type FileChangeCallback = (file: string) => void;

// ============================================================
// WebSocket 服务
// ============================================================

/**
 * 简易 WebSocket 服务
 * 基于 HTTP upgrade 请求实现，用于 HMR 热更新通知
 */
class SimpleWebSocketServer {
  private clients: WSConnection[] = [];

  /**
   * 处理 HTTP upgrade 请求，建立 WebSocket 连接
   */
  handleUpgrade(
    req: http.IncomingMessage,
    socket: import('net').Socket,
    head: Buffer
  ): void {
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

    socket.on('close', () => {
      this.clients = this.clients.filter((c) => c !== client);
    });

    socket.on('error', () => {
      this.clients = this.clients.filter((c) => c !== client);
    });

    this.clients.push(client);
  }

  /**
   * 向所有已连接的客户端广播消息
   */
  broadcast(data: string): void {
    const deadClients: WSConnection[] = [];

    for (const client of this.clients) {
      try {
        if (!client.isAlive) {
          deadClients.push(client);
          continue;
        }
        const payload = Buffer.from(data, 'utf-8');
        const frame = this.createFrame(0x81, payload);
        client.socket.write(frame);
      } catch {
        deadClients.push(client);
      }
    }

    for (const dead of deadClients) {
      this.clients = this.clients.filter((c) => c !== dead);
      try {
        dead.socket.destroy();
      } catch {
        // ignore
      }
    }
  }

  /**
   * 创建 WebSocket 数据帧
   */
  private createFrame(opcode: number, payload: Buffer): Buffer {
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

  /**
   * 断开所有客户端连接
   */
  closeAll(): void {
    for (const client of this.clients) {
      try {
        client.socket.destroy();
      } catch {
        // ignore
      }
    }
    this.clients = [];
  }
}

// ============================================================
// HMR 服务器实现
// ============================================================

/**
 * 创建 HMR 服务器实例
 * 将 WebSocket 服务和文件监听整合在一起
 *
 * @param rootDir - 项目根目录
 * @returns HMRServer 实例
 */
export function createHMRServer(rootDir: string): HMRServer {
  const wsServer = new SimpleWebSocketServer();
  const fileChangeCallbacks: FileChangeCallback[] = [];
  const watchers: fs.FSWatcher[] = [];
  let httpServer: http.Server | null = null;
  let isRunning = false;

  /**
   * 根据文件扩展名确定 HMR 更新类型
   */
  function getUpdateType(filePath: string): HMRUpdate['type'] {
    const ext = path.extname(filePath).toLowerCase();

    if (ext === '.css') {
      return 'css';
    }

    // 配置文件变更需要全量刷新
    const basename = path.basename(filePath);
    if (
      basename.startsWith('lytx.config') ||
      basename === 'tsconfig.json' ||
      basename === 'package.json'
    ) {
      return 'reload';
    }

    // .ts/.lyt 文件进行组件热更新
    if (ext === '.ts' || ext === '.tsx' || ext === '.lyt' || ext === '.js' || ext === '.jsx') {
      return 'update';
    }

    return 'reload';
  }

  /**
   * 递归监听目录
   */
  function watchDirectory(dir: string): void {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') {
            continue;
          }
          watchDirectory(fullPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          const watchExtensions = new Set([
            '.ts', '.tsx', '.js', '.jsx', '.css', '.html', '.json', '.lyt',
          ]);

          if (watchExtensions.has(ext)) {
            try {
              const watcher = fs.watch(fullPath, { persistent: false }, (eventType) => {
                if (eventType === 'change') {
                  const relativePath = path.relative(rootDir, fullPath);

                  // 通知所有回调
                  for (const cb of fileChangeCallbacks) {
                    try {
                      cb(relativePath);
                    } catch {
                      // ignore callback errors
                    }
                  }

                  // 构造 HMR 更新
                  const updateType = getUpdateType(fullPath);
                  const update: HMRUpdate = {
                    type: updateType,
                    path: `/${relativePath}`,
                  };

                  // CSS 文件读取内容
                  if (updateType === 'css') {
                    try {
                      update.content = fs.readFileSync(fullPath, 'utf-8');
                    } catch {
                      // ignore read error
                    }
                  }

                  // 通过 WebSocket 广播更新
                  wsServer.broadcast(JSON.stringify(update));
                }
              });

              watchers.push(watcher);
            } catch {
              // ignore watch errors
            }
          }
        }
      }
    } catch {
      // ignore directory read errors
    }
  }

  return {
    start(port: number): void {
      if (isRunning) return;
      isRunning = true;

      // 创建 HTTP 服务器（用于 WebSocket upgrade）
      httpServer = http.createServer((_req, res) => {
        res.writeHead(426, { 'Content-Type': 'text/plain' });
        res.end('Upgrade Required');
      });

      // 处理 WebSocket upgrade
      httpServer.on('upgrade', (req, socket, head) => {
        wsServer.handleUpgrade(req, socket, head);
      });

      httpServer.listen(port, () => {
        // 服务器已启动，开始监听文件变化
      });

      // 开始监听文件变化
      watchDirectory(rootDir);
    },

    stop(): void {
      isRunning = false;

      // 关闭所有文件监听器
      for (const watcher of watchers) {
        try {
          watcher.close();
        } catch {
          // ignore
        }
      }
      watchers.length = 0;

      // 关闭 WebSocket 连接
      wsServer.closeAll();

      // 关闭 HTTP 服务器
      if (httpServer) {
        try {
          httpServer.close();
        } catch {
          // ignore
        }
        httpServer = null;
      }
    },

    onFileChange(callback: FileChangeCallback): void {
      fileChangeCallbacks.push(callback);
    },

    notifyClient(update: HMRUpdate): void {
      wsServer.broadcast(JSON.stringify(update));
    },
  };
}

// ============================================================
// HMR 端点（集成到现有 HTTP 服务器）
// ============================================================

/**
 * 在现有 HTTP 服务器上创建 HMR WebSocket 端点
 *
 * @param server - 现有的 HTTP 服务器实例
 * @returns 包含 broadcast 和 getClientCount 方法的对象
 */
export function createHMREndpoint(server: http.Server): {
  broadcast(data: string): void;
  getClientCount(): number;
} {
  const wsServer = new SimpleWebSocketServer();

  server.on('upgrade', (req, socket, head) => {
    wsServer.handleUpgrade(req, socket, head);
  });

  return {
    broadcast(data: string): void {
      wsServer.broadcast(data);
    },
    getClientCount(): number {
      return wsServer.getClientCount();
    },
  };
}

// ============================================================
// 客户端 HMR 运行时脚本
// ============================================================

/**
 * 生成注入到页面的客户端 HMR 运行时脚本
 * 该脚本在浏览器中运行，负责：
 * 1. 建立 WebSocket 连接
 * 2. 接收服务端的 HMR 更新通知
 * 3. 根据更新类型执行对应操作
 *
 * @returns 客户端 HMR 脚本字符串
 */
export function getHMRClientScript(): string {
  return `(function() {
  'use strict';

  var ws = null;
  var reconnectTimer = null;
  var reconnectAttempts = 0;
  var maxReconnectAttempts = 10;

  function connect() {
    var protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    var wsUrl = protocol + '//' + location.host + '/__hmr__';
    ws = new WebSocket(wsUrl);

    ws.onopen = function() {
      reconnectAttempts = 0;
      console.log('[HMR] Connected');
    };

    ws.onmessage = function(event) {
      try {
        var update = JSON.parse(event.data);

        if (update.type === 'css') {
          handleCSSUpdate(update);
        } else if (update.type === 'update') {
          handleModuleUpdate(update);
        } else if (update.type === 'reload') {
          handleFullReload(update);
        }
      } catch (e) {
        console.error('[HMR] Failed to parse update:', e);
      }
    };

    ws.onclose = function() {
      console.log('[HMR] Disconnected');
      scheduleReconnect();
    };

    ws.onerror = function() {
      ws.close();
    };
  }

  function scheduleReconnect() {
    if (reconnectAttempts >= maxReconnectAttempts) {
      console.log('[HMR] Max reconnect attempts reached');
      return;
    }
    reconnectAttempts++;
    var delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
    console.log('[HMR] Reconnecting in ' + delay + 'ms (attempt ' + reconnectAttempts + ')');
    reconnectTimer = setTimeout(connect, delay);
  }

  function handleCSSUpdate(update) {
    console.log('[HMR] CSS update:', update.path);
    // 查找所有 link[rel="stylesheet"] 并重新加载
    var links = document.querySelectorAll('link[rel="stylesheet"]');
    links.forEach(function(link) {
      var href = link.getAttribute('href');
      if (href && href.indexOf(update.path) !== -1) {
        var newLink = document.createElement('link');
        newLink.rel = 'stylesheet';
        newLink.href = href + (href.indexOf('?') !== -1 ? '&' : '?') + 't=' + Date.now();
        link.parentNode.replaceChild(newLink, link);
      }
    });

    // 如果有内联 CSS 内容，直接注入
    if (update.content) {
      var style = document.createElement('style');
      style.textContent = update.content;
      document.head.appendChild(style);
    }
  }

  function handleModuleUpdate(update) {
    console.log('[HMR] Module update:', update.path);
    // 尝试热更新模块
    if (typeof module !== 'undefined' && module.hot) {
      module.hot.accept(update.path, function() {
        console.log('[HMR] Module accepted:', update.path);
      });
    } else {
      // 回退到全量刷新
      console.log('[HMR] Full reload (module.hot not available)');
      location.reload();
    }
  }

  function handleFullReload(update) {
    console.log('[HMR] Full reload:', update.path);
    location.reload();
  }

  // 启动连接
  connect();
})();`;
}
