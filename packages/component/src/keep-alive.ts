// src/keep-alive.ts
// KeepAlive component (simplified)

import { isString, isArray, isFunction } from '@lytjs/common-is';
import { warn } from '@lytjs/common-error';
import { watch } from '@lytjs/reactivity';
import type { ComponentInternalInstance, ComponentOptions, SetupContext } from './types';
import { createComponentInstance, setupComponent } from './component';
import { handleError } from './lifecycle';
// FIX: DTS build error - 统一从 vdom 导入，避免类型不兼容
import { ShapeFlags, createVNode, createCommentVNode } from '@lytjs/vdom';
import type { VNode } from '@lytjs/vdom';

// ==================== Types ====================

interface KeepAliveCache {
  get(key: string): ComponentInternalInstance | undefined;
  set(key: string, instance: ComponentInternalInstance): void;
  delete(key: string): boolean;
  has(key: string): boolean;
  forEach(callback: (value: ComponentInternalInstance, key: string) => void): void;
  readonly size: number;
  keys(): IterableIterator<string>;
}

/**
 * LRU (Least Recently Used) Cache implementation for KeepAlive
 * FIX: P2-8 COMPONENT-NEW-05 - 实现 LRU 缓存策略，限制缓存组件数量
 */
class LRUCache implements KeepAliveCache {
  private cache: Map<string, ComponentInternalInstance>;
  private maxSize: number;

  constructor(maxSize: number = 10) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key: string): ComponentInternalInstance | undefined {
    const instance = this.cache.get(key);
    if (instance !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, instance);
    }
    return instance;
  }

  set(key: string, instance: ComponentInternalInstance): void {
    // If key exists, delete it first to update order
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // If at capacity, remove the oldest entry (first in Map)
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        const oldestInstance = this.cache.get(oldestKey);
        if (oldestInstance) {
          // Deactivate and cleanup the oldest instance
          deactivateInstance(oldestInstance);
          oldestInstance.effects?.forEach((effect) => {
            effect.stop();
          });
        }
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, instance);
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  forEach(callback: (value: ComponentInternalInstance, key: string) => void): void {
    this.cache.forEach(callback);
  }

  get size(): number {
    return this.cache.size;
  }

  keys(): IterableIterator<string> {
    return this.cache.keys();
  }

  /**
   * Update the max size of the cache
   */
  setMaxSize(newMaxSize: number): void {
    this.maxSize = newMaxSize;
    // Prune if necessary
    while (this.cache.size > this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        const oldestInstance = this.cache.get(oldestKey);
        if (oldestInstance) {
          deactivateInstance(oldestInstance);
          oldestInstance.effects?.forEach((effect) => {
            effect.stop();
          });
        }
        this.cache.delete(oldestKey);
      }
    }
  }
}

// ==================== KeepAlive Component ====================

export interface KeepAliveProps {
  include?: string | RegExp | (string | RegExp)[];
  exclude?: string | RegExp | (string | RegExp)[];
  /** FIX: P2-17 缓存大小限制配置（默认 10） */
  max?: number;
  /** Custom cache key function: receives a vnode and returns a string or number to use as the cache key */
  onCacheKey?: (vnode: VNode) => string | number;
}

