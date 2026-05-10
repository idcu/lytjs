/**
 * DevTools 与面板通信桥接模块
 */

export type MessageType = 
  | 'init'
  | 'update-component-tree'
  | 'update-signals'
  | 'edit-state'
  | 'time-travel'
  | 'performance-data';

export interface BridgeMessage {
  type: MessageType;
  payload?: unknown;
  timestamp?: number;
}

type MessageHandler = (message: BridgeMessage) => void;

const handlers = new Map<MessageType, Set<MessageHandler>>();

export function onPanelMessage(type: MessageType, handler: MessageHandler): () => void {
  if (!handlers.has(type)) {
    handlers.set(type, new Set());
  }
  handlers.get(type)!.add(handler);
  
  return () => {
    handlers.get(type)?.delete(handler);
  };
}

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
}

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
}

export function clearHandlers(): void {
  handlers.clear();
}
