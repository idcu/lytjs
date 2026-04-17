/**
 * Lyt.js 模板编译器 — AST 节点定义
 *
 * 定义了模板编译过程中使用的所有 AST 节点类型。
 * 所有节点都继承自 ASTNode 基础接口，携带位置信息用于错误定位和 source-map。
 */

// ============================================================
// 位置信息
// ============================================================

/** 源码位置信息，用于错误报告和 source-map 生成 */
export interface Position {
  /** 在源码中的起始偏移量（字符索引） */
  start: number;
  /** 在源码中的结束偏移量（字符索引） */
  end: number;
  /** 起始行号（从 1 开始） */
  line: number;
  /** 起始列号（从 1 开始） */
  column: number;
}

// ============================================================
// 基础节点
// ============================================================

/** AST 节点联合类型 */
export type ASTNode = RootNode | ElementNode | TextNode | AttributeNode | DirectiveNode;

/** AST 节点基础接口，所有节点都包含 type 和 loc */
export interface BaseNode {
  /** 节点类型标识 */
  type: string;
  /** 源码位置信息 */
  loc: Position;
}

// ============================================================
// 根节点
// ============================================================

/** 根节点，代表整个模板的 AST 树 */
export interface RootNode extends BaseNode {
  type: 'Root';
  /** 模板的顶层子节点列表 */
  children: (ElementNode | TextNode)[];
  /** 编译过程中收集的辅助函数列表（如 createVNode, createTextVNode 等） */
  helpers: Set<string>;
}

// ============================================================
// 元素节点
// ============================================================

/** 元素节点，代表 HTML 标签或自定义组件 */
export interface ElementNode extends BaseNode {
  type: 'Element';
  /** 标签名，如 'div'、'span'、'MyComponent' */
  tag: string;
  /** 属性列表（包含静态属性、动态属性和事件绑定） */
  props: AttributeNode[];
  /** 子节点列表 */
  children: (ElementNode | TextNode)[];
  /** 是否为组件（大写开头或已注册的组件名） */
  isComponent: boolean;
  /** 指令列表（if/each/bind/on/slot/ref） */
  directives: DirectiveNode[];
  /** 静态提升标记：-1 表示未分析，0 表示动态，1 表示静态 */
  staticFlag: number;
  /** 是否为自闭合标签 */
  isSelfClosing: boolean;
}

// ============================================================
// 文本节点
// ============================================================

/** 文本节点，代表元素内部的文本内容 */
export interface TextNode extends BaseNode {
  type: 'Text';
  /** 文本内容，可能包含 {{ expression }} 插值 */
  content: string;
  /** 是否为表达式文本（包含 {{ }} 插值） */
  isExpression: boolean;
  /** 静态提升标记 */
  staticFlag: number;
}

// ============================================================
// 属性节点
// ============================================================

/** 属性节点，代表元素的属性 */
export interface AttributeNode extends BaseNode {
  type: 'Attribute';
  /** 属性名，如 'class'、'id'、'style' */
  name: string;
  /** 属性值，可能为 null（布尔属性如 disabled） */
  value: string | null;
  /** 是否为动态属性（以 : 或 v-bind: 开头，如 :class、:style） */
  isDynamic: boolean;
  /** 是否为事件绑定（以 @ 或 v-on: 开头，如 @click、@input） */
  isEvent: boolean;
}

// ============================================================
// 指令节点
// ============================================================

/** 指令节点，代表 Lyt.js 的模板指令 */
export interface DirectiveNode extends BaseNode {
  type: 'Directive';
  /** 指令名称 */
  name: 'if' | 'each' | 'bind' | 'on' | 'slot' | 'ref';
  /** 指令值（表达式字符串），如 'show'、'items'、'value' */
  value: string;
  /** 指令参数，如 v-bind:class 中的 'class' */
  arg: string;
  /** 指令修饰符，如 v-on:click.prevent 中的 ['prevent'] */
  modifiers: string[];
}

// ============================================================
// 工厂函数 — 创建各类 AST 节点
// ============================================================

/** 创建位置信息 */
export function createPosition(
  start: number,
  end: number,
  line: number,
  column: number
): Position {
  return { start, end, line, column };
}

/** 创建根节点 */
export function createRootNode(loc: Position): RootNode {
  return {
    type: 'Root',
    children: [],
    helpers: new Set(),
    loc,
  };
}

/** 创建元素节点 */
export function createElementNode(
  tag: string,
  loc: Position,
  isSelfClosing: boolean = false
): ElementNode {
  return {
    type: 'Element',
    tag,
    props: [],
    children: [],
    isComponent: /^[A-Z]/.test(tag),
    directives: [],
    staticFlag: -1,
    isSelfClosing,
    loc,
  };
}

/** 创建文本节点 */
export function createTextNode(content: string, loc: Position): TextNode {
  return {
    type: 'Text',
    content,
    isExpression: /\{\{.*?\}\}/.test(content),
    staticFlag: -1,
    loc,
  };
}

/** 创建属性节点 */
export function createAttributeNode(
  name: string,
  value: string | null,
  loc: Position
): AttributeNode {
  return {
    type: 'Attribute',
    name,
    value,
    isDynamic: /^:|^v-bind:/.test(name),
    isEvent: /^@|^v-on:/.test(name),
    loc,
  };
}

/** 创建指令节点 */
export function createDirectiveNode(
  name: DirectiveNode['name'],
  value: string,
  arg: string = '',
  modifiers: string[] = [],
  loc: Position = { start: 0, end: 0, line: 1, column: 1 }
): DirectiveNode {
  return {
    type: 'Directive',
    name,
    value,
    arg,
    modifiers,
    loc,
  };
}
