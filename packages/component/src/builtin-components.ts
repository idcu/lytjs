// src/builtin-components.ts
// 内置组件实现登记入口
//
// ## 为什么需要它（2026-10-28 修 P0）
//
// 编译器（`mode: 'function'`，即运行时字符串模板）对**组件标签**生成的是
// `_ctx.Xxx`（见 codegen 的 genVNodeCall：「组件标签也要前缀化」），而不是 Vue 的
// `_resolveComponent("Xxx")`。因此组件实例代理**必须**能按名字解析出组件对象，
// 否则 `_ctx.Xxx` 恒为 `undefined` ⇒ 该 vnode 静默渲染为空。
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
// `component-proxy` 只依赖它。
//
// ## 为什么不再在模块加载时自动注册（2026-11-07，ADR 0022 / 方案 B2）
//
// `component/package.json` 声明 `"sideEffects": false`。入口里的**裸副作用 import**
// 会被 tsup/esbuild 按声明丢弃 —— 实测 dist 中 `registerBuiltin` 出现 **0 次**，
// 于是模板路径静默失效。只把声明改成保留副作用则五入口 +5.7~6.8 KB、
// `minimal-app` 突破 A15 硬上限（99,673 > 95,948），故否决。
//
// B2 口径：
// - **编译期模板**：codegen 检测到内置标签后直接 `import { X } from '@lytjs/component'`，
//   产物引用裸标识符 ⇒ 零配置即用、且只带入实际用到的实现；
// - **运行时字符串模板**（`template` 字符串）：产物走 `_ctx.X`，由使用方显式调用一次
//   `registerBuiltinComponents()`；未注册时 `component-proxy` 会给出 DEV 告警
//   （不会静默渲染为空）。

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

let registered = false;

/**
 * 把内置组件登记进运行期查找表（幂等）。
 *
 * 运行时字符串模板（`{ template: '<Teleport …>' }`）需要使用一次；
 * 编译期模板（AOT / `compile` 产物）由 codegen 直接 import，无需调用。
 *
 * 从 `@lytjs/component` 导入；`@lytjs/core` 已透传同名函数。
 */
export function registerBuiltinComponents(): void {
  if (registered) return;
  for (const [name, component] of Object.entries(BUILTIN_COMPONENTS)) {
    registerBuiltin(name, component);
  }
  registered = true;
}

export {
  isBuiltinComponentName,
  getBuiltinComponent,
  BUILTIN_COMPONENT_NAMES,
} from './builtin-registry';
