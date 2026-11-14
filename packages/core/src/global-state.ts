// src/global-state.ts
// @lytjs/core 的跨入口单例状态。
//
// 背景：tsup `splitting: false` 会把同一批模块逐入口内联，`@lytjs/core` 主入口与
// `@lytjs/core/runtime` 是两个 dist 产物，同一进程同时加载时各持一份模块级状态。
// 全局配置、集成点注册表与实例级 WeakMap 都属于「进程内应当唯一」的语义，
// 因此统一挂到 `globalThis` + `Symbol.for`，而不是依赖模块级变量。
//
// 注意：只共享真正需要跨入口可见的状态；实例级数据仍以实例对象为 WeakMap 键，
// 不会破坏多 App 实例之间的隔离。

import type { ConfigManager } from '@lytjs/config';
import type { CoreIntegrations } from './common-integration';

export interface CoreGlobalState {
  configManager: ConfigManager | null;
  integrations: CoreIntegrations;
  instanceIds: WeakMap<object, Map<string, number>>;
  instanceCssModules: WeakMap<object, Record<string, Record<string, string>>>;
}

const SLOT = Symbol.for('@lytjs/core/global-state');

export function coreGlobalState(): CoreGlobalState {
  const existing = Reflect.get(globalThis, SLOT) as CoreGlobalState | undefined;
  if (existing) return existing;
  const created: CoreGlobalState = {
    configManager: null,
    integrations: {},
    instanceIds: new WeakMap(),
    instanceCssModules: new WeakMap(),
  };
  Reflect.set(globalThis, SLOT, created);
  return created;
}
