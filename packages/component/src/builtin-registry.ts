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
// - `builtin-components.ts` 在模块加载时把实现注册进来；
// - `component-proxy.ts` 只 import 本文件。
//
// 注册发生的时机：`src/index.ts` 顶部用副作用 import 加载 `builtin-components`，
// 因此在任何通过包入口使用组件系统的地方，渲染期查表时表已就绪。

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
