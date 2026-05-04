// @lytjs/runtime-convergence - node-cache
// 节点缓存：管理 container → VNode 映射、组件实例 → 资源注册表映射、统一清理函数

import type { RendererHost, HostEventHandler, HostEventOptions } from '@lytjs/host-contract';
import type { VNode, ComponentInstance, ResourceEntry, NodeCacheOptions } from './types';

// ============================================================
// 常量
// ============================================================

declare const __DEV__: boolean;

/** 默认配置 */
const DEFAULT_OPTIONS: Required<NodeCacheOptions> = {
  enableVNodeMap: true,
  enableResourceRegistry: true,
};

// ============================================================
// NodeCache
// ============================================================

/**
 * 节点缓存。
 *
 * 管理 container → VNode 映射和组件实例 → 资源注册表映射，
 * 提供统一的资源清理函数。
 *
 * @template HN - 宿主节点类型
 * @template HE - 宿主元素类型
 */
export class NodeCache<HN extends object = object, HE extends HN = HN> {
  /** RendererHost 实例 */
  private host: RendererHost<HN, HE>;

  /** 配置项 */
  private options: Required<NodeCacheOptions>;

  /** container → VNode 映射 */
  private vnodeMap = new WeakMap<HN, VNode | null>();

  /** 组件实例 → 资源注册表映射 */
  private resourceRegistry = new WeakMap<ComponentInstance, ResourceEntry>();

  /**
   * 创建节点缓存实例。
   * @param host - RendererHost 实例
   * @param options - 可选的配置项
   */
  constructor(host: RendererHost<HN, HE>, options?: NodeCacheOptions) {
    this.host = host;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  // ==========================================================
  // VNode 映射
  // ==========================================================

  /**
   * 获取 container 对应的 VNode。
   * @param container - 宿主容器节点
   * @returns VNode 或 null
   */
  getVNode(container: HN): VNode | null {
    if (!this.options.enableVNodeMap) return null;
    return this.vnodeMap.get(container) ?? null;
  }

  /**
   * 设置 container → VNode 映射。
   * @param container - 宿主容器节点
   * @param vnode - VNode 实例
   */
  setVNode(container: HN, vnode: VNode | null): void {
    if (!this.options.enableVNodeMap) return;
    this.vnodeMap.set(container, vnode);
  }

  /**
   * 删除 container 的 VNode 映射。
   * @param container - 宿主容器节点
   */
  deleteVNode(container: HN): void {
    this.vnodeMap.delete(container);
  }

  // ==========================================================
  // 资源注册表
  // ==========================================================

  /**
   * 注册事件监听器到组件实例的资源注册表。
   *
   * @param instance - 组件实例
   * @param el - 宿主元素
   * @param event - 事件名
   * @param handler - 事件处理函数
   * @param options - 可选的事件选项
   */
  registerEventListener(
    instance: ComponentInstance,
    el: HE,
    event: string,
    handler: HostEventHandler,
    options?: HostEventOptions,
  ): void {
    if (!this.options.enableResourceRegistry) return;

    const entry = this.getOrCreateResourceEntry(instance);
    entry.eventListeners.push({ el, event, handler, options });
  }

  /**
   * 注册 effect 订阅到组件实例的资源注册表。
   *
   * @param instance - 组件实例
   * @param disposer - effect 的 dispose 回调函数
   */
  registerEffectSubscription(instance: ComponentInstance, disposer: () => void): void {
    if (!this.options.enableResourceRegistry) return;

    const entry = this.getOrCreateResourceEntry(instance);
    entry.effectDisposers.push(disposer);
  }

  /**
   * 注册通用清理钩子到组件实例的资源注册表。
   *
   * @param instance - 组件实例
   * @param cleanup - 清理回调函数
   */
  registerCleanup(instance: ComponentInstance, cleanup: () => void): void {
    if (!this.options.enableResourceRegistry) return;

    const entry = this.getOrCreateResourceEntry(instance);
    entry.cleanupHooks.push(cleanup);
  }

  // ==========================================================
  // 统一清理
  // ==========================================================

  /**
   * 统一清理组件实例的所有注册资源。
   *
   * 清理顺序：
   * 1. cleanup 钩子（可能依赖 effect 仍活跃）
   * 2. effect 订阅（停止响应式追踪）
   * 3. 事件监听器（DOM 操作，最后执行）
   *
   * 每个清理操作均通过 try-catch 保护，单个失败不影响其余流程。
   *
   * @param instance - 要清理资源的组件实例
   */
  cleanupComponentResources(instance: ComponentInstance): void {
    const entry = this.resourceRegistry.get(instance);
    if (!entry) return;

    // 1. 执行 cleanup 钩子
    for (const cleanup of entry.cleanupHooks) {
      try {
        cleanup();
      } catch (err) {
        if (__DEV__) console.warn('[lytjs/node-cache] Error during cleanup hook:', err);
      }
    }

    // 2. 清理 effect 订阅
    for (const disposer of entry.effectDisposers) {
      try {
        disposer();
      } catch (err) {
        if (__DEV__) console.warn('[lytjs/node-cache] Error during effect dispose:', err);
      }
    }

    // 3. 清理事件监听器
    for (const listener of entry.eventListeners) {
      try {
        this.host.removeEventListener(
          listener.el as HE,
          listener.event,
          listener.handler,
          listener.options,
        );
      } catch (err) {
        if (__DEV__) console.warn('[lytjs/node-cache] Error during event listener cleanup:', err);
      }
    }

    // 删除注册表条目
    this.resourceRegistry.delete(instance);
  }

  /**
   * 清理指定 container 的 VNode 映射。
   * @param container - 宿主容器节点
   */
  cleanupContainer(container: HN): void {
    this.vnodeMap.delete(container);
  }

  /**
   * 销毁缓存，清理所有内部状态。
   *
   * 注意：不会自动清理所有组件资源，需提前手动调用 cleanupComponentResources。
   */
  dispose(): void {
    this.vnodeMap = new WeakMap<HN, VNode | null>();
    this.resourceRegistry = new WeakMap<ComponentInstance, ResourceEntry>();
  }

  // ==========================================================
  // 内部方法
  // ==========================================================

  /**
   * 获取或创建组件实例的资源注册表条目。
   */
  private getOrCreateResourceEntry(instance: ComponentInstance): ResourceEntry {
    let entry = this.resourceRegistry.get(instance);
    if (!entry) {
      entry = {
        eventListeners: [],
        effectDisposers: [],
        cleanupHooks: [],
      };
      this.resourceRegistry.set(instance, entry);
    }
    return entry;
  }
}
