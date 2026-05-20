// packages/component/src/di/index.ts
// 依赖注入增强模块
// Phase 1.8-1.11: 多级 Provider、可选注入、InjectionToken、生命周期管理

import { hasOwn } from '@lytjs/common-is';
import { getCurrentInstance } from '../lifecycle';
import { effectScope } from '@lytjs/reactivity';
import type { EffectScope } from '@lytjs/reactivity';

// ============================================================
// Phase 1.10: InjectionToken - 类型安全的注入令牌
// ============================================================

/**
 * InjectionToken - 类型安全的注入令牌
 *
 * 与 InjectionKey 不同，InjectionToken 是一个类实例，
 * 可以携带更多元数据（如描述、工厂函数、生命周期等）
 *
 * @example
 * ```ts
 * const API_URL = new InjectionToken<string>('api-url');
 * const Database = new InjectionToken<Database>('database', {
 *   factory: () => new Database(),
 *   lifecycle: 'singleton',
 * });
 * ```
 */
export class InjectionToken<T> {
  /** 令牌描述 */
  readonly description: string;
  /** 令牌唯一标识 */
  readonly __token: symbol;
  /** 工厂函数 */
  readonly factory?: () => T;
  /** 生命周期 */
  readonly lifecycle?: ProviderLifecycle;

  constructor(
    description: string,
    options?: {
      factory?: () => T;
      lifecycle?: ProviderLifecycle;
    },
  ) {
    this.description = description;
    this.__token = Symbol(description);
    this.factory = options?.factory;
    this.lifecycle = options?.lifecycle;
  }

  toString(): string {
    return `InjectionToken(${this.description})`;
  }
}

/**
 * 判断是否是 InjectionToken
 */
export function isInjectionToken(value: unknown): value is InjectionToken<unknown> {
  return value instanceof InjectionToken;
}

// ============================================================
// Phase 1.11: 生命周期管理
// ============================================================

/** Provider 生命周期类型 */
export type ProviderLifecycle = 'singleton' | 'scoped' | 'transient';

/** Provider 配置 */
export interface ProviderConfig<T = unknown> {
  /** 提供的值 */
  provide?: T;
  /** 工厂函数 */
  useFactory?: () => T;
  /** 现有令牌别名 */
  useExisting?: InjectionToken<T> | string | symbol;
  /** 生命周期 */
  lifecycle?: ProviderLifecycle;
  /** 是否可选 */
  optional?: boolean;
}

/** Provider 记录 */
interface ProviderRecord {
  value: unknown;
  lifecycle: ProviderLifecycle;
  scope?: EffectScope;
  instanceId?: symbol;
}

// ============================================================
// Phase 1.8: 多级 Provider
// ============================================================

/**
 * Provider 树节点
 * 支持嵌套的 Provider 层级结构
 */
export interface ProviderNode {
  /** 唯一标识 */
  id: symbol;
  /** 父节点 */
  parent: ProviderNode | null;
  /** 子节点 */
  children: Set<ProviderNode>;
  /** 提供的值 */
  providers: Map<string | symbol, ProviderRecord>;
  /** 作用域 */
  scope: EffectScope;
}

/** 全局 Provider 根节点 */
let globalProviderRoot: ProviderNode | null = null;

/** 当前 Provider 上下文 */
let currentProviderNode: ProviderNode | null = null;

/**
 * 创建 Provider 节点
 */
function createProviderNode(parent: ProviderNode | null = null): ProviderNode {
  const node: ProviderNode = {
    id: Symbol('provider-node'),
    parent,
    children: new Set(),
    providers: new Map(),
    scope: effectScope(),
  };

  if (parent) {
    parent.children.add(node);
  }

  return node;
}

/**
 * 获取或创建全局 Provider 根节点
 */
export function getProviderRoot(): ProviderNode {
  if (!globalProviderRoot) {
    globalProviderRoot = createProviderNode();
  }
  return globalProviderRoot;
}

/**
 * 进入新的 Provider 作用域
 */
export function enterProviderScope(): ProviderNode {
  const parent = currentProviderNode || getProviderRoot();
  currentProviderNode = createProviderNode(parent);
  return currentProviderNode;
}

/**
 * 退出当前 Provider 作用域
 */
export function exitProviderScope(): void {
  if (currentProviderNode && currentProviderNode.parent) {
    currentProviderNode.scope.stop();
    currentProviderNode.parent.children.delete(currentProviderNode);
    currentProviderNode = currentProviderNode.parent;
  }
}

