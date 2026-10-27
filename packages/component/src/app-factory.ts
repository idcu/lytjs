// packages/component/src/app-factory.ts
// 「创建 App 实例」的注入缝
//
// ## 为什么需要这个（2026-10-27 修，P1-N 的前置）
//
// `@lytjs/renderer` 的 `hydrateApp` / `hydrateVisible` / `safeHydrate` 需要返回一个
// **App 实例**，而 App 的构造器在 `@lytjs/core` 里。于是 renderer 里出现了：
//
//     const { createApp } = await import('@lytjs/core');
//
// 这是三重问题：
//   ① **分层倒置**：renderer 是 core 的下层，却反过来 import 上层 ⇒ core ↔ renderer 成环；
//   ② **幽灵依赖**：renderer 的 package.json **根本没有声明** `@lytjs/core`
//      （实测 dependencies / peerDependencies 里都没有）⇒ 严格 pnpm 安装下解析不到；
//   ③ **体积污染**：core 静态依赖 compiler（模板编译），这条反向边让
//      `@lytjs/core/runtime`（不含编译器入口）**依然被打进 52KB 编译器**，
//      实测 98.5 KB gzip vs 断开后 80.2 KB。
//
// ## 做法
//
// 与同目录 `component-init.ts` 的 `setTemplateCompiler` **同一模式**：
//   · `@lytjs/core` 在模块加载时注入 `(component) => createApp(component)`；
//   · renderer 用 `getAppFactory()` 取用，**不再 import core**。
//
// 这样依赖方向恢复为单向（core → renderer），`@lytjs/component` 是两者共同的
// 下层，作为注入缝的落点是自然的（不新增任何依赖边）。

/**
 * App 实例的**最小结构类型**。
 *
 * 刻意只声明 renderer 真正会用到的那一个方法 —— 写全 `App` 的成员会让
 * renderer 的 `.d.ts` 反向依赖 core 的类型（core 构建顺序在 renderer 之后 ⇒ 循环）。
 */
export interface AppLike {
  mount(element: unknown, options?: unknown): unknown;
}

/** 由组件对象创建一个 App 实例（`@lytjs/core` 的 `createApp` 签名子集） */
export type AppFactory = (component: unknown) => AppLike;

let appFactory: AppFactory | null = null;

/**
 * 注入 App 工厂（幂等，可重复调用覆盖）。
 *
 * 正常使用下**不需要手动调用** —— `@lytjs/core` 加载时会自动注入。
 * 传 `null` 可清空（仅供测试）。
 */
export function setAppFactory(factory: AppFactory | null): void {
  appFactory = factory;
}

/** 是否已注入（供 renderer 在降级路径上做判断，避免直接抛错） */
export function hasAppFactory(): boolean {
  return appFactory !== null;
}

/**
 * 取 App 工厂。
 *
 * 未注入时抛**可操作**的错误，而不是像以前那样「动态 import 一个没声明的包」：
 * 后者在严格安装下是 `ERR_MODULE_NOT_FOUND`，在宽松安装下会把整包体积拖大。
 */
export function getAppFactory(): AppFactory {
  if (!appFactory) {
    throw new Error(
      '[LytJS] 尚未注入 App 工厂：`hydrateApp` / `hydrateVisible` / `safeHydrate` 需要一个 App 实例。\n' +
        "修法：在应用入口 `import { createApp } from '@lytjs/core'` —— 加载时会自动注入；\n" +
        "或显式 `import { setAppFactory } from '@lytjs/component'` 后调用 `setAppFactory(fn)`。",
    );
  }
  return appFactory;
}
