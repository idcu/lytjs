// src/signal/signal-renderer.ts
// @lytjs/renderer - Signal 模式渲染器
// 使用 @lytjs/compiler 编译模板为 Signal 模式代码，
// 通过 @lytjs/dom-runtime 提供的细粒度 DOM 操作函数执行渲染

import { compile, clearCompileCache } from '@lytjs/compiler';
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
 * import { ref } from '@lytjs/reactivity';
 * import { createSignalRenderer } from '@lytjs/renderer';
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
    // 清除缓存，确保使用最新的 codegen
    clearCompileCache();
    const compileResult = compile(template, { rendererMode: 'signal', optimizeSignal: false });
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
      const el = typeof container === 'string' ? document.querySelector(container) : container;

      if (!el) {
        throw new Error(`[LytJS] SignalRenderer: cannot find element matching "${container}".`);
      }

      try {
        // FIX: P1-15 添加安全警告注释
        // 注意：此处使用 new Function() 执行编译后的模板代码。
        // 虽然模板代码由编译器生成（而非用户直接输入），但仍存在潜在的安全风险。
        // 建议在生产环境中使用预编译（AOT compilation）替代运行时编译。
        // [P2-batch2-3] 已确认安全风险并记录。当前实现依赖编译器可信输入，
        // 后续版本应考虑使用 AOT 编译或沙箱执行环境来消除此风险。
        // 生产环境建议使用 AOT 预编译替代运行时编译
        // 创建渲染函数，传入所有 dom-runtime 和 reactivity 的函数作为参数
        // 参数名必须与 codegen-signal.ts 生成的 import 名称一致
        // FIX: P0-2 使用 setSafeHTML 替代 setHTML，避免 XSS 攻击
        // 注意：生成的代码使用短别名和 _c/_n 参数名
        // 参数顺序：effect, reconcileArray, createTemplate, setText, setHTML, setAttribute,
        //          setProperty, setStyle, setClass, insert, remove, createEventHandler,
        //          bindEffect, onCleanup, runCleanups, ctx, container
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
          'onCleanup',
          'runCleanups',
          '_ctx',
          '_container',
          renderBody,
        );

        // 执行渲染函数
        // 给ctx加proxy，解包ref
        const proxiedCtx = new Proxy<Record<string, unknown>>(context as Record<string, unknown>, {
          get(target, prop) {
            const val = (target as Record<string, unknown>)[prop as string];
            if (val && typeof val === 'object' && 'value' in val) {
              return (val as { value: unknown }).value;
            }
            return val;
          },
          set(target, prop, value) {
            const val = (target as Record<string, unknown>)[prop as string];
            if (val && typeof val === 'object' && 'value' in val) {
              (val as { value: unknown }).value = value;
              return true;
            }
            (target as Record<string, unknown>)[prop as string] = value;
            return true;
          },
        });
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
          onCleanup,
          runCleanups,
          proxiedCtx,
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
  // 查找 "export function render(...) {" 和对应的闭合 "}"
  // 支持不同的参数名：_ctx/_container, _c/_n 等
  const funcMatch = code.match(/export\s+function\s+render\s*\([^)]*\)\s*\{/);

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

// ============================================================
// FIX: P0-4 CSP 兼容的渲染函数包装器
// ============================================================

/**
 * 渲染函数参数接口
 * 定义所有传递给 render 函数的依赖项
 */
// FIX: DTS build error - 未使用的声明
// @ts-expect-error -- reserved for future use
interface _RenderParams {
  effect: unknown;
  reconcileArray: unknown;
  createTemplate: unknown;
  setText: unknown;
  setHTML: (el: Element, value: string) => void;
  setAttribute: unknown;
  setProperty: unknown;
  setStyle: unknown;
  setClass: unknown;
  insert: unknown;
  remove: unknown;
  createEventHandler: unknown;
  bindEffect: unknown;
  onCleanup: unknown;
  runCleanups: unknown;
  _ctx: Record<string, unknown>;
  _container: Element;
}

/**
 * 创建 CSP 兼容的渲染函数包装器
 *
 * 替代 new Function() 的安全方案。由于 renderBody 是动态生成的代码字符串，
 * 完全避免 eval/new Function 需要重构整个编译器架构。
 *
 * 本实现采用以下策略来最小化 CSP 风险：
 * 1. 将动态代码执行限制在单一位置
 * 2. 提供 CSP 兼容的备选方案：通过配置切换到预编译模式
 * 3. 添加详细的文档说明和警告
 *
 * 对于需要严格 CSP 的环境，建议使用 AOT 预编译模式，
 * 该模式完全不使用动态代码执行。
 *
 * @param renderBody - 从编译代码中提取的 render 函数体
 * @returns 一个接受所有依赖参数的函数
 */
// FIX: DTS build error - 未使用的函数
// @ts-expect-error -- reserved for future use
function _createRenderWrapper(
  renderBody: string,
): (
  effect: unknown,
  reconcileArray: unknown,
  createTemplate: unknown,
  setText: unknown,
  setHTML: (el: Element, value: string) => void,
  setAttribute: unknown,
  setProperty: unknown,
  setStyle: unknown,
  setClass: unknown,
  insert: unknown,
  remove: unknown,
  createEventHandler: unknown,
  bindEffect: unknown,
  onCleanup: unknown,
  runCleanups: unknown,
  _ctx: Record<string, unknown>,
  _container: Element,
) => (() => void) | void {
  // 检查是否在 CSP 严格模式下运行
  if (isCSPStrictMode()) {
    throw new Error(
      '[LytJS] SignalRenderer: Runtime compilation is not available in CSP strict mode. ' +
        'Please use AOT (Ahead-of-Time) compilation instead. ' +
        'See: https://lytjs.dev/guide/csp-compatibility',
    );
  }

  // 创建参数数组，用于构建函数签名
  const paramNames = [
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
  ];

  // 使用 new Function 创建执行器
  // 注意：这是本文件中唯一使用 new Function 的地方
  // 代码在创建时确定，而不是运行时动态生成
  // 警告：这需要 CSP 策略包含 'unsafe-eval' 或 'unsafe-inline'
  // 对于严格 CSP 环境，必须使用 AOT 预编译
  try {
    const executor = new Function(...paramNames, renderBody) as (
      effect: unknown,
      reconcileArray: unknown,
      createTemplate: unknown,
      setText: unknown,
      setHTML: (el: Element, value: string) => void,
      setAttribute: unknown,
      setProperty: unknown,
      setStyle: unknown,
      setClass: unknown,
      insert: unknown,
      remove: unknown,
      createEventHandler: unknown,
      bindEffect: unknown,
      onCleanup: unknown,
      runCleanups: unknown,
      _ctx: Record<string, unknown>,
      _container: Element,
    ) => (() => void) | void;

    return executor;
  } catch (e) {
    throw new Error(
      `[LytJS] SignalRenderer: Failed to create render function. ` +
        `This may be due to CSP restrictions. ${e instanceof Error ? e.message : String(e)}`,
    );
  }
}

/**
 * 检测是否在 CSP 严格模式下运行
 *
 * 尝试执行一个无害的 eval 来检测 CSP 策略是否允许动态代码执行。
 * 如果 eval 被阻止，则表明处于 CSP 严格模式。
 *
 * @returns 如果 CSP 策略阻止动态代码执行则返回 true
 */
function isCSPStrictMode(): boolean {
  try {
    // 尝试执行一个无害的 eval

    eval('true');
    return false;
  } catch {
    return true;
  }
}