/**
 * 获取当前 Provider 节点
 */
export function getCurrentProviderNode(): ProviderNode | null {
  return currentProviderNode;
}

// ============================================================
// Phase 1.9: 可选注入
// ============================================================

/**
 * 增强的 Inject 选项
 */
export interface EnhancedInjectOptions<T = unknown> {
  /** 是否可选（找不到时不报错） */
  optional?: boolean;
  /** 默认值 */
  default?: T | (() => T);
  /** 从特定祖先查找 */
  from?: InjectionToken<T> | string | symbol;
  /** 是否仅查找当前层级 */
  local?: boolean;
  /** 是否跳过自身（仅查找祖先） */
  skipSelf?: boolean;
}

/**
 * 注入错误
 */
export class InjectionError extends Error {
  constructor(
    public token: string | symbol,
    message: string,
  ) {
    super(`Injection error for token "${String(token)}": ${message}`);
    this.name = 'InjectionError';
  }
}

// ============================================================
// 核心 API
// ============================================================

/**
 * 提供值到当前 Provider 作用域
 *
 * @example
 * ```ts
 * // 简单值
 * provide('api-url', 'https://api.example.com');
 *
 * // 使用 InjectionToken
 * const API_URL = new InjectionToken<string>('api-url');
 * provide(API_URL, 'https://api.example.com');
 *
 * // 使用配置对象
 * provide(API_URL, {
 *   useFactory: () => config.apiUrl,
 *   lifecycle: 'singleton',
 * });
 * ```
 */
export function provide<T>(
  key: InjectionToken<T> | string | symbol,
  valueOrConfig: T | ProviderConfig<T>,
): void {
  const instance = getCurrentInstance();
  const providerNode = currentProviderNode || (instance ? null : getProviderRoot());

  // 解析 key
  const actualKey = isInjectionToken(key) ? key.__token : key;

  // 解析配置
  let record: ProviderRecord;

  if (isProviderConfig(valueOrConfig)) {
    const config = valueOrConfig;
    const lifecycle = config.lifecycle || 'singleton';

    if (config.provide !== undefined) {
      record = {
        value: config.provide,
        lifecycle,
      };
    } else if (config.useFactory) {
      record = {
        value: config.useFactory(),
        lifecycle,
      };
    } else if (config.useExisting) {
      // 延迟解析 useExisting
      record = {
        value: () => inject(config.useExisting!),
        lifecycle,
      };
    } else {
      throw new InjectionError(
        actualKey,
        'ProviderConfig must have provide, useFactory, or useExisting',
      );
    }
  } else {
    record = {
      value: valueOrConfig,
      lifecycle: 'singleton',
    };
  }

  // 存储到适当的位置
  if (instance) {
    // 组件实例级别
    if (instance.provides === (instance.parent?.provides ?? null)) {
      instance.provides = Object.create(
        instance.provides as Record<string | symbol, unknown>,
      ) as Record<string | symbol, unknown>;
    }
    instance.provides[actualKey as string | symbol] = record.value;
  } else if (providerNode) {
    // Provider 节点级别
    providerNode.providers.set(actualKey, record);
  }
}

/**
 * 从 Provider 作用域注入值
 *
 * @example
 * ```ts
 * // 简单注入
 * const apiUrl = inject('api-url');
 *
 * // 使用 InjectionToken
 * const apiUrl = inject(API_URL);
 *
 * // 可选注入
 * const logger = inject(LOGGER, { optional: true });
 *
 * // 带默认值
 * const timeout = inject(TIMEOUT, { default: 5000 });
 * ```
 */
export function inject<T>(
  key: InjectionToken<T> | string | symbol,
  options?: EnhancedInjectOptions<T>,
): T | undefined {
  const instance = getCurrentInstance();
  const providerNode = currentProviderNode;

  // 解析 key
  const actualKey = isInjectionToken(key) ? key.__token : key;
  const lookupKey = options?.from
    ? isInjectionToken(options.from)
      ? options.from.__token
      : options.from
    : actualKey;

  // 1. 检查组件实例级别
  if (instance) {
    const result = injectFromInstance(instance, lookupKey, options);
    if (result !== undefined) {
      return result as T;
    }
  }

  // 2. 检查 Provider 节点级别
  if (providerNode) {
    const result = injectFromProviderNode(providerNode, lookupKey, options);
    if (result !== undefined) {
      return result as T;
    }
  }

  // 3. 检查全局 Provider 根节点
  if (globalProviderRoot) {
    const result = injectFromProviderNode(globalProviderRoot, lookupKey, options);
    if (result !== undefined) {
      return result as T;
    }
  }

  // 4. 检查 InjectionToken 的默认工厂
  if (isInjectionToken(key) && key.factory) {
    return key.factory();
  }

  // 5. 返回默认值或抛出错误
  if (options?.default !== undefined) {
    return typeof options.default === 'function' ? (options.default as () => T)() : options.default;
  }

  if (!options?.optional) {
    throw new InjectionError(actualKey, 'No provider found');
  }

  return undefined;
}

