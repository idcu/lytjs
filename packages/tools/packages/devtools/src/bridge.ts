/**
 * @lytjs/devtools - Communication bridge
 *
 * Handles communication between the DevTools backend and the browser extension panel.
 */

import type { DevToolsHook } from './types';

// Bridge state
let bridgeActive = false;
const messageHandlers = new Set<(message: unknown) => void>();

/**
 * Check if bridge is active
 */
export function isBridgeActive(): boolean {
  return bridgeActive;
}

/**
 * Activate the bridge
 */
export function activateBridge(): void {
  bridgeActive = true;
  
  // Setup window hook for DevTools panel communication
  if (typeof window !== 'undefined') {
    (window as any).__LYTJS_DEVTOOLS_HOOK__ = createDevToolsHook();
  }
}

/**
 * Deactivate the bridge
 */
export function deactivateBridge(): void {
  bridgeActive = false;
  messageHandlers.clear();
  
  if (typeof window !== 'undefined') {
    delete (window as any).__LYTJS_DEVTOOLS_HOOK__;
  }
}

/**
 * Send message to DevTools panel
 */
export function sendToPanel(message: unknown): void {
  if (!bridgeActive) return;
  
  // In a real implementation, this would use Chrome DevTools Protocol
  // or postMessage to communicate with the extension panel
  if (typeof window !== 'undefined') {
    window.postMessage({
      source: 'lytjs-devtools-backend',
      payload: message,
    }, '*');
  }
}

/**
 * Subscribe to messages from panel
 */
export function onPanelMessage(handler: (message: unknown) => void): () => void {
  messageHandlers.add(handler);
  
  // Setup message listener if not already done
  if (typeof window !== 'undefined' && messageHandlers.size === 1) {
    window.addEventListener('message', handleWindowMessage);
  }
  
  return () => {
    messageHandlers.delete(handler);
    
    if (typeof window !== 'undefined' && messageHandlers.size === 0) {
      window.removeEventListener('message', handleWindowMessage);
    }
  };
}

/**
 * Handle window messages
 */
function handleWindowMessage(event: MessageEvent): void {
  if (event.data?.source === 'lytjs-devtools-panel') {
    for (const handler of messageHandlers) {
      handler(event.data.payload);
    }
  }
}

/**
 * Create DevTools hook
 */
function createDevToolsHook(): DevToolsHook {
  const listeners = new Map<string, Set<(payload?: unknown) => void>>();
  
  return {
    emit(event: string, payload?: unknown) {
      const handlers = listeners.get(event);
      if (handlers) {
        for (const handler of handlers) {
          handler(payload);
        }
      }
    },
    
    on(event: string, handler: (payload?: unknown) => void) {
      if (!listeners.has(event)) {
        listeners.set(event, new Set());
      }
      listeners.get(event)!.add(handler);
    },
    
    off(event: string, handler: (payload?: unknown) => void) {
      const handlers = listeners.get(event);
      if (handlers) {
        handlers.delete(handler);
      }
    },
  };
}