export const KeepAlive: ComponentOptions = {
  name: 'KeepAlive',

  props: {
    include: {},
    exclude: {},
    max: { type: Number },
    onCacheKey: { type: Function },
  },

  setup(_props: Record<string, unknown>, _ctx: SetupContext) {
    const props = _props as KeepAliveProps;
    // FIX: P2-8 COMPONENT-NEW-05 - 使用 LRU 缓存替代普通 Map
    const maxCacheSize = props.max ?? 10;
    const cache: KeepAliveCache = new LRUCache(maxCacheSize);
    // FIX: P2-29 移除冗余的 keys Set，直接使用 cache.keys() 避免数据重复
    let _currentVNode: VNode | null = null;

    // FIX: P2-29 监听 max prop 变化，动态调整 LRU 缓存大小
    watch(
      () => (_props as KeepAliveProps).max,
      (newMax) => {
        if (newMax !== undefined && typeof newMax === 'number' && newMax > 0) {
          (cache as LRUCache).setMaxSize(newMax);
        }
      },
    );

    return {
      cache,
      _currentVNode,
    } as Record<string, unknown>;
  },

  render(ctx: unknown): VNode {
    // FIX: P2-12 使用 ctx 参数替代 this，避免依赖 this 上下文
    const instance = ctx as unknown as ComponentInternalInstance;
    const props = instance.props as KeepAliveProps;
    const defaultSlot = instance.slots?.default;

    if (!defaultSlot) return createCommentVNode('keep-alive');

    const children = defaultSlot();
    if (!children || children.length === 0) return createCommentVNode('keep-alive');

    // KeepAlive only handles a single child component
    const rawVNode = children[0] as VNode;
    if (rawVNode == null) return createCommentVNode('keep-alive');

    // Skip non-component vnodes (text, comment, etc.)
    if (
      typeof rawVNode.type === 'string' ||
      rawVNode.type === (globalThis as Record<string, unknown>).__LYTJS_FRAGMENT__ ||
      rawVNode.type === (globalThis as Record<string, unknown>).__LYTJS_TEXT__ ||
      rawVNode.type === (globalThis as Record<string, unknown>).__LYTJS_COMMENT__
    ) {
      return rawVNode;
    }

    // Get component name for matching
    const compType = rawVNode.type as Record<string, unknown>;
    const compName = typeof compType === 'object' && compType !== null && 'name' in compType
      ? (compType as { name?: string }).name
      : typeof compType === 'function'
        ? (compType as { name?: string }).name
        : undefined;

    // FIX: P1-18 exclude 逻辑重构提高可读性，将复杂的条件表达式拆分为独立判断
    // 检查 include 过滤：组件名必须匹配 include 模式（如果提供了 include）
    const isIncluded = props.include === undefined ||
      matchesPattern(compName as string | undefined, props.include);

    // 检查 exclude 过滤：组件名不能匹配 exclude 模式（如果提供了 exclude）
    const isExcluded = props.exclude !== undefined &&
      matchesPattern(compName as string | undefined, props.exclude);

    if (!isIncluded || isExcluded) {
      return rawVNode;
    }

    // Compute cache key
    const cacheKey = getCacheKey(instance, rawVNode);

    // Check if already cached
    const cachedInstance = getCachedInstance(instance, cacheKey);
    if (cachedInstance) {
      // Move to most recent position
      cacheInstance(instance, cacheKey, cachedInstance);
      // Copy the cached vnode's children onto the raw vnode for patching
      // FIX: DTS build error - 类型断言避免 ComponentInternalInstance 冲突
      rawVNode.component = cachedInstance as unknown as NonNullable<typeof rawVNode.component>;
      rawVNode.shapeFlag |= ShapeFlags.COMPONENT_KEPT_ALIVE;
      activateInstance(cachedInstance);
      return rawVNode;
    }

    // Store reference for deactivation on unmount
    (instance.setupState as Record<string, unknown>)._currentVNode = rawVNode;

    return rawVNode;
  },

  created() {
    // KeepAlive instance init
  },
};

// ==================== KeepAlive helpers ====================

/**
 * Create a KeepAlive component instance.
 */
export function createKeepAliveInstance(
  props: KeepAliveProps = {},
  parent: ComponentInternalInstance | null = null,
): ComponentInternalInstance {
  const vnode: VNode = createVNode(
    KeepAlive,
    {
      ...props,
      include: props.include,
      exclude: props.exclude,
      max: props.max,
      onCacheKey: props.onCacheKey,
    },
    null,
    ShapeFlags.STATEFUL_COMPONENT,
  );

  const instance = createComponentInstance(vnode, parent);
  setupComponent(instance);
  return instance;
}

/**
 * Check if a component name matches the include/exclude patterns.
 */
