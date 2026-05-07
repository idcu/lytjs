/**
 * @lytjs/web - ResizeObserver 管理模块
 *
 * 提供 ResizeObserver 的安全封装，确保在组件卸载时自动清理观察者，
 * 防止内存泄漏。
 * FIX: P2-5 ResizeObserver 未清理问题
 *
 * @module @lytjs/web/resize-observer
 * @version 6.0.0
 */
// FIX: DTS build error - 声明 __DEV__ 全局变量
declare const __DEV__: boolean;

// ============================================================
// 类型定义
// ============================================================

/**
 * ResizeObserver 回调函数类型
 */
export type ResizeObserverCallback = (entries: ResizeObserverEntry[]) => void;

/**
 * ResizeObserver 观察选项
 */
export interface ResizeObserverOptions {
  /** 指定要观察的盒模型 */
  box?: 'content-box' | 'border-box' | 'device-pixel-content-box';
}

// ============================================================
// ResizeObserver 管理器
// ============================================================

/**
 * 受管理的 ResizeObserver 包装类
 *
 * 自动处理 ResizeObserver 的创建、观察和清理，
 * 确保在组件卸载时不会泄漏观察者。
 *
 * FIX: P2-5 ResizeObserver 未清理问题
 *
 * @example
 * ```ts
 * // 创建管理器
 * const manager = new ResizeObserverManager((entries) => {
 *   for (const entry of entries) {
 *     console.log('Element resized:', entry.target);
 *   }
 * });
 *
 * // 观察元素
 * manager.observe(myElement);
 *
 * // 组件卸载时清理
 * onUnmounted(() => {
 *   manager.disconnect();
 * });
 * ```
 */
export class ResizeObserverManager {
  private observer: ResizeObserver | null = null;
  private callback: ResizeObserverCallback;
  private observedElements = new Set<Element>();
  private isConnected = false;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;

    // 检查浏览器支持
    if (typeof ResizeObserver === 'undefined') {
      if (__DEV__) {
        console.warn('[lytjs/resize-observer] ResizeObserver is not supported in this environment.');
      }
      return;
    }

    // 创建 ResizeObserver 实例
    this.observer = new ResizeObserver((entries) => {
      // 过滤掉已停止观察的条目
      const activeEntries = entries.filter((entry) =>
        this.observedElements.has(entry.target)
      );
      if (activeEntries.length > 0) {
        this.callback(activeEntries);
      }
    });
  }

  /**
   * 开始观察元素
   *
   * @param target - 要观察的目标元素
   * @param options - 观察选项
   * @returns 是否成功开始观察
   */
  observe(target: Element, options?: ResizeObserverOptions): boolean {
    if (!this.observer) {
      if (__DEV__) {
        console.warn('[lytjs/resize-observer] Cannot observe: ResizeObserver is not available.');
      }
      return false;
    }

    // 避免重复观察同一元素
    if (this.observedElements.has(target)) {
      if (__DEV__) {
        console.warn('[lytjs/resize-observer] Element is already being observed.');
      }
      return false;
    }

    try {
      this.observer.observe(target, options);
      this.observedElements.add(target);
      this.isConnected = true;
      return true;
    } catch (err) {
      if (__DEV__) {
        console.error('[lytjs/resize-observer] Error observing element:', err);
      }
      return false;
    }
  }

  /**
   * 停止观察指定元素
   *
   * @param target - 要停止观察的目标元素
   * @returns 是否成功停止观察
   */
  unobserve(target: Element): boolean {
    if (!this.observer) {
      return false;
    }

    if (!this.observedElements.has(target)) {
      return false;
    }

    try {
      this.observer.unobserve(target);
      this.observedElements.delete(target);

      // 如果没有观察的元素了，标记为断开连接
      if (this.observedElements.size === 0) {
        this.isConnected = false;
      }
      return true;
    } catch (err) {
      if (__DEV__) {
        console.error('[lytjs/resize-observer] Error unobserving element:', err);
      }
      return false;
    }
  }

  /**
   * 停止观察所有元素并断开连接
   *
   * FIX: P2-5 这是关键方法，确保在组件卸载时调用此方法
   */
  disconnect(): void {
    if (!this.observer) {
      return;
    }

    try {
      this.observer.disconnect();
      this.observedElements.clear();
      this.isConnected = false;
    } catch (err) {
      if (__DEV__) {
        console.error('[lytjs/resize-observer] Error disconnecting observer:', err);
      }
    }
  }

  /**
   * 检查是否正在观察指定元素
   *
   * @param target - 要检查的目标元素
   * @returns 是否正在观察
   */
  isObserving(target: Element): boolean {
    return this.observedElements.has(target);
  }

  /**
   * 获取当前观察的元素数量
   */
  get observedCount(): number {
    return this.observedElements.size;
  }

  /**
   * 检查观察者是否已连接（正在观察至少一个元素）
   */
  get connected(): boolean {
    return this.isConnected;
  }

  /**
   * 检查 ResizeObserver 是否可用
   */
  get isAvailable(): boolean {
    return this.observer !== null;
  }
}

