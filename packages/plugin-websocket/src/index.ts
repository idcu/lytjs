/**
 * @lytjs/plugin-websocket - WebSocket Plugin
 *
 * Provides a robust WebSocket client with:
 * - Automatic reconnection with exponential backoff
 * - Heartbeat (ping/pong) detection
 * - Message buffering during disconnection
 * - Automatic JSON serialization/deserialization
 * - Event-based API (on/off)
 */

// ============================================================
// Types
// ============================================================

export type WebSocketState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

export type WebSocketEventType = 'open' | 'close' | 'message' | 'error' | 'reconnect';

export interface WebSocketOptions {
  /** Enable automatic reconnection (default: true) */
  autoReconnect?: boolean;
  /** Initial reconnect interval in ms (default: 1000) */
  reconnectInterval?: number;
  /** Maximum number of reconnection attempts (default: 10, 0 = unlimited) */
  maxReconnects?: number;
  /** Enable heartbeat ping/pong (default: true) */
  heartbeat?: boolean;
  /** Heartbeat interval in ms (default: 30000) */
  heartbeatInterval?: number;
  /** WebSocket sub-protocols */
  protocols?: string | string[];
}

export interface WebSocketClient {
  /** Establish the WebSocket connection */
  connect(): void;
  /** Close the WebSocket connection */
  disconnect(code?: number, reason?: string): void;
  /** Send data (objects are auto-serialized to JSON) */
  send(data: string | object): void;
  /** Register an event listener */
  on(event: WebSocketEventType, callback: (...args: any[]) => void): void;
  /** Remove an event listener */
  off(event: WebSocketEventType, callback: (...args: any[]) => void): void;
  /** Current connection state */
  state: WebSocketState;
  /** Messages buffered while disconnected */
  bufferedMessages: any[];
  /** Number of reconnection attempts since last successful connection */
  reconnectCount: number;
}

// ============================================================
// Event Emitter Helper
// ============================================================

type EventCallback = (...args: any[]) => void;

class EventEmitter {
  private _listeners: Map<string, Set<EventCallback>> = new Map();

  on(event: string, callback: EventCallback): void {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event)!.add(callback);
  }

  off(event: string, callback: EventCallback): void {
    const listeners = this._listeners.get(event);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this._listeners.delete(event);
      }
    }
  }

  emit(event: string, ...args: any[]): void {
    const listeners = this._listeners.get(event);
    if (listeners) {
      listeners.forEach((cb) => {
        try {
          cb(...args);
        } catch {
          // Swallow listener errors to prevent breaking the event loop
        }
      });
    }
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this._listeners.delete(event);
    } else {
      this._listeners.clear();
    }
  }
}

// ============================================================
// WebSocketClient Implementation
// ============================================================

class WebSocketClientImpl extends EventEmitter implements WebSocketClient {
  private _url: string;
  private _options: Required<WebSocketOptions>;
  private _ws: WebSocket | null = null;
  private _state: WebSocketState = 'disconnected';
  private _reconnectCount = 0;
  private _reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private _heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private _heartbeatTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private _bufferedMessages: any[] = [];
  private _isManualClose = false;

  constructor(url: string, options: WebSocketOptions = {}) {
    super();
    this._url = url;
    this._options = {
      autoReconnect: options.autoReconnect !== false,
      reconnectInterval: options.reconnectInterval || 1000,
      maxReconnects: options.maxReconnects ?? 10,
      heartbeat: options.heartbeat !== false,
      heartbeatInterval: options.heartbeatInterval || 30000,
      protocols: options.protocols || [],
    };
  }

  // --- State ---

  get state(): WebSocketState {
    return this._state;
  }

  private _setState(newState: WebSocketState): void {
    this._state = newState;
  }

  get bufferedMessages(): any[] {
    return this._bufferedMessages;
  }

  get reconnectCount(): number {
    return this._reconnectCount;
  }

  // --- Connect ---

  connect(): void {
    this._isManualClose = false;
    this._setState('connecting');
    this._clearTimers();

    try {
      const protocols = this._options.protocols;
      this._ws =
        protocols && protocols.length > 0
          ? new WebSocket(this._url, protocols)
          : new WebSocket(this._url);
    } catch (err) {
      this._setState('disconnected');
      this.emit('error', err);
      this._scheduleReconnect();
      return;
    }

    this._ws.onopen = () => {
      this._setState('connected');
      this._reconnectCount = 0;
      this.emit('open');

      // Flush buffered messages
      this._flushBuffer();

      // Start heartbeat
      if (this._options.heartbeat) {
        this._startHeartbeat();
      }
    };

    this._ws.onmessage = (event: MessageEvent) => {
      // Handle pong response for heartbeat
      if (event.data === '__lyt_pong__') {
        this._clearHeartbeatTimeout();
        return;
      }

      // Try to parse JSON, fall back to raw string
      let data: any = event.data;
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch {
          // Not JSON, keep as string
        }
      }
      this.emit('message', data);
    };

    this._ws.onclose = (event: CloseEvent) => {
      this._clearTimers();
      this._setState('disconnected');
      this.emit('close', event);

      if (!this._isManualClose && this._options.autoReconnect) {
        this._scheduleReconnect();
      }
    };

