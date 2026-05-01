/**
 * @lytjs/common-events
 * 事件发射器与订阅管理工具
 */

function isFunction(val: unknown): val is Function {
  return typeof val === "function";
}

type EventHandler<T extends unknown[] = unknown[]> = (...args: T) => void;

// ============================================================
// DOM event name mapping & helpers
// ============================================================

/**
 * Special event name mappings from camelCase prop names to DOM event names.
 * e.g., onDoubleClick -> dblclick, onMouseEnter -> mouseenter
 */
export const DOM_EVENT_NAME_MAP: Record<string, string> = {
  onDoubleClick: "dblclick",
  onMouseEnter: "mouseenter",
  onMouseLeave: "mouseleave",
  onBeforeInput: "beforeinput",
  onCompositionStart: "compositionstart",
  onCompositionUpdate: "compositionupdate",
  onCompositionEnd: "compositionend",
  onPointerEnter: "pointerenter",
  onPointerLeave: "pointerleave",
  onPointerDown: "pointerdown",
  onPointerMove: "pointermove",
  onPointerUp: "pointerup",
  onPointerCancel: "pointercancel",
  onPointerOver: "pointerover",
  onPointerOut: "pointerout",
  onDragStart: "dragstart",
  onDragEnd: "dragend",
  onDragOver: "dragover",
  onDragEnter: "dragenter",
  onDragLeave: "dragleave",
  onDragDrop: "drop",
  onAnimationStart: "animationstart",
  onAnimationEnd: "animationend",
  onAnimationIteration: "animationiteration",
  onTransitionEnd: "transitionend",
  onTouchStart: "touchstart",
  onTouchMove: "touchmove",
  onTouchEnd: "touchend",
  onTouchCancel: "touchcancel",
  onContextMenu: "contextmenu",
  onWheel: "wheel",
  onScroll: "scroll",
};

/**
 * Convert a camelCase event prop name (e.g., onClick) to a DOM event name (e.g., click).
 * Uses the mapping table for special cases, falls back to simple lowercase conversion.
 */
export function getDOMEventName(rawName: string): string {
  return DOM_EVENT_NAME_MAP[rawName] ?? rawName.slice(2).toLowerCase();
}

/**
 * Extract the event handler function from a prop value.
 * Supports both plain functions and objects with a handler property.
 */
export function extractDOMEventHandler(value: unknown): EventListener | null {
  if (isFunction(value)) {
    return value as EventListener;
  }
  if (value != null && typeof value === "object" && "handler" in value) {
    return (value as { handler: EventListener }).handler;
  }
  return null;
}

/**
 * Extract event options (capture, passive, once) from a prop value.
 * Returns undefined when no options are specified (for performance).
 */
export function extractDOMEventOptions(
  value: unknown,
): boolean | AddEventListenerOptions | undefined {
  if (value != null && typeof value === "object" && !isFunction(value)) {
    const opts = value as Record<string, unknown>;
    if ("capture" in opts || "passive" in opts || "once" in opts) {
      return {
        capture: !!opts.capture,
        passive: !!opts.passive,
        once: !!opts.once,
      };
    }
  }
  return undefined;
}

// ============================================================
// EventEmitter
// ============================================================

/**
 * 事件发射器
 */
export class EventEmitter {
  private events: Map<string, Set<EventHandler>> = new Map();

  /**
   * 注册事件监听器
   */
  on(event: string, handler: EventHandler): this {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(handler);
    return this;
  }

  /**
   * 注册一次性事件监听器
   */
  once(event: string, handler: EventHandler): this {
    const wrapper: EventHandler = (...args) => {
      this.off(event, wrapper);
      handler(...args);
    };
    return this.on(event, wrapper);
  }

  /**
   * 移除事件监听器
   */
  off(event: string, handler: EventHandler): this {
    const handlers = this.events.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.events.delete(event);
      }
    }
    return this;
  }

  /**
   * 触发事件
   */
  emit(event: string, ...args: unknown[]): boolean {
    const handlers = this.events.get(event);
    if (!handlers || handlers.size === 0) return false;
    handlers.forEach((handler) => {
      try {
        handler(...args);
      } catch (e) {
        console.error(`Error in event handler for "${event}":`, e);
      }
    });
    return true;
  }

  /**
   * 移除指定事件的所有监听器
   */
  removeAllListeners(event?: string): this {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
    return this;
  }

  /**
   * 获取指定事件的监听器数量
   */
  listenerCount(event: string): number {
    return this.events.get(event)?.size ?? 0;
  }
}

/**
 * 订阅管理器 - 管理多个取消订阅函数
 */
export class SubscriptionManager {
  private unsubscribers: Set<() => void> = new Set();

  /**
   * 添加一个取消订阅函数
   * @returns 移除此订阅的函数
   */
  add(unsubscribe: () => void): () => void {
    this.unsubscribers.add(unsubscribe);
    return () => {
      this.unsubscribers.delete(unsubscribe);
    };
  }

  /**
   * 取消所有订阅
   */
  unsubscribeAll(): void {
    this.unsubscribers.forEach((unsub) => {
      try {
        unsub();
      } catch (e) {
        console.error("Error during unsubscribe:", e);
      }
    });
    this.unsubscribers.clear();
  }

  /**
   * 当前订阅数量
   */
  get count(): number {
    return this.unsubscribers.size;
  }
}

/**
 * 主题订阅管理器 - 基于主题的发布/订阅
 */
export class TopicSubscriptionManager {
  private topics: Map<string, Set<EventHandler>> = new Map();

  /**
   * 订阅主题
   */
  subscribe(topic: string, handler: EventHandler): () => void {
    if (!this.topics.has(topic)) {
      this.topics.set(topic, new Set());
    }
    this.topics.get(topic)!.add(handler);
    return () => this.unsubscribe(topic, handler);
  }

  /**
   * 取消订阅主题
   */
  unsubscribe(topic: string, handler: EventHandler): void {
    const handlers = this.topics.get(topic);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.topics.delete(topic);
      }
    }
  }

  /**
   * 发布消息到主题
   */
  publish(topic: string, ...args: unknown[]): boolean {
    const handlers = this.topics.get(topic);
    if (!handlers || handlers.size === 0) return false;
    handlers.forEach((handler) => {
      try {
        handler(...args);
      } catch (e) {
        console.error(`Error in topic handler for "${topic}":`, e);
      }
    });
    return true;
  }

  /**
   * 取消指定主题的所有订阅
   */
  unsubscribeAll(topic?: string): void {
    if (topic) {
      this.topics.delete(topic);
    } else {
      this.topics.clear();
    }
  }

  /**
   * 获取指定主题的订阅者数量
   */
  subscriberCount(topic: string): number {
    return this.topics.get(topic)?.size ?? 0;
  }
}
