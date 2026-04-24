/**
 * Lyt.js Core Shared - Subscription Manager
 *
 * 订阅管理器
 * 纯原生零依赖实现
 */

export class SubscriptionManager<T = any> {
  private subscribers: Set<(data: T) => void> = new Set();

  /**
   * 订阅
   */
  subscribe(callback: (data: T) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  /**
   * 取消订阅
   */
  unsubscribe(callback: (data: T) => void): void {
    this.subscribers.delete(callback);
  }

  /**
   * 通知所有订阅者
   */
  notify(data: T): void {
    this.subscribers.forEach((cb) => cb(data));
  }

  /**
   * 清空所有订阅
   */
  clear(): void {
    this.subscribers.clear();
  }

  /**
   * 获取订阅者数量
   */
  get size(): number {
    return this.subscribers.size;
  }

  /**
   * 检查是否有订阅者
   */
  hasSubscribers(): boolean {
    return this.subscribers.size > 0;
  }

  /**
   * 获取所有订阅者
   */
  getSubscribers(): ((data: T) => void)[] {
    return [...this.subscribers];
  }
}

/**
 * 带主题的订阅管理器
 */
export class TopicSubscriptionManager<T = any> {
  private topics: Map<string, SubscriptionManager<T>> = new Map();

  /**
   * 订阅主题
   */
  subscribe(topic: string, callback: (data: T) => void): () => void {
    if (!this.topics.has(topic)) {
      this.topics.set(topic, new SubscriptionManager());
    }
    return this.topics.get(topic)!.subscribe(callback);
  }

  /**
   * 取消订阅主题
   */
  unsubscribe(topic: string, callback: (data: T) => void): void {
    this.topics.get(topic)?.unsubscribe(callback);
  }

  /**
   * 通知主题订阅者
   */
  notify(topic: string, data: T): void {
    this.topics.get(topic)?.notify(data);
  }

  /**
   * 清空主题
   */
  clear(topic?: string): void {
    if (topic) {
      this.topics.get(topic)?.clear();
    } else {
      this.topics.forEach((manager) => manager.clear());
    }
  }

  /**
   * 获取所有主题
   */
  getTopics(): string[] {
    return [...this.topics.keys()];
  }

  /**
   * 获取主题订阅者数量
   */
  getSubscriberCount(topic: string): number {
    return this.topics.get(topic)?.size || 0;
  }
}
