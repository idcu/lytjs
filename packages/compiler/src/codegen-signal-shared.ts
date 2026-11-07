// src/codegen-signal-shared.ts
// Signal 两套 codegen 的**共享语义 helper**（S13 / ADR 0015 方向 2）。
//
// 这里只放「读 AST + 判语义」的逻辑；产物**输出形态**差异留在各自发射器：
// - 短别名 / 完整名（`effect` vs `e`）
// - render 形参名（`_c,_n` vs `_ctx,_container`）
// - 静态元素变量名（`_0` vs `_li`）
// - 上下文前缀（`_c.` vs `_ctx.`）
//
// 任何 helper 的**语义判据**只允许在这里修改一次；两个发射器不得再各写一份。

import { NodeTypes, ElementTypes } from './constants';
import type {
  ElementNode,
  SimpleExpressionNode,
  CompoundExpressionNode,
  VNodeCall,
  JSObjectExpression,
  JSProperty,
} from './types';

/**
 * 插值「文本槽位」在静态模板里的注释标记。
 * 与 `@lytjs/dom-runtime` 的 `claimTextSlots()` / `TEXT_SLOT_MARKER` 必须一致。
 */
export const TEXT_SLOT_COMMENT = '<!--lyt-t-->';

/**
 * 发射器输出形态（B01d-1）。
 *
 * 两个入口（`generateSignal` / `generateSignalOptimized`）都只读这里的常量，
 * 不再各写一份形参名 / 前缀 / 短别名开关。本步只做常量抽取与接线，
 * 不迁移任何序列化逻辑，产物必须逐字不变。
 */
export interface EmitProfile {
  /** 产物形态标识 */
  readonly name: 'base' | 'optimized';
  /** render 第一形参（上下文），也是组件引用前缀的本体 */
  readonly ctxParam: '_ctx' | '_c';
  /** render 第二形参（容器） */
  readonly containerParam: '_container' | '_n';
  /** 上下文表达式前缀（含点，用于拼接 `_ctx.x` / `_c.x`） */
  readonly ctxPrefix: '_ctx.' | '_c.';
  /** 是否使用运行时短别名（`effect` vs `e`） */
  readonly shortNames: boolean;
  /** 元素临时变量命名：语义名（`_li`）或序号名（`_0`） */
  readonly elementVarStyle: 'semantic' | 'indexed';
}

/** 基础实现（语义主干、默认路径）。 */
export const BASE_EMIT_PROFILE: EmitProfile = {
  name: 'base',
  ctxParam: '_ctx',
  containerParam: '_container',
  ctxPrefix: '_ctx.',
  shortNames: false,
  elementVarStyle: 'semantic',
};

/** 优化实现（实验路径，`optimizeSignal: true` 显式开启）。 */
export const OPTIMIZED_EMIT_PROFILE: EmitProfile = {
  name: 'optimized',
  ctxParam: '_c',
  containerParam: '_n',
  ctxPrefix: '_c.',
  shortNames: true,
  elementVarStyle: 'indexed',
};

/** 根据标签名生成变量名，使用 `_` 前缀；重复标签通过计数器后缀区分。 */
export function genVarName(tag: string, counter: Map<string, number>): string {
  const count = counter.get(tag) ?? 0;
  counter.set(tag, count + 1);
  return count === 0 ? `_${tag}` : `_${tag}${count}`;
}

/** 取 SIMPLE / COMPOUND 表达式的源码文本；形态异常时返回空串。 */
export function getExpContent(
  node: SimpleExpressionNode | CompoundExpressionNode | undefined,
): string {
  if (!node) return '';
  if (node.type === NodeTypes.SIMPLE_EXPRESSION) return node.content;
  if (node.type !== NodeTypes.COMPOUND_EXPRESSION || !Array.isArray(node.children)) return '';
  return node.children
    .map((c) => {
      if (typeof c === 'string') return c;
      if (c.type === NodeTypes.SIMPLE_EXPRESSION) return c.content;
      return '';
    })
    .join('');
}

