/**
 * @lytjs/ssr - 服务端组件完善
 *
 * 提供服务端组件生命周期管理、数据预取优化、状态序列化等功能
 */

import type { VNode } from '@lytjs/vdom';
import { isObject, isFunction, isArray } from '@lytjs/common-is';
import type { DataPrefetchContext, PrefetchResult } from './stream';

/** 服务端组件生命周期钩子类型 */
export type ServerLifecycleHook = (
  context: ServerComponentContext
) => Promise<void> | void;

/** 服务端组件上下文 */
export interface ServerComponentContext {
  /** 组件唯一 ID */
  componentId: string;
  /** 路由信息 */
  route?: {
    path: string;
    params: Record<string, string>;
    query: Record<string, string>;
  };
  /** 请求上下文 */
  request?: {
    headers: Record<string, string | undefined>;
    cookies: Record<string, string>;
  };
}

/** 服务端组件注册信息 */
export interface ServerComponentRegistration {
  /** 组件名称 */
  name: string;
  /** 组件渲染函数 */
  render: () => VNode;
  /** 服务端初始化钩子 */
  onServerInit?: ServerLifecycleHook;
  /** 数据预取钩子 */
  prefetch?: (context: DataPrefetchContext) => Promise<PrefetchResult>;
  /** 服务端清理钩子 */
  onServerCleanup?: ServerLifecycleHook;
}

/** 服务端组件状态管理器 */
class ServerComponentStateManager {
  /** 注册的组件 */
  private registrations: Map<string, ServerComponentRegistration> = new Map();
  /** 正在执行的预取请求 */
  private pendingPrefetches: Map<string, Promise<PrefetchResult>> = new Map();
  /** 组件初始化状态 */
  private initializationStates: Map<string, boolean> = new Map();

  /**
   * 注册服务端组件
   */
  register(name: string, registration: ServerComponentRegistration): void {
    this.registrations.set(name, registration);
  }

  /**
   * 取消注册服务端组件
   */
  unregister(name: string): void {
    this.registrations.delete(name);
  }

  /**
   * 获取已注册的组件
   */
  getRegistration(name: string): ServerComponentRegistration | undefined {
    return this.registrations.get(name);
  }

  /**
   * 初始化服务端组件
   */
  async initializeComponent(
    name: string,
    context: ServerComponentContext
  ): Promise<void> {
    const registration = this.registrations.get(name);
    if (!registration) {
      throw new Error(`Server component ${name} not registered`);
    }

    if (this.initializationStates.get(name)) {
      return; // 已初始化
    }

    if (registration.onServerInit) {
      await Promise.resolve(registration.onServerInit(context));
    }

    this.initializationStates.set(name, true);
  }

  /**
   * 清理服务端组件
   */
  async cleanupComponent(
    name: string,
    context: ServerComponentContext
  ): Promise<void> {
    const registration = this.registrations.get(name);
    if (!registration) {
      return;
    }

    if (registration.onServerCleanup) {
      await Promise.resolve(registration.onServerCleanup(context));
    }

    this.initializationStates.delete(name);
  }

  /**
   * 预取组件数据（带缓存）
   */
  async prefetchComponentData(
    name: string,
    context: DataPrefetchContext,
    cacheKey?: string
  ): Promise<PrefetchResult> {
    const registration = this.registrations.get(name);
    if (!registration || !registration.prefetch) {
      return { data: {} };
    }

    const key = cacheKey || `${name}-${JSON.stringify(context)}`;
    const existing = this.pendingPrefetches.get(key);
    if (existing) {
      return existing; // 复用正在进行的请求
    }

    const promise = registration.prefetch(context).finally(() => {
      this.pendingPrefetches.delete(key);
    });

    this.pendingPrefetches.set(key, promise);
    return promise;
  }

  /**
   * 清除所有缓存
   */
  clearAll(): void {
    this.registrations.clear();
    this.pendingPrefetches.clear();
    this.initializationStates.clear();
  }
}

/** 全局状态管理器实例 */
export const stateManager = new ServerComponentStateManager();

/**
 * 注册服务端组件
 */
export function registerServerComponent(
  name: string,
  registration: ServerComponentRegistration
): void {
  stateManager.register(name, registration);
}

/**
 * 取消注册服务端组件
 */
export function unregisterServerComponent(name: string): void {
  stateManager.unregister(name);
}

/**
 * 从 VNode 树中收集需要预取数据的组件
 */
