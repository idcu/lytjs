// src/builtin-registry.ts
// 内置组件注册表（**叶子模块**：不 import 任何组件实现）
//
// ## 为什么单开这个文件
//
// `component-proxy.ts` 需要在模板路径上解析 `_ctx.Teleport` 这类内置组件；
// 若它直接 import `builtin-components.ts`，会形成
// `component-proxy → builtin-components → keep-alive → component → component-init → component-proxy`
// 的**源码级循环依赖**（check-circular --src 会报“新增循环”）。
//
// 这里把「按名字查表」与「组件实现」拆开：
// - 本文件只有一张表 + 读写函数，谁都不依赖；
// - `builtin-components.ts` 通过显式的 `registerBuiltinComponents()` 把实现注册进来；
// - `component-proxy.ts` 只 import 本文件。
//
// ⚠️ 2026-11-07（ADR 0022 / 方案 B2）：入口**不再**用副作用 import 自动注册。
//   `package.json` 声明 `sideEffects:false`，裸 import 会被打包器丢弃（实测 dist 里
//   `registerBuiltin` 出现 0 次）；改为按需注册后，未用内置组件的入口不再付 ~6 KB。
//   代价是运行时字符串模板需显式调用一次 `registerBuiltinComponents()`；
//   编译期模板由 codegen 直接 import 实现，零配置可用。

/** 内置组件名（**静态清单**，与是否已注册无关） */
export const BUILTIN_COMPONENT_NAMES: ReadonlySet<string> = new Set([
  'Teleport',
  'Suspense',
  'Transition',
  'TransitionGroup',
  'KeepAlive',
]);

const registry = new Map<string, unknown>();

/** 注册一个内置组件（同名重复注册以最后一次为准） */
export function registerBuiltin(name: string, component: unknown): void {
  registry.set(name, component);
}

/** 该名字是否是内置组件（只查自有表，不碰原型链） */
export function isBuiltinComponentName(key: string): boolean {
  return registry.has(key);
}

/** 取内置组件对象（未注册返回 `undefined`） */
export function getBuiltinComponent(key: string): unknown {
  return registry.get(key);
}
