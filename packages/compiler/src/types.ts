// src/types.ts
// 编译器 AST 和选项的所有类型定义

import type { SourceLocation } from '@lytjs/common-error';
import type { NodeTypes, ElementTypes, TextModes, BindingTypes } from './constants';

// ============================================================
// 源码位置（为方便起见重新导出）
// ============================================================

export type { SourceLocation };

// ============================================================
// 位置
// ============================================================

export interface Position {
  offset: number;
  line: number;
  column: number;
}

// ============================================================
// 基础节点
// ============================================================

export interface BaseNode {
  type: (typeof NodeTypes)[keyof typeof NodeTypes];
  loc: SourceLocation;
}

// ============================================================
// 模板 AST 节点
// ============================================================

export interface RootNode extends BaseNode {
  type: typeof NodeTypes.ROOT;
  children: TemplateChildNode[];
  helpers: string[];
  components: string[];
  directives: string[];
  hoists: JSChildNode[];
  codegenNode: JSChildNode | undefined;
  imports: string[];
  cached: number;
  temps: number;
  ssrHelpers?: string[];
}

export interface ElementNode extends BaseNode {
  type: typeof NodeTypes.ELEMENT;
  ns: number;
  tag: string;
  tagType: (typeof ElementTypes)[keyof typeof ElementTypes];
  isSelfClosing: boolean;
  props: (AttributeNode | DirectiveNode)[];
  children: TemplateChildNode[];
  codegenNode: VNodeCall | undefined;
  patchFlag: number;
  patchFlagForChildren?: number;
  dynamicChildren?: JSChildNode[];
  isStatic: boolean;
  isBlock: boolean;
  ref: string | undefined;
  scopeId: string | undefined;
  slots: TemplateChildNode[] | undefined;
  slotScopeNodes: TemplateChildNode[];
  cachedIndex?: number;
  onceId?: number;
}

export interface TextNode extends BaseNode {
  type: typeof NodeTypes.TEXT;
  content: string;
  isStatic: boolean;
}

export interface CommentNode extends BaseNode {
  type: typeof NodeTypes.COMMENT;
  content: string;
}

export interface InterpolationNode extends BaseNode {
  type: typeof NodeTypes.INTERPOLATION;
  content: ExpressionNode;
  isStatic: boolean;
}

export interface AttributeNode extends BaseNode {
  type: typeof NodeTypes.ATTRIBUTE;
  name: string;
  value: TextNode | undefined;
}

export interface DirectiveNode extends BaseNode {
  type: typeof NodeTypes.DIRECTIVE;
  name: string;
  arg: ExpressionNode | undefined;
  exp: ExpressionNode | undefined;
  modifiers: string[];
}

// ============================================================
// 表达式节点
// ============================================================

export interface SimpleExpressionNode extends BaseNode {
  type: typeof NodeTypes.SIMPLE_EXPRESSION;
  content: string;
  isStatic: boolean;
  isConstant: boolean;
  identifiers?: string[];
}

export interface CompoundExpressionNode extends BaseNode {
  type: typeof NodeTypes.COMPOUND_EXPRESSION;
  children: (TemplateChildNode | SimpleExpressionNode | string)[];
  identifiers?: string[];
  isConstant: boolean;
}

// ============================================================
// JS AST Nodes (Codegen Nodes)
// ============================================================

export interface VNodeCall extends BaseNode {
  type: typeof NodeTypes.VNODE_CALL;
  tag: string | JSChildNode;
  props: JSChildNode | undefined;
  children: JSChildNode | TemplateChildNode[] | string | undefined;
  patchFlag: string | number | undefined;
  dynamicProps: JSChildNode | undefined;
  directives: JSChildNode[] | undefined;
  isBlock: boolean;
  disableTracking: boolean;
  isComponent: boolean;
}

export interface JSCallExpression extends BaseNode {
  type: typeof NodeTypes.JS_CALL_EXPRESSION;
  callee: string | symbol;
  arguments: (JSChildNode | string | TemplateChildNode | TemplateChildNode[])[];
}

export interface JSObjectExpression extends BaseNode {
  type: typeof NodeTypes.JS_OBJECT_EXPRESSION;
  properties: JSProperty[];
}