/** 静态 HTML 文本转义。 */
export function escapeHtmlStatic(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * 元素是否只含**一个插值**子节点（可把元素自身当作文本宿主，省掉槽位注释）。
 * 多插值 / 静态文本 + 插值仍必须走 `claimTextSlots`，否则会互相覆盖。
 */
export function isDirectTextElement(node: ElementNode): boolean {
  return (
    node.tagType !== ElementTypes.COMPONENT &&
    node.children.length === 1 &&
    node.children[0]!.type === NodeTypes.INTERPOLATION
  );
}

/**
 * 属性值是否为可静态序列化的**字面量**。
 * 旧判据「值里没有 `_ctx` 就算静态」会把 `:id="i"` 写成 `id="i"`，动态绑定丢失。
 */
export function isStaticPropValue(value: string): boolean {
  const v = value.trim();
  if (/^["'][\s\S]*["']$/.test(v)) return true;
  return /^(?:-?\d+(?:\.\d+)?|true|false|null|undefined)$/.test(v);
}

/** 组件引用表达式；kebab 名不是合法标识符，必须写成 `ctx["my-comp"]`。 */
export function componentRef(tag: string, ctx: string): string {
  return /^[A-Za-z_$][\w$]*$/.test(tag) ? `${ctx}.${tag}` : `${ctx}[${JSON.stringify(tag)}]`;
}

/** 叶子节点是否是一个插值（TO_DISPLAY_STRING / INTERPOLATION），返回表达式。 */
export function readInterpolationExpr(node: unknown): string | null {
  if (!node || typeof node !== 'object') return null;
  const n = node as { type?: number; callee?: unknown; arguments?: unknown[]; content?: unknown };
  if (n.type === NodeTypes.INTERPOLATION) {
    const inner = n.content as { content?: unknown } | undefined;
    return typeof inner?.content === 'string' ? inner.content : null;
  }
  if (n.type === NodeTypes.JS_CALL_EXPRESSION) {
    const callee = typeof n.callee === 'string' ? n.callee : String(n.callee);
    if (callee !== 'TO_DISPLAY_STRING' && callee !== 'toDisplayString') return null;
    const arg = (n.arguments ?? [])[0] as { content?: unknown } | undefined;
    return typeof arg?.content === 'string' ? arg.content : null;
  }
  return null;
}

/** 列表项的 children 里是否有**嵌套元素**（`<li v-for><span>{{x}}</span></li>`）。 */
export function containsElementVNode(node: unknown): boolean {
  if (node === undefined || node === null) return false;
  if (Array.isArray(node)) return node.some((n) => containsElementVNode(n));
  const n = node as { type?: number; tag?: unknown };
  return n.type === NodeTypes.VNODE_CALL && typeof n.tag === 'string' && /^["']/.test(n.tag);
}

/** 把表达式改写成当前发射器的上下文前缀形态。 */
export type ToExpr = (content: string, locals: ReadonlySet<string>) => string;

/**
 * 列表项元素的 props：字面量写死；动态值 create/update 各同步一次（跳过 :key / 事件）。
 *
 * `updateExpr` 为 null 表示该元素不参与更新（不会调用 reconcile update）。
 */
export function emitListItemProps(
  props: unknown,
  createExpr: string,
  updateExpr: string | null,
  locals: ReadonlySet<string>,
  createLines: string[],
  updateLines: string[],
  toExpr: ToExpr,
): void {
  if (!props || (props as { type?: number }).type !== NodeTypes.JS_OBJECT_EXPRESSION) return;
  for (const prop of (props as JSObjectExpression).properties) {
    if (prop.type !== NodeTypes.JS_PROPERTY) continue;
    const jsProp = prop as JSProperty;
    if (
      jsProp.key.type !== NodeTypes.SIMPLE_EXPRESSION ||
      jsProp.value.type !== NodeTypes.SIMPLE_EXPRESSION
    ) {
      continue;
    }
    const key = (jsProp.key as SimpleExpressionNode).content.replace(/^["']|["']$/g, '');
    const value = (jsProp.value as SimpleExpressionNode).content;
    if (key === 'key' || /^on[A-Z]/.test(key)) continue;
    if (isStaticPropValue(value)) {
      createLines.push(
        `${createExpr}.setAttribute(${JSON.stringify(key)}, ${JSON.stringify(
          value.replace(/^["']|["']$/g, ''),
        )});`,
      );
    } else {
      const code = toExpr(value, locals);
      createLines.push(`${createExpr}.setAttribute(${JSON.stringify(key)}, ${code});`);
      if (updateExpr) {
        updateLines.push(`${updateExpr}.setAttribute(${JSON.stringify(key)}, ${code});`);
      }
    }
  }
}

/**
 * 递归生成列表项子树（元素 / 文本 / 插值）的 create 与 update 代码。
 *
 * update 侧用 `childNodes[i]` 定位（创建顺序即索引，稳定）。
 */
export function emitListItemNode(
  node: unknown,
  createParent: string,
  updateExpr: string | null,
  locals: ReadonlySet<string>,
  counter: Map<string, number>,
  createLines: string[],
  updateLines: string[],
  toExpr: ToExpr,
  toTextExpr: ToExpr = toExpr,
): boolean {
  if (node === undefined || node === null) return false;
  if (Array.isArray(node)) {
    for (const child of node) {
      emitListItemNode(
        child,
        createParent,
        updateExpr,
        locals,
        counter,
        createLines,
        updateLines,
        toExpr,
        toTextExpr,
      );
    }
    return false;
  }

  // 静态文本 / COMPOUND_EXPRESSION 里的代码片段字符串
  if (typeof node === 'string') {
    if (!node) return false;
    const textVar = genVarName('t', counter);
    createLines.push(`const ${textVar}=document.createTextNode(${JSON.stringify(node)});`);
    createLines.push(`${createParent}.appendChild(${textVar});`);
    if (updateExpr) updateLines.push(`${updateExpr}.textContent=${JSON.stringify(node)};`);
    return true;
  }

  const n = node as {
    type?: number;
    tag?: unknown;
    content?: unknown;
    callee?: unknown;
    arguments?: unknown[];
    children?: unknown;
    props?: unknown;
  };

  const textExpr = readInterpolationExpr(n);
  if (textExpr !== null) {
    const code = toTextExpr(textExpr, locals);
    const textVar = genVarName('t', counter);
    createLines.push(`const ${textVar}=document.createTextNode(${code});`);
    createLines.push(`${createParent}.appendChild(${textVar});`);
    if (updateExpr) updateLines.push(`${updateExpr}.textContent=${code};`);
    return true;
  }

  if (n.type === NodeTypes.COMPOUND_EXPRESSION && Array.isArray(n.children)) {
    for (const child of n.children) {
      emitListItemNode(
        child,
        createParent,
        updateExpr,
        locals,
        counter,
        createLines,
        updateLines,
        toExpr,
        toTextExpr,
      );
    }
    return false;
  }

  if (n.type !== NodeTypes.VNODE_CALL || typeof n.tag !== 'string') return false;
  const tag = n.tag.replace(/^["']|["']$/g, '');
  const elVar = genVarName(tag, counter);
  createLines.push(`const ${elVar}=document.createElement(${JSON.stringify(tag)});`);
  createLines.push(`${createParent}.appendChild(${elVar});`);
  emitListItemProps(n.props, elVar, updateExpr, locals, createLines, updateLines, toExpr);

  // children：逐个 append，update 用 childNodes[i] 定位
  const rawKids = n.children as unknown;
  const kidList =
    rawKids === undefined || rawKids === null ? [] : Array.isArray(rawKids) ? rawKids : [rawKids];
  let childIdx = 0;
  for (const kid of kidList) {
    const kidUpdate = updateExpr ? `${updateExpr}.childNodes[${childIdx}]` : null;
    const emitted = emitListItemNode(
      kid,
      elVar,
      kidUpdate,
      locals,
      counter,
      createLines,
      updateLines,
      toExpr,
      toTextExpr,
    );
    if (emitted) childIdx++;
  }
  return true;
}

/** 生成列表项组件的 props 对象字面量（跳过 :key；字面量原样、表达式按 `toExpr` 前缀化）。 */
export function buildItemComponentPropsShared(
  vnode: VNodeCall,
  locals: ReadonlySet<string>,
  toExpr: ToExpr,
): string {
  const props = vnode.props as unknown;
  if (
    !props ||
    Array.isArray(props) ||
    typeof props !== 'object' ||
    (props as { type?: number }).type !== NodeTypes.JS_OBJECT_EXPRESSION
  ) {
    return '{}';
  }
  const parts: string[] = [];
  for (const prop of (props as JSObjectExpression).properties) {
    if (prop.type !== NodeTypes.JS_PROPERTY) continue;
    const key = prop.key as unknown;
    const keyName =
      typeof key === 'string'
        ? key
        : typeof (key as { content?: unknown } | undefined)?.content === 'string'
          ? String((key as { content: string }).content)
          : null;
    if (!keyName) continue;
    const cleanKey = keyName.replace(/^["']|["']$/g, '');
    if (!cleanKey || cleanKey === 'key') continue;

    const value = prop.value as unknown;
    if (typeof value === 'string') {
      parts.push(JSON.stringify(cleanKey) + ':' + JSON.stringify(value));
      continue;
    }
    const raw =
      value &&
      typeof value === 'object' &&
      (value as { type?: number }).type === NodeTypes.SIMPLE_EXPRESSION
        ? String((value as { content?: unknown }).content ?? '')
        : '';
    if (raw) parts.push(JSON.stringify(cleanKey) + ':' + toExpr(raw, locals));
  }
  return '{' + parts.join(',') + '}';
}
