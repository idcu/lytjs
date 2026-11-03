/* eslint-disable no-console */
/**
 * @lytjs/hmr - LytJS 热模块替换
 *
 * 提供热模块替换的核心功能
 *
 * ## 2026-11-03（第 41 轮）修的 5 个缺陷
 *
 * 1. **`disconnect()` 断不掉** —— `ws.onclose` 里无条件 `setTimeout(connect, 2000)`，
 *    手动断开后 2 秒又连回去；而且 `connect()` 会先 `close()` 旧 socket，旧 socket 的
 *    `onclose` 再排一个定时器 ⇒ **每调用一次 connect 就多一条重连链**，socket 数量增长。
 * 2. **`dispose` 从来不会执行** —— `handleUpdate` 只调 `accept`。热更新 N 次后，
 *    旧模块的定时器 / 事件监听 / store 订阅全都还活着（dev 下越改越卡、越改越乱）。
 *    同时 `accept()` 的注册会**覆盖**掉之前 `dispose()` 注册的清理函数。
 * 3. **`handler.error` 是死字段** —— 类型里声明了「处理错误」，实现里一次都没用过；
 *    accept / dispose 抛错时只有一句 console.error，模块状态停在半更新。
 * 4. **模块路径按字符串全等匹配** —— 服务端发 `./src/App.vue?t=1699`、客户端注册
 *    `/src/App.vue`，于是**每次热更新都退化成整页刷新**（HMR 形同虚设，但看起来
 *    「刷新了，所以生效了」）。
 * 5. **无宿主保护** —— 没有 `window` / `CustomEvent` / `WebSocket` 的环境（SSR、测试、
 *    非浏览器宿主）里，`dispatch` / `handleFullReload` / `connect` 直接抛。
 */

import type { HMRClientOptions, HMRMessage, HMRUpdate, HMRHandler } from './types';

/** 默认重连间隔（毫秒） */
const DEFAULT_RECONNECT_DELAY = 2000;
/** 指数退避的上限 */
const DEFAULT_MAX_RECONNECT_DELAY = 30_000;

type ConnectionState = 'idle' | 'connecting' | 'open' | 'closed';

/**
 * 归一化模块路径，用于「注册路径」与「服务端推送路径」的匹配。
 *
 * - 统一分隔符（Windows 的 `\`）
 * - 去掉 `./` 前缀与多余的 `/`
 * - 去掉 `?t=123` 这类缓存戳（Vite / webpack 都会带）
 */
