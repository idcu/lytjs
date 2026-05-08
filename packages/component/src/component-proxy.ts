// src/component-proxy.ts
// Public instance proxy ($data, $props, $el, etc.) and access cache

import { hasOwn } from '@lytjs/common-is';
import { warn } from '@lytjs/common-error';
import { nextTick } from '@lytjs/common-scheduler';
import type { ComponentInternalInstance, ComponentPublicInstance } from './types';
// FIX: DTS build error - VNode 未使用
// import type { VNode } from '@lytjs/common-vnode';

// ==================== accessCache 常量 ====================

/**
 * PublicInstanceProxy 属性访问缓存位掩码。
 * 每个公共属性对应一个唯一的位，用于在 accessCache 数组中标记
 * 该属性首次被访问时的查找结果，避免后续重复遍历 setupState/data/props。
 *
 * 位值设计：
 *   0       - 未缓存（需要首次查找）
 *   1       - $ 属性（$data, $props, $el, $emit 等）
 *   2       - setupState
 *   4       - data
 *   8       - props
 *   16      - globalProperties
 *   32      - ctx（公共实例自身属性）
 */
export const enum PublicInstanceProxyAccessCache {
  /** 未缓存 */
  NONE = 0,
  /** 其他（无法归类到具体来源） */
  OTHER = 1,
  /** 来自 setupState */
  SETUP_STATE = 2,
  /** 来自 data */
  DATA = 4,
  /** 来自 props */
  PROPS = 8,
  /** 来自 globalProperties */
  GLOBAL_PROPERTIES = 16,
  /** 来自 ctx（公共实例自身属性，如 $data, $el 等） */
  CONTEXT = 32,
}

/**
 * 公共属性名到 accessCache 位掩码的映射。
 * 用于快速判断一个 key 是否是 Vue 内置公共属性（$data, $props 等）。
 */
export const PUBLIC_PROPERTIES_MAP: Record<string, number> = {
  $: 1,
  $el: 2,
  $data: 4,
  $props: 8,
  $attrs: 16,
  $slots: 32,
  $refs: 64,
  $parent: 128,
  $root: 256,
  $emit: 512,
  $options: 1024,
  $forceUpdate: 2048,
  $nextTick: 4096,
  $watch: 8192,
};

// ==================== createComponentPublicInstance ====================

/**
 * Create the public instance proxy ($data, $props, $el, etc.).
 * Uses a Proxy so that Options API `this` correctly resolves properties
 * from setupState, data, props, and public instance fields ($el, $emit, etc.).
 */