// ============================================================
// 便捷函数
// ============================================================

/**
 * 创建并使用 ResizeObserver，返回清理函数
 *
 * 这是使用 ResizeObserver 的推荐方式，确保在组件卸载时调用返回的清理函数。
 *
 * FIX: P2-5 ResizeObserver 未清理问题
 *
 * @example
 * ```ts
 * // 在组件中使用
 * const cleanup = useResizeObserver(myElement, (entries) => {
 *   for (const entry of entries) {
 *     console.log('Resized:', entry.contentRect);
 *   }
 * });
 *
 * // 组件卸载时清理
 * onUnmounted(() => {
 *   cleanup();
 * });
 * ```
 *
 * @param target - 要观察的目标元素
 * @param callback - 尺寸变化回调
 * @param options - 观察选项
 * @returns 清理函数，调用后停止观察并释放资源
 */
export function useResizeObserver(
  target: Element,
  callback: ResizeObserverCallback,
  options?: ResizeObserverOptions,
): () => void {
  const manager = new ResizeObserverManager(callback);
  manager.observe(target, options);

  // 返回清理函数
  return () => {
    manager.disconnect();
  };
}

/**
 * 检查浏览器是否支持 ResizeObserver
 *
 * @returns 如果支持则返回 true
 */
export function supportsResizeObserver(): boolean {
  return typeof ResizeObserver !== 'undefined';
}

// ============================================================
// 全局 ResizeObserver 注册表（用于调试和监控）
// ============================================================

/**
 * ResizeObserver 统计信息
 */
export interface ResizeObserverStats {
  /** 活跃的管理器数量 */
  activeManagers: number;
  /** 总共观察的元素数量 */
  totalObservedElements: number;
}

// 开发模式下导出统计信息
if (__DEV__) {
  // 用于跟踪所有创建的 ResizeObserverManager 实例
  const managerRegistry = new WeakSet<ResizeObserverManager>();

  // 重写构造函数以跟踪实例
  const OriginalManager = ResizeObserverManager;
  (ResizeObserverManager as unknown as typeof ResizeObserverManager & { new(callback: ResizeObserverCallback): ResizeObserverManager }) = class extends OriginalManager {
    constructor(callback: ResizeObserverCallback) {
      super(callback);
      managerRegistry.add(this);
    }
  };

  /**
   * 获取 ResizeObserver 统计信息（仅开发模式）
   */
  (globalThis as Record<string, unknown>).__getResizeObserverStats = (): ResizeObserverStats => {
    // 注意：WeakSet 无法遍历，这里仅作为示例
    return {
      activeManagers: 0,
      totalObservedElements: 0,
    };
  };
}