/**
 * 从组件实例注入
 */
function injectFromInstance(
  instance: Record<string, unknown>,
  key: string | symbol,
  options?: EnhancedInjectOptions,
): unknown {
  if (options?.local) {
    const provides = instance.provides as Record<string | symbol, unknown>;
    const hasOwnProvides = instance.parent ? provides !== instance.parent.provides : true;
    if (hasOwnProvides && hasOwn(provides, key as string)) {
      return provides[key];
    }
    return undefined;
  }

  if (!options?.skipSelf) {
    const provides = instance.provides as Record<string | symbol, unknown>;
    if ((key as string | symbol) in provides) {
      return provides[key];
    }
  }

  // 向上查找
  let current = options?.skipSelf ? instance.parent : instance.parent;
  while (current) {
    const provides = current.provides as Record<string | symbol, unknown>;
    if ((key as string | symbol) in provides) {
      return provides[key];
    }
    current = current.parent;
  }

  return undefined;
}

/**
 * 从 Provider 节点注入
 */
function injectFromProviderNode(
  node: ProviderNode,
  key: string | symbol,
  options?: EnhancedInjectOptions,
): unknown {
  // 检查当前节点
  if (!options?.skipSelf) {
    const record = node.providers.get(key);
    if (record) {
      if (typeof record.value === 'function' && record.lifecycle === 'transient') {
        return (record.value as () => unknown)();
      }
      return record.value;
    }
  }

  // 向上查找父节点
  let current = options?.skipSelf ? node.parent : node.parent;
  while (current) {
    const record = current.providers.get(key);
    if (record) {
      if (typeof record.value === 'function' && record.lifecycle === 'transient') {
        return (record.value as () => unknown)();
      }
      return record.value;
    }
    current = current.parent;
  }

  return undefined;
}

/**
 * 检查是否是 ProviderConfig
 */
function isProviderConfig<T>(value: unknown): value is ProviderConfig<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    ('provide' in value || 'useFactory' in value || 'useExisting' in value || 'lifecycle' in value)
  );
}

// ============================================================
// 便捷 API
// ============================================================

/**
 * 创建并注册一个单例 Provider
 */
export function provideSingleton<T>(
  key: InjectionToken<T> | string | symbol,
  factory: () => T,
): void {
  provide(key, {
    useFactory: factory,
    lifecycle: 'singleton',
  });
}

/**
 * 创建并注册一个作用域 Provider
 */
export function provideScoped<T>(key: InjectionToken<T> | string | symbol, factory: () => T): void {
  provide(key, {
    useFactory: factory,
    lifecycle: 'scoped',
  });
}

/**
 * 创建并注册一个临时 Provider
 */
export function provideTransient<T>(
  key: InjectionToken<T> | string | symbol,
  factory: () => T,
): void {
  provide(key, {
    useFactory: factory,
    lifecycle: 'transient',
  });
}

/**
 * 批量注册 Providers
 */
export function provideAll(
  providers: Array<{
    provide: InjectionToken<unknown> | string | symbol;
    useValue?: unknown;
    useFactory?: () => unknown;
    useExisting?: InjectionToken<unknown> | string | symbol;
    lifecycle?: ProviderLifecycle;
  }>,
): void {
  for (const provider of providers) {
    const { provide: key, useValue, useFactory, useExisting, lifecycle } = provider;
    provide(key, {
      provide: useValue,
      useFactory,
      useExisting,
      lifecycle,
    } as ProviderConfig);
  }
}

/**
 * 创建一个 Provider 作用域并执行回调
 */
export function withProviderScope<T>(fn: () => T): T {
  const node = enterProviderScope();
  try {
    return node.scope.run(fn) as T;
  } finally {
    exitProviderScope();
  }
}
