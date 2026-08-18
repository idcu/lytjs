// packages/ecosystem/packages/di/src/scope.ts
// 通用依赖注入 - 生命周期作用域抽象
//
// 保持零框架依赖：允许通过 setProviderScopeFactory 注入任何满足
// ProviderScope 结构的作用域实现（如响应式框架的 EffectScope）。

/** 生命周期作用域接口 */
export interface ProviderScope {
  /** 作用域是否活跃 */
  readonly active: boolean;
  /** 在作用域内执行函数（作用域可能返回 void/undefined） */
  run<T>(fn: () => T): T | void;
  /** 停止/销毁作用域 */
  stop(): void;
}

/** 作用域工厂类型 */
export type ProviderScopeFactory = () => ProviderScope;

/** 无操作作用域工厂（默认实现） */
let noopActive = true;
function createNoopScope(): ProviderScope {
  const scope: ProviderScope = {
    active: noopActive,
    run: (fn) => fn(),
    stop: () => {
      noopActive = false;
    },
  };
  return scope;
}

let scopeFactory: ProviderScopeFactory = () => createNoopScope();

/**
 * 设置作用域工厂
 *
 * 组件系统可通过注入带响应式清理能力的作用域（如 EffectScope）
 * 来保持现有 `exitProviderScope` / `withProviderScope` 的行为。
 */
export function setProviderScopeFactory(factory: ProviderScopeFactory): void {
  scopeFactory = factory;
}

/**
 * 获取当前作用域工厂
 */
export function getProviderScopeFactory(): ProviderScopeFactory {
  return scopeFactory;
}