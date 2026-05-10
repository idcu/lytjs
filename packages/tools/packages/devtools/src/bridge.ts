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
  handler?: MessageHandler
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
    typeHandlers.forEach(handler => {
      try {
        handler(message);
      } catch (e) {
        console.error('[DevTools Bridge] Handler error:', e);
      }
    });
  }

  // 触发通用处理器
  genericHandlers.forEach(handler => {
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
    typeHandlers.forEach(handler => {
      try {
        handler(message);
      } catch (e) {
        console.error('[DevTools Bridge] Broadcast error:', e);
      }
    });
  });

  // 触发通用处理器
  genericHandlers.forEach(handler => {
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
 * 激活桥接
 */
export function activateBridge(): void {
  isActive = true;
}

/**
 * 停用桥接
 */
export function deactivateBridge(): void {
  isActive = false;
}

/**
 * 检查桥接是否激活
 */
export function isBridgeActive(): boolean {
  return isActive;
}
