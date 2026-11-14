// src/sfc/compile.ts
// SFC compiler - compiles SFCDescriptor into JS + CSS

import { compile } from '../index';
import type { CompilerOptions } from '../types';
import type { SFCDescriptor } from './parse';
import { getCustomBlockProcessor } from './custom-blocks';
import { compileScriptSetup } from './script-setup';

// ============================================================
// 编译选项和结果类型
// ============================================================

export interface SFCCompileOptions {
  id?: string;
  filename?: string;
  scoped?: boolean;
  ssr?: boolean;
  rendererMode?: 'vnode' | 'signal' | 'vapor';
}

export interface SFCCompileResult {
  code: string;
  css?: string;
  scopedId?: string;
  sourceMap?: object;
  // FIX: P2-30 模块热替换稳定性：添加 HMR 相关元数据
  /** 模块热替换 ID */
  hmrId?: string;
  /** 是否为 HMR 增量更新 */
  isHmrUpdate?: boolean;
}

// ============================================================
// compileSFC
// ============================================================

/**
 * 将 SFCDescriptor 编译为 JavaScript 模块字符串（和可选的 CSS）。
 *
 * @param descriptor - The parsed SFC descriptor
 * @param options - Compilation options
 * @returns SFCCompileResult with JS code and optional CSS
 */
export function compileSFC(
  descriptor: SFCDescriptor,
  options: SFCCompileOptions = {},
): SFCCompileResult {
  const {
    id = generateScopeId(descriptor.filename),
    filename = descriptor.filename,
    scoped,
    ssr = false,
    rendererMode = 'vnode',
  } = options;

  // ⚠️ 2026-10-10 订正（P1-8）：scopedId 此前写死为 `scoped ? id : undefined`，
  // 而下方 `shouldScope` 的判定**还有第二支**——「未显式传 scoped 且 style 块自带
  // `scoped` 属性」。该支下 `scopeCSS(css, undefined)` 产出 `[data-v-undefined]`：
  // **所有未显式传 scoped 的组件共用同一个 scope 属性** ⇒ `<style scoped>` 的
  // 隔离完全失效（样式跨组件泄漏），且 `result.scopedId` 也永远拿不到值。
  // 现按与 shouldScope 完全相同的条件计算，并让 template 的 `scopeId` 与之同源。
  const scopedId =
    scoped === true || (scoped === undefined && descriptor.styles.some((s) => s.scoped))
      ? id
      : undefined;

  const parts: string[] = [];

  // 1. 编译 template block into a render function
  let renderFnCode = '';
  // ⚠️ 2026-10-27 修（P0）：`compile()` 把 helper 的 import 放在 `preamble` 里，
  // 而这里此前**只取 `result.code`** ⇒ 产物里的 `openBlock` / `createBlock` /
  // `toDisplayString` 全部没有来源，消费方一执行就 `ReferenceError`。
  let renderPreamble = '';
  if (descriptor.template) {
    const compilerOptions: CompilerOptions = {
      filename,
      ssr,
      // ⚠️ 2026-10-10 订正（P1-8）：`compile()` 选择 SSR 通路读的是 **`ssrMode`**，
      // 不是 `ssr` —— 后者是 transform / codegen 的子开关，且在 `compile()` 内被
      // `ssr: ssrMode ?? false` **覆盖为 false**。此前只传 `ssr` ⇒
      // `compileSFC(d, { ssr: true })` 的产物与 `ssr: false` **逐字节相同**
      // （探针实测），即该选项是个死开关。现同时传 `ssrMode`。
      ssrMode: ssr,
      rendererMode,
      scopeId: scopedId ?? null,
    };
    const templateResult = compile(descriptor.template.content, compilerOptions);
    renderFnCode = templateResult.code;
    renderPreamble = templateResult.preamble ?? '';
  }

  // 2. Process script block
  const scriptContent = descriptor.script?.content ?? '';
  const scriptSetupContent = descriptor.scriptSetup?.content ?? '';

  // 3. Process style blocks - extract CSS and apply scoping
  let cssCode: string | undefined;
  // 当显式提供 scoped 选项时，它控制所有 style 块。
  // 当未提供 scoped 选项（undefined）时，各个 style 块的
  // scoped attribute determines scoping.
  // 注：scopedId 已在函数开头按同一条件算好（见那里的订正说明）。

  if (descriptor.styles.length > 0) {
    const cssParts: string[] = [];

    for (const style of descriptor.styles) {
      let css = style.content;

      // 作用域 CSS 条件：scoped 选项为 true，或 scoped 选项未设置且
      // the individual style block has the scoped attribute
      const shouldScope = scoped === true || (scoped === undefined && style.scoped);
      if (shouldScope) {
        css = scopeCSS(css, scopedId!);
      }

      if (css.trim()) {
        cssParts.push(css);
      }
    }

    if (cssParts.length > 0) {
      cssCode = cssParts.join('\n\n');
    }
  }

  // 4. Process custom blocks
  const customBlockImports: string[] = [];
  for (const block of descriptor.customBlocks) {
    const processor = getCustomBlockProcessor(block.type);
    if (processor) {
      const result = processor.transform(block.content, block.attrs);
      customBlockImports.push(result.code);
    }
  }

  // 5. Assemble the final JS module
  parts.push(
    generateModuleCode({
      scriptContent,
      scriptSetupContent,
      renderFnCode,
      renderPreamble,
      scopedId,
      filename,
      customBlockImports,
    }),
  );

  const result: SFCCompileResult = {
    code: parts.join('\n'),
  };

  if (cssCode) {
    result.css = cssCode;
  }

  if (scopedId) {
    result.scopedId = scopedId;
  }

  return result;
}

