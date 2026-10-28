// src/builtin-components.ts
// 内置组件注册表（供组件实例代理解析 `_ctx.Teleport` 这类写法）
//
// ## 为什么需要它（2026-10-28 修 P0）
//
// 编译器对**组件标签**生成的是 `_ctx.Xxx`（见 codegen 的 genVNodeCall：「组件标签也要
// 前缀化」），而不是 Vue 的 `_resolveComponent("Xxx")`。因此组件实例代理**必须**能
// 按名字解析出组件对象，否则 `_ctx.Xxx` 恒为 `undefined` ⇒ 该 vnode 静默渲染为空。
//
// 代理原本只查两处：局部 `components` → app 级 `components`。
// **内置组件不在任何一处** ⇒ 模板里写 `<Teleport>` / `<Suspense>` / `<Transition>` /
// `<TransitionGroup>` / `<KeepAlive>` **全部静默渲染为空**（不报错、不告警）。
//
// 实测（2026-10-28）：
// ```
// <div id="app"><Teleport to="#tp"><span class="tele">T</span></Teleport></div>
//   → <div id="app"></div>        ← 内容整块消失，target 也没拿到
// ```
// 而 `import { Teleport } from '@lytjs/core'` + `h(Teleport, …)` 一直正常 ——
// 也就是说「内置组件可用」这句话**只在 import 路径上成立，在模板路径上是假的**。
//
// ## 为什么单开一个文件
//
// `component-proxy.ts` 是组件实例的核心，导入 `suspense.ts` / `keep-alive.ts`
// 会形成 `component-proxy → suspense → component → component-proxy` 的环。
// 环本身是安全的（这几个模块顶层只有声明与对象字面量，没有会触碰环另一侧的**调用**），
// 但把它隔离在一个「只有数据、没有逻辑」的文件里，能把环的爆炸半径压到最小：
// 将来若某个内置组件在顶层加了副作用，只需要改这一个文件，而不是核心代理。
//
// ⚠️ 这里刻意用**对象字面量**（而非 getter）：代理的 `get` 在渲染期高频调用，
//   走一层属性读取即可；用 getter 会让每次查找都多一次函数调用。

import { Teleport } from './teleport';
import { Suspense } from './suspense';
import { Transition } from './transition';
import { TransitionGroup } from './transition-group';
import { KeepAlive } from './keep-alive';

/**
 * 内置组件名 → 组件对象。
 *
 * ⚠️ 名字必须与**模板里写的标签名**逐字一致（大小写敏感）：
 *   编译器把 `<Teleport>` 编成 `_ctx.Teleport`，代理就用 `'Teleport'` 去查。
 *   若将来支持 kebab-case（`<keep-alive>`），要在**编译期**归一化，而不是在这里
 *   加别名 —— 别名会让「模板里能写什么」出现第二份真相。
 */
export const BUILTIN_COMPONENTS: Record<string, unknown> = {
  Teleport,
  Suspense,
  Transition,
  TransitionGroup,
  KeepAlive,
};

/** 该名字是否是内置组件（`hasOwn` 而非 `in`，避免命中原型链上的 `constructor` 等） */
export function isBuiltinComponentName(key: string): boolean {
  return Object.prototype.hasOwnProperty.call(BUILTIN_COMPONENTS, key);
}

/** 取内置组件对象（未注册返回 `undefined`） */
export function getBuiltinComponent(key: string): unknown {
  return Object.prototype.hasOwnProperty.call(BUILTIN_COMPONENTS, key)
    ? BUILTIN_COMPONENTS[key]
    : undefined;
}
