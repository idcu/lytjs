// src/keep-alive.ts
// KeepAlive 组件（简化版）

import { isString, isArray, isFunction } from '@lytjs/common-is';
import { warn } from '@lytjs/common-error';
import { watch } from '@lytjs/reactivity';
import type { ComponentInternalInstance, ComponentOptions, SetupContext } from './types';
import { createComponentInstance, setupComponent } from './component';
import { handleError, onMounted, onUpdated, onBeforeUnmount, getCurrentInstance } from './lifecycle';
import { callBeforeUnmountHook, callUnmountedHook } from './lifecycle';
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
          evictInstance(oldestInstance);
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
          evictInstance(oldestInstance);
        }
        this.cache.delete(oldestKey);
      }
    }
  }
}

/**
 * 从缓存中淘汰一个实例（LRU 超容 / `max` 缩小 / KeepAlive 自身卸载时调用）。
 *
 * 语义 = **销毁**该缓存条目（与 Vue 的 `pruneCacheEntry` 一致，等价于卸载）。
 *
 * ⚠️ 2026-09-28 两处修复：
 * ① 原实现对被淘汰实例**无条件** `deactivateInstance()` ⇒ 「切走时已触发过 `deactivated`」
 *    的实例被淘汰时**再次触发**同一钩子（钩子被调用两次）。
 * ② 原实现**只停用不卸载** ⇒ 被淘汰实例的 `unmounted` 钩子**永不触发**、DOM 残留在
 *    隐藏仓库里（泄漏）。
 *
 * 现统一走卸载语义：`beforeUnmount` → 移除 DOM → `isUnmounted = true` → 停 effects →
 * `unmounted`（由 `callBeforeUnmountHook` / `callUnmountedHook` 触发，与渲染器的
 * unmount 顺序一致）。
 *
 * 已知限制：不递归卸载 `subTree` 内的**嵌套组件**（component 包拿不到渲染器实例）。
 */
