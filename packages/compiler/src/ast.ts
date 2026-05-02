// src/ast.ts
// AST node creation helper functions

import { NodeTypes, ElementTypes } from './constants';
import type {
  RootNode,
  ElementNode,
  TextNode,
  CommentNode,
  InterpolationNode,
  AttributeNode,
  DirectiveNode,
  SimpleExpressionNode,
  CompoundExpressionNode,
  VNodeCall,
  JSCallExpression,
  JSObjectExpression,
  JSProperty,
  JSArrayExpression,
  JSConditionalExpression,
  JSChildNode,
  ExpressionNode,
  TemplateChildNode,
  SourceLocation,
} from './types';

function createLoc(source: string, offset: number, length: number): SourceLocation {
  if (__DEV__) {
    if (offset < 0 || length < 0 || offset + length > source.length) {
      console.warn(
        `[LytJS] createLoc: invalid range offset=${offset}, length=${length}, source.length=${source.length}`,
      );
    }
  }
  const lines = source.slice(0, offset).split('\n');
  const line = lines.length;
  const column = (lines[line - 1] ?? '').length + 1;
  const endLines = source.slice(0, offset + length).split('\n');
  const endLine = endLines.length;
  const endColumn = (endLines[endLine - 1] ?? '').length + 1;
  return {
    start: { line, column, offset },
    end: { line: endLine, column: endColumn, offset: offset + length },
    source: source.slice(offset, offset + length),
  };
}

const DEFAULT_LOC: SourceLocation = {
  start: { line: 1, column: 1, offset: 0 },
  end: { line: 1, column: 1, offset: 0 },
  source: '',
};

export function createRoot(children: TemplateChildNode[], source = ''): RootNode {
  return {
    type: NodeTypes.ROOT,
    children,
    helpers: [],
    components: [],
    directives: [],
    hoists: [],
    codegenNode: undefined,
    imports: [],
    cached: 0,
    temps: 0,
    loc: createLoc(source, 0, source.length),
  };
}

export function createElement(
  tag: string,
  props: (AttributeNode | DirectiveNode)[] = [],
  children: TemplateChildNode[] = [],
  loc: SourceLocation = DEFAULT_LOC,
): ElementNode {
  return {
    type: NodeTypes.ELEMENT,
    ns: 0,
    tag,
    tagType: ElementTypes.ELEMENT,
    isSelfClosing: false,
    props,
    children,
    codegenNode: undefined,
    patchFlag: 0,
    dynamicChildren: undefined,
    isStatic: false,
    isBlock: false,
    ref: undefined,
    scopeId: undefined,
    slots: undefined,
    slotScopeNodes: [],
    loc,
  };
}

export function createText(content: string, loc: SourceLocation = DEFAULT_LOC): TextNode {
  return {
    type: NodeTypes.TEXT,
    content,
    isStatic: true,
    loc,
  };
}

export function createComment(content: string, loc: SourceLocation = DEFAULT_LOC): CommentNode {
  return {
    type: NodeTypes.COMMENT,
    content,
    loc,
  };
}

export function createInterpolation(
  content: ExpressionNode,
  loc: SourceLocation = DEFAULT_LOC,
): InterpolationNode {
  return {
    type: NodeTypes.INTERPOLATION,
    content,
    isStatic: false,
    loc,
  };
}

export function createAttribute(
  name: string,
  value: TextNode | undefined = undefined,
  loc: SourceLocation = DEFAULT_LOC,
): AttributeNode {
  return {
    type: NodeTypes.ATTRIBUTE,
    name,
    value,
    loc,
  };
}

export function createDirective(
  name: string,
  arg: ExpressionNode | undefined = undefined,
  exp: ExpressionNode | undefined = undefined,
  modifiers: string[] = [],
  loc: SourceLocation = DEFAULT_LOC,
): DirectiveNode {
  return {
    type: NodeTypes.DIRECTIVE,
    name,
    arg,
    exp,
    modifiers,
    loc,
  };
}

export function createSimpleExpression(
  content: string,
  isStatic = false,
  loc: SourceLocation = DEFAULT_LOC,
  isConstant = false,
): SimpleExpressionNode {
  return {
    type: NodeTypes.SIMPLE_EXPRESSION,
    content,
    isStatic,
    isConstant,
    loc,
  };
}

export function createCompoundExpression(
  children: (TemplateChildNode | SimpleExpressionNode | string)[],
  loc: SourceLocation = DEFAULT_LOC,
): CompoundExpressionNode {
  return {
    type: NodeTypes.COMPOUND_EXPRESSION,
    children,
    isConstant: false,
    loc,
  };
}

export function createVNodeCall(
  tag: string | VNodeCall | JSCallExpression,
  props: JSObjectExpression | undefined = undefined,
  children: JSChildNode | TemplateChildNode[] | string | undefined = undefined,
  patchFlag: string | number | undefined = undefined,
  dynamicProps: JSChildNode | undefined = undefined,
  directives: JSChildNode[] | undefined = undefined,
  isBlock = false,
  disableTracking = false,
  isComponent = false,
  loc: SourceLocation = DEFAULT_LOC,
): VNodeCall {
  return {
    type: NodeTypes.VNODE_CALL,
    tag,
    props,
    children,
    patchFlag: patchFlag !== undefined ? String(patchFlag) : undefined,
    dynamicProps,
    directives,
    isBlock,
    disableTracking,
    isComponent,
    loc,
  };
}

export function createObjectExpression(
  properties: JSProperty[] = [],
  loc: SourceLocation = DEFAULT_LOC,
): JSObjectExpression {
  return {
    type: NodeTypes.JS_OBJECT_EXPRESSION,
    properties,
    loc,
  };
}

export function createObjectProperty(
  key: JSChildNode,
  value: JSChildNode,
  loc: SourceLocation = DEFAULT_LOC,
): JSProperty {
  return {
    type: NodeTypes.JS_PROPERTY,
    key,
    value,
    loc,
  };
}

export function createCallExpression(
  callee: string | symbol,
  args: (JSChildNode | string | TemplateChildNode | TemplateChildNode[])[] = [],
  loc: SourceLocation = DEFAULT_LOC,
): JSCallExpression {
  return {
    type: NodeTypes.JS_CALL_EXPRESSION,
    callee,
    arguments: args,
    loc,
  };
}

export function createConditionalExpression(
  test: JSChildNode | string,
  consequent: JSChildNode | TemplateChildNode | TemplateChildNode[],
  alternate: JSChildNode | TemplateChildNode | TemplateChildNode[] | undefined,
  newline = true,
  loc: SourceLocation = DEFAULT_LOC,
): JSConditionalExpression {
  return {
    type: NodeTypes.JS_CONDITIONAL_EXPRESSION,
    test,
    consequent,
    alternate,
    newline,
    loc,
  };
}

export function createArrayExpression(
  elements: JSChildNode[] = [],
  loc: SourceLocation = DEFAULT_LOC,
): JSArrayExpression {
  return {
    type: NodeTypes.JS_ARRAY_EXPRESSION,
    elements,
    loc,
  };
}