export function normalizeModulePath(path: string): string {
  let result = String(path).replace(/\\/g, '/');
  const queryIndex = result.search(/[?#]/);
  if (queryIndex >= 0) result = result.slice(0, queryIndex);
  result = result.replace(/^\.\//, '');
  result = result.replace(/^\/+/, '');
  return result;
}

/** 当前宿主是否有可用的浏览器全局对象 */
function hasWindow(): boolean {
  return typeof window !== 'undefined' && typeof window.dispatchEvent === 'function';
}

/**
 * HMR 客户端类
 */
class HMRClient {
  private options: Required<HMRClientOptions>;
  private ws: WebSocket | null = null;
  private handlers: Map<string, HMRHandler> = new Map();
  private state: ConnectionState = 'idle';
  /** 手动 disconnect ⇒ 不再自动重连（此前没有这个开关，断开后 2s 又连回来） */
  private manualClose = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;

  constructor(options: HMRClientOptions = {}) {
    this.options = {
      url: options.url || 'ws://localhost:5173',
      autoConnect: options.autoConnect !== false,
      reconnectDelay: options.reconnectDelay ?? DEFAULT_RECONNECT_DELAY,
      maxReconnectDelay: options.maxReconnectDelay ?? DEFAULT_MAX_RECONNECT_DELAY,
    };

    if (this.options.autoConnect) {
      this.connect();
    }
  }

  /** 当前是否已连上（公开只读，便于宿主/测试判断） */
  get connected(): boolean {
    return this.state === 'open';
  }

  /**
   * 连接到 HMR 服务器
   *
   * 幂等：已连接 / 正在连接时重复调用不会新建 socket（此前会先 close 旧的，
   * 而旧的 `onclose` 又会排一个重连定时器 ⇒ 重连链越滚越多）。
   */
  connect(): void {
    this.manualClose = false;
    if (this.state === 'open' || this.state === 'connecting') return;

    this.clearReconnectTimer();

    const WebSocketImpl = typeof WebSocket !== 'undefined' ? WebSocket : undefined;
    if (!WebSocketImpl) {
      console.warn('[HMR] 当前环境没有 WebSocket，跳过连接');
      return;
    }

    this.state = 'connecting';
    console.log('[HMR] Connecting to', this.options.url);

    let socket: WebSocket;
    try {
      socket = new WebSocketImpl(this.options.url);
    } catch (error) {
      console.error('[HMR] Connection failed', error);
      this.state = 'closed';
      this.scheduleReconnect();
      return;
    }
    this.ws = socket;

    // ⚠️ 所有回调都先确认「这个 socket 还是当前 socket」—— 旧 socket 的
    //   onclose 迟到时不能影响新连接的状态机。
    socket.onopen = () => {
      if (this.ws !== socket) return;
      this.state = 'open';
      this.reconnectAttempts = 0;
      console.log('[HMR] Connected');
      this.dispatch({ type: 'connected' });
    };

    socket.onmessage = (event) => {
      if (this.ws !== socket) return;
      this.handleMessage(event.data as string);
    };

    socket.onclose = () => {
      if (this.ws !== socket) return;
      this.ws = null;
      this.state = 'closed';
      if (this.manualClose) return;
      console.log('[HMR] Disconnected, will reconnect');
      this.dispatch({ type: 'disconnected' });
      this.scheduleReconnect();
    };

    socket.onerror = (error) => {
      if (this.ws !== socket) return;
      console.error('[HMR] WebSocket error', error);
    };
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
   *
   * ⚠️ 顺序是 **dispose → accept**：先拆掉旧模块（定时器 / 监听 / 订阅），
   *   再把新模块接上。此前只调 accept，于是每热更新一次就多一份旧模块的副作用。
   */
  private handleUpdate(update: HMRUpdate): void {
    const handler = this.findHandler(update.path);
    if (!handler?.accept) {
      console.log('[HMR] No handler for', update.path, ', reloading');
      this.handleFullReload();
      return;
    }

    if (handler.dispose) {
      try {
        handler.dispose();
      } catch (error) {
        // 清理失败不能阻断更新，但必须让模块有机会自己处理（`handler.error` 此前是死字段）
        this.reportError(handler, error);
      }
    }

    try {
      console.log('[HMR] Accepting update for', update.path);
      handler.accept(update);
    } catch (error) {
      this.reportError(handler, error);
    }
  }

  private reportError(handler: HMRHandler, error: unknown): void {
    const err = error instanceof Error ? error : new Error(String(error));
    if (handler.error) {
      try {
        handler.error(err);
        return;
      } catch {
        // 处理器自己又抛了：退回到 console，避免把主流程带崩
      }
    }
    console.error('[HMR] Handler failed', err);
  }

  /**
   * 处理完全重新加载
   */
  private handleFullReload(): void {
    console.log('[HMR] Full reload requested');
    if (typeof window !== 'undefined' && typeof window.location?.reload === 'function') {
      window.location.reload();
      return;
    }
    // 非浏览器宿主（SSR / 测试）：没有 location.reload，退化成事件通知
    this.dispatch({ type: 'full-reload' });
  }

  /** 按归一化路径查找 handler（精确匹配优先，其次归一化匹配） */
  private findHandler(path: string): HMRHandler | undefined {
    const exact = this.handlers.get(path);
    if (exact) return exact;
    return this.handlers.get(normalizeModulePath(path));
  }

  /**
   * 注册模块处理程序
   *
   * 合并而非覆盖：`accept()` 与 `dispose()` 通常是两次独立调用，
   * 覆盖会让先注册的那一半静默丢失。
   */
  register(path: string, handler: HMRHandler): void {
    const key = normalizeModulePath(path);
    const existing = this.handlers.get(key);
    this.handlers.set(key, existing ? { ...existing, ...handler } : handler);
  }

  /**
   * 注销模块处理程序
   */
  unregister(path: string): void {
    const key = normalizeModulePath(path);
    this.handlers.delete(key);
    this.handlers.delete(path);
  }

  /** 读取已注册的 handler（供 `dispose()` 复用，避免访问私有字段） */
  getHandler(path: string): HMRHandler | undefined {
    return this.findHandler(path);
  }

  /**
   * 发送消息到服务器
   *
   * 未连接时直接丢弃（HMR 消息是尽力而为的，不该在断线时堆积）。
   */
  send(message: HMRMessage): void {
    if (this.ws && this.state === 'open') {
      this.ws.send(JSON.stringify(message));
    }
  }

  /**
   * 分发事件
   */
  private dispatch(message: HMRMessage): void {
    if (!hasWindow() || typeof CustomEvent === 'undefined') return;
    window.dispatchEvent(new CustomEvent('lytjs:hmr', { detail: message }));
  }

  /**
   * 断开连接
   *
   * 真正的断开：摘掉回调 + 清掉待执行的重连定时器 + 标记手动关闭。
   */
  disconnect(): void {
    this.manualClose = true;
    this.clearReconnectTimer();
    this.reconnectAttempts = 0;

    const socket = this.ws;
    this.ws = null;
    this.state = 'closed';

    if (socket) {
      // 先摘回调再 close：某些宿主 close 是同步的，onclose 会立刻触发
      socket.onopen = null;
      socket.onmessage = null;
      socket.onclose = null;
      socket.onerror = null;
      try {
        socket.close();
      } catch {
        // 已经关掉了 / 宿主实现不允许 —— 忽略
      }
    }
  }

  /** 指数退避重连；同一时刻只允许一个待执行定时器 */
  private scheduleReconnect(): void {
    if (this.manualClose) return;
    if (this.reconnectTimer !== null) return;

    const delay = Math.min(
      this.options.reconnectDelay * 2 ** this.reconnectAttempts,
      this.options.maxReconnectDelay,
    );
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
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
  client.register(path, { dispose: handler });
}

export type { HMRClientOptions, HMRMessage, HMRUpdate, HMRHandler };