// ============================================================
// Module Code Generation
// ============================================================

interface ModuleCodeOptions {
  scriptContent: string;
  scriptSetupContent: string;
  renderFnCode: string;
  renderPreamble: string;
  scopedId: string | undefined;
  filename: string;
  customBlockImports: string[];
}

function generateModuleCode(opts: ModuleCodeOptions): string {
  const lines: string[] = [];

  // Module preamble
  lines.push(`/* Generated from ${opts.filename} */`);
  lines.push('');

  // ⚠️ 2026-10-27 修（P0）：先输出 render 函数的 helper import。
  // 缺了它，产物里的 `openBlock` / `createBlock` / `toDisplayString` 全是未定义标识符。
  if (opts.renderPreamble.trim()) {
    lines.push(opts.renderPreamble.trim());
    lines.push('');
  }

  // Custom block imports
  if (opts.customBlockImports.length > 0) {
    for (const imp of opts.customBlockImports) {
      lines.push(imp);
    }
    lines.push('');
  }

  // ============================================================
  // `<script setup>`（2026-11-01 新增）
  // ============================================================
  //
  // 此前 `<script setup>` 的正文被**原样**拼进模块，而模板产物引用的是 `_ctx.msg`。
  // `msg` 只是模块作用域的局部常量 ⇒ `_ctx.msg` 恒为 undefined ⇒ **整页空白且不报错**。
  //
  // 现在把正文改写成 `setup(__props, { emit: __emit })` 的函数体，并 `return` 出所有顶层绑定，
  // 使 `_ctx.xxx` 能解析到（本框架的 ctx 代理会回落到 props / setupState）。
  const hasScriptSetup = opts.scriptSetupContent.trim().length > 0;
  const setupInfo = hasScriptSetup ? compileScriptSetup(opts.scriptSetupContent) : null;

  if (setupInfo && setupInfo.errors.length > 0) {
    // 不产出半成品：把错误直接写进产物，并抛错让构建期暴露
    const msg = setupInfo.errors.map((e) => `  · ${e}`).join('\n');
    throw new Error(`[lytjs/sfc] ${opts.filename} 的 <script setup> 无法编译：\n${msg}`);
  }

  // C-32：顶层 `let`/`var` 会被 return，但**不是响应式的** —— 模板读到的只是 setup
  // 返回时的快照，setup 内再赋值不会触发重渲染。此处不能静默：否则用户会把它当成
  // 渲染缺陷去查。仅当该绑定真的出现在模板里时才告警，避免误伤纯局部变量。
  if (setupInfo) {
    const usedInTemplate = setupInfo.mutableBindings.filter((name) => {
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`\\b_ctx\\.${escaped}\\b`).test(opts.renderFnCode);
    });
    if (usedInTemplate.length > 0) {
      console.warn(
        `[lytjs/sfc] ${opts.filename}：模板引用了顶层可变量 ${usedInTemplate.join('、')}（let/var）。` +
          `它不是响应式的，setup 内对它的赋值不会触发重新渲染；` +
          `请改用 ref()/reactive()（模板会自动解包 .value）。`,
      );
    }
  }

  if (setupInfo) {
    for (const imp of setupInfo.imports) {
      lines.push(imp);
    }
    if (setupInfo.imports.length > 0) lines.push('');
  }

  // Script content（普通 <script>）
  //
  // `export default {...}` 改写成 `const __options__ = {...}`，便于后面合并/挂载 render。
  let componentVar: string | undefined;
  if (opts.scriptContent.trim()) {
    let body = opts.scriptContent.trim();
    if (/export\s+default\s+/.test(body)) {
      body = body.replace(/export\s+default\s+/, 'const __options__ = ');
      componentVar = '__options__';
    }
    lines.push('// <script>');
    lines.push(body);
    lines.push('');
  }

  // 渲染函数 from template compilation
  if (opts.renderFnCode) {
    lines.push('// Template render function');
    lines.push(opts.renderFnCode);
    lines.push('');
  }

  // Scoped ID assignment
  if (opts.scopedId) {
    lines.push(`// Scoped styles`);
    lines.push(`const __scopeId = ${JSON.stringify(opts.scopedId)};`);
    lines.push('');
  }

  // ============================================================
  // 组装并导出
  // ============================================================
  if (setupInfo) {
    // `<script>` 与 `<script setup>` 并存：展开 options 再覆盖 setup / props / emits
    if (componentVar && /\bsetup\s*[:(]/.test(opts.scriptContent)) {
      throw new Error(
        `[lytjs/sfc] ${opts.filename}：<script> 与 <script setup> 都声明了 setup()，无法合并。` +
          `请只保留 <script setup>。`,
      );
    }

    const fields: string[] = [];
    if (componentVar) fields.push('...__options__');
    if (setupInfo.propsDecl) fields.push(`props: ${setupInfo.propsDecl}`);
    if (setupInfo.emitsDecl) fields.push(`emits: ${setupInfo.emitsDecl}`);

    lines.push('// <script setup>');
    lines.push('export default {');
    for (const f of fields) lines.push(`  ${f},`);

    // N12：只有正文用到 defineExpose 才扩展签名，其余产物形态保持不变。
    const setupContext = setupInfo.usesExpose
      ? '{ emit: __emit, expose: __expose }'
      : '{ emit: __emit }';
    lines.push(`  setup(__props, ${setupContext}) {`);
    if (setupInfo.propsDecl) lines.push('    const props = __props;');
    if (setupInfo.emitsDecl) lines.push('    const emit = __emit;');
    if (setupInfo.setupBody) {
      for (const l of setupInfo.setupBody.split('\n')) lines.push(`    ${l}`);
    }
    const ret = setupInfo.bindings.length > 0 ? `{ ${setupInfo.bindings.join(', ')} }` : '{}';
    lines.push(`    return ${ret};`);
    lines.push('  },');

    if (opts.renderFnCode) lines.push('  render,');
    if (opts.scopedId) lines.push('  __scopeId,');
    lines.push('};');
    lines.push('');
    return lines.join('\n');
  }

  // 只有 <script>：沿用原逻辑（挂 render / scopeId 到 __options__）
  if (opts.renderFnCode) {
    if (componentVar) {
      lines.push(`${componentVar}.render = render;`);
      if (opts.scopedId) {
        lines.push(`${componentVar}.__scopeId = __scopeId;`);
      }
      lines.push('export default __options__;');
      lines.push('');
    } else if (!opts.scriptContent.trim()) {
      const fields = ['render'];
      if (opts.scopedId) fields.push('__scopeId');
      lines.push(`export default { ${fields.join(', ')} };`);
      lines.push('');
    } else {
      // 有 script 但没有 `export default`（只写了具名导出）：无法安全挂载，显式说明
      lines.push('// ⚠️ 本 SFC 的 script 块没有 `export default`，render 函数未自动挂载；');
      lines.push('//    请在消费侧手动 `Component.render = render`。');
      lines.push('');
    }
  }

  return lines.join('\n');
}

