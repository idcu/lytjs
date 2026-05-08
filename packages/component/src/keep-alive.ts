// src/keep-alive.ts
// KeepAlive 组件（简化版）

import { isString, isArray, isFunction } from '@lytjs/common-is';
import { warn } from '@lytjs/common-error';
import { watch } from '@lytjs/reactivity';
import type { ComponentInternalInstance, ComponentOptions, SetupContext } from './types';
import { createComponentInstance, setupComponent } from './component';
import { handleError } from './lifecycle';
// FIX: DTS build error - 统一从 vdom 导入，避免类型不兼容
import { ShapeFlags, createVNode, createCommentVNode } from '@lytjs/vdom';
import type { VNode } from '@lytjs/vdom';

// ==================== 类型定义 ====================

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
 * LRU（最近最少使用）缓存实现，用于 KeepAlive
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
      // 移动到末尾（最近使用）
      this.cache.delete(key);
      this.cache.set(key, instance);
    }
    return instance;
  }

  set(key: string, instance: ComponentInternalInstance): void {
    // 如果 key 已存在，先删除以更新顺序
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // 如果达到容量上限，移除最旧的条目（Map 中的第一个）
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        const oldestInstance = this.cache.get(oldestKey);
        if (oldestInstance) {
          // 停用并清理最旧的实例
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
   * 更新缓存的最大容量
   */
  setMaxSize(newMaxSize: number): void {
    this.maxSize = newMaxSize;
    // 如有必要则修剪
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
  /** 自定义缓存 key 函数：接收一个 vnode，返回字符串或数字作为缓存 key */
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
    const _currentVNode: VNode | null = null;

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

    // KeepAlive 只处理单个子组件
    const rawVNode = children[0] as VNode;
    if (rawVNode == null) return createCommentVNode('keep-alive');

    // 跳过非组件 vnode（文本、注释等）
    if (
      typeof rawVNode.type === 'string' ||
      rawVNode.type === (globalThis as Record<string, unknown>).__LYTJS_FRAGMENT__ ||
      rawVNode.type === (globalThis as Record<string, unknown>).__LYTJS_TEXT__ ||
      rawVNode.type === (globalThis as Record<string, unknown>).__LYTJS_COMMENT__
    ) {
      return rawVNode;
    }

    // 获取组件名用于匹配
    const compType = rawVNode.type as Record<string, unknown>;
    const compName =
      typeof compType === 'object' && compType !== null && 'name' in compType
        ? (compType as { name?: string }).name
        : typeof compType === 'function'
          ? (compType as { name?: string }).name
          : undefined;

    // FIX: P1-18 exclude 逻辑重构提高可读性，将复杂的条件表达式拆分为独立判断
    // 检查 include 过滤：组件名必须匹配 include 模式（如果提供了 include）
    const isIncluded =
      props.include === undefined || matchesPattern(compName as string | undefined, props.include);

    // 检查 exclude 过滤：组件名不能匹配 exclude 模式（如果提供了 exclude）
    const isExcluded =
      props.exclude !== undefined && matchesPattern(compName as string | undefined, props.exclude);

    if (!isIncluded || isExcluded) {
      return rawVNode;
    }

    // 计算缓存 key
    const cacheKey = getCacheKey(instance, rawVNode);

    // 检查是否已缓存
    const cachedInstance = getCachedInstance(instance, cacheKey);
    if (cachedInstance) {
      // 移动到最近使用位置
      cacheInstance(instance, cacheKey, cachedInstance);
      // 将缓存 vnode 的子节点复制到原始 vnode 上用于 patch
      // FIX: DTS build error - 类型断言避免 ComponentInternalInstance 冲突
      rawVNode.component = cachedInstance as unknown as NonNullable<typeof rawVNode.component>;
      rawVNode.shapeFlag |= ShapeFlags.COMPONENT_KEPT_ALIVE;
      activateInstance(cachedInstance);
      return rawVNode;
    }

    // 存储引用以便在卸载时停用
    (instance.setupState as Record<string, unknown>)._currentVNode = rawVNode;

    return rawVNode;
  },

  created() {
    // KeepAlive 实例初始化
  },
};

// ==================== KeepAlive 辅助函数 ====================

/**
 * 创建 KeepAlive 组件实例。
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
 * 检查组件名是否匹配 include/exclude 模式。
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
 * 获取 KeepAlive 上下文中 vnode 的缓存 key。
 *
 * 如果 KeepAlive 实例有 `onCacheKey` prop（自定义函数），
 * 则使用该函数计算缓存 key。
 * 否则，默认 key 从 `vnode.type`（组件构造函数或标签名）派生。
 *
 * @param keepAlive - KeepAlive 组件实例
 * @param vnode - 需要计算缓存 key 的 vnode
 * @returns 字符串形式的缓存 key
 */
export function getCacheKey(keepAlive: ComponentInternalInstance, vnode: VNode): string {
  const onCacheKey = keepAlive.props.onCacheKey as ((vnode: VNode) => string | number) | undefined;

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

  // 默认：使用 vnode.type（组件构造函数或标签字符串）
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
 * 在 KeepAlive 中缓存组件实例。
 * FIX: P2-8 COMPONENT-NEW-05 - LRU 缓存自动处理容量限制
 */
export function cacheInstance(
  keepAlive: ComponentInternalInstance,
  key: string,
  instance: ComponentInternalInstance,
): void {
  const cache = keepAlive.setupState.cache as KeepAliveCache;

  // 如果已缓存，先删除旧条目（将以更新后的顺序重新添加）
  if (cache.has(key)) {
    cache.delete(key);
  }

  // LRU 缓存在 set() 中自动处理最大容量修剪
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
 * 从 KeepAlive 移除缓存的实例。
 */
export function removeCachedInstance(keepAlive: ComponentInternalInstance, key: string): boolean {
  const cache = keepAlive.setupState.cache as KeepAliveCache;
  return cache.delete(key);
}

/**
 * 激活缓存的组件实例。
 */
export function activateInstance(instance: ComponentInternalInstance): void {
  instance.isDeactivated = false;
  // 如果定义了 activated 钩子则调用
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
 * 停用组件实例。
 */
export function deactivateInstance(instance: ComponentInternalInstance): void {
  instance.isDeactivated = true;
  // 如果定义了 deactivated 钩子则调用
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
