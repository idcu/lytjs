// tests/support/execute.ts
// 把编译产物当模块执行，断言**运行时可观察的行为**，而不是产物文本。
//
// 三种执行器：
//   · execute / renderWith  —— 默认 VNode 产物，helper 由桩注入（@lytjs/core）
//   · executeSsr            —— ssrMode 产物自带 renderToString/escapeHtml，直接执行取 HTML
//   · executeSignal         —— signal 产物依赖真实 @lytjs/reactivity + @lytjs/dom-runtime，
//                              需 jsdom 环境（文件头 `// @vitest-environment jsdom`）

import * as domRuntime from '@lytjs/dom-runtime';
import * as reactivity from '@lytjs/reactivity';
import * as vdom from '@lytjs/vdom';
import * as renderer from '@lytjs/renderer';
import { isEventModifierIntercepted } from '@lytjs/common-events';
import { sanitizeHTML } from '@lytjs/common-security';
import { compile } from '../../src/index';

export type CompileResult = { code: string; preamble: string };

export interface RenderedVNode {
  __v_isVNode: true;
  type: unknown;
  props: Record<string, unknown> | null;
  children: unknown;
  patchFlag: number;
  dynamicChildren: unknown[] | null;
}

export function vnode(
  type: unknown,
  props: Record<string, unknown> | null = null,
  children: unknown = null,
  patchFlag = 0,
): RenderedVNode {
  return { __v_isVNode: true, type, props, children, patchFlag, dynamicChildren: null };
}

export const Fragment = Symbol('Fragment');

export const HELPERS: Record<string, unknown> = {
  createElementVNode: vnode,
  createElementBlock: vnode,
  createBlock: vnode,
  createVNode: vnode,
  createTextVNode: (text: unknown) => vnode('#text', null, text),
  createCommentVNode: (text: unknown) => vnode('#comment', null, text),
  openBlock: () => undefined,
  closeBlock: () => [],
  setBlockTracking: () => undefined,
  toDisplayString: (value: unknown) => (value == null ? '' : String(value)),
  renderList: (source: unknown, callback: (item: unknown, index: number) => unknown): unknown[] => {
    if (source == null) return [];
    if (typeof source === 'number') {
      return Array.from({ length: source }, (_, index) => callback(index + 1, index));
    }
    if (typeof source === 'string') {
      return Array.from(source, (item, index) => callback(item, index));
    }
    if (Array.isArray(source)) {
      return source.map((item, index) => callback(item, index));
    }
    return [];
  },
  resolveDynamicComponent: (component: unknown) => component,
  resolveComponent: (name: string) => name,
  // 复用生产实现的事件修饰符判定（stop/prevent/self/系统键/按键名）
  withModifiers: (fn: (...args: unknown[]) => unknown, modifiers: string[]) => (event: unknown) => {
    if (isEventModifierIntercepted(event as Event, modifiers)) return undefined;
    return fn(event);
  },
  withKeys: (fn: (...args: unknown[]) => unknown, keys: string[]) => (event: unknown) => {
    const key = (event as { key?: string }).key;
    return key && keys.includes(key) ? fn(event) : undefined;
  },
  // 运行时据此在挂载/更新时调用指令钩子；这里原样挂到 VNode 上供断言。
  withDirectives: (vnodeValue: unknown, directives: unknown[]) => {
    (vnodeValue as { __directives?: unknown[] }).__directives = directives;
    return vnodeValue;
  },
  resolveDirective: (name: string) => name,
  Fragment,
  createSlots: (slots: unknown) => slots,
  renderSlot: (
    slots: Record<string, (props?: unknown) => unknown> | undefined,
    name: string,
    props?: unknown,
    fallback?: unknown,
  ) => {
    const slot = slots?.[name];
    if (slot) return slot(props);
    return typeof fallback === 'function' ? (fallback as () => unknown)() : fallback;
  },
  normalizeSlot: (slot: unknown) => slot,
  guardReactiveProps: (props: unknown) => props,
  mergeProps: (...args: Record<string, unknown>[]) => Object.assign({}, ...args),
  extend: Object.assign,
  createTextVNodeStub: undefined,
};

/** 从 preamble 中解析出 helper 名（仅用于桩注入与缺失校验） */
export function importedHelpers(result: CompileResult): string[] {
  return [...result.preamble.matchAll(/import\s*\{([^}]*)\}\s*from/g)].flatMap((match) =>
    match[1]
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean),
  );
}

export type RenderFn = (ctx: Record<string, unknown>, cache?: Record<string, unknown>) => unknown;