export function createComponentPublicInstance(
  instance: ComponentInternalInstance,
): ComponentPublicInstance {
  // 初始化 accessCache（惰性创建）
  if (!instance.accessCache) {
    instance.accessCache = Object.create(null) as Record<string, number>;
  }

  const PublicInstanceProxyHandlers: ProxyHandler<ComponentPublicInstance> = {
    get(target: ComponentPublicInstance, key: string | symbol): unknown {
      // Symbol.key 无法缓存，直接走原始逻辑
      if (typeof key === 'symbol') {
        if (key in target) {
          const res = (target as unknown as Record<string | symbol, unknown>)[key];
          if (typeof res === 'function' && key !== Symbol.toPrimitive && key !== Symbol.iterator) {
            return res.bind(target);
          }
          return res;
        }
        return undefined;
      }

      // 尝试从 accessCache 获取缓存结果
      const cachedValue = instance.accessCache![key];
      if (cachedValue !== undefined) {
        switch (cachedValue) {
          case PublicInstanceProxyAccessCache.CONTEXT: {
            const res = (target as unknown as Record<string | symbol, unknown>)[key];
            if (typeof res === 'function' && key !== '$emit') {
              return res.bind(target);
            }
            return res;
          }
          case PublicInstanceProxyAccessCache.OTHER:
            return undefined;
          case PublicInstanceProxyAccessCache.SETUP_STATE:
            return instance.setupState[key];
          case PublicInstanceProxyAccessCache.DATA:
            return instance.data[key];
          case PublicInstanceProxyAccessCache.PROPS:
            return instance.props[key];
          case PublicInstanceProxyAccessCache.GLOBAL_PROPERTIES: {
            const globalProperties = instance.appContext?.config?.globalProperties as
              | Record<string, unknown>
              | undefined;
            return globalProperties ? globalProperties[key] : undefined;
          }
        }
      }

      // 1. Public properties ($data, $props, $el, $emit, etc.)
      if (key in target) {
        const res = (target as unknown as Record<string | symbol, unknown>)[key];
        // Bind functions to the proxy so `this` works correctly
        if (typeof res === 'function' && key !== '$emit') {
          return res.bind(target);
        }
        // 缓存查找结果
        instance.accessCache![key] = PublicInstanceProxyAccessCache.CONTEXT;
        return res;
      }

      // 2. globalProperties
      const globalProperties = instance.appContext?.config?.globalProperties as
        | Record<string, unknown>
        | undefined;
      if (globalProperties && hasOwn(globalProperties, key)) {
        instance.accessCache![key] = PublicInstanceProxyAccessCache.GLOBAL_PROPERTIES;
        return globalProperties[key as string];
      }

      // 3. setupState
      if (hasOwn(instance.setupState, key)) {
        instance.accessCache![key] = PublicInstanceProxyAccessCache.SETUP_STATE;
        return instance.setupState[key as string];
      }

      // 4. data
      if (hasOwn(instance.data, key)) {
        instance.accessCache![key] = PublicInstanceProxyAccessCache.DATA;
        return instance.data[key as string];
      }

      // 5. props
      if (hasOwn(instance.props, key)) {
        instance.accessCache![key] = PublicInstanceProxyAccessCache.PROPS;
        return instance.props[key as string];
      }

      // 未找到，缓存为 OTHER 以避免重复查找
      instance.accessCache![key] = PublicInstanceProxyAccessCache.OTHER;
      return undefined;
    },

    set(_target: ComponentPublicInstance, key: string | symbol, value: unknown): boolean {
      // FIX: P1-16 完善 Symbol key 处理：Symbol key 不应被写入 setupState/data，
      // 应直接设置到 target 上（与 get handler 的 Symbol 处理保持一致）
      if (typeof key === 'symbol') {
        if (key === Symbol.toPrimitive || key === Symbol.iterator) {
          return false; // 不允许覆盖内置 Symbol
        }
        (_target as unknown as Record<string | symbol, unknown>)[key] = value;
        return true;
      }

      // 1. setupState
      if (hasOwn(instance.setupState, key)) {
        instance.setupState[key as string] = value;
        return true;
      }

      // 2. data
      if (hasOwn(instance.data, key)) {
        instance.data[key as string] = value;
        return true;
      }

      // FIX: P0-05 未找到属性时，在 DEV 模式下发出警告并返回 false，
      // 避免静默吞没写入导致调试困难
      // FIX: P2-10 注意：生产模式下此操作静默返回 false，不抛出错误。
      // 这是有意的设计，以避免在生产环境中因意外的属性写入导致应用崩溃。
      if (__DEV__) {
        warn(
          `Component public instance has no property "${String(key)}". ` +
            `This set operation was silently ignored.`,
        );
      }
      return false;
    },

    has(_target: ComponentPublicInstance, key: string | symbol): boolean {
      // Symbol key 无法使用 accessCache
      if (typeof key === 'symbol') {
        return (
          key in instance.setupState ||
          key in instance.data ||
          key in instance.props ||
          key in _target
        );
      }

      // 尝试从 accessCache 获取缓存结果
      const cachedValue = instance.accessCache![key];
      if (cachedValue !== undefined) {
        // 缓存值为 OTHER 表示未找到
        return cachedValue !== PublicInstanceProxyAccessCache.OTHER;
      }

      const globalProperties = instance.appContext?.config?.globalProperties as
        | Record<string, unknown>
        | undefined;
      const found =
        key in instance.setupState ||
        key in instance.data ||
        key in instance.props ||
        (globalProperties ? key in globalProperties : false) ||
        key in _target;

      // 缓存 has 结果
      instance.accessCache![key] = found
        ? PublicInstanceProxyAccessCache.CONTEXT
        : PublicInstanceProxyAccessCache.OTHER;

      return found;
    },
  };

  const ctx: ComponentPublicInstance = {
    get $data() {
      return instance.data;
    },
    get $props() {
      return instance.props;
    },
    get $el() {
      return (instance.vnode?.el as Element) ?? null;
    },
    get $options() {
      return instance.type as unknown as Record<string, unknown>;
    },
    get $refs() {
      return instance.refs as Record<string, Element | ComponentPublicInstance | null>;
    },
    get $slots() {
      return instance.slots;
    },
    $emit: instance.emit,
    $forceUpdate: () => {
      if (instance.update) {
        instance.update();
      } else if (instance.isMounted && instance.render && !instance.isUnmounted) {
        // 回退路径：已挂载但 instance.update 不可用（非标准渲染器场景）。
        // 标记需要重新渲染，在下一个 tick 中执行 render 并通过
        // instance.subTree 引用替换触发渲染器的更新机制。
        // FIX: P2-35 添加 anchor 和 ref 处理：
        // - 保留旧 subTree 的 anchor 信息（用于 Fragment 定位）
        // - 将旧 subTree 的 ref 转移到新 subTree（保持 ref 绑定）
        nextTick(() => {
          if (instance.isUnmounted) return;
          const prevTree = instance.subTree;
          const nextTree = instance.render!(instance.ctx as Parameters<typeof instance.render>[0]);
          if (nextTree) {
            instance.subTree = nextTree;
            // 将旧 subTree 标记为需要卸载，新 subTree 标记为需要挂载。
            // 渲染器在下次调度时会检测到 subTree 变化并执行 patch。
            nextTree.el = prevTree?.el ?? null;
            // FIX: P2-35 保留 anchor 信息，确保 Fragment 子节点定位正确
            if (prevTree && 'anchor' in prevTree) {
              (nextTree as unknown as Record<string, unknown>).anchor = (
                prevTree as unknown as Record<string, unknown>
              ).anchor;
            }
            // FIX: P2-35 转移 ref 绑定，避免 ref 丢失
            if (prevTree && 'ref' in prevTree) {
              (nextTree as unknown as Record<string, unknown>).ref = (
                prevTree as unknown as Record<string, unknown>
              ).ref;
            }
          }
        });
      }
    },
    $nextTick: () => nextTick(),
  };

  return new Proxy(ctx, PublicInstanceProxyHandlers);
}
