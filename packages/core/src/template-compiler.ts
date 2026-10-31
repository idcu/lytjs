/**
 * src/template-compiler.ts
 * @lytjs/core —— 运行时模板编译（把 `template` 字符串变成渲染函数）
 *
 * ## 背景（2026-09-26 修复的 P0）
 *
 * 此前 `createApp({ setup, template })` 会**静默渲染空白**：
 * `finishComponentSetup` 的「设置渲染函数」一步只认 `options.render`，
 * 全仓也没有任何 VNode 路径调用 `compile()` —— `template` 被彻底忽略。
 * 而 README 的「快速开始」第一个示例恰恰用的是 `template`。
 *
 * 本模块补上这条链路，形态与 signal 模式（`signal-renderer.ts`）一致：
 *   ① `compile(template)` → 产物（`import` 来自 preamble/内联两处，需都剥掉）
 *   ② 把 helper 作为参数注入 `new Function`，返回 `render`
 * 差别在于 VNode 产物是 `function render(_ctx, _cache) { return (openBlock(), createBlock(...)) }`，
 * 因此注入的是 vdom 侧的 helper（见 `./runtime-helpers`）。
 *
 * ## 安全说明
 * 与 signal 模式同样的取舍：`new Function` 执行的是**编译器生成的**代码，
 * 而非用户直接输入；生产环境建议走 AOT 预编译（这也是 Vue 的分包策略）。
 */

import { compile, clearCompileCache } from '@lytjs/compiler';
import * as RUNTIME_HELPERS from './runtime-helpers';

/** 编译产物里的渲染函数签名（`_ctx` 为组件公共实例代理） */
type CompiledRenderFn = (ctx: unknown, cache: unknown) => unknown;

/** 编译缓存：同一 template 字符串只编译一次（避免每次挂载都重新编译） */
const renderCache = new Map<string, CompiledRenderFn>();

/** 从编译产物中剥掉全部 `import ... from '...'` 语句（helper 走参数注入） */
function stripImports(code: string): string {
  return code
    .replace(/^[ \t]*import\s*\{[^}]*\}\s*from\s*['"][^'"]+['"];?[ \t]*$/gm, '')
    .replace(/^[ \t]*import\s+[^;]+;?[ \t]*$/gm, '');
}

/**
 * 把模板字符串编译为可直接挂到组件实例上的渲染函数。
 *
 * @param template 模板字符串
 * @param options  额外编译选项（如 `filename`）
 * @throws 当产物里没有渲染函数，或执行产物时抛错（错误信息会带上模板片段便于定位）
 */
export function compileTemplateToRender(
  template: string,
  options: { filename?: string } = {},
): CompiledRenderFn {
  const cached = renderCache.get(template);
  if (cached) return cached;

  clearCompileCache();
  const result = compile(template, { mode: 'module', filename: options.filename });

  // ⚠️ import 可能出现在两个位置：vnode 模式的 preamble、signal 模式的内联 code。
  // 只剥其中一处会漏（这正是契约守卫第一版的 bug），故两处都处理。
  const body = stripImports(result.preamble ?? '') + stripImports(result.code);

  if (!/\bfunction\s+render\s*\(/.test(body)) {
    throw new Error(
      `[LytJS] compileTemplateToRender: 编译产物里没有 render 函数。\n模板片段：${template.slice(0, 120)}`,
    );
  }

  const names = Object.keys(RUNTIME_HELPERS).filter((n) => n !== '__DEV__');
  let factory: (...args: unknown[]) => CompiledRenderFn;
  try {
    // ⚠️ 2026-10-31 修（P0）：产物里可能引用 `__DEV__`（`v-html` 的 XSS 警告分支，
    //   见 compiler/src/transforms/transform-element.ts 的 createConditionalExpression），
    //   而 `__DEV__` 是**构建期常量**：本包 dist 由 tsup `define:{__DEV__:'false'}`
    //   压成字面量，`new Function` 的作用域里却**没有**它 ⇒ 运行期
    //   `ReferenceError: __DEV__ is not defined`，整个应用挂载失败。
    //   修法：把本模块的 `__DEV__`（构建期已替换）作为**最后一个参数**注入产物，
    //   与包内其它代码同源（dist=false / vitest=true），不需要宿主再配 define。

    factory = new Function(...names, '__DEV__', `${body}\nreturn render;`) as typeof factory;
  } catch (e) {
    throw new Error(
      `[LytJS] compileTemplateToRender: 产物语法错误：${(e as Error).message}\n` +
        `模板片段：${template.slice(0, 120)}`,
    );
  }

  let render: CompiledRenderFn;
  try {
    render = factory(...names.map((n) => (RUNTIME_HELPERS as Record<string, unknown>)[n]), __DEV__);
  } catch (e) {
    throw new Error(
      `[LytJS] compileTemplateToRender: 执行产物失败：${(e as Error).message}\n` +
        `模板片段：${template.slice(0, 120)}`,
    );
  }

  renderCache.set(template, render);
  return render;
}

/** 清空模板编译缓存（测试/热更新用） */
export function clearTemplateRenderCache(): void {
  renderCache.clear();
}
