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
  _resolveAlias: (token: InjectionToken<unknown> | string | symbol) => unknown = () => undefined,
): ProviderRecord {
  if (isProviderConfig(valueOrConfig)) {
    const config = valueOrConfig as ProviderConfig;
    const lifecycle = config.lifecycle || 'singleton';

    if (config.provide !== undefined) {
      return { value: config.provide, lifecycle };
    }

    // ★ 2026-11-03 修（P0）：**保留工厂本身，不在 provide 时求值**。
    //   此前这里是 `{ value: config.useFactory() }` ⇒ `transient` 永远不生效
    //   （判据是 `typeof value === 'function'`，而 value 已是求值结果）。
    if (config.useFactory) {
      return { value: undefined, lifecycle, factory: config.useFactory };
    }

    // ★ 2026-11-03 修（P0）：别名**读时解析**。
    //   此前 `resolveAlias(config.useExisting)` 在所有公开调用点都没传 resolver
    //   ⇒ 别名恒为 undefined ⇒ 注入时报 "No provider found"。
    if (config.useExisting) {
      return { value: undefined, lifecycle, alias: resolveKey(config.useExisting) };
    }

    throw new InjectionError(
      actualKey,
      'ProviderConfig must have provide, useFactory, or useExisting',
    );
  }

  return { value: valueOrConfig, lifecycle: 'singleton' };
}

/**
 * 把一个 ProviderRecord 物化成**值**（用于「值型存储」的适配层，如组件实例的 `provides`）。
 *
 * 与 `materializeRecord` 的区别：这里没有 Provider 节点，别名通过调用方给的
 * `resolveAlias` 解析（组件适配层传 `inject` 即可走完整的实例链）。
 *
 * 语义：工厂在这里**求值一次并缓存**（适配层的存储是值，不是记录）。
 */
export function resolveProviderValue(
  record: ProviderRecord,
  resolveAlias: (key: string | symbol) => unknown = () => undefined,
): unknown {
  if (record.alias !== undefined) {
    return resolveAlias(record.alias);
  }
  if (record.factory) {
    const value = record.factory();
    record.value = value;
    record.factory = undefined;
    return value;
  }
  return record.value;
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
  return lookupInChain(node, key, options, new Set());
}

/**
 * 把一条 ProviderRecord 物化成注入值。
 *
 * - `alias`：读时解析 —— 从**声明该别名的节点**开始沿链查找（这样「先声明别名、
 *   后提供目标」也能工作），并带环路检测（`a → b → a` 会明确抛错而不是死递归）
 * - `factory` + `transient`：每次求值
 * - `factory` + singleton/scoped：首次求值后缓存（写回 record，后续直接命中）
 * - 其它：直接返回 `value`
 */
function materializeRecord(
  owner: ProviderNode,
  record: ProviderRecord,
  seen: Set<string | symbol>,
): unknown {
  if (record.alias !== undefined) {
    if (seen.has(record.alias)) {
      throw new InjectionError(record.alias, 'Circular provider alias detected');
    }
    seen.add(record.alias);
    return lookupInChain(owner, record.alias, undefined, seen);
  }

  if (record.factory) {
    if (record.lifecycle === 'transient') {
      return record.factory();
    }
    // singleton / scoped：求值一次并缓存
    record.value = record.factory();
    record.factory = undefined;
    return record.value;
  }

  // 向后兼容：手工构造的 transient 记录把工厂放在 `value` 里
  // （`node.providers.set(k, { value: () => ..., lifecycle: 'transient' })`）。
  // `ProviderRecord` 是公开类型，这种写法在既有用例/用户代码里存在，不能直接删。
  if (record.lifecycle === 'transient' && typeof record.value === 'function') {
    return (record.value as () => unknown)();
  }

  return record.value;
}

function lookupInChain(
  node: ProviderNode,
  key: string | symbol,
  options: EnhancedInjectOptions | undefined,
  seen: Set<string | symbol>,
): unknown {
  // 检查当前节点
  if (!options?.skipSelf) {
    const record = node.providers.get(key);
    if (record) return materializeRecord(node, record, seen);
  }

  // 向上查找父节点
  let current = node.parent;
  while (current) {
    const record = current.providers.get(key);
    if (record) return materializeRecord(current, record, seen);
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
    return typeof options.default === 'function' ? (options.default as () => T)() : options.default;
  }

  if (!options?.optional) {
    throw new InjectionError(actualKey, 'No provider found');
  }

  return undefined;
}