// ============================================================
// CSS Scoping
// ============================================================

/**
 * Add a scoped ID attribute selector to every CSS rule.
 * Transforms `.container { color: red; }` into `.container[data-v-abc123] { color: red; }`
 *
 * ⚠️ 2026-11-13（C-19）：改为**结构扫描**，不再用 `([^{}@/][^{}]*?)\{` 正则。
 * 旧实现有三类实际错误（已用编译产物复现）：
 *   1. at-rule 前导被当成选择器：`@media (min-width: 600px)` → `@media (min-width: 600px)[data-v-x]`；
 *      `@keyframes fade` → `@keyframes fade[data-v-x]`。
 *   2. 关键帧百分比选择器（`0%, 100%`）被加作用域，且逗号拆分破坏块结构。
 *   3. 逗号拆分不识别括号/引号：`:not(.b, .c)`、`[data-x="a,b"]` 被拦腰截断。
 *   4. 单冒号 `:deep()` 未识别，产物变成 `[data-v-x]:deep(.b)`（无效 CSS）。
 *
 * 现在的做法：按 `{` / `}` / `;` 维护块栈，at-rule 前导与关键帧内容原样输出；
 * 普通规则的选择器列表按**顶层逗号**拆分（尊重 `()`/`[]`/引号），
 * 每条选择器再处理 `:deep()` / `:global()` 后追加作用域属性。
 *
 * 仍不是完整 CSS 解析器（不处理注释内的花括号以外的高级语法），
 * 生产环境仍建议 PostCSS；但上述结构性输入不再被破坏。
 */
