/**
 * Lyt.js KeepAlive 内置缓存组件
 *
 * 缓存组件实例，避免重复渲染和销毁。
 * 支持 include/exclude 匹配规则和 max LRU 淘汰策略。
 * 提供 activated/deactivated 生命周期钩子。
 * 纯原生实现，零外部依赖。
 */

import {
  defineComponent,
  type ComponentDefine,
  type ComponentInternalInstance,
} from '../define-component';

import type { PropType } from '../props';

import {
  LifecycleHook,
  callLifecycleHook,
} from '../lifecycle';

// ============================================================
// 类型定义
// ============================================================

/** KeepAlive 组件的 Props 接口 */
export interface KeepAliveProps {
  /** 匹配的组件名缓存（字符串精确匹配或 RegExp 正则匹配） */
  include?: string | RegExp | (string | RegExp)[];
  /** 匹配的组件名不缓存 */
  exclude?: string | RegExp | (string | RegExp)[];
  /** 最大缓存数量，超过时使用 LRU 淘汰策略 */
  max?: number;
}

/** 缓存条目 */
interface CacheEntry {
  /** 缓存的 VNode（原始引用，非拷贝） */
  vnode: any;
  /** 缓存的组件实例 */
  component: ComponentInternalInstance | null;
  /** 缓存的 key（组件名） */
  key: string;
  /** 组件实例的完整状态快照（deactivate 时保存） */
  savedState: SavedComponentState | null;
}

/** 组件实例状态快照 */
interface SavedComponentState {
  /** 组件内部 state（reactive 对象的原始值） */
  state: Record<string, any>;
  /** 组件 setupState */
  setupState: Record<string, any>;
  /** 计算属性引用（@lytjs/reactivity ComputedRef） */
  computedRefs: Record<string, { value: any } | (() => any)>;
  /** 子树 */
  subTree: any;
  /** 是否已挂载 */
  isMounted: boolean;
  /** watch 停止句柄列表 */
  watchStopHandles: any[];
  /** 生命周期钩子快照 */
  lifecycleHooks: Partial<Record<string, any[]>>;
}

// ============================================================
// 工具函数
// ============================================================

/**
 * 判断值是否为函数
 */
function isFunction(val: unknown): val is Function {
  return typeof val === 'function';
}

/**
 * 判断值是否为字符串
 */
function isString(val: unknown): val is string {
  return typeof val === 'string';
}

/**
 * 判断值是否为正则表达式
 */
function isRegExp(val: unknown): val is RegExp {
  return val instanceof RegExp;
}

/**
 * 判断组件名是否匹配 include/exclude 规则
 *
 * 支持三种匹配方式：
 * - 字符串：精确匹配组件名
 * - RegExp：正则匹配组件名
 * - 数组：任意一项匹配即通过
 *
 * @param name - 组件名称
 * @param pattern - 匹配规则
 * @returns 是否匹配
 */
function matchesPattern(name: string, pattern: string | RegExp | (string | RegExp)[]): boolean {
  if (!pattern) return false;

  if (isString(pattern)) {
    // 字符串精确匹配
    return name === pattern;
  }

  if (isRegExp(pattern)) {
    // 正则匹配
    return pattern.test(name);
  }

  if (Array.isArray(pattern)) {
    // 数组：任意一项匹配即通过
    for (let i = 0; i < pattern.length; i++) {
      if (matchesPattern(name, pattern[i])) {
        return true;
      }
    }
    return false;
  }

  return false;
}

/**
 * 深拷贝一个普通对象（仅支持可序列化数据）
 * 用于保存组件 state 的快照
 */
function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item)) as any;
  }
  const result: any = {};
  for (const key of Object.keys(obj as any)) {
    result[key] = deepClone((obj as any)[key]);
  }
  return result;
}

/**
 * 保存组件实例的完整状态
 *
 * @param component - 组件内部实例
 * @returns 保存的状态快照
 */
