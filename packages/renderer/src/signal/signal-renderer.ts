// src/signal/signal-renderer.ts
// @lytjs/renderer - Signal 模式渲染器
// 使用 @lytjs/compiler 编译模板为 Signal 模式代码，
// 通过 @lytjs/dom-runtime 提供的细粒度 DOM 操作函数执行渲染

import { compile } from '@lytjs/compiler';
import { effect } from '@lytjs/reactivity';
import {
  insert,
  remove,
  runCleanups,
  onCleanup,
  createTemplate,
  setText,
  setHTML,
  setAttribute,
  setProperty,
  setStyle,
  setClass,
  createEventHandler,
  reconcileArray,
  bindEffect,
} from '@lytjs/dom-runtime';

// ============================================================
// SignalRenderer 接口
// ============================================================

export interface SignalRenderer {
  /** 将模板渲染到指定的容器元素或 CSS 选择器 */
  render(container: Element | string): void;
  /** 卸载渲染器，清理所有 effect 和 DOM */
  unmount(): void;
}

// ============================================================
// createSignalRenderer 工厂函数
// ============================================================

/**
 * 创建一个 Signal 模式的渲染器
 *
 * @param template - 模板字符串
 * @param context - 模板上下文（响应式数据）
 * @returns SignalRenderer 实例
 *
 * @example
 * ```ts
 * const { ref } = require('@lytjs/reactivity');
 * const { createSignalRenderer } = require('@lytjs/renderer');
 *
 * const ctx = { message: ref('hello') };
 * const renderer = createSignalRenderer('<div>{{ message }}</div>', ctx);
 * renderer.render('#app');
 * ```
 */
export function createSignalRenderer(
  template: string,
  context: Record<string, unknown>,
): SignalRenderer {
  let cleanup: (() => void) | null = null;

  // 编译模板为 Signal 模式（缓存编译结果，避免每次 render 重新编译）
  let code: string;
  let renderBody: string | null;
  try {
    const compileResult = compile(template, { rendererMode: 'signal' });
    code = compileResult.code;

    // 从编译结果中提取 render 函数体
    // codegen-signal 生成的代码结构：
    //   import { effect, reconcileArray } from '@lytjs/reactivity';
    //   import { createTemplate, ... } from '@lytjs/dom-runtime';
    //   export function render(_ctx, _container) { ... }
    //   return () => { runCleanups(); };
    //
    // 我们需要提取 render 函数体，并通过 new Function 执行
    renderBody = extractRenderBody(code);
    if (!renderBody) {
      throw new Error(
        `[LytJS] SignalRenderer: failed to extract render function from compiled code.`,
      );
    }
  } catch (e) {
    throw e instanceof Error
      ? new Error(`[LytJS] SignalRenderer: template compilation failed. ${e.message}`)
      : new Error(`[LytJS] SignalRenderer: template compilation failed. ${String(e)}`);
  }

  return {
    render(container: Element | string) {
      // 卸载旧的渲染
      if (cleanup) {
        cleanup();
        cleanup = null;
      }

      // FIX: P2-32 移除非空断言，添加 null 检查
      const el =
        typeof container === 'string'
          ? document.querySelector(container)
          : container;

      if (!el) {
        throw new Error(
          `[LytJS] SignalRenderer: cannot find element matching "${container}".`,
        );
      }

      try {
        // FIX: P1-15 添加安全警告注释
        // 注意：此处使用 new Function() 执行编译后的模板代码。
        // 虽然模板代码由编译器生成（而非用户直接输入），但仍存在潜在的安全风险。
        // 建议在生产环境中使用预编译（AOT compilation）替代运行时编译。
        // [P2-batch2-3] 已确认安全风险并记录。当前实现依赖编译器可信输入，
        // 后续版本应考虑使用 AOT 编译或沙箱执行环境来消除此风险。
        // 创建渲染函数，传入所有 dom-runtime 和 reactivity 的函数作为参数
        // 参数名必须与 codegen-signal.ts 生成的 import 名称一致
        const renderFn = new Function(
          'effect',
          'reconcileArray',
          'createTemplate',
          'setText',
          'setHTML',
          'setAttribute',
          'setProperty',
          'setStyle',
          'setClass',
          'insert',
          'remove',
          'createEventHandler',
          'bindEffect',
          'onCleanup',
          'runCleanups',
          '_ctx',
          '_container',
          renderBody,
        );

        // 执行渲染函数
        const cleanupFn = renderFn(
          effect,
          reconcileArray,
          createTemplate,
          setText,
          setHTML,
          setAttribute,
          setProperty,
          setStyle,
          setClass,
          insert,
          remove,
          createEventHandler,
          bindEffect,
          onCleanup,
          runCleanups,
          context,
          el,
        );

        // 保存清理函数
        if (typeof cleanupFn === 'function') {
          cleanup = cleanupFn;
        }
      } catch (e) {
        throw e instanceof Error
          ? new Error(`[LytJS] SignalRenderer: render execution failed. ${e.message}`)
          : new Error(`[LytJS] SignalRenderer: render execution failed. ${String(e)}`);
      }
    },

    unmount() {
      if (cleanup) {
        cleanup();
        cleanup = null;
      }
    },
  };
}