function scopeCSS(css: string, scopeId: string): string {
  const attrSelector = `[data-v-${scopeId}]`;
  type Frame = { keyframes: boolean };
  const stack: Frame[] = [];

  let out = '';
  let buffer = '';
  let quote = '';

  const flushText = (): string => {
    const text = buffer;
    buffer = '';
    return text;
  };

  for (let i = 0; i < css.length; i++) {
    const ch = css[i]!;

    // 字符串字面量：原样收集，花括号/分号/逗号不参与结构判断
    if (quote) {
      buffer += ch;
      if (ch === '\\') {
        buffer += css[i + 1] ?? '';
        i++;
      } else if (ch === quote) {
        quote = '';
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      buffer += ch;
      continue;
    }
    // 注释：整段原样收集
    if (ch === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2);
      const stop = end === -1 ? css.length : end + 2;
      buffer += css.slice(i, stop);
      i = stop - 1;
      continue;
    }

    if (ch === '{') {
      const prelude = flushText();
      const trimmed = prelude.trim();
      const parentKeyframes = stack.length > 0 && stack[stack.length - 1]!.keyframes;

      if (trimmed.startsWith('@')) {
        // at-rule 前导（@media / @supports / @keyframes …）原样输出
        out += `${prelude}{`;
        stack.push({ keyframes: /^@(?:-[a-z]+-)?keyframes\b/i.test(trimmed) });
      } else if (parentKeyframes) {
        // 关键帧内部：from / to / 0% / 0%, 100% 原样输出
        out += `${prelude}{`;
        stack.push({ keyframes: false });
      } else {
        out += `${scopeSelectorList(prelude, attrSelector)}{`;
        stack.push({ keyframes: false });
      }
      continue;
    }

    if (ch === '}') {
      out += `${flushText()}}`;
      stack.pop();
      continue;
    }

    // 顶层 at-statement（如 `@import "x";`）原样输出，不并入后续选择器
    if (ch === ';' && stack.length === 0) {
      out += `${flushText()};`;
      continue;
    }

    buffer += ch;
  }

  return out + buffer;
}

