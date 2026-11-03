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

/**
 * 无操作作用域工厂（默认实现）。
 *
 * ⚠️ 2026-11-03 修（P0）：此前 `active` 来自**模块级**的 `let noopActive = true`，
 *   并且是在创建时**值拷贝**进对象。两个后果（实测）：
 *
 *   ① `stop()` 把模块级 `noopActive` 置 false ⇒ **之后创建的每一个 scope 一出生就是
 *      `active: false`** —— 一个 scope 的销毁污染了整个进程后续所有 scope；
 *   ② `active` 是值拷贝，`stop()` 之后**本 scope 的 `active` 仍是 true**（标志不翻转）。
 *
 *   现在每个 scope 持有自己的 `active` 闭包变量，用 getter 暴露。
 */
function createNoopScope(): ProviderScope {
  let active = true;
  return {
    get active() {
      return active;
    },
    run: (fn) => fn(),
    stop: () => {
      active = false;
    },
  };
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
