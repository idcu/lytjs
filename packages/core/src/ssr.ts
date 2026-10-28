// src/ssr.ts
// @lytjs/core —— 服务端渲染入口（**含模板编译器注入**）
//
// ## 为什么这个文件存在
//
// 2026-10-28 实测：`renderToString`（来自 `@lytjs/renderer`）对**用模板写的组件**
// 一律输出空串，且没有任何告警：
//
// ```
// { setup(){ return { msg: ref('hi') } }, render: … }   → <div id="app"><span>hi</span></div>
// { setup(){ return { msg: ref('hi') } }, template: … } → ""
// ```
//
// 根因不是「SSR 不支持模板」这个设计选择，而是 **renderer 侧的组件解析器
// （`resolveFromSetupResult`）只认 `render`，从不看 `template`** ——
// 而客户端的 `finishComponentSetup` 是认的。同一个组件对象，客户端能渲染、
// 服务端渲染成空，这是**不对称**，不是取舍。
//
// ## 修法为什么放在 core 而不是 renderer
//
// 「模板 → 渲染函数」需要一个编译器。`@lytjs/compiler` 有 52 KB，**不能**被
// renderer 静态依赖（那是 P1-N 花一整批修掉的问题：任何用 renderer 的产物都被
// 强制打上编译器）。本仓已有的解法是**注入缝**：`@lytjs/component` 持有
// `setTemplateCompiler` / `getTemplateCompiler`，`@lytjs/core` 在首次 `createApp`
// 时注入。
//
// 于是这里做同一件事：**`@lytjs/core` 的 `renderToString` 先确保注入，再转发**。
//   · renderer 侧：只用注入缝，零编译器依赖（未注入时给**可操作的**告警）
//   · core 侧：本来就含编译器，注入是零成本
//
// ## 为什么不放进 `@lytjs/core/runtime`
//
// `runtime` 入口的全部意义就是**不含编译器**（实测最小 app 差 52 KB）。
// 若把本模块从 `runtime.ts` 转出，`./template-compiler` 会被静态拉进 runtime 的图，
// 该入口立刻失去存在意义。需要 SSR 的用户从 `@lytjs/core` 导入即可。

import { getTemplateCompiler, setTemplateCompiler } from '@lytjs/component';
import { compileTemplateToRender } from './template-compiler';
import type { VNode } from '@lytjs/vdom';

/**
 * 确保模板编译器已注入（幂等）。
 *
 * 用 `getTemplateCompiler()` 判空而不是模块级布尔标记：测试里会显式
 * `setTemplateCompiler(null)` 来验证「未注入」的告警路径，用布尔标记会让
 * 之后的调用**永远不再注入**（假绿）。
 */
function ensureTemplateCompiler(): void {
  if (!getTemplateCompiler()) {
    setTemplateCompiler(compileTemplateToRender);
  }
}

/** `renderToString` 的入参（与 `@lytjs/renderer` 的同名类型一致） */
export interface CoreRenderToStringInput {
  vnode: VNode;
  /** 是否给每个元素写 `data-hydrate="lyt-hydrate-N"` 标记（选择性水合需要） */
  hydrateMarkers?: boolean;
}

/**
 * 把 vnode 渲染为 HTML 字符串（**支持用 `template` 写的组件**）。
 *
 * 与 `@lytjs/renderer` 的 `renderToString` 的唯一差别：本函数会先注入模板编译器。
 * 因此：
 *   · `import { renderToString } from '@lytjs/core'` → 模板组件正常渲染
 *   · `import { renderToString } from '@lytjs/renderer'` → 模板组件得到**明确告警** + 空输出
 *     （不是静默空白；想自己控制注入时机就用这条）
 */
export async function renderToString(input: CoreRenderToStringInput): Promise<string> {
  ensureTemplateCompiler();
  // 动态导入：`@lytjs/renderer` 是 core 的下层，静态导入会把 renderer 的整个
  // barrel（含 signal/vapor 相关代码）拉进「只用 createApp」的产物里。
  const { renderToString: render } = await import('@lytjs/renderer');
  return render(input);
}

/**
 * 流式 SSR（同样确保编译器已注入）。
 *
 * 单独给一个导出而不是让用户自己注入：流式入口的组件解析走的是**同一段**
 * `resolveFromSetupResult`，同样受「只认 render」影响。
 */
export async function renderToStream(
  input: { vnode: VNode },
  options?: { commentMarkers?: boolean },
): Promise<ReadableStream> {
  ensureTemplateCompiler();
  const { renderToStream: render } = await import('@lytjs/renderer');
  return render(input as never, options as never);
}
