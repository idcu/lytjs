// packages/component/src/di/index.ts
// 依赖注入增强模块 (Phase 1.8-1.11): 多级 Provider、可选注入、InjectionToken、生命周期管理
//
// 本文件是 @lytjs/component 与独立包 @lytjs/di 的适配层：
// - 纯依赖注入核心（InjectionToken / Provider 树 / 解析器）由 @lytjs/di 提供
// - 本层保留组件实例级 provides 注入逻辑，并向 @lytjs/di 注入响应式模式的作用域

import { hasOwn } from '@lytjs/common-is';
import { getCurrentInstance } from '../lifecycle';
import { effectScope } from '@lytjs/reactivity';
import type { ComponentInternalInstance } from '@lytjs/shared-types';

import {
  InjectionToken,
  isInjectionToken,
  InjectionError,
  setProviderScopeFactory,
  getProviderRoot,
  getCurrentProviderNode,
  withProviderScope,
  enterProviderScope,
  exitProviderScope,
  injectValue,
  createProviderRecord,
} from '@lytjs/di';
import type {
  ProviderLifecycle,
  ProviderConfig,
  EnhancedInjectOptions,
  ProviderNode,
} from '@lytjs/di';

// 使用响应式 EffectScope 作为 DI 生命周期作用域，保持现有的响应式清理行为
setProviderScopeFactory(() => effectScope());

// ============================================================
// 重导出 @lytjs/di 基础能力
// ============================================================

export { InjectionToken, isInjectionToken, InjectionError };
export {
  getProviderRoot,
  getCurrentProviderNode,
  withProviderScope,
  enterProviderScope,
  exitProviderScope,
};
export type { ProviderLifecycle, ProviderConfig, ProviderNode, EnhancedInjectOptions };

// ============================================================
// 核心 provide / inject（组件实例感知）
// ============================================================

/**
 * 提供值到当前 Provider 作用域（组件实例或 Provider 节点）
 */
export function provide<T>(
  key: InjectionToken<T> | string | symbol,
  valueOrConfig: T | ProviderConfig<T>,
): void {
  const instance = getCurrentInstance();
  const providerNode = getCurrentProviderNode() || (instance ? null : getProviderRoot());

  // 解析 key
  const actualKey = isInjectionToken(key) ? key.__token : key;

  // 解析配置（useExisting 延迟解析到本适配器的 inject）
  const record = createProviderRecord(
    actualKey,
    valueOrConfig,
    (token) => () => inject(token as never) as unknown,
  );

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
 * 从 Provider 作用域注入值（组件实例优先，其次 Provider 节点树）
 */
export function inject<T>(
  key: InjectionToken<T> | string | symbol,
  options?: EnhancedInjectOptions<T>,
): T | undefined {
  const instance = getCurrentInstance();
  const actualKey = isInjectionToken(key) ? key.__token : key;
  const lookupKey = options?.from
    ? isInjectionToken(options.from)
      ? options.from.__token
      : options.from
    : actualKey;

  // 1. 检查组件实例级别
  if (instance) {
    const result = injectFromInstance(
      instance as unknown as ComponentInternalInstance,
      lookupKey,
      options,
    );
    if (result !== undefined) {
      return result as T;
    }
  }

  // 2. 检查 Provider 节点树 / 令牌工厂 / 默认值（委托 @lytjs/di）
  return injectValue(key, options);
}

/**
 * 从组件实例注入
 */
function injectFromInstance(
  instance: ComponentInternalInstance,
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