export function matchesPattern(
  name: string | undefined,
  pattern: string | RegExp | (string | RegExp)[] | undefined,
): boolean {
  if (!pattern) return true;
  // 当组件 name 为 undefined 时，跳过匹配（视为不匹配）
  if (name === undefined) return false;

  if (isString(pattern)) {
    return name === pattern;
  }

  if (pattern instanceof RegExp) {
    return pattern.test(name);
  }

  if (isArray(pattern)) {
    return pattern.some((p) => matchesPattern(name, p));
  }

  return true;
}

/**
 * Get the cache key for a vnode within a KeepAlive context.
 *
 * If the KeepAlive instance has an `onCacheKey` prop (a custom function),
 * it is called with the vnode to produce the cache key.
 * Otherwise, the default key is derived from `vnode.type` (the component
 * constructor or tag name).
 *
 * @param keepAlive - The KeepAlive component instance
 * @param vnode - The vnode to compute a cache key for
 * @returns A string cache key
 */
export function getCacheKey(
  keepAlive: ComponentInternalInstance,
  vnode: VNode,
): string {
  const onCacheKey = keepAlive.props.onCacheKey as
    | ((vnode: VNode) => string | number)
    | undefined;

  if (isFunction(onCacheKey)) {
    try {
      return String(onCacheKey(vnode));
    } catch (e) {
      handleError(e as Error, keepAlive, 'onCacheKey');
      // FIX: P1-19 onCacheKey 异常时在 DEV 模式下发出警告，
      // 提醒开发者自定义缓存键函数可能存在问题
      if (__DEV__) {
        warn(
          `[KeepAlive] onCacheKey threw an error for vnode type "${String(vnode.type)}". ` +
          `Falling back to default cache key.`,
        );
      }
    }
  }

  // Default: use vnode.type (component constructor or tag string)
  const type = vnode.type;
  if (typeof type === 'string') {
    return type;
  }
  if (type && typeof type === 'object' && 'name' in type) {
    return String((type as { name?: string }).name) || String(type);
  }
  if (typeof type === 'function' && 'name' in type) {
    return (type as { name?: string }).name || String(type);
  }
  return String(type);
}

/**
 * Cache a component instance in KeepAlive.
 * FIX: P2-8 COMPONENT-NEW-05 - LRU 缓存自动处理容量限制
 */
export function cacheInstance(
  keepAlive: ComponentInternalInstance,
  key: string,
  instance: ComponentInternalInstance,
): void {
  const cache = keepAlive.setupState.cache as KeepAliveCache;

  // If already cached, remove old entry first (will be re-added with updated order)
  if (cache.has(key)) {
    cache.delete(key);
  }

  // LRU cache automatically handles max size pruning in set()
  cache.set(key, instance);
}

/**
 * Get a cached instance from KeepAlive.
 */
export function getCachedInstance(
  keepAlive: ComponentInternalInstance,
  key: string,
): ComponentInternalInstance | undefined {
  const cache = keepAlive.setupState.cache as KeepAliveCache;
  return cache.get(key);
}

/**
 * Remove a cached instance from KeepAlive.
 */
export function removeCachedInstance(keepAlive: ComponentInternalInstance, key: string): boolean {
  const cache = keepAlive.setupState.cache as KeepAliveCache;
  return cache.delete(key);
}

/**
 * Activate a cached component instance.
 */
export function activateInstance(instance: ComponentInternalInstance): void {
  instance.isDeactivated = false;
  // Call activated hook if defined
  if (instance.type.activated) {
    instance.type.activated.call(instance.ctx);
  }
  if (instance.activatedHooks) {
    for (const hook of instance.activatedHooks) {
      try {
        hook();
      } catch (e) {
        handleError(e as Error, instance, 'activated hook');
      }
    }
  }
}

/**
 * Deactivate a component instance.
 */
export function deactivateInstance(instance: ComponentInternalInstance): void {
  instance.isDeactivated = true;
  // Call deactivated hook if defined
  if (instance.type.deactivated) {
    instance.type.deactivated.call(instance.ctx);
  }
  if (instance.deactivatedHooks) {
    for (const hook of instance.deactivatedHooks) {
      try {
        hook();
      } catch (e) {
        handleError(e as Error, instance, 'deactivated hook');
      }
    }
  }
}