/** 把默认（VNode）产物当模块执行，返回 render 函数 */
export function execute(result: CompileResult): RenderFn {
  const helpers = importedHelpers(result);
  const missing = helpers.filter((name) => !(name in HELPERS));
  if (missing.length > 0) {
    throw new Error(`测试 harness 未提供 helper 桩：${missing.join(', ')}`);
  }

  const executable = result.code
    .replace(/import\s*\{[^}]*\}\s*from\s*'[^']*';?/g, '')
    .replace(/^export\s+/gm, '');

  const factory = new Function(...helpers, `${executable}\nreturn render;`) as (
    ...args: unknown[]
  ) => RenderFn;

  return factory(...helpers.map((name) => HELPERS[name]));
}

export function renderWith(source: string, ctx: Record<string, unknown> = {}): unknown {
  return execute(compile(source))(ctx);
}

export function asVNode(value: unknown): RenderedVNode {
  if (!value || typeof value !== 'object' || (value as RenderedVNode).__v_isVNode !== true) {
    throw new Error(`期望 VNode，实际得到：${String(value)}`);
  }
  return value as RenderedVNode;
}

export function asVNodeList(value: unknown): RenderedVNode[] {
  if (!Array.isArray(value)) {
    throw new Error(`期望 VNode 数组，实际得到：${String(value)}`);
  }
  return value as RenderedVNode[];
}

/**
 * 执行 ssrMode 产物（代码自带 renderToString / escapeHtml），返回 HTML 字符串。
 *
 * `sanitizeHTML` 与 `renderComponentVNode` 按设计由**执行方**注入（见 codegen-ssr.ts），
 * 这里用生产实现 `@lytjs/common-security` 注入，避免测试桩掩盖转义语义。
 */
export function executeSsr(
  result: CompileResult,
  helpers: Record<string, unknown> = {},
): (ctx: Record<string, unknown>) => string {
  const executable = result.code.replace(/^export\s+/gm, '').replace(/import[^;]*;/g, '');
  const names = Object.keys({ sanitizeHTML, ...helpers });
  const values = Object.values({ sanitizeHTML, ...helpers });
  const factory = new Function(...names, `${executable}\nreturn render;`);
  return factory(...values) as (ctx: Record<string, unknown>) => string;
}

const MODULES: Record<string, Record<string, unknown>> = {
  '@lytjs/reactivity': reactivity as unknown as Record<string, unknown>,
  '@lytjs/dom-runtime': domRuntime as unknown as Record<string, unknown>,
  '@lytjs/vdom': vdom as unknown as Record<string, unknown>,
  '@lytjs/renderer': renderer as unknown as Record<string, unknown>,
};

export interface SignalHandle {
  container: HTMLElement;
  /** 生成代码返回的清理函数 */
  dispose: () => void;
  /** 当前 DOM 结构 */
  html: () => string;
  /** 当前文本内容 */
  text: () => string;
}

/**
 * 执行 signal 产物：注入真实 reactivity / dom-runtime helper，在 jsdom 容器里渲染。
 * `render(ctx, container)` 返回清理函数。
 */
export function executeSignal(
  result: CompileResult,
  ctx: Record<string, unknown> = {},
  helpers: Record<string, unknown> = {},
): SignalHandle {
  const bindings: Array<[string, unknown]> = [];
  const body = result.code.replace(
    /import\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"];?/g,
    (_match, spec: string, moduleName: string) => {
      const mod = MODULES[moduleName.trim()];
      if (!mod) throw new Error(`测试 harness 未知运行期模块：${moduleName}`);
      for (const part of spec.split(',')) {
        const [original, local] = part.trim().split(/\s+as\s+/);
        if (!original) continue;
        if (original in helpers) {
          bindings.push([local ?? original, helpers[original]]);
          continue;
        }
        if (!(original in mod)) {
          throw new Error(`模块 ${moduleName} 未导出 ${original}`);
        }
        bindings.push([local ?? original, mod[original]]);
      }
      return '';
    },
  );

  const executable = body.replace(/^export\s+/gm, '');
  const factory = new Function(...bindings.map(([name]) => name), `${executable}\nreturn render;`);
  const render = factory(...bindings.map(([, value]) => value)) as (
    context: Record<string, unknown>,
    node: Node,
  ) => () => void;

  const container = document.createElement('div');
  document.body.appendChild(container);
  const dispose = render(ctx, container);

  return {
    container,
    dispose,
    html: () => container.innerHTML,
    text: () => container.textContent ?? '',
  };
}
