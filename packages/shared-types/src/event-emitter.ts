/**
 * @lytjs/shared-types - 类型安全的事件发射器实现
 * v6.8.0 新增功能
 */

import type { EventHandler, EventListeners, IEventEmitter } from './type-utils';

/**
 * 类型安全的事件发射器实现
 * @template Events - 事件类型映射
 */
export class EventEmitter<
  Events extends Record<string, unknown[]>,
> implements IEventEmitter<Events> {
  private listeners: EventListeners<Events> = {};
  private onceListeners: EventListeners<Events> = {};

  /**
   * 添加事件监听器
   */
  on<E extends keyof Events>(event: E, handler: EventHandler<Events[E]>): void {
    if (!this.listeners[event]) {
      this.listeners[event] = new Set();
    }
    this.listeners[event]!.add(handler);
  }

  /**
   * 移除事件监听器
   */
  off<E extends keyof Events>(event: E, handler: EventHandler<Events[E]>): void {
    this.listeners[event]?.delete(handler);
    this.onceListeners[event]?.delete(handler);
  }

  /**
   * 触发事件
   */
  emit<E extends keyof Events>(event: E, ...args: Events[E]): void {
    // 调用普通监听器
    this.listeners[event]?.forEach((handler) => {
      void handler(...args);
    });

    // 调用一次性监听器并移除
    const onceHandlers = this.onceListeners[event];
    if (onceHandlers) {
      onceHandlers.forEach((handler) => {
        void handler(...args);
      });
      delete this.onceListeners[event];
    }
  }

  /**
   * 一次性事件监听器
   */
  once<E extends keyof Events>(event: E, handler: EventHandler<Events[E]>): void {
    if (!this.onceListeners[event]) {
      this.onceListeners[event] = new Set();
    }
    this.onceListeners[event]!.add(handler);
  }

  /**
   * 移除所有事件监听器
   */
  removeAllListeners<E extends keyof Events>(event?: E): void {
    if (event) {
      delete this.listeners[event];
      delete this.onceListeners[event];
    } else {
      this.listeners = {};
      this.onceListeners = {};
    }
  }

  /**
   * 获取指定事件的监听器数量
   */
  listenerCount<E extends keyof Events>(event: E): number {
    const count = (this.listeners[event]?.size ?? 0) + (this.onceListeners[event]?.size ?? 0);
    return count;
  }

  /**
   * 获取所有事件名称
   */
  eventNames(): (keyof Events)[] {
    return Object.keys(this.listeners) as (keyof Events)[];
  }

  /**
   * 检查是否有指定事件的监听器
   */
  hasListeners<E extends keyof Events>(event: E): boolean {
    return (this.listeners[event]?.size ?? 0) > 0 || (this.onceListeners[event]?.size ?? 0) > 0;
  }
}

/**
 * 创建事件发射器
 */
export function createEventEmitter<
  Events extends Record<string, unknown[]>,
>(): EventEmitter<Events> {
  return new EventEmitter<Events>();
}