// ============================================================
// 辅助函数：从编译代码中提取 render 函数体
// ============================================================

/**
 * 从 codegen-signal 生成的代码中提取 render 函数体
 *
 * 生成的代码结构：
 * ```
 * import { effect, reconcileArray } from '@lytjs/reactivity';
 * import { createTemplate, ... } from '@lytjs/dom-runtime';
 *
 * export function render(_ctx, _container) {
 *   ...
 *   return () => { runCleanups(); };
 * }
 * ```
 *
 * 我们需要提取函数体（花括号内的内容），去掉 import 语句和函数声明
 *
 * FIX: P2-33 边界情况说明：
 * - 本函数假设输入代码是由 codegen-signal 生成的标准格式
 * - 不支持嵌套函数声明或复杂的花括号嵌套（如对象字面量中的方法）
 * - 字符串和注释中的花括号会被正确跳过
 * - 如果代码结构不符合预期，可能返回 null 或不完整的结果
 */
function extractRenderBody(code: string): string | null {
  // 匹配 render 函数体
  // 查找 "export function render(_ctx, _container) {" 和对应的闭合 "}"
  const funcMatch = code.match(
    /export\s+function\s+render\s*\(\s*_ctx\s*,\s*_container\s*\)\s*\{/,
  );

  if (!funcMatch) {
    return null;
  }

  const startIndex = funcMatch.index! + funcMatch[0]!.length;

  // 找到匹配的闭合花括号，跳过字符串和注释中的花括号
  let depth = 1;
  let i = startIndex;
  while (i < code.length && depth > 0) {
    const ch = code[i]!;

    // 跳过单引号字符串
    if (ch === "'") {
      i++;
      while (i < code.length && code[i] !== "'") {
        if (code[i] === '\\') i++; // 跳过转义字符
        i++;
      }
      i++;
      continue;
    }

    // 跳过双引号字符串
    if (ch === '"') {
      i++;
      while (i < code.length && code[i] !== '"') {
        if (code[i] === '\\') i++; // 跳过转义字符
        i++;
      }
      i++;
      continue;
    }

    // 跳过模板字符串
    if (ch === '`') {
      i++;
      while (i < code.length && code[i] !== '`') {
        if (code[i] === '\\') i++; // 跳过转义字符
        if (code[i] === '$' && code[i + 1] === '{') {
          // FIX: P0-8 模板字符串中的 ${} 表达式，使用子循环跳过，
          // 不修改外层 depth，避免 depth 泄漏导致提前闭合
          i += 2;
          let exprDepth = 1;
          while (i < code.length && exprDepth > 0) {
            // 跳过表达式内的字符串
            if (code[i] === "'") {
              i++;
              while (i < code.length && code[i] !== "'") {
                if (code[i] === '\\') i++;
                i++;
              }
              i++;
              continue;
            }
            if (code[i] === '"') {
              i++;
              while (i < code.length && code[i] !== '"') {
                if (code[i] === '\\') i++;
                i++;
              }
              i++;
              continue;
            }
            if (code[i] === '`') {
              i++;
              while (i < code.length && code[i] !== '`') {
                if (code[i] === '\\') i++;
                i++;
              }
              i++;
              continue;
            }
            if (code[i] === '{') exprDepth++;
            if (code[i] === '}') exprDepth--;
            i++;
          }
          continue;
        }
        i++;
      }
      i++;
      continue;
    }

    // 跳过单行注释
    if (ch === '/' && code[i + 1] === '/') {
      i += 2;
      while (i < code.length && code[i] !== '\n') {
        i++;
      }
      i++;
      continue;
    }

    // 跳过多行注释
    if (ch === '/' && code[i + 1] === '*') {
      i += 2;
      while (i < code.length && !(code[i] === '*' && code[i + 1] === '/')) {
        i++;
      }
      i += 2;
      continue;
    }

    if (ch === '{') {
      depth++;
    } else if (ch === '}') {
      depth--;
    }
    i++;
  }

  if (depth !== 0) {
    return null;
  }

  // 提取函数体内容
  const body = code.substring(startIndex, i - 1).trim();
  return body;
}