function evictInstance(instance: ComponentInternalInstance): void {
  if (instance.isUnmounted) return;

  // 仅对**真实组件实例**触发生命周期钩子（其 `lifecycle` 袋存在）。
  // `evictInstance` 也会经由 LRU 被「部分构造的实例」触达
  // （单测里用过 `{ type: {} }`），此时不应因缺 `lifecycle` 而崩溃。
  const hasLifecycleBag = !!(instance as { lifecycle?: unknown }).lifecycle;
  if (hasLifecycleBag) callBeforeUnmountHook(instance);

  const el = ((instance.subTree as VNode | null | undefined)?.el ?? null) as Node | null;
  if (el && el.parentNode) {
    el.parentNode.removeChild(el);
  }

  instance.isUnmounted = true;
  instance.isDeactivated = false;
  instance.effects?.forEach((effect) => {
    effect.stop();
  });

  if (hasLifecycleBag) callUnmountedHook(instance);
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

    const self = getCurrentInstance();

    /**
     * 把「待入库」的 vnode 对应实例写入缓存。
     *
     * 时机：本组件的 `mounted` / `updated` ——
     * 只有此时 `pending.component`（子组件实例）才存在。
     * （`render()` 阶段子实例尚未创建，故不能在那里直接落库。）
     */
    const commitPendingCache = (): void => {
      if (!self) return;
      const state = self.setupState as Record<string, unknown>;
      const pending = state.__pendingCacheVNode as VNode | undefined;
      if (!pending) return;
      // vnode.component 的类型是 vnode 包的轻量 ComponentInternalInstance，
      // 运行时实为完整实例；此处桥接到 component 包的完整类型（同 async-component 先例）。
      const child = pending.component as unknown as ComponentInternalInstance | null;
      if (child) {
        cacheInstance(self, getCacheKey(self, pending), child);
        child.isKeepingAlive = true;
        state.__pendingCacheVNode = null;
      }
    };

    onMounted(commitPendingCache);
    onUpdated(commitPendingCache);

    /**
     * KeepAlive 自身被卸载时，释放所有缓存实例。
     *
     * ⚠️ 2026-09-28 新增：此前被停用的缓存组件 DOM 停在 `storage`（游离节点），
     * KeepAlive 卸载后它们**永远不会被 unmount** ⇒ `unmounted` 钩子不触发、
     * DOM / 副作用泄漏。
     *
     * 处置：
     * - **当前活动实例**：清除其 `COMPONENT_SHOULD_KEEP_ALIVE`，交给渲染器随
     *   KeepAlive 的 subTree 一起正常卸载（若不清，渲染器会把它**停用**而非销毁
     *   —— 又变回泄漏）；
     * - 其余缓存实例：直接 `evictInstance`（走卸载语义）。
     */
    onBeforeUnmount(() => {
      if (!self) return;
      const currentSubTree = self.subTree as VNode | null | undefined;
      const currentKey = currentSubTree ? getCacheKey(self, currentSubTree) : null;
      if (currentSubTree) {
        currentSubTree.shapeFlag &= ~ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE;
      }
      for (const key of Array.from(cache.keys())) {
        const inst = cache.get(key);
        cache.delete(key);
        if (inst && key !== currentKey) {
          evictInstance(inst);
        }
      }
    });

    /**
     * 隐藏仓库：被停用的组件 DOM 会被移到这里（不从文档树销毁），
     * 以便再次激活时原样移回。
     */
    const storage: { appendChild(node: unknown): void } | null = (() => {
      const doc = (globalThis as { document?: { createElement(tag: string): unknown } }).document;
      return doc ? (doc.createElement('div') as { appendChild(node: unknown): void }) : null;
    })();

    /**
     * 激活（由渲染器在把既有 DOM 移回容器之后调用）。
     * vdom 通过 `vnode.component.parent.ctx.activate` 访问到它。
     */
    const activate = (vnode: VNode, container: unknown, anchor: unknown): void => {
      const inst = vnode.component as unknown as ComponentInternalInstance | null;
      if (!inst) return;
      const el = (inst.subTree as VNode | null | undefined)?.el ?? null;
      if (el && container) {
        (container as { insertBefore(node: unknown, anchor: unknown): void }).insertBefore(
          el,
          anchor ?? null,
        );
      }
      if (el) vnode.el = el;
      activateInstance(inst);
    };

    /**
     * 停用（由渲染器在卸载标记了 `COMPONENT_SHOULD_KEEP_ALIVE` 的组件时调用）：
     * 把 DOM 移入隐藏仓库、触发 deactivated，**但不销毁实例**。
     */
    const deactivate = (vnode: VNode): void => {
      const inst = vnode.component as unknown as ComponentInternalInstance | null;
      if (!inst) return;
      const el = (inst.subTree as VNode | null | undefined)?.el ?? null;
      if (el && storage) storage.appendChild(el);
      deactivateInstance(inst);
    };

    /**
     * 渲染实现（**闭包**持有 raw `self` 与 `cache`）。
     *
     * ⚠️ 2026-09-28 修复（第 3 层、也是最深的缺陷）：此前 `render(ctx)` 直接把
     * **公共实例代理**当作实例使用：
     *   `const instance = ctx; instance.slots; instance.props; instance.setupState.cache`
     * 但该代理**只暴露 `$slots` / `$props`**（见 `component-proxy.ts` 的 PUBLIC 字段），
     * `instance.slots` / `instance.props` / `instance.setupState` **全部解析为 undefined**
     * ⇒ `defaultSlot` 恒为 undefined ⇒ **KeepAlive 永远只渲染 `<!--keep-alive-->`**
     * （连"pass-through"都不是 —— 它根本不渲染子组件）。
     *
     * 正确做法（与 Vue 一致）：渲染逻辑以**闭包**形式持有 setup 阶段拿到的
     * **raw instance**（`self`）与 `cache`，`options.render` 仅作委派调用。
     */
    const renderImpl = (): VNode => {
      if (!self) return createCommentVNode('keep-alive');

      const props = (self.props ?? {}) as KeepAliveProps;
      const slots = self.slots as Record<string, unknown> | undefined;
      const defaultSlot = slots?.default as (() => VNode[] | VNode) | undefined;

      if (!defaultSlot) return createCommentVNode('keep-alive');

      const slotResult = defaultSlot();
      const children: VNode[] = Array.isArray(slotResult)
        ? (slotResult as VNode[])
        : slotResult == null
          ? []
          : [slotResult as VNode];
      if (children.length === 0) return createCommentVNode('keep-alive');

      // KeepAlive 只处理单个子组件
      const rawVNode = children[0] as VNode;
      if (rawVNode == null) return createCommentVNode('keep-alive');

      // 跳过非组件 vnode（元素/文本/注释等）
      if (typeof rawVNode.type === 'string') return rawVNode;

      // 获取组件名用于匹配
      const compType = rawVNode.type as Record<string, unknown>;
      const compName =
        typeof compType === 'object' && compType !== null && 'name' in compType
          ? (compType as { name?: string }).name
          : typeof compType === 'function'
            ? (compType as { name?: string }).name
            : undefined;

      // 检查 include / exclude 过滤
      const isIncluded =
        props.include === undefined ||
        matchesPattern(compName as string | undefined, props.include);
      const isExcluded =
        props.exclude !== undefined &&
        matchesPattern(compName as string | undefined, props.exclude);
      if (!isIncluded || isExcluded) return rawVNode;

      // 计算缓存 key
      const cacheKey = getCacheKey(self, rawVNode);

      // 检查是否已缓存
      const cachedInstance = getCachedInstance(self, cacheKey);
      if (cachedInstance) {
        // 移动到最近使用位置
        cacheInstance(self, cacheKey, cachedInstance);
        // 复用缓存实例：把实例挂到新 vnode 上，并标记 KEPT_ALIVE
        rawVNode.component = cachedInstance as unknown as NonNullable<typeof rawVNode.component>;
        rawVNode.shapeFlag |= ShapeFlags.COMPONENT_KEPT_ALIVE;
        // ⚠️ 不在这里调 `activateInstance()`：它应当在**渲染器**把既有 DOM
        //    移回容器**之后**触发（见 vdom mountComponent 的激活分支），
        //    否则 activated 钩子会在 DOM 尚未回到文档树时运行。
        return rawVNode;
      }

      // ── 未命中：走"缓存 + 停用"路径 ──────────────────────────────────────
      //
      // ⚠️ 缓存写入时机：缓存的 value 是 `ComponentInternalInstance`，而本函数运行在
      //    **render 阶段** —— 子组件实例要到 patch → mountComponent 才被创建。
      //    因此这里**只能记录待入库的 vnode**，真正落库交给本组件的
      //    `mounted` / `updated`（见 setup 的 commitPendingCache）。
      //    渲染器消费点：vdom 在「挂载」时识别 `COMPONENT_KEPT_ALIVE`（走激活）、
      //    在「卸载」时识别 `COMPONENT_SHOULD_KEEP_ALIVE`（走停用而非销毁）。
      rawVNode.shapeFlag |= ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE;
      (self.setupState as Record<string, unknown>).__pendingCacheVNode = rawVNode;
      (self.setupState as Record<string, unknown>)._currentVNode = rawVNode;

      return rawVNode;
    };

    return {
      cache,
      _currentVNode,
      activate,
      deactivate,
      // 供 `options.render` 委派调用（闭包持有 raw `self` / `cache`）
      __render: renderImpl,
    } as Record<string, unknown>;
  },

  render(ctx: unknown): VNode {
    // ⚠️ `ctx` 是**公共实例代理**（只暴露 `$slots` / `$props`），不能当作实例读取
    //    `.slots` / `.setupState`。真正的渲染实现以闭包形式存于 `setupState.__render`
    //    （闭包持有 raw instance 与 cache），此处仅作委派。
    const proxy = ctx as Record<string, unknown>;
    const renderImpl = proxy.__render as (() => VNode) | undefined;
    if (renderImpl) return renderImpl();
    return createCommentVNode('keep-alive');
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