export function collectPrefetchComponents(
  vnode: VNode | VNode[] | string | number | null | undefined
): string[] {
  const components: string[] = [];
  collectComponentsRecursive(vnode, components);
  return components;
}

function collectComponentsRecursive(
  vnode: VNode | VNode[] | string | number | null | undefined,
  result: string[]
): void {
  if (!isObject(vnode)) {
    return;
  }

  const node = vnode as VNode;

  if (isArray(vnode)) {
    for (const child of vnode) {
      collectComponentsRecursive(child as VNode, result);
    }
    return;
  }

  // 检查是否是带有预取的组件
  if (isFunction(node.type)) {
    const compName = (node.type as any).name;
    if (compName && stateManager.getRegistration(compName)) {
      if (!result.includes(compName)) {
        result.push(compName);
      }
    }
  }

  // 递归子节点
  const children = node.children;
  if (isArray(children)) {
    for (const child of children) {
      collectComponentsRecursive(child as any, result);
    }
  } else if (isObject(children)) {
    collectComponentsRecursive(children as any, result);
  }
}

/**
 * 并发预取多个组件的数据
 */
export async function prefetchAllComponents(
  components: string[],
  context: DataPrefetchContext
): Promise<Record<string, PrefetchResult>> {
  const results: Record<string, PrefetchResult> = {};
  const promises: Array<Promise<void>> = [];

  for (const name of components) {
    const promise = stateManager
      .prefetchComponentData(name, context)
      .then((result) => {
        results[name] = result;
      })
      .catch((err) => {
        console.warn(`Prefetch failed for component ${name}`, err);
        results[name] = { data: {} };
      });
    promises.push(promise);
  }

  await Promise.all(promises);
  return results;
}

/**
 * 安全的状态序列化
 * 处理循环引用、日期、正则表达式等特殊类型
 */
export function safeSerializeState(state: unknown): string {
  const seen = new WeakSet();
  return JSON.stringify(state, (_key, value) => {
    // 处理循环引用
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
    }

    // 处理日期
    if (value instanceof Date) {
      return { __type: 'Date', value: value.toISOString() };
    }

    // 处理正则表达式
    if (value instanceof RegExp) {
      return { __type: 'RegExp', source: value.source, flags: value.flags };
    }

    // 处理 Set
    if (value instanceof Set) {
      return { __type: 'Set', values: Array.from(value) };
    }

    // 处理 Map
    if (value instanceof Map) {
      return { __type: 'Map', entries: Array.from(value.entries()) };
    }

    return value;
  });
}

/**
 * 安全的状态反序列化
 * 恢复特殊类型
 */
export function safeDeserializeState(serialized: string): unknown {
  return JSON.parse(serialized, (_key, value) => {
    if (typeof value === 'object' && value !== null && '__type' in value) {
      const typedValue = value as { __type: string; [key: string]: unknown };
      switch (typedValue.__type) {
        case 'Date':
          return new Date(typedValue.value as string);
        case 'RegExp':
          return new RegExp(typedValue.source as string, typedValue.flags as string);
        case 'Set':
          return new Set(typedValue.values as unknown[]);
        case 'Map':
          return new Map(typedValue.entries as [unknown, unknown][]);
      }
    }
    return value;
  });
}

/**
 * 创建组件脱水状态
 */
export interface ComponentDehydratedState {
  /** 组件名称 */
  componentName: string;
  /** 组件 Props */
  props: Record<string, unknown>;
  /** 预取的数据 */
  data?: Record<string, unknown>;
  /** 错误信息 */
  error?: string;
}

/**
 * 构建完整的脱水状态
 */
export function buildDehydratedState(
  prefetchResults: Record<string, PrefetchResult>
): Record<string, ComponentDehydratedState> {
  const state: Record<string, ComponentDehydratedState> = {};
  for (const [name, result] of Object.entries(prefetchResults)) {
    state[name] = {
      componentName: name,
      props: {},
      data: result.data,
    };
  }
  return state;
}

/**
 * 服务端组件管理器装饰器
 */
export function ServerComponent(options: {
  name: string;
  prefetch?: (context: DataPrefetchContext) => Promise<PrefetchResult>;
  onInit?: ServerLifecycleHook;
  onCleanup?: ServerLifecycleHook;
}) {
  return function (target: any) {
    registerServerComponent(options.name, {
      name: options.name,
      render: target.render || (() => ({ type: 'div' })),
      prefetch: options.prefetch,
      onServerInit: options.onInit,
      onServerCleanup: options.onCleanup,
    });
  };
}