function saveComponentState(component: ComponentInternalInstance): SavedComponentState {
  // 保存所有生命周期钩子
  const hookNames = [
    LifecycleHook.INIT,
    LifecycleHook.MOUNTED,
    LifecycleHook.BEFORE_UPDATE,
    LifecycleHook.UPDATED,
    LifecycleHook.BEFORE_UNMOUNT,
    LifecycleHook.UNMOUNTED,
  ];
  const lifecycleHooks: Partial<Record<string, any[]>> = {};
  for (const hook of hookNames) {
    const callbacks = component[hook];
    if (callbacks && callbacks.length > 0) {
      lifecycleHooks[hook] = [...callbacks];
    }
  }

  return {
    state: deepClone(component.state),
    setupState: deepClone(component.setupState),
    computedRefs: component.computedRefs,
    subTree: component.subTree,
    isMounted: component.isMounted,
    watchStopHandles: component.watchStopHandles,
    lifecycleHooks,
  };
}

/**
 * 恢复组件实例的完整状态
 *
 * @param component - 组件内部实例
 * @param saved - 之前保存的状态快照
 */
function restoreComponentState(
  component: ComponentInternalInstance,
  saved: SavedComponentState
): void {
  // 恢复 state
  component.state = deepClone(saved.state);

  // 恢复 setupState
  component.setupState = deepClone(saved.setupState);

  // 恢复计算属性引用
  component.computedRefs = saved.computedRefs;

  // 恢复子树
  component.subTree = saved.subTree;

  // 恢复挂载状态
  component.isMounted = saved.isMounted;

  // 恢复侦听器
  component.watchStopHandles = saved.watchStopHandles;

  // 恢复生命周期钩子
  const hookNames = [
    LifecycleHook.INIT,
    LifecycleHook.MOUNTED,
    LifecycleHook.BEFORE_UPDATE,
    LifecycleHook.UPDATED,
    LifecycleHook.BEFORE_UNMOUNT,
    LifecycleHook.UNMOUNTED,
  ];
  for (const hook of hookNames) {
    const callbacks = saved.lifecycleHooks[hook];
    if (callbacks) {
      component[hook] = [...callbacks];
    }
  }

  // 确保组件未被标记为已卸载
  component.isUnmounted = false;
}

// ============================================================
// KeepAlive 组件实现
// ============================================================

/**
 * KeepAlive 内置缓存组件
 *
 * 缓存包裹的组件实例，切换时不会销毁组件而是移入缓存，
 * 再次切换回来时从缓存恢复，避免重复创建和销毁。
 *
 * 缓存策略：
 * - include：只有匹配的组件会被缓存
 * - exclude：匹配的组件不会被缓存
 * - max：最大缓存数量，使用 LRU（最近最少使用）策略淘汰
 *
 * 生命周期：
 * - activated：从缓存恢复时触发
 * - deactivated：移入缓存时触发
 *
 * @example
 * ```ts
 * // 基本用法
 * <keep-alive>
 *   <component :is="currentComponent" />
 * </keep-alive>
 *
 * // 配置 include/exclude
 * <keep-alive include="Home" exclude="Login" :max="10">
 *   <component :is="currentComponent" />
 * </keep-alive>
 * ```
 */
