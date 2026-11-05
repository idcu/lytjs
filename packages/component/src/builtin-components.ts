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
// ## 为什么查表函数搬到了 builtin-registry.ts
//
// 本文件要 import 五个实现，而实现（尤其 keep-alive）会回到 component 核心，
// 于是 `component-proxy` 直接 import 本文件会形成源码级循环依赖。
// 查表函数与注册表已下沉到 `builtin-registry.ts`（叶子模块），
// `component-proxy` 只依赖它；本文件在加载时把实现注册进去。

import { Teleport } from './teleport';
import { Suspense } from './suspense';
import { Transition } from './transition';
import { TransitionGroup } from './transition-group';
import { KeepAlive } from './keep-alive';
import { registerBuiltin } from './builtin-registry';

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

// 注册到叶子表：`BUILTIN_COMPONENTS` 仍是唯一真相，注册只是把同一份数据交给查表模块。
for (const [name, component] of Object.entries(BUILTIN_COMPONENTS)) {
  registerBuiltin(name, component);
}

export { isBuiltinComponentName, getBuiltinComponent } from './builtin-registry';
