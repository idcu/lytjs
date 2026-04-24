/**
 * Lyt.js Core Shared - Event Emitter
 *
 * 事件发射器
 * 纯原生零依赖实现
 */

export class EventEmitter {
  private events: Map<string, Set<Function>> = new Map();

  /**
   * 注册事件监听器
   */
  on(event: string, callback: Function): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(callback);
    return () => this.off(event, callback);
  }

  /**
   * 注册一次性事件监听器
   */
  once(event: string, callback: Function): () => void {
    const wrapper = (...args: any[]) => {
      callback(...args);
      this.off(event, wrapper);
    };
    this.on(event, wrapper);
    return () => this.off(event, wrapper);
  }

  /**
   * 移除事件监听器
   */
  off(event: string, callback?: Function): void {
    if (!callback) {
      this.events.delete(event);
    } else {
      this.events.get(event)?.delete(callback);
    }
  }

  /**
   * 触发事件
   */
  emit(event: string, ...args: any[]): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => cb(...args));
    }
  }

  /**
   * 检查是否有事件监听器
   */
  hasListeners(event: string): boolean {
    const callbacks = this.events.get(event);
    return callbacks ? callbacks.size > 0 : false;
  }

  /**
   * 获取事件的所有监听器
   */
  getListeners(event: string): Function[] {
    const callbacks = this.events.get(event);
    return callbacks ? [...callbacks] : [];
  }

  /**
   * 获取所有事件名称
   */
  getEventNames(): string[] {
    return [...this.events.keys()];
  }

  /**
   * 移除所有事件监听器
   */
  removeAllListeners(event?: string): void {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }

  /**
   * 获取事件监听器数量
   */
  listenerCount(event: string): number {
    const callbacks = this.events.get(event);
    return callbacks ? callbacks.size : 0;
  }
}
