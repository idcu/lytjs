/**
 * src/runtime-helpers.ts
 * @lytjs/core —— **模板编译产物的运行时 helper 聚合**
 *
 * ## 为什么单独成文件
 *
 * 编译器产物的 import 契约是「默认从 `@lytjs/core` 取这些名字」
 * （见 compiler 的 `genHelperImports`，默认 `runtimeModuleName = '@lytjs/core'`）。
 * 执行产物时不能靠 ESM import，而是把 helper 作为参数注入 `new Function`
 * （与 signal 模式的两段式工厂同理）—— 注入对象必须**恰好覆盖**产物会用到的名字。
 *
 * 若注入对象与 `index.ts` 的导出面是**两份手写清单**，就会出现
 * 「守卫看着绿、执行时某个 helper 是 undefined」的落差。
 * 因此这里作为**单一真相源**：
 *   - `index.ts` 从本文件 re-export（对外契约面）
 *   - `template-compiler.ts` 用 `import * as` 取命名空间（注入对象）
 * 两者同源，不可能漂移。
 *
 * ⚠️ 维护约定：`compiler/src/constants.ts` 的 `helperNameMap` 新增条目时，
 * 必须在此处补上对应实现/转出，否则 `scripts/check-runtime-contract.ts` 会 FAIL。
 */

// —— VNode 原语与 Block Tree（@lytjs/vdom）——
export {
  createVNode,
  createTextVNode,
  createCommentVNode,
  createStaticVNode,
  createElementVNode,
  Fragment,
  Text,
  Comment,
  cloneVNode,
  mergeProps,
  createBlock,
  openBlock,
  closeBlock,
  setBlockTracking,
  trackDynamicChild,
  getCurrentBlock,
  getBlockStackDepth,
  resetBlockStack,
  // 渲染期 helper（2026-09-26 补齐，此前运行期完全缺失）
  toDisplayString,
  renderList,
  createSlots,
  withCtx,
  normalizeProps,
  guardReactiveProps,
  toHandlerKey,
} from '@lytjs/vdom';
export type { Block } from '@lytjs/vdom';

// —— DOM 侧 helper（@lytjs/dom-runtime）——
// class / style 归一化（:class / :style）与 HTML 消毒（v-html）
export { normalizeClass, normalizeStyle, sanitizeHTML } from '@lytjs/dom-runtime';

// —— 插槽渲染（@lytjs/component）——
export { renderSlot } from '@lytjs/component';
