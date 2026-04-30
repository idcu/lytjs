// src/types.ts
// All type definitions for the compiler AST and options

import type { SourceLocation } from "@lytjs/common-error";
import type {
  NodeTypes,
  ElementTypes,
  TextModes,
  BindingTypes,
} from "./constants";

// ============================================================
// Source Location (re-export for convenience)
// ============================================================

export type { SourceLocation };

// ============================================================
// Position
// ============================================================

export interface Position {
  offset: number;
  line: number;
  column: number;
}

// ============================================================
// Base Node
// ============================================================

export interface BaseNode {
  type: (typeof NodeTypes)[keyof typeof NodeTypes];
  loc: SourceLocation;
}

// ============================================================
// Template AST Nodes
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
// Expression Nodes
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
// Union Types
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
export type VNodeChild =
  | JSChildNode
  | TemplateChildNode
  | TemplateChildNode[]
  | string;

export type ExpressionNode = SimpleExpressionNode | CompoundExpressionNode;

export type ParentNode = RootNode | ElementNode;

// ============================================================
// Property for codegen
// ============================================================

export type Property =
  | JSProperty
  | {
      key: string;
      value: string;
    };

// ============================================================
// Transform Types
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
// Compiler Options
// ============================================================

export interface ParserOptions {
  isCustomElement?: (tag: string) => boolean;
  isNativeTag?: (tag: string) => boolean;
  getTextMode?: (
    tag: string,
    ns: number,
  ) => (typeof TextModes)[keyof typeof TextModes];
  decodeEntities?: (text: string, strict: boolean) => string;
  onError?: (error: Error) => void;
  comments?: boolean;
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
  mode?: "module" | "function";
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

export interface CompilerOptions
  extends ParserOptions, TransformOptions, CodegenOptions {
  whitespace?: "condense" | "preserve";
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
// Transform Context
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
// Codegen Context
// ============================================================

export interface CodegenContext {
  source: string;
  code: string;
  line: number;
  column: number;
  offset: number;
  indentLevel: number;
  pure: boolean;
  map?: Record<string, number>;
  helper(key: string): string;
  push(code: string, node?: BaseNode): void;
  indent(): void;
  deindent(withoutNewline?: boolean): void;
  newline(): void;
}

// ============================================================
// Codegen Result
// ============================================================

export interface CodegenResult {
  code: string;
  preamble: string;
  ast: RootNode;
  map?: Record<string, number>;
}

// ============================================================
// Parser Context
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
