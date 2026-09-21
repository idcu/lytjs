/**
 * DevTools 与面板通信桥接模块
 */

export type MessageType =
  | 'init'
  | 'update-component-tree'
  | 'update-signals'
  | 'edit-state'
  | 'time-travel'
  | 'performance-data'
  | string;

export interface BridgeMessage {
  type: MessageType;
  payload?: unknown;
  timestamp?: number;
}

type MessageHandler = (message: BridgeMessage) => void;
type GenericMessageHandler = (message: unknown) => void;

const handlers = new Map<MessageType, Set<MessageHandler>>();
const genericHandlers = new Set<GenericMessageHandler>();
let isActive = false;

/**
 * 注册面板消息处理器
 * @param type - 消息类型
 * @param handler - 消息处理器
 * @returns 取消注册函数
 */
export function onPanelMessage(type: MessageType, handler: MessageHandler): () => void;
/**
 * 注册通用面板消息处理器（接收所有类型消息）
 * @param handler - 消息处理器
 * @returns 取消注册函数
 */
export function onPanelMessage(handler: GenericMessageHandler): () => void;
export function onPanelMessage(
  typeOrHandler: MessageType | GenericMessageHandler,
  handler?: MessageHandler,
): () => void {
  // 处理通用处理器（只传入一个函数参数）
  if (typeof typeOrHandler === 'function') {
    genericHandlers.add(typeOrHandler);
    return () => {
      genericHandlers.delete(typeOrHandler);
    };
  }

  // 处理特定类型处理器
  const type = typeOrHandler;
  if (!handler) {
    throw new Error('Handler is required when specifying a message type');
  }

  if (!handlers.has(type)) {
    handlers.set(type, new Set());
  }
  handlers.get(type)!.add(handler);

  return () => {
    handlers.get(type)?.delete(handler);
  };
}

/**
 * 发送消息到面板
 */
export function sendToPanel(message: BridgeMessage): void {
  // 实际实现中，这里会通过 chrome.runtime 或 window.postMessage 发送
  // 简化版本：直接触发对应类型的处理器
  const typeHandlers = handlers.get(message.type);
  if (typeHandlers) {
    typeHandlers.forEach((handler) => {
      try {
        handler(message);
      } catch (e) {
        console.error('[DevTools Bridge] Handler error:', e);
      }
    });
  }

  // 触发通用处理器
  genericHandlers.forEach((handler) => {
    try {
      handler(message);
    } catch (e) {
      console.error('[DevTools Bridge] Generic handler error:', e);
    }
  });
}

/**
 * 广播消息到面板
 */
export function broadcastToPanel(message: BridgeMessage): void {
  // 广播到所有类型的处理器
  handlers.forEach((typeHandlers, type) => {
    if (type !== message.type) return;
    typeHandlers.forEach((handler) => {
      try {
        handler(message);
      } catch (e) {
        console.error('[DevTools Bridge] Broadcast error:', e);
      }
    });
  });

  // 触发通用处理器
  genericHandlers.forEach((handler) => {
    try {
      handler(message);
    } catch (e) {
      console.error('[DevTools Bridge] Generic broadcast error:', e);
    }
  });
}

/**
 * 清除所有处理器
 */
export function clearHandlers(): void {
  handlers.clear();
  genericHandlers.clear();
}

/**
 * 挂到 window 上供浏览器扩展 / 面板发现的钩子键
 */
export const DEVTOOLS_HOOK_KEY = '__LYTJS_DEVTOOLS_HOOK__';

const HOOK_VERSION = '1.0.0';
const MESSAGE_SOURCE = 'lytjs-devtools';
const PANEL_SOURCE = 'lytjs-devtools-panel';

/**
 * 浏览器扩展侧可访问的钩子接口
 */
export interface DevToolsWindowHook {
  /** 钩子协议版本 */
  version: string;
  /** 桥接是否处于激活状态 */
  isActive: () => boolean;
  /** 向面板发送消息（本进程处理器 + postMessage 跨上下文） */
  send: (message: BridgeMessage) => void;
  /** 订阅面板消息，返回取消订阅函数 */
  subscribe: (handler: GenericMessageHandler) => () => void;
}

type HookHost = Record<string, unknown> & {
  postMessage?: (message: unknown, targetOrigin: string) => void;
  addEventListener?: (type: string, listener: (event: unknown) => void) => void;
  removeEventListener?: (type: string, listener: (event: unknown) => void) => void;
};

function getHookHost(): HookHost | undefined {
  const g = globalThis as unknown as HookHost & { window?: unknown };
  return g.window === undefined ? undefined : g;
}

/**
 * 处理来自面板（扩展 / iframe）的 window 消息
 */
function handlePanelWindowMessage(event: unknown): void {
  const data = (event as { data?: unknown } | undefined)?.data as
    | { source?: string; payload?: unknown; type?: string }
    | undefined;
  if (!data || data.source !== PANEL_SOURCE) return;

  // 优先取 payload（面板消息约定），否则把消息体本身当作 BridgeMessage
  const message = (data.payload ?? data) as BridgeMessage;
  if (!message || typeof message.type !== 'string') return;
  broadcastToPanel(message);
}

function installWindowHook(): void {
  const host = getHookHost();
  if (!host || host[DEVTOOLS_HOOK_KEY]) return;

  host[DEVTOOLS_HOOK_KEY] = {
    version: HOOK_VERSION,
    isActive: () => isActive,
    send: (message: BridgeMessage) => {
      sendToPanel(message);
      // 真实传输层：让扩展面板 / iframe 也能收到
      host.postMessage?.({ source: MESSAGE_SOURCE, ...message }, '*');
    },
    subscribe: (handler: GenericMessageHandler) => onPanelMessage(handler),
  } satisfies DevToolsWindowHook;

  // 接收面板下发的消息（此前完全没人监听 window 消息，
  // 面板 -> 页面方向的消息通路是断的）
  host.addEventListener?.('message', handlePanelWindowMessage);
}

function uninstallWindowHook(): void {
  const host = getHookHost();
  if (!host) return;
  host.removeEventListener?.('message', handlePanelWindowMessage);
  delete host[DEVTOOLS_HOOK_KEY];
}

/**
 * 激活桥接
 *
 * 除了置位标志，还会在浏览器环境下挂载 `window.__LYTJS_DEVTOOLS_HOOK__`
 * （此前只改了一个内部布尔值，扩展/面板没有任何发现入口，导致整套 DevTools
 * 在实际浏览器里无法被连接上）。
 */
export function activateBridge(): void {
  isActive = true;
  installWindowHook();
}

/**
 * 停用桥接
 */
export function deactivateBridge(): void {
  isActive = false;
  uninstallWindowHook();
}

/**
 * 检查桥接是否激活
 */
export function isBridgeActive(): boolean {
  return isActive;
}