export const KeepAlive: ComponentDefine = defineComponent({
  name: 'KeepAlive',

  props: {
    include: { type: [String, Array] as PropType[], default: undefined },
    exclude: { type: [String, Array] as PropType[], default: undefined },
    max: { type: Number, default: undefined },
  },

  state() {
    return {
      /** 组件缓存 Map：key -> CacheEntry */
      cache: new Map<string, CacheEntry>(),
      /** 当前活跃的缓存 key */
      activeKey: null as string | null,
    };
  },

  init(props, state) {
    state.cache = new Map();
    state.activeKey = null;
  },

  render(h, instance) {
    const props = instance.props as unknown as KeepAliveProps;
    const state = instance.state;
    const slots = instance.slots;

    // 获取默认插槽内容（子组件）
    const children = slots.default ? slots.default() : null;
    const rawChild = Array.isArray(children) ? children[0] : children;

    if (!rawChild || typeof rawChild !== 'object') {
      return null;
    }

    // 获取子组件名称
    const childName = rawChild.name
      || (rawChild.type && (rawChild.type as any).name)
      || (rawChild.type && (rawChild.type as any).options && (rawChild.type as any).options.name)
      || '';

    // 生成缓存 key（优先使用组件 key，其次使用组件名）
    const cacheKey = rawChild.key != null
      ? String(rawChild.key)
      : childName || '__default__';

    // 检查 include/exclude 规则
    const shouldCache = shouldIncludeCache(childName, props);

    // 检查缓存是否命中
    const cachedEntry = state.cache.get(cacheKey);

    if (cachedEntry && shouldCache) {
      // 缓存命中：从缓存恢复

      // 如果当前有活跃组件且不是同一个，触发当前组件的 deactivated
      if (state.activeKey && state.activeKey !== cacheKey) {
        const prevEntry = state.cache.get(state.activeKey);
        if (prevEntry && prevEntry.component) {
          // 在 deactivate 前保存当前组件状态
          prevEntry.savedState = saveComponentState(prevEntry.component);
          callDeactivated(prevEntry.component);
        }
      }

      // 更新 LRU 顺序：删除后重新插入，使其成为最近访问
      state.cache.delete(cacheKey);
      state.cache.set(cacheKey, cachedEntry);

      // 更新活跃 key
      state.activeKey = cacheKey;

      // 如果有保存的状态，恢复组件实例
      if (cachedEntry.component && cachedEntry.savedState) {
        restoreComponentState(cachedEntry.component, cachedEntry.savedState);
        cachedEntry.savedState = null;
      }

      // 触发 activated 生命周期
      if (cachedEntry.component) {
        callActivated(cachedEntry.component);
      }

      // 返回缓存的 VNode（原始引用，非拷贝）
      return cachedEntry.vnode;
    }

    // 缓存未命中：创建新实例

    // 如果当前有活跃组件，触发其 deactivated
    if (state.activeKey) {
      const prevEntry = state.cache.get(state.activeKey);
      if (prevEntry && prevEntry.component) {
        // 在 deactivate 前保存当前组件状态
        prevEntry.savedState = saveComponentState(prevEntry.component);
        callDeactivated(prevEntry.component);
      }
    }

    // 使用原始 VNode 引用（不浅拷贝），保留嵌套组件的完整状态
    // 标记子 VNode 为 KeepAlive 包裹
    (rawChild as any).__keepalive = {
      cacheKey,
      shouldCache,
    };

    // 更新活跃 key
    state.activeKey = cacheKey;

    // 如果需要缓存，加入缓存
    if (shouldCache) {
      // 检查是否超过最大缓存数量
      if (props.max && state.cache.size >= props.max) {
        // LRU 淘汰：移除最早（最久未访问）的缓存条目
        pruneOldestEntry(state.cache);
      }

      // 添加到缓存（使用原始 VNode 引用）
      state.cache.set(cacheKey, {
        vnode: rawChild,
        component: null as any,
        key: cacheKey,
        savedState: null,
      });
    }

    return rawChild;
  },
});

// ============================================================
// 公共 API：注册/更新缓存条目的组件实例
// ============================================================

/**
 * 注册组件实例到 KeepAlive 缓存
 *
 * 当 KeepAlive 包裹的子组件完成挂载后，
 * 渲染器应调用此方法将组件实例关联到对应的缓存条目。
 *
 * @param vnode - 子组件的 VNode
 * @param component - 子组件的内部实例
 */
export function registerKeepAliveInstance(
  vnode: any,
  component: ComponentInternalInstance
): void {
  if (!vnode || !vnode.__keepalive) return;

  const { cacheKey, shouldCache } = vnode.__keepalive;
  if (!shouldCache || !component) return;

  // 从 KeepAlive 实例的缓存中找到对应条目并更新组件实例
  // 这里通过遍历查找，因为 VNode 可能来自不同的 KeepAlive 实例
  // 在实际渲染器中，会有更高效的查找方式
  const keepaliveInfo = vnode.__keepalive;
  if (keepaliveInfo._cacheRef) {
    const entry = keepaliveInfo._cacheRef.get(cacheKey);
    if (entry) {
      entry.component = component;
    }
  }
}

