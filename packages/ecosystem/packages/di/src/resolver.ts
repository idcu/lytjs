// packages/ecosystem/packages/di/src/resolver.ts
// 通用依赖注入 - 依赖关系解析器（纯 Provider 树，无组件耦合）

import { isInjectionToken } from './token';
import type { InjectionToken } from './token';
import { InjectionError, isProviderConfig } from './errors';
import { getCurrentProviderNode, getActiveProviderRoot, getProviderRoot } from './provider-tree';
import type { ProviderNode } from './provider-tree';
import type { EnhancedInjectOptions, ProviderConfig, ProviderRecord } from './types';

/**
 * 解析 key 为实际存储标识（InjectionToken 取符号）
 */
export function resolveKey(key: InjectionToken<unknown> | string | symbol): string | symbol {
  return isInjectionToken(key) ? key.__token : key;
}

/**
 * 解析 key（考虑 from 覆盖），返回查找用的标识
 */
function resolveLookupKey<T>(
  key: InjectionToken<T> | string | symbol,
  options?: EnhancedInjectOptions<T>,
): string | symbol {
  if (options?.from) {
    return resolveKey(options.from);
  }
  return resolveKey(key);
}

/**
 * 根据 valueOrConfig 构造 ProviderRecord
 */
export function createProviderRecord(
  actualKey: string | symbol,
  valueOrConfig: unknown,
  resolveAlias: (token: InjectionToken<unknown> | string | symbol) => unknown = () => undefined,
): ProviderRecord {
  if (isProviderConfig(valueOrConfig)) {
    const config = valueOrConfig as ProviderConfig;
    const lifecycle = config.lifecycle || 'singleton';

    if (config.provide !== undefined) {
      return { value: config.provide, lifecycle };
    }

    if (config.useFactory) {
      return { value: config.useFactory(), lifecycle };
    }

    if (config.useExisting) {
      return { value: resolveAlias(config.useExisting) as () => unknown, lifecycle };
    }

    throw new InjectionError(
      actualKey,
      'ProviderConfig must have provide, useFactory, or useExisting',
    );
  }

  return { value: valueOrConfig, lifecycle: 'singleton' };
}

/**
 * 向指定 Provider 节点提供值
 */
export function provideToNode<T>(
  node: ProviderNode,
  key: InjectionToken<T> | string | symbol,
  valueOrConfig: T | ProviderConfig<T>,
  resolveAlias: (token: InjectionToken<unknown> | string | symbol) => unknown = () => undefined,
): void {
  const actualKey = resolveKey(key);
  const record = createProviderRecord(actualKey, valueOrConfig, resolveAlias);
  node.providers.set(actualKey, record);
}

/**
 * 当前上下文提供值（写入当前节点或全局根节点）
 */
export function provideValue<T>(
  key: InjectionToken<T> | string | symbol,
  valueOrConfig: T | ProviderConfig<T>,
): void {
  const providerNode = getCurrentProviderNode() || getProviderRoot();
  provideToNode(providerNode, key, valueOrConfig);
}

/**
 * 从 Provider 节点（及祖先链）解析注入值
 */
export function injectFromNode(
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
  let current = node.parent;
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
 * 当前上下文注入值
 *
 * 解析顺序：当前 Provider 节点链 → 全局根节点链 → 令牌工厂 → 默认值/抛错
 * （不含组件实例级注入，组件侧通过适配器在实例级优先查找）
 */
export function injectValue<T>(
  key: InjectionToken<T> | string | symbol,
  options?: EnhancedInjectOptions<T>,
): T | undefined {
  const providerNode = getCurrentProviderNode();
  const actualKey = resolveKey(key);
  const lookupKey = resolveLookupKey(key, options);

  // 1. 检查当前 Provider 节点链
  if (providerNode) {
    const result = injectFromNode(providerNode, lookupKey, options);
    if (result !== undefined) {
      return result as T;
    }
  }

  // 2. 检查全局 Provider 根节点链
  const globalRoot = getActiveProviderRoot();
  if (globalRoot) {
    const result = injectFromNode(globalRoot, lookupKey, options);
    if (result !== undefined) {
      return result as T;
    }
  }

  // 3. 检查 InjectionToken 的默认工厂
  if (isInjectionToken(key) && key.factory) {
    return key.factory();
  }

  // 4. 返回默认值或抛出错误
  if (options?.default !== undefined) {
    return typeof options.default === 'function'
      ? (options.default as () => T)()
      : options.default;
  }

  if (!options?.optional) {
    throw new InjectionError(actualKey, 'No provider found');
  }

  return undefined;
}