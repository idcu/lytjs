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
import { FRAGMENT_SENTINEL } from './transforms/transform-element';
import type {
  ElementNode,
  TextNode,
  TemplateChildNode,
  DirectiveNode,
  InterpolationNode,
  SimpleExpressionNode,
  CompoundExpressionNode,
  JSChildNode,
  JSCallExpression,
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
 * 静态模板的元素变量分配器（B01d-2）。
 *
 * 两套发射器只有**变量名形态**不同，登记动作也略有差异（基础实现记 `staticVars`，
 * 优化实现把 `node` 挂在元素变量上）。这里只暴露分配结果，登记由调用方在闭包里做。
 */
export type StaticHtmlAllocator = (node: ElementNode, tag: string, isComponent: boolean) => string;

/**
 * 把一组子节点序列化成静态模板串（两套发射器共用）。
 *
 * 只序列化 TEXT / ELEMENT；动态节点留给各自的动态绑定阶段。
 */
export function buildStaticHtml(
  children: TemplateChildNode[],
  allocate: StaticHtmlAllocator,
): string {
  let html = '';
  for (const child of children) {
    if (child.type === NodeTypes.TEXT) {
      html += (child as TextNode).content;
    } else if (child.type === NodeTypes.ELEMENT) {
      html += serializeStaticHtml(child as ElementNode, allocate, true);
    }
  }
  return html;
}

/**
 * 静态序列化单个元素（两套发射器共用）。
 *
 * - 组件输出占位元素 `<lyt-comp data-lyt-comp="…">`，由运行时挂载真实组件；
 *   占位必须是**元素**，注释不在 `element.children` 里，会让按下标取元素的变量错位。
 * - 插值在混合文本里留 `TEXT_SLOT_COMMENT` 槽位，由 `claimTextSlots()` 认领；
 *   元素只有一个插值时可省掉槽位（`allowDirectText`）。
 */
export function serializeStaticHtml(
  node: ElementNode,
  allocate: StaticHtmlAllocator,
  allowDirectText = false,
): string {
  if (node.tagType === ElementTypes.COMPONENT) {
    allocate(node, 'lyt-comp', true);
    return `<lyt-comp data-lyt-comp="${node.tag}"></lyt-comp>`;
  }

  allocate(node, node.tag, false);

  let attrs = '';
  for (const prop of node.props) {
    if (prop.type === NodeTypes.ATTRIBUTE && prop.value) {
      attrs += ` ${prop.name}="${escapeHtmlStatic(prop.value.content)}"`;
    } else if (prop.type === NodeTypes.ATTRIBUTE && !prop.value) {
      attrs += ` ${prop.name}`;
    }
    // 跳过 DIRECTIVE 类型的 props
  }

  let childrenHTML = '';
  const directText = allowDirectText && isDirectTextElement(node);
  for (const child of node.children) {
    if (child.type === NodeTypes.TEXT) {
      childrenHTML += escapeHtmlStatic((child as TextNode).content);
    } else if (child.type === NodeTypes.ELEMENT) {
      childrenHTML += serializeStaticHtml(child as ElementNode, allocate, allowDirectText);
    } else if (child.type === NodeTypes.INTERPOLATION && !directText) {
      childrenHTML += TEXT_SLOT_COMMENT;
    }
    // 跳过 CommentNode 等其它动态内容
  }

  if (node.children.length === 0 && node.isSelfClosing) {
    return `<${node.tag}${attrs} />`;
  }
  return `<${node.tag}${attrs}>${childrenHTML}</${node.tag}>`;
}

/**
 * v-if / v-for 分支静态序列化的形态钩子（B01d-2）。
 *
 * 两套发射器的差异只有三处，全部由调用方注入，语义不分叉。
 */
export interface BranchHtmlHooks {
  /** 子树里的 ELEMENT 交给各自的静态模板序列化器 */
  serializeStaticElement: (node: ElementNode) => string;
  /** 动态组件名校验（基础实现开启；优化实现历史上未校验，传 undefined 保持原状） */
  validateDynamicComponentName?: (tag: string) => void;
  /** 剥离静态属性值两端引号（基础实现剥单双引号，优化实现只剥双引号） */
  stripStaticQuotes: (value: string) => string;
}

/**
 * 把 v-if / v-for 分支序列化成静态模板串（两套发射器共用）。
 *
 * 分支里的插值一律留 `TEXT_SLOT_COMMENT` 槽位，避免多层嵌套时被整段丢弃；
 * 动态绑定留给分支内的 setAttribute / setClass 阶段。
 */
export function serializeBranchHtml(
  branch: JSChildNode | TemplateChildNode | TemplateChildNode[] | string | undefined,
  hooks: BranchHtmlHooks,
): string {
  if (!branch) return '';
  if (typeof branch === 'string') return branch;
  if (Array.isArray(branch)) {
    return branch.map((item) => serializeBranchHtml(item, hooks)).join('');
  }
  if (branch.type === NodeTypes.INTERPOLATION) return TEXT_SLOT_COMMENT;
  if (branch.type === NodeTypes.JS_CALL_EXPRESSION) {
    const call = branch as JSCallExpression;
    const callee = typeof call.callee === 'string' ? call.callee : String(call.callee);
    return callee === 'TO_DISPLAY_STRING' || callee === 'toDisplayString' ? TEXT_SLOT_COMMENT : '';
  }
  if (branch.type === NodeTypes.COMPOUND_EXPRESSION) {
    const compound = branch as CompoundExpressionNode;
    return (compound.children ?? []).map((c) => serializeBranchHtml(c as never, hooks)).join('');
  }
  if (branch.type === NodeTypes.VNODE_CALL) {
    const vnode = branch as VNodeCall;
    if (typeof vnode.tag === 'string') {
      // 组件分支（tag 是标识符/表达式）：不能按 HTML 标签名序列化，
      // 输出占位元素，运行期由 mountComponent 挂载真实组件。
      if (vnode.tag !== '' && !/^["']/.test(vnode.tag)) {
        return `<lyt-comp data-lyt-comp="${escapeHtmlStatic(vnode.tag)}"></lyt-comp>`;
      }
      const rawTag = vnode.tag.replace(/^"|"$/g, '');
      // `<template>` 的 Fragment 哨兵：signal 模式不支持 Fragment，按字面量序列化，
      // 并且跳过组件名校验（哨兵名带下划线，会被 VALID_COMPONENT_NAME 判为非法）。
      const tag = rawTag === FRAGMENT_SENTINEL ? 'template' : rawTag;
      if (rawTag !== FRAGMENT_SENTINEL) {
        hooks.validateDynamicComponentName?.(tag);
      }
      let attrs = '';
      // 只序列化**字面量**属性值；动态绑定留给条件内的 setAttribute
      if (vnode.props && vnode.props.type === NodeTypes.JS_OBJECT_EXPRESSION) {
        const objExpr = vnode.props as JSObjectExpression;
        for (const prop of objExpr.properties) {
          if (prop.type === NodeTypes.JS_PROPERTY) {
            const jsProp = prop as JSProperty;
            if (
              jsProp.key.type === NodeTypes.SIMPLE_EXPRESSION &&
              jsProp.value.type === NodeTypes.SIMPLE_EXPRESSION
            ) {
              const key = (jsProp.key as SimpleExpressionNode).content.replace(/^"|"$/g, '');
              const value = (jsProp.value as SimpleExpressionNode).content;
              if (isStaticPropValue(value)) {
                attrs += ` ${key}="${escapeHtmlStatic(hooks.stripStaticQuotes(value))}"`;
              }
            }
          }
        }
      }
      let childrenHTML = '';
      if (vnode.children) {
        if (typeof vnode.children === 'string') {
          childrenHTML = escapeHtmlStatic(vnode.children);
        } else if (Array.isArray(vnode.children)) {
          childrenHTML = vnode.children.map((c) => serializeBranchHtml(c, hooks)).join('');
        } else {
          childrenHTML = serializeBranchHtml(vnode.children as never, hooks);
        }
      }
      return `<${tag}${attrs}>${childrenHTML}</${tag}>`;
    }
  }
  if (branch.type === NodeTypes.ELEMENT) {
    return hooks.serializeStaticElement(branch as ElementNode);
  }
  return '';
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

/** 取元素上的静态属性值（`name="v"`），没有则返回 null。 */
export function getStaticAttr(node: ElementNode, attrName: string): string | null {
  for (const prop of node.props) {
    if (prop && prop.type === NodeTypes.ATTRIBUTE && prop.name === attrName && prop.value) {
      return prop.value.content;
    }
  }
  return null;
}

/**
 * 取元素上的**静态** `class` 属性值；没有则返回 `''`。
 *
 * ⚠️ 2026-09-30 修复「静态 class 丢失」：`setClass()` 整体替换 class 属性，
 * 而静态 class 已烧进 createTemplate 的 HTML ⇒ `:class` 一动就把它抹掉。
 * 修法：静态 class 并入动态取值（`setClass(el, ['a b', _ctx.cls])`）。
 */
export function getStaticClass(node: ElementNode): string {
  for (const prop of node.props) {
    if (prop && prop.type === NodeTypes.ATTRIBUTE && prop.name === 'class' && prop.value) {
      return prop.value.content;
    }
  }
  return '';
}

/** 构造一个 SIMPLE_EXPRESSION 节点；未传 loc 时用占位位置。 */
export function createSimpleExpressionFor(
  content: string,
  _loc?: {
    start: { line: number; column: number; offset: number };
    end: { line: number; column: number; offset: number };
    source: string;
  },
): SimpleExpressionNode {
  return {
    type: NodeTypes.SIMPLE_EXPRESSION,
    content,
    isStatic: false,
    isConstant: false,
    loc: _loc ?? {
      start: { line: 1, column: 1, offset: 0 },
      end: { line: 1, column: 1, offset: 0 },
      source: content,
    },
  };
}

/** 取 v-if / v-for 的 test / source 表达式源码文本；非表达式返回空串。 */
export function getTestExpr(test: JSChildNode | string | undefined): string {
  if (!test) return '';
  if (typeof test === 'string') return test;
  if (test.type === NodeTypes.SIMPLE_EXPRESSION) return test.content;
  if (test.type === NodeTypes.COMPOUND_EXPRESSION) {
    return getExpContent(test as CompoundExpressionNode);
  }
  return '';
}

/** 插槽指令信息 */
export interface SlotDirectiveInfo {
  /** 插槽名；null 表示未显式指定（组件上的 `v-slot` 无 arg ⇒ 默认插槽） */
  name: string | null;
  /** 作用域参数表达式（`p` / `{ x, y }`）；null 表示无 */
  param: string | null;
}

/** 从元素 props 里取出 `v-slot` 指令信息（没有则返回 null） */
export function findSlotDirective(el: ElementNode): SlotDirectiveInfo | null {
  for (const prop of el.props) {
    if (!prop || prop.type !== NodeTypes.DIRECTIVE) continue;
    const dir = prop as DirectiveNode;
    if (dir.name !== 'slot') continue;
    const rawName = dir.arg ? getExpContent(dir.arg as SimpleExpressionNode) : null;
    const rawParam = dir.exp ? getExpContent(dir.exp as SimpleExpressionNode) : null;
    return {
      name: rawName && /^[A-Za-z_$][\w$-]*$/.test(rawName) ? rawName : null,
      param: rawParam && rawParam.trim() ? rawParam.trim() : null,
    };
  }
  return null;
}

/** 从作用域参数表达式里提取标识符（`p` → [p]；`{ x, y }` → [x, y]） */
export function extractScopeNames(param: string | null): string[] {
  if (!param) return [];
  return param.split(/[^A-Za-z0-9_$]+/).filter((x) => x && /^[A-Za-z_$][\w$]*$/.test(x));
}

/** 把作用域变量并入 locals，供 `prefixIdentifiers` 排除前缀化 */
export function withScope(locals: ReadonlySet<string>, param: string | null): Set<string> {
  const out = new Set(locals);
  for (const name of extractScopeNames(param)) out.add(name);
  return out;
}

/** 元素是否带有插槽编译尚不支持的结构性指令（只认 v-bind / v-on / v-show） */
export function hasUnsupportedSlotDirective(node: ElementNode): boolean {
  for (const prop of node.props) {
    if (!prop || prop.type !== NodeTypes.DIRECTIVE) continue;
    const name = (prop as DirectiveNode).name;
    if (name !== 'bind' && name !== 'on' && name !== 'show') return true;
  }
  return false;
}

/**
 * 把模板里的事件名转成组件的 prop 键名。
 *
 * `click` → `onClick`；`my-event` → `onMyEvent`（kebab 先 camelize）。
 * 与 `@lytjs/component` 的 `toHandlerKey()` 保持同一约定，否则组件 `emit()` 回查
 * `props.onXxx` 时会因键名不一致而找不到处理器。
 */
export function toComponentEventKey(event: string): string {
  const camelized = event.replace(/-(\w)/g, (_m, c: string) => c.toUpperCase());
  return `on${camelized.charAt(0).toUpperCase()}${camelized.slice(1)}`;
}

// FIX: P1-S1, P1-S2 属性名和事件名验证正则
const VALID_ATTRIBUTE_NAME = /^[a-zA-Z][a-zA-Z0-9-:]*$/;
const VALID_EVENT_NAME = /^[a-zA-Z][a-zA-Z0-9-]*$/;
const VALID_COMPONENT_NAME = /^[a-zA-Z][a-zA-Z0-9-]*$/;
/** v-island 只允许简单属性访问或布尔字面量。 */
const VALID_ISLAND_EXPRESSION = /^[a-zA-Z_$][a-zA-Z0-9_$]*(\.([a-zA-Z_$][a-zA-Z0-9_$]*))*$/;

/** FIX: P1-S1 v-bind 动态属性名验证（两套发射器共用同一判据与错误文案）。 */
export function validateAttributeName(name: string | undefined, context: string): void {
  if (!name) return;
  if (!VALID_ATTRIBUTE_NAME.test(name)) {
    throw new Error(
      `[lytjs/compiler] Invalid attribute name in ${context}: "${name}". Only alphanumeric characters, hyphens, and colons are allowed.`,
    );
  }
}

/** FIX: P1-S2 v-on 事件名验证。 */
export function validateEventName(name: string | undefined, context: string): void {
  if (!name) return;
  if (!VALID_EVENT_NAME.test(name)) {
    throw new Error(
      `[lytjs/compiler] Invalid event name in ${context}: "${name}". Only alphanumeric characters and hyphens are allowed.`,
    );
  }
}

/** FIX: P1-S6 动态组件名验证。 */
export function validateComponentName(name: string | undefined, context: string): void {
  if (!name) return;
  if (!VALID_COMPONENT_NAME.test(name)) {
    throw new Error(
      `[lytjs/compiler] Invalid component name in ${context}: "${name}". Only alphanumeric characters and hyphens are allowed.`,
    );
  }
}

/** FIX: P1-S8 v-island 指令验证。 */
export function validateIslandDirective(exp: string | undefined, context: string): void {
  if (!exp) return;
  if (!VALID_ISLAND_EXPRESSION.test(exp) && exp !== 'true' && exp !== 'false') {
    throw new Error(
      `[lytjs/compiler] Invalid v-island expression in ${context}: "${exp}". Only simple property access or boolean literals are allowed.`,
    );
  }
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

/**
 * 把组件的子内容编译为「插槽对象」字面量：`{default:()=>[vnode,...]}`
 *
 * 返回 null 表示没有可编译的子内容（此时不传第 4 个参数）。
 * 首版只覆盖**静态内容**（文本 / 元素 / 嵌套组件）；插值与指令仍不参与插槽编译。
 */
export function buildComponentSlotsObjectShared(
  node: ElementNode,
  locals: ReadonlySet<string>,
  collect: (children: TemplateChildNode[], locals: ReadonlySet<string>) => string[],
): string | null {
  // 组件自身若带 `v-slot="p"`（无 arg），表示**默认插槽**的作用域参数
  const ownSlot = findSlotDirective(node);
  const ownParam = ownSlot && ownSlot.name === null ? ownSlot.param : null;

  const namedSlots: string[] = [];
  const defaultParts: string[] = [];

  for (const child of node.children) {
    if (!child) continue;

    // 具名插槽：`<template #name="scope">…</template>` → `"name":(scope)=>[…]`
    const info = child.type === NodeTypes.ELEMENT ? findSlotDirective(child as ElementNode) : null;
    if (info && info.name) {
      const scope = info.param;
      const parts = collect((child as ElementNode).children, withScope(locals, scope));
      if (parts.length) {
        namedSlots.push(`${JSON.stringify(info.name)}:(${scope ?? ''})=>[${parts.join(',')}]`);
      }
      continue;
    }

    // 其余节点归入默认插槽（使用组件自身的作用域参数）
    defaultParts.push(...collect([child], withScope(locals, ownParam)));
  }

  const all = [...namedSlots];
  if (defaultParts.length) {
    all.push(`default:(${ownParam ?? ''})=>[${defaultParts.join(',')}]`);
  }
  if (all.length === 0) return null;
  return `{${all.join(',')}}`;
}

/** 插槽 vnode 收集时需要发射器注入的差异点（前缀 / 短别名 / 递归实现） */
export interface SlotVNodeHooks {
  text: (text: string) => string;
  interpolation: (exp: string) => string;
  conditional: (node: JSChildNode, locals: ReadonlySet<string>) => string | null;
  list: (node: JSChildNode, locals: ReadonlySet<string>) => string | null;
  element: (node: ElementNode, locals: ReadonlySet<string>) => string;
}

/** 递归收集子节点对应的 vnode 构造代码（跳过注释与动态内容） */
export function collectSlotVNodesShared(
  children: TemplateChildNode[],
  locals: ReadonlySet<string>,
  hooks: SlotVNodeHooks,
): string[] {
  const out: string[] = [];
  for (const child of children) {
    if (!child) continue;
    if (child.type === NodeTypes.TEXT) {
      const text = (child as TextNode).content;
      if (text.trim()) out.push(hooks.text(text));
      continue;
    }
    // 插值 → 动态文本 vnode：依赖由 mountComponent 的 effect 追踪，变化即整体重渲染
    if (child.type === NodeTypes.INTERPOLATION) {
      const exp = getExpContent((child as InterpolationNode).content as SimpleExpressionNode);
      if (exp) out.push(hooks.interpolation(exp));
      continue;
    }
    // v-if 的产物是条件表达式（元素已被 transform 替换掉，不再是 ELEMENT）
    if (child.type === NodeTypes.JS_CONDITIONAL_EXPRESSION) {
      const cond = hooks.conditional(child as JSChildNode, locals);
      if (cond) out.push(cond);
      continue;
    }
    // v-for 的产物是 RENDER_LIST 调用
    if (child.type === NodeTypes.JS_CALL_EXPRESSION) {
      const list = hooks.list(child as JSChildNode, locals);
      if (list) out.push(list);
      continue;
    }
    if (child.type === NodeTypes.ELEMENT) {
      const el = child as ElementNode;
      // 含 v-show 等暂不支持指令的元素不参与插槽编译 —— 宁可缺失，也不静默错渲
      if (hasUnsupportedSlotDirective(el)) continue;
      const elCode = hooks.element(el, locals);
      if (elCode) out.push(elCode);
    }
  }
  return out;
}

/** 条件 vnode 序列化时需要发射器注入的差异点 */
export interface ConditionalVNodeHooks {
  vnodeCall: (node: unknown, locals: ReadonlySet<string>) => string | null;
  conditional: (node: unknown, locals: ReadonlySet<string>) => string | null;
  testExpr: (exp: string, locals: ReadonlySet<string>) => string;
}

/**
 * `JS_CONDITIONAL_EXPRESSION`（v-if 在 Signal 模式的 transform 产物）→ `(cond ? vnode : null)`
 *
 * 返回 null 表示无法完整还原（此时调用方跳过，不下发半成品）。
 */
export function serializeConditionalVNodeShared(
  node: unknown,
  locals: ReadonlySet<string>,
  hooks: ConditionalVNodeHooks,
): string | null {
  const cond = node as { test?: unknown; consequent?: unknown; alternate?: unknown };
  if (!cond || !cond.test) return null;

  const testExp = getExpContent(cond.test as SimpleExpressionNode);
  if (!testExp) return null;

  const inner = hooks.vnodeCall(cond.consequent, locals);
  if (!inner) return null;

  // alternate 有两种形态：`v-else` 是 VNODE_CALL、`v-else-if` 是嵌套的
  // JS_CONDITIONAL_EXPRESSION（递归处理）。
  let alternate = 'null';
  if (cond.alternate) {
    const altType = (cond.alternate as { type?: number }).type;
    if (altType === NodeTypes.VNODE_CALL) {
      const alt = hooks.vnodeCall(cond.alternate, locals);
      if (!alt) return null;
      alternate = alt;
    } else if (altType === NodeTypes.JS_CONDITIONAL_EXPRESSION) {
      const alt = hooks.conditional(cond.alternate, locals);
      if (!alt) return null;
      alternate = alt;
    } else {
      return null;
    }
  }

  return `(${hooks.testExpr(testExp, locals)}?${inner}:${alternate})`;
}

/** 列表 vnode 序列化时需要发射器注入的差异点 */
export interface ListVNodeHooks {
  vnodeCall: (node: unknown, locals: ReadonlySet<string>) => string | null;
  srcExpr: (exp: string, locals: ReadonlySet<string>) => string;
}

/**
 * `RENDER_LIST` 调用（v-for 产物）→ `...((source).map((item,i)=>vnode))`
 *
 * 循环变量作为 `locals` 传入表达式前缀化，避免 `item.id` 被误加前缀。
 * 严格模式：任一段无法完整还原即整体返回 null。
 */
export function serializeListVNodeShared(
  node: unknown,
  locals: ReadonlySet<string>,
  hooks: ListVNodeHooks,
): string | null {
  const call = node as { type?: number; callee?: unknown; arguments?: unknown[] };
  if (!call || call.type !== NodeTypes.JS_CALL_EXPRESSION) return null;
  if (call.callee !== 'RENDER_LIST') return null;

  const args = call.arguments;
  if (!Array.isArray(args) || args.length < 2) return null;

  const srcNode = args[0] as SimpleExpressionNode | undefined;
  const src = srcNode && typeof srcNode.content === 'string' ? srcNode.content : null;
  if (!src) return null;

  const fn = args[1] as { type?: number; children?: unknown[] };
  if (!fn || fn.type !== NodeTypes.COMPOUND_EXPRESSION || !Array.isArray(fn.children)) return null;

  // 箭头函数头（含参数名），例如 "(item, i) => { "
  const head = fn.children.find((c): c is string => typeof c === 'string' && c.includes('=>'));
  if (!head) return null;
  const paramMatch = /^\s*\(?\s*([^)]*?)\s*\)?\s*=>/.exec(head);
  if (!paramMatch) return null;
  const params = (paramMatch[1] ?? '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
  if (params.length === 0) return null;

  const vnodeNode = fn.children.find(
    (c) => !!c && typeof c === 'object' && (c as { type?: number }).type === NodeTypes.VNODE_CALL,
  );
  if (!vnodeNode) return null;

  const innerLocals = new Set(locals);
  for (const param of params) innerLocals.add(param);

  const inner = hooks.vnodeCall(vnodeNode, innerLocals);
  if (!inner) return null;

  return `...(${hooks.srcExpr(src, locals)}.map((${params.join(',')})=>${inner}))`;
}

/** 单个 vnode 子节点序列化时需要发射器注入的差异点 */
export interface VNodeCallChildHooks {
  textVNode: (exp: string, locals: ReadonlySet<string>) => string;
  element: (node: ElementNode, locals: ReadonlySet<string>) => string | null;
  vnodeCall: (node: unknown, locals: ReadonlySet<string>) => string | null;
}

/** 子节点 → vnode 构造代码；不能完整还原时返回 null */
export function serializeVNodeCallChildShared(
  child: unknown,
  locals: ReadonlySet<string>,
  hooks: VNodeCallChildHooks,
): string | null {
  if (!child || typeof child !== 'object') return null;
  const node = child as { type?: number };

  // 插值：JS_CALL_EXPRESSION(TO_DISPLAY_STRING, expr)
  if (node.type === NodeTypes.JS_CALL_EXPRESSION) {
    const call = child as { callee?: unknown; arguments?: unknown[] };
    if (call.callee !== 'TO_DISPLAY_STRING') return null;
    const arg = (call.arguments && call.arguments[0]) as SimpleExpressionNode | undefined;
    const exp = arg && typeof arg.content === 'string' ? arg.content : null;
    if (!exp) return null;
    return hooks.textVNode(exp, locals);
  }

  // 嵌套元素
  if (node.type === NodeTypes.ELEMENT) {
    return hooks.element(child as ElementNode, locals);
  }

  // 嵌套 vnode（transform 已把子元素转成 VNODE_CALL，与 v-if 的 consequent 同类）
  if (node.type === NodeTypes.VNODE_CALL) {
    return hooks.vnodeCall(child, locals);
  }

  return null;
}

/** `VNODE_CALL.children` 序列化时需要发射器注入的差异点 */
export interface VNodeCallChildrenHooks {
  staticText: (text: string) => string;
  child: (node: unknown, locals: ReadonlySet<string>) => string | null;
}

/** `VNODE_CALL.children` → 数组代码；无法完整识别返回 null */
export function serializeVNodeCallChildrenShared(
  children: unknown,
  locals: ReadonlySet<string>,
  hooks: VNodeCallChildrenHooks,
): string | null {
  if (children === undefined || children === null) return 'null';

  if (typeof children === 'string') {
    if (!children.trim()) return 'null';
    return `[${hooks.staticText(children)}]`;
  }

  if (Array.isArray(children)) {
    const parts: string[] = [];
    for (const ch of children) {
      const code = hooks.child(ch, locals);
      if (code === null) return null;
      parts.push(code);
    }
    return parts.length ? `[${parts.join(',')}]` : 'null';
  }

  const one = hooks.child(children, locals);
  return one === null ? null : `[${one}]`;
}