export interface JSProperty extends BaseNode {
  type: typeof NodeTypes.JS_PROPERTY;
  key: JSChildNode;
  value: JSChildNode;
}

export interface JSArrayExpression extends BaseNode {
  type: typeof NodeTypes.JS_ARRAY_EXPRESSION;
  elements: JSChildNode[];
}

export interface JSFunctionExpression extends BaseNode {
  type: typeof NodeTypes.JS_FUNCTION_EXPRESSION;
  params: (string | JSChildNode)[];
  returns: JSChildNode | TemplateChildNode | TemplateChildNode[];
  body?: JSChildNode;
  newline: boolean;
  isSlot: boolean;
}

export interface JSConditionalExpression extends BaseNode {
  type: typeof NodeTypes.JS_CONDITIONAL_EXPRESSION;
  test: JSChildNode | string;
  consequent: JSChildNode | TemplateChildNode | TemplateChildNode[];
  alternate: JSChildNode | TemplateChildNode | TemplateChildNode[] | undefined;
  newline: boolean;
}

export interface JSCacheExpression extends BaseNode {
  type: typeof NodeTypes.JS_CACHE_EXPRESSION;
  index: number;
  value: JSChildNode;
}

// ============================================================
// 联合类型
// ============================================================

export type JSChildNode =
  | VNodeCall
  | JSCallExpression
  | JSObjectExpression
  | JSProperty
  | JSArrayExpression
  | JSFunctionExpression
  | JSConditionalExpression
  | JSCacheExpression
  | SimpleExpressionNode
  | CompoundExpressionNode;

export type TemplateChildNode =
  | ElementNode
  | TextNode
  | CommentNode
  | InterpolationNode
  | SimpleExpressionNode
  | CompoundExpressionNode
  | JSChildNode;

/**
 * VNode children type - represents the possible types for VNodeCall.children
 * and conditional expression branches.
 */
export type VNodeChild = JSChildNode | TemplateChildNode | TemplateChildNode[] | string;

export type ExpressionNode = SimpleExpressionNode | CompoundExpressionNode;

export type ParentNode = RootNode | ElementNode;

// ============================================================
// 代码生成属性
// ============================================================

export type Property =
  | JSProperty
  | {
      key: string;
      value: string;
    };

// ============================================================
// 转换类型
// ============================================================

export type NodeTransform = (
  node: RootNode | ElementNode | TextNode | InterpolationNode | CommentNode,
  context: TransformContext,
) => void | (() => void) | (() => void)[];

export type DirectiveTransform = (
  dir: DirectiveNode,
  node: ElementNode,
  context: TransformContext,
) => DirectiveTransformResult;

export interface DirectiveTransformResult {
  props: Property[];
  needRuntime?: boolean | string | symbol;
}

// ============================================================
// 编译器选项
// ============================================================

export interface ParserOptions {
  isCustomElement?: (tag: string) => boolean;
  isNativeTag?: (tag: string) => boolean;
  getTextMode?: (tag: string, ns: number) => (typeof TextModes)[keyof typeof TextModes];
  decodeEntities?: (text: string, strict: boolean) => string;
  onError?: (error: Error) => void;
  comments?: boolean;
  /**
   * 是否启用裸指令名解析（"所见即所得"模式）。默认为 true。
   * 设为 false 时，所有裸指令名将被视为普通 HTML 属性。
   */
  bareDirectives?: boolean;
}

export interface TransformOptions {
  nodeTransforms?: NodeTransform[];
  directiveTransforms?: Record<string, DirectiveTransform>;
  isBuiltInComponent?: (tag: string) => symbol | undefined;
  isCustomElement?: (tag: string) => boolean;
  expressionPlugins?: string[];
  scopeId?: string | null;
  slotted?: boolean;
  ssr?: boolean;
  inSSR?: boolean;
  ssrCssVars?: string[];
  bindingMetadata?: BindingMetadata;
  inline?: boolean;
  isTS?: boolean;
  onError?: (error: Error) => void;
  onWarn?: (warning: string) => void;
}

export interface CodegenOptions {
  mode?: 'module' | 'function';
  prefixIdentifiers?: boolean;
  sourceMap?: boolean;
  filename?: string;
  scopeId?: string | null;
  optimizeImports?: boolean;
  runtimeGlobalName?: string;
  runtimeModuleName?: string;
  ssrRuntimeModuleName?: string;
  ssr?: boolean;
  inSSR?: boolean;
  isTS?: boolean;
  emitStatic?: boolean;
}

export interface CompilerOptions extends ParserOptions, TransformOptions, CodegenOptions {
  whitespace?: 'condense' | 'preserve';
  /** 渲染模式：'vnode' 使用 VNode diff，'signal' 使用 Signal + 直接 DOM 操作，'vapor' 是 'signal' 的别名 */
  rendererMode?: 'vnode' | 'signal' | 'vapor';
  /** SSR 编译模式：启用后跳过客户端专用指令（v-on, v-model, v-show），生成 renderToString 格式代码 */
  ssrMode?: boolean;
  /** 
   * Phase 1.1: Signal 模式代码优化
   * 启用后使用优化版本的代码生成器，生成更紧凑的代码
   * - 短导入别名：effect -> e, setText -> x 等
   * - 合并多个 effect 为单个 effect
   * - 更短的变量名：_div -> _0
   * 默认为 true
   */
  optimizeSignal?: boolean;
}

export interface BindingMetadata {
  [key: string]: BindingMetadataValue | undefined;
}

export type BindingMetadataValue =
  | {
      type: typeof BindingTypes.DATA;
      declared?: boolean;
    }
  | {
      type: typeof BindingTypes.PROPS;
      declared?: boolean;
    }
  | {
      type: typeof BindingTypes.SETUP;
      declared?: boolean;
    }
  | {
      type: typeof BindingTypes.LITERAL_CONST;
    };

// ============================================================
// 转换上下文
// ============================================================

export interface TransformContext {
  self: TransformContext;
  parent: ParentNode | null;
  rootNode: RootNode;
  helpers: Map<string, number>;
  components: Set<string>;
  directives: Set<string>;
  hoists: JSChildNode[];
  temps: number;
  cached: number;
  identifiers: Set<string>;
  scopes: { vFor: number; vOnce: number }[];
  filters?: Set<string>;
  childIndex: number;
  // FIX: P2-27 添加 __counters 字段，用于存储转换器内部计数器（如解构计数器）
  __counters?: Record<string, number>;
  helper<T extends string>(name: T): T;
  helperString(name: string): string;
  replaceNode(node: TemplateChildNode): void;
  removeNode(node: TemplateChildNode | null): void;
  onNodeRemoved(): void;
  addIdentifiers(exp: ExpressionNode | string): void;
  removeIdentifiers(exp: ExpressionNode | string): void;
  addHoist(node: JSChildNode): void;
  addTemp(): number;
  addCache(index: number): void;
  currentNode: RootNode | TemplateChildNode | null;
  error(msg: string, node?: BaseNode): void;
}

// ============================================================
// 代码生成上下文
// ============================================================

export interface CodegenContext {
  source: string;
  line: number;
  column: number;
  offset: number;
  indentLevel: number;
  pure: boolean;
  helper(key: string): string;
  push(code: string, node?: BaseNode): void;
  indent(): void;
  deindent(withoutNewline?: boolean): void;
  newline(): void;
}

// ============================================================
// 原始 Source Map
// ============================================================

export interface RawSourceMap {
  version: number;
  file: string;
  sourceRoot?: string;
  sources: string[];
  sourcesContent: string[];
  names: string[];
  mappings: string;
}

// ============================================================
// 代码生成结果
// ============================================================

export interface CodegenResult {
  code: string;
  preamble: string;
  ast: RootNode;
  /** Source map（RawSourceMap 格式） */
  map?: RawSourceMap;
}

// ============================================================
// 解析器上下文
// ============================================================

export interface ParserContext {
  options: ParserOptions;
  readonly originalSource: string;
  source: string;
  offset: number;
  line: number;
  column: number;
  inPre: boolean;
  inVPre: boolean;
  onWarn?: (warning: string) => void;
}
