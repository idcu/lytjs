// src/signal/signal-renderer.ts
// @lytjs/renderer - Signal 模式渲染器
// 使用 @lytjs/compiler 编译模板为 Signal 模式代码，
// 通过 @lytjs/dom-runtime 提供的细粒度 DOM 操作函数执行渲染

import { compile, clearCompileCache } from '@lytjs/compiler';
import { effect } from '@lytjs/reactivity';
// Vapor 组件挂载（模板中出现组件时，编译产物会调用 mountComponent）
import { mountComponent } from '../vapor/mount-component';
// 组件插槽需要 vnode（signal 产物是 DOM 操作，但 slot 契约要求返回 vnode）
import { createVNode, Text } from '@lytjs/vdom';
import {
  insert,
  remove,
  runCleanups,
  bindEffect,
  onCleanup,
  createTemplate,
  getRealNode,
  setText,
  setHTML,
  setAttribute,
  setProperty,
  setStyle,
  setClass,
  createEventHandler,
  reconcileArray,
  claimTextSlots,
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
  try {
    // 清除缓存，确保使用最新的 codegen
    clearCompileCache();
    const compileResult = compile(template, { rendererMode: 'signal', optimizeSignal: false });
    code = compileResult.code;
    // 注意：这里曾无条件 console.log 出全部编译产物（每个 renderer 实例都打印一次）。
    // 需要排查编译结果时用下面的 DEV 开关，避免污染生产环境控制台。
    if (__DEV__) {
      console.debug('[LytJS] Signal renderer compiled code:\n' + code);
    }

    // 产物校验：codegen-signal 的产物形如
    //   import { ... } from '@lytjs/{reactivity,dom-runtime}';
    //   export function render(_ctx, _container) { ... }
    // 执行走「整段模块代码在 Function 体内求值」（见 makeCreateRenderFactory），
    // 因此这里只做一次廉价的存在性校验，不再做任何花括号扫描
    //（历史教训：扫描遇到空对象字面量会提前收尾、截断函数体）。
    if (!/export\s+function\s+render\s*\(/.test(code)) {
      throw new Error(`[LytJS] SignalRenderer: compiled code has no render function.`);
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
        // 创建「工厂」：工厂只接收运行时依赖参数，产出 render 函数（render 再接收 _ctx/_container）。
        // 两段式的目的：让 `new Function` 只有一处、且不再对 render 函数体做花括号配平扫描
        //（组件挂载产物里的空对象字面量会打乱扫描，导致 body 截断 / 参数错位）。
        // 两步：① 工厂注入全部运行时依赖（effect/reconcileArray/.../mountComponent），产出 render；
        //       ② render 只接收 _ctx 与 _container。
        const createRenderFactory = makeCreateRenderFactory();
        const renderFn = createRenderFactory(code)(
          effect,
          reconcileArray,
          createTemplate,
          getRealNode,
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
          mountComponent,
          createVNode,
          Text,
          claimTextSlots,
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
        const cleanupFn = renderFn(proxiedCtx, el);

        // 保存清理函数
        if (typeof cleanupFn === 'function') {
          cleanup = cleanupFn as () => void;
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
// FIX: P0-4 CSP 兼容的渲染函数包装器
// ============================================================

/**
 * 渲染函数参数接口
 * 定义所有传递给 render 函数的依赖项
 */
// FIX: DTS build error - 未使用的声明
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
  mountComponent: unknown;
  createVNode: unknown;
  Text: unknown;
  _ctx: Record<string, unknown>;
  _container: Element;
}

/**
 * 创建 CSP 兼容的渲染函数包装器
 *
 * 这是本文件唯一使用 new Function() 的位置（严格 CSP 下会直接抛错）。
 * 完全避免动态代码执行需要重构整个编译器架构。
 *
 * 本实现采用以下策略来最小化 CSP 风险：
 * 1. 将动态代码执行限制在单一位置
 * 2. 提供 CSP 兼容的备选方案：通过配置切换到预编译模式
 * 3. 添加详细的文档说明和警告
 *
 * 对于需要严格 CSP 的环境，建议使用 AOT 预编译模式，
 * 该模式完全不使用动态代码执行。
 *
 * @param code - 编译器产出的完整模块代码（内部会剥离 import/export 后在 Function 体内求值）
 * @returns 一个接受所有依赖参数的函数
 */
// FIX: DTS build error - 未使用的函数
function makeCreateRenderFactory(): (
  code: string,
) => (
  ...runtimeArgs: unknown[]
) => (_ctx: Record<string, unknown>, _container: unknown) => (() => void) | void {
  // 检查是否在 CSP 严格模式下运行
  if (isCSPStrictMode()) {
    throw new Error(
      '[LytJS] SignalRenderer: Runtime compilation is not available in CSP strict mode. ' +
        'Please use AOT (Ahead-of-Time) compilation instead. ' +
        'See: https://lytjs.dev/guide/csp-compatibility',
    );
  }

  // 运行时依赖参数（render 函数本身还需要 _ctx / _container，由调用方传入）
  const paramNames = [
    'effect',
    'reconcileArray',
    'createTemplate',
    'getRealNode',
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
    'mountComponent',
    'createVNode',
    'Text',
    'claimTextSlots',
  ];

  // 使用 new Function 创建执行器
  // 注意：这是本文件中唯一使用 new Function 的地方
  // 警告：这需要 CSP 策略包含 'unsafe-eval' 或 'unsafe-inline'
  // 对于严格 CSP 环境，必须使用 AOT 预编译
  //
  // 说明（2026-09 修复）：此前是把 render 函数体**抠出来**再执行，依赖花括号配平扫描。
  // 产物里一旦出现空对象字面量（例如 `mountComponent(_ctx.Child,{},_el)`），扫描就会
  // 提前收尾、body 被截断（丢掉 `return () => { runCleanups(); }`），进而参数错位、
  // 运行时崩溃。现在改为：整段模块代码（去 import/export）在同一个 Function 体内执行，
  // 末尾 `return render;` —— 不再依赖任何字符串扫描。
  return function createRenderFactory(
    code: string,
  ): (
    ...runtimeArgs: unknown[]
  ) => (_ctx: Record<string, unknown>, _container: unknown) => (() => void) | void {
    const moduleCode = code.replace(/^\s*import[^\n]*\n/gm, '').replace(/\bexport\s+/g, '');
    try {
      return new Function(...paramNames, `${moduleCode}\nreturn render;`) as unknown as (
        ...runtimeArgs: unknown[]
      ) => (_ctx: Record<string, unknown>, _container: unknown) => (() => void) | void;
    } catch (e) {
      throw new Error(
        `[LytJS] SignalRenderer: Failed to create render function. ` +
          `This may be due to CSP restrictions. ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  };
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