/**
 * 将缓存 Map 引用关联到 VNode
 *
 * 在 KeepAlive render 时调用，使 registerKeepAliveInstance
 * 能找到正确的缓存 Map。
 *
 * @param vnode - 子组件 VNode
 * @param cache - KeepAlive 的缓存 Map
 */
export function attachCacheRef(
  vnode: any,
  cache: Map<string, CacheEntry>
): void {
  if (vnode && vnode.__keepalive) {
    vnode.__keepalive._cacheRef = cache;
  }
}

// ============================================================
// 缓存管理函数
// ============================================================

/**
 * 判断组件是否应该被缓存
 *
 * 规则：
 * - 如果 exclude 匹配，不缓存
 * - 如果 include 存在但不匹配，不缓存
 * - 其他情况缓存
 *
 * @param name - 组件名称
 * @param props - KeepAlive props
 * @returns 是否应该缓存
 */
function shouldIncludeCache(name: string, props: KeepAliveProps): boolean {
  const { include, exclude } = props;

  // exclude 优先：匹配 exclude 的不缓存
  if (exclude && matchesPattern(name, exclude)) {
    return false;
  }

  // include 存在时，必须匹配 include 才缓存
  if (include && !matchesPattern(name, include)) {
    return false;
  }

  return true;
}

/**
 * 淘汰最旧的缓存条目（LRU 策略）
 *
 * Map 保持插入顺序，第一个条目就是最久未访问的。
 *
 * @param cache - 缓存 Map
 */
function pruneOldestEntry(cache: Map<string, CacheEntry>): void {
  // Map 的第一个 key 就是最久未访问的
  const oldestKey = cache.keys().next().value;
  if (oldestKey !== undefined) {
    pruneCacheEntry(cache, oldestKey);
  }
}

/**
 * 淘汰指定缓存条目
 *
 * 从缓存中移除指定 key 的条目，
 * 并触发该组件的 deactivated 钩子。
 *
 * @param cache - 缓存 Map
 * @param key - 要淘汰的缓存 key
 */
export function pruneCacheEntry(
  cache: Map<string, CacheEntry>,
  key: string
): void {
  const entry = cache.get(key);
  if (!entry) return;

  // 触发 deactivated 钩子
  if (entry.component && !entry.component.isUnmounted) {
    callDeactivated(entry.component);
  }

  // 从缓存中移除
  cache.delete(key);
}

/**
 * 根据 include/exclude 规则清理缓存
 *
 * 遍历所有缓存条目，移除不满足条件的条目。
 *
 * @param cache - 缓存 Map
 * @param props - KeepAlive props
 */
export function pruneCache(
  cache: Map<string, CacheEntry>,
  props: KeepAliveProps
): void {
  const keysToDelete: string[] = [];

  cache.forEach((entry, key) => {
    const name = entry.key;
    if (!shouldIncludeCache(name, props)) {
      keysToDelete.push(key);
    }
  });

  for (let i = 0; i < keysToDelete.length; i++) {
    pruneCacheEntry(cache, keysToDelete[i]);
  }
}

// ============================================================
// activated / deactivated 生命周期
// ============================================================

/**
 * 触发组件的 activated 生命周期钩子
 *
 * 当组件从 KeepAlive 缓存中恢复时调用。
 *
 * @param component - 组件内部实例
 */
function callActivated(component: ComponentInternalInstance): void {
  // 调用组件实例上的 activated 钩子
  callLifecycleHook(component, 'activated' as any);

  // 如果组件有 onActivated 方法，也调用它
  if (component.renderProxy && typeof (component.renderProxy as any).onActivated === 'function') {
    (component.renderProxy as any).onActivated();
  }
}

/**
 * 触发组件的 deactivated 生命周期钩子
 *
 * 当组件被移入 KeepAlive 缓存时调用。
 *
 * @param component - 组件内部实例
 */
function callDeactivated(component: ComponentInternalInstance): void {
  // 调用组件实例上的 deactivated 钩子
  callLifecycleHook(component, 'deactivated' as any);

  // 如果组件有 onDeactivated 方法，也调用它
  if (component.renderProxy && typeof (component.renderProxy as any).onDeactivated === 'function') {
    (component.renderProxy as any).onDeactivated();
  }
}
