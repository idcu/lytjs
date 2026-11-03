/**
 * @lytjs/hmr - Type definitions
 */

export interface HMRClientOptions {
  /** WebSocket URL */
  url?: string;
  /** 是否自动连接 */
  autoConnect?: boolean;
  /** 首次重连间隔（毫秒），之后按指数退避，默认 2000 */
  reconnectDelay?: number;
  /** 指数退避的上限（毫秒），默认 30000 */
  maxReconnectDelay?: number;
}

export interface HMRMessage {
  /** 消息类型 */
  type: 'connected' | 'disconnected' | 'update' | 'full-reload' | 'custom';
  /** 数据 */
  data?: unknown;
}

export interface HMRUpdate {
  /** 模块路径 */
  path: string;
  /** 更新时间戳 */
  timestamp: number;
  /** 是否需要保留状态 */
  preserveState?: boolean;
}

export interface HMRHandler {
  /** 接受更新 */
  accept?: (update: HMRUpdate) => void;
  /** 处理错误 */
  error?: (error: Error) => void;
  /** 清理旧模块 */
  dispose?: () => void;
}
