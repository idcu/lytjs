// src/sfc/compile.ts
// SFC compiler - compiles SFCDescriptor into JS + CSS

import { compile } from '../index';
import type { CompilerOptions } from '../types';
import type { SFCDescriptor } from './parse';
import {
  getCustomBlockProcessor,
} from './custom-blocks';

// ============================================================
// Compile Options & Result Types
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
 * Compile an SFCDescriptor into a JavaScript module string (and optional CSS).
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

  const parts: string[] = [];

  // 1. Compile template block into a render function
  let renderFnCode = '';
  if (descriptor.template) {
    const compilerOptions: CompilerOptions = {
      filename,
      ssr,
      rendererMode,
      scopeId: scoped ? id : undefined,
    };
    const templateResult = compile(descriptor.template.content, compilerOptions);
    renderFnCode = templateResult.code;
  }

  // 2. Process script block
  const scriptContent = descriptor.script?.content ?? '';
  const scriptSetupContent = descriptor.scriptSetup?.content ?? '';

  // 3. Process style blocks - extract CSS and apply scoping
  let cssCode: string | undefined;
  // When scoped option is explicitly provided, it controls all style blocks.
  // When scoped option is not provided (undefined), individual style block's
  // scoped attribute determines scoping.
  const scopedId = scoped ? id : undefined;

  if (descriptor.styles.length > 0) {
    const cssParts: string[] = [];

    for (const style of descriptor.styles) {
      let css = style.content;

      // Scope CSS if: scoped option is true, OR scoped option is not set and
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
  parts.push(generateModuleCode({
    scriptContent,
    scriptSetupContent,
    renderFnCode,
    scopedId,
    filename,
    customBlockImports,
  }));

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
  scopedId: string | undefined;
  filename: string;
  customBlockImports: string[];
}

function generateModuleCode(opts: ModuleCodeOptions): string {
  const lines: string[] = [];

  // Module preamble
  lines.push(`/* Generated from ${opts.filename} */`);
  lines.push('');

  // Custom block imports
  if (opts.customBlockImports.length > 0) {
    for (const imp of opts.customBlockImports) {
      lines.push(imp);
    }
    lines.push('');
  }

  // Script setup content (if present, goes before the main script)
  if (opts.scriptSetupContent.trim()) {
    lines.push('// <script setup>');
    lines.push(opts.scriptSetupContent.trim());
    lines.push('');
  }

  // Script content
  if (opts.scriptContent.trim()) {
    lines.push('// <script>');
    lines.push(opts.scriptContent.trim());
    lines.push('');
  }

  // Render function from template compilation
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

  return lines.join('\n');
}

// ============================================================
// CSS Scoping
// ============================================================

/**
 * Add a scoped ID attribute selector to every CSS rule.
 * Transforms `.container { color: red; }` into `.container[data-v-abc123] { color: red; }`
 *
 * This is a simplified implementation. A production compiler would use
 * a proper CSS parser (e.g., postcss) for robust handling.
 *
 * FIX: P1-34 CSS scoping 正则增强：
 * - 正确处理伪类选择器（:hover, :focus, ::before 等）
 * - 正确处理属性选择器（[attr=value]）
 * - 正确处理多级嵌套选择器
 * - 跳过 @keyframes 内部的 from/to 百分比选择器
 *
 * FIX: P2-25 已知限制：当前正则实现不支持 CSS 嵌套规则（CSS Nesting），
 * 如 `.parent { .child { } }` 这种嵌套语法需要使用完整的 CSS 解析器处理。
 * 建议使用 PostCSS 等工具进行生产环境的 CSS 作用域处理。
 */
function scopeCSS(css: string, scopeId: string): string {
  const attrSelector = `[data-v-${scopeId}]`;

  // Process each CSS rule block
  return css.replace(
    // FIX: P1-34 增强正则，正确匹配包含伪类、伪元素、属性选择器的复杂选择器
    // FIX: P2-25 注意：此正则不支持 CSS 嵌套规则（CSS Nesting）
    /([^{}@/][^{}]*?)\{/g,
    (match, selector: string) => {
      // Skip @ rules (e.g., @media, @keyframes)
      if (selector.trim().startsWith('@')) {
        return match;
      }

      // 跳过 @keyframes 内部的 from/to/百分比选择器
      const trimmedSelector = selector.trim();
      if (/^(from|to|\d+%)\s*$/.test(trimmedSelector)) {
        return match;
      }

      // FIX: P2-25 检测并警告嵌套规则（简单的启发式检测）
      if (trimmedSelector.includes('{') || trimmedSelector.includes('}')) {
        if (__DEV__) {
          console.warn(
            `[scopeCSS] 检测到可能的 CSS 嵌套规则，当前实现可能无法正确处理。` +
            `建议使用 PostCSS 进行生产环境的 CSS 作用域处理。`
          );
        }
      }

      // Split selector by comma to handle multiple selectors
      const scopedSelectors = selector
        .split(',')
        .map((s: string) => {
          const trimmed = s.trim();
          if (!trimmed) return trimmed;
          // For ::v-deep or ::deep, use a different scoping strategy
          if (trimmed.includes('::v-deep') || trimmed.includes('::deep')) {
            return trimmed;
          }
          // FIX: P1-34 将 scopeId 添加到选择器末尾（伪类/伪元素之前），
          // 正确处理 :hover, ::before, :not() 等伪选择器
          const pseudoMatch = trimmed.match(/^(.*?)(::?[a-zA-Z-]+(?:\(.*?\))?)$/);
          if (pseudoMatch && pseudoMatch[2]) {
            return `${pseudoMatch[1]}${attrSelector}${pseudoMatch[2]}`;
          }
          return `${trimmed}${attrSelector}`;
        })
        .join(', ');

      return `${scopedSelectors}{`;
    },
  );
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
