/**
 * @lytjs/hmr - LytJS 热模块替换
 *
 * 提供热模块替换的核心功能
 */

import type {
  HMRClientOptions,
  HMRMessage,
  HMRUpdate,
  HMRHandler,
} from './types';

/**
 * HMR 客户端类
 */
class HMRClient {
  private options: Required<HMRClientOptions>;
  private ws: WebSocket | null = null;
  private handlers: Map<string, HMRHandler> = new Map();
  private isConnected: boolean = false;

  constructor(options: HMRClientOptions = {}) {
    this.options = {
      url: options.url || 'ws://localhost:5173',
      autoConnect: options.autoConnect !== false,
    };

    if (this.options.autoConnect) {
      this.connect();
    }
  }

  /**
   * 连接到 HMR 服务器
   */
  connect(): void {
    if (this.ws) {
      this.ws.close();
    }

    console.log('[HMR] Connecting to', this.options.url);

    try {
      this.ws = new WebSocket(this.options.url);

      this.ws.onopen = () => {
        this.isConnected = true;
        console.log('[HMR] Connected');
        this.dispatch({ type: 'connected' });
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        console.log('[HMR] Disconnected, reconnecting in 2s...');
        setTimeout(() => this.connect(), 2000);
      };

      this.ws.onerror = (error) => {
        console.error('[HMR] WebSocket error', error);
      };
    } catch (error) {
      console.error('[HMR] Connection failed', error);
      setTimeout(() => this.connect(), 2000);
    }
  }

  /**
   * 处理消息
   */
  private handleMessage(data: string): void {
    try {
      const message: HMRMessage = JSON.parse(data);
      console.log('[HMR] Received message:', message.type);

      switch (message.type) {
        case 'update':
          this.handleUpdate(message.data as HMRUpdate);
          break;
        case 'full-reload':
          this.handleFullReload();
          break;
        default:
          this.dispatch(message);
          break;
      }
    } catch (error) {
      console.error('[HMR] Failed to parse message', error);
    }
  }

  /**
   * 处理模块更新
   */
  private handleUpdate(update: HMRUpdate): void {
    const handler = this.handlers.get(update.path);
    if (handler?.accept) {
      console.log('[HMR] Accepting update for', update.path);
      handler.accept(update);
    } else {
      console.log('[HMR] No handler for', update.path, ', reloading');
      this.handleFullReload();
    }
  }

  /**
   * 处理完全重新加载
   */
  private handleFullReload(): void {
    console.log('[HMR] Full reload requested');
    window.location.reload();
  }

  /**
   * 注册模块处理程序
   */
  register(path: string, handler: HMRHandler): void {
    this.handlers.set(path, handler);
  }

  /**
   * 注销模块处理程序
   */
  unregister(path: string): void {
    this.handlers.delete(path);
  }

  /**
   * 发送消息到服务器
   */
  send(message: HMRMessage): void {
    if (this.ws && this.isConnected) {
      this.ws.send(JSON.stringify(message));
    }
  }

  /**
   * 分发事件
   */
  private dispatch(message: HMRMessage): void {
    const event = new CustomEvent('lytjs:hmr', {
      detail: message,
    });
    window.dispatchEvent(event);
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

/**
 * 创建 HMR 客户端
 *
 * @param options - 客户端选项
 * @returns HMR 客户端实例
 */
export function createHMRClient(options: HMRClientOptions = {}): HMRClient {
  return new HMRClient(options);
}

/**
 * 全局 HMR 客户端实例（单例）
 */
let globalClient: HMRClient | null = null;

/**
 * 获取全局 HMR 客户端
 *
 * @param options - 客户端选项（首次调用时使用）
 * @returns HMR 客户端实例
 */
export function getHMRClient(options: HMRClientOptions = {}): HMRClient {
  if (!globalClient) {
    globalClient = createHMRClient(options);
  }
  return globalClient;
}

/**
 * HMR 模块接受函数
 *
 * @param path - 模块路径
 * @param handler - 处理程序
 */
export function accept(path: string, handler: (update: HMRUpdate) => void): void {
  const client = getHMRClient();
  client.register(path, { accept: handler });
}

/**
 * HMR 模块清理函数
 *
 * @param path - 模块路径
 * @param handler - 清理函数
 */
export function dispose(path: string, handler: () => void): void {
  const client = getHMRClient();
  const existing = client['handlers'].get(path) || {};
  client.register(path, { ...existing, dispose: handler });
}

export type { HMRClientOptions, HMRMessage, HMRUpdate, HMRHandler };