/** 按**顶层逗号**拆分选择器列表（尊重 `()` / `[]` / 引号）。 */
function splitSelectorList(selector: string): string[] {
  const parts: string[] = [];
  let current = '';
  let depth = 0;
  let quote = '';

  for (let i = 0; i < selector.length; i++) {
    const ch = selector[i]!;
    if (quote) {
      current += ch;
      if (ch === '\\') {
        current += selector[i + 1] ?? '';
        i++;
      } else if (ch === quote) {
        quote = '';
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
      continue;
    }
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth--;
    if (ch === ',' && depth === 0) {
      parts.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  parts.push(current);
  return parts;
}

/** 给单条选择器追加作用域属性（插在尾部伪类/伪元素之前）。 */
function scopeSingleSelector(selector: string, attrSelector: string): string {
  const trimmed = selector.trim();
  if (!trimmed) return trimmed;

  // :deep(...) / ::v-deep(...)：左侧正常作用域，括号内保持全局
  const deep = findPseudoCall(trimmed, [':deep', '::v-deep', '::deep']);
  if (deep) {
    const left = trimmed.slice(0, deep.start).trim();
    const inner = trimmed.slice(deep.innerStart, deep.innerEnd).trim();
    if (!left) return inner;
    return `${scopeSingleSelector(left, attrSelector)} ${inner}`;
  }

  // :global(...)：内部完全全局
  const global = findPseudoCall(trimmed, [':global', '::v-global']);
  if (global) {
    const left = trimmed.slice(0, global.start).trim();
    const inner = trimmed.slice(global.innerStart, global.innerEnd).trim();
    return left ? `${scopeSingleSelector(left, attrSelector)} ${inner}` : inner;
  }

  // 旧式 `::v-deep` 后代组合符（无括号）：左侧作用域，右侧全局
  const legacy = trimmed.indexOf('::v-deep');
  if (legacy !== -1) {
    const left = trimmed.slice(0, legacy).trim();
    const right = trimmed.slice(legacy + '::v-deep'.length).trim();
    const scopedLeft = left ? `${scopeSingleSelector(left, attrSelector)} ` : '';
    return `${scopedLeft}${right}`.trim();
  }

  // 属性选择器插在尾部伪类/伪元素之前：`.a:hover` → `.a[data-v-x]:hover`
  const pseudoMatch = trimmed.match(/^(.*?)(::?[a-zA-Z-]+(?:\(.*?\))?)$/);
  if (pseudoMatch && pseudoMatch[2] && pseudoMatch[1]) {
    return `${pseudoMatch[1]}${attrSelector}${pseudoMatch[2]}`;
  }
  if (pseudoMatch && pseudoMatch[2] && !pseudoMatch[1]) {
    // 纯伪类选择器（`:hover`）：属性必须在伪类之后才合法
    return `:root${attrSelector}${pseudoMatch[2]}`;
  }
  return `${trimmed}${attrSelector}`;
}

/** 选择器列表整体作用域化（保留逗号分隔）。 */
function scopeSelectorList(prelude: string, attrSelector: string): string {
  const body = prelude.trim();
  if (!body) return prelude;
  return splitSelectorList(body)
    .map((part) => scopeSingleSelector(part, attrSelector))
    .join(', ');
}

/**
 * 在 `:deep(...)` / `:global(...)` 这类伪类函数里找到顶层调用位置。
 * 返回前导结束位置、括号内区间；找不到返回 null。
 */
function findPseudoCall(
  selector: string,
  names: string[],
): { start: number; innerStart: number; innerEnd: number } | null {
  for (const name of names) {
    let index = selector.indexOf(name);
    while (index !== -1) {
      const open = index + name.length;
      if (selector[open] === '(') {
        let depth = 0;
        for (let i = open; i < selector.length; i++) {
          if (selector[i] === '(') depth++;
          else if (selector[i] === ')') {
            depth--;
            if (depth === 0) {
              return { start: index, innerStart: open + 1, innerEnd: i };
            }
          }
        }
      }
      index = selector.indexOf(name, index + 1);
    }
  }
  return null;
}

// ============================================================
// Scope ID Generation
// ============================================================

/**
 * Generate a deterministic scope ID from a filename.
 * Uses a simple hash function for consistency.
 */
function generateScopeId(filename: string): string {
  let hash = 0;
  for (let i = 0; i < filename.length; i++) {
    const char = filename.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  // Convert to unsigned 32-bit hex string, take first 8 chars
  return (hash >>> 0).toString(16).padStart(8, '0').slice(0, 8);
}