    this._ws.onerror = (event: Event) => {
      this.emit('error', event);
    };
  }

  // --- Disconnect ---

  disconnect(code: number = 1000, reason: string = 'Normal closure'): void {
    this._isManualClose = true;
    this._clearTimers();
    this._bufferedMessages = [];

    if (this._ws) {
      try {
        this._ws.close(code, reason);
      } catch {
        // Ignore close errors
      }
      this._ws = null;
    }

    this._setState('disconnected');
  }

  // --- Send ---

  send(data: string | object): void {
    const payload = typeof data === 'object' ? JSON.stringify(data) : data;

    if (this._state === 'connected' && this._ws && this._ws.readyState === WebSocket.OPEN) {
      this._ws.send(payload);
    } else {
      // Buffer the message for later
      this._bufferedMessages.push(data);
    }
  }

  // --- Event delegation ---

  on(event: WebSocketEventType, callback: (...args: any[]) => void): void {
    super.on(event, callback);
  }

  off(event: WebSocketEventType, callback: (...args: any[]) => void): void {
    super.off(event, callback);
  }

  // --- Heartbeat ---

  private _startHeartbeat(): void {
    this._stopHeartbeat();
    this._heartbeatTimer = setInterval(() => {
      if (this._ws && this._ws.readyState === WebSocket.OPEN) {
        try {
          this._ws.send('__lyt_ping__');
        } catch {
          // Ignore send errors
        }

        // Set a timeout to detect if pong is received
        this._heartbeatTimeoutTimer = setTimeout(() => {
          // No pong received, assume connection is dead
          if (this._ws) {
            this._ws.close(4000, 'Heartbeat timeout');
          }
        }, this._options.heartbeatInterval * 0.8);
      }
    }, this._options.heartbeatInterval);
  }

  private _stopHeartbeat(): void {
    if (this._heartbeatTimer) {
      clearInterval(this._heartbeatTimer);
      this._heartbeatTimer = null;
    }
    this._clearHeartbeatTimeout();
  }

  private _clearHeartbeatTimeout(): void {
    if (this._heartbeatTimeoutTimer) {
      clearTimeout(this._heartbeatTimeoutTimer);
      this._heartbeatTimeoutTimer = null;
    }
  }

  // --- Reconnection ---

  private _scheduleReconnect(): void {
    if (this._isManualClose) return;

    const maxAttempts = this._options.maxReconnects;
    if (maxAttempts > 0 && this._reconnectCount >= maxAttempts) {
      return;
    }

    this._setState('reconnecting');

    // Exponential backoff: interval * 2^attempt, capped at 30 seconds
    const delay = Math.min(
      this._options.reconnectInterval * Math.pow(2, this._reconnectCount),
      30000,
    );

    this._reconnectCount++;
    this.emit('reconnect', {
      attempt: this._reconnectCount,
      delay,
      maxAttempts: maxAttempts || Infinity,
    });

    this._reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  // --- Buffer ---

  private _flushBuffer(): void {
    if (this._bufferedMessages.length === 0) return;
    if (!this._ws || this._ws.readyState !== WebSocket.OPEN) return;

    const messages = [...this._bufferedMessages];
    this._bufferedMessages = [];

    for (const msg of messages) {
      const payload = typeof msg === 'object' ? JSON.stringify(msg) : msg;
      try {
        this._ws.send(payload);
      } catch {
        // If sending fails, re-buffer remaining messages
        this._bufferedMessages.unshift(msg, ...messages.slice(messages.indexOf(msg) + 1));
        break;
      }
    }
  }

  // --- Cleanup ---

  private _clearTimers(): void {
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
    this._stopHeartbeat();
  }
}

// ============================================================
// Public API
// ============================================================

/**
 * Create a new WebSocket client instance.
 *
 * @param url - WebSocket server URL (e.g., 'wss://example.com/ws')
 * @param options - WebSocket options
 * @returns A new WebSocketClient instance
 *
 * @example
 * ```ts
 * const ws = createWebSocket('wss://api.example.com/ws', {
 *   autoReconnect: true,
 *   heartbeat: true,
 *   heartbeatInterval: 15000,
 * });
 *
 * ws.on('open', () => console.log('Connected'));
 * ws.on('message', (data) => console.log('Received:', data));
 * ws.on('error', (err) => console.error('Error:', err));
 *
 * ws.connect();
 * ws.send({ type: 'hello', payload: 'world' });
 *
 * // Later...
 * ws.disconnect();
 * ```
 */
export function createWebSocket(
  url: string,
  options?: WebSocketOptions,
): WebSocketClient {
  return new WebSocketClientImpl(url, options);
}

/**
 * Create or return a singleton WebSocket client instance.
 *
 * On first call, creates a new client. Subsequent calls with the same URL
 * return the existing instance. Calling with a different URL creates a new instance.
 *
 * @param url - WebSocket server URL
 * @param options - WebSocket options
 * @returns A WebSocketClient instance
 *
 * @example
 * ```ts
 * // Initialize once
 * const ws = useWebSocket('wss://api.example.com/ws');
 * ws.connect();
 *
 * // Access the same instance anywhere
 * const ws2 = useWebSocket('wss://api.example.com/ws');
 * ws2.send({ type: 'ping' }); // Same connection
 * ```
 */
export function useWebSocket(
  url: string,
  options?: WebSocketOptions,
): WebSocketClient {
  // Simple singleton keyed by URL
  const key = `__lyt_ws_${url}`;
  const existing = (globalThis as any)[key] as WebSocketClient | undefined;
  if (existing) return existing;

  const client = createWebSocket(url, options);
  (globalThis as any)[key] = client;
  return client;
}
