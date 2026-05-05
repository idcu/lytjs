// src/codegen.ts
// Code generator - generates render function code from AST

import { NodeTypes } from './constants';
import { describePatchFlag } from '@lytjs/common-vnode';
import type {
  RootNode,
  JSChildNode,
  VNodeCall,
  JSCallExpression,
  JSObjectExpression,
  JSProperty,
  JSArrayExpression,
  JSConditionalExpression,
  TextNode,
  InterpolationNode,
  SimpleExpressionNode,
  CompoundExpressionNode,
  TemplateChildNode,
  ElementNode,
  CodegenResult,
  CodegenContext,
  CodegenOptions,
  BaseNode,
} from './types';
import { helperNameMap } from './constants';
import { SourceMapGenerator } from './source-map';

// ============================================================
// Main generate function
// ============================================================

// FIX: P1-3 COMPILER-NEW-04 - 死代码检测：检查是否为空语句序列
function isDeadCode(node: JSChildNode | TemplateChildNode | undefined): boolean {
  if (!node) return true;
  // 空数组表示空语句序列
  if (Array.isArray(node) && node.length === 0) return true;
  // 空文本节点
  if (typeof node === 'object' && 'type' in node && node.type === NodeTypes.TEXT) {
    const textNode = node as TextNode;
    if (!textNode.content || textNode.content.trim() === '') return true;
  }
  // 空复合表达式
  if (typeof node === 'object' && 'type' in node && node.type === NodeTypes.COMPOUND_EXPRESSION) {
    const compoundNode = node as CompoundExpressionNode;
    if (!compoundNode.children || compoundNode.children.length === 0) return true;
  }
  return false;
}

export function generate(ast: RootNode, options: CodegenOptions = {}): CodegenResult {
  const { context, codeParts, sourceMapGen } = createCodegenContext(ast, options);

  // Generate helper imports (preamble)
  const preamble = genHelperImports(ast.helpers, options.runtimeModuleName);

  // Generate hoisted variable declarations
  if (ast.hoists && ast.hoists.length > 0) {
    for (let i = 0; i < ast.hoists.length; i++) {
      const hoistedNode = ast.hoists[i];
      // FIX: P1-3 COMPILER-NEW-04 - 跳过死代码（空语句序列）
      if (isDeadCode(hoistedNode as JSChildNode)) {
        continue;
      }
      context.push(`const _hoisted_${i + 1} = `);
      genNode(hoistedNode as JSChildNode, context);
      context.push(`\n`);
    }
    context.push(`\n`);
  }

  // Generate render function
  // FIX: P2-23 生成代码可读性优化：添加函数注释
  context.push(`// Render function\n`);
  context.push(`function render(_ctx, _cache) {\n`);
  context.indent();

  // FIX: P1-3 COMPILER-NEW-04 - 检查 codegenNode 是否为空/死代码
  if (ast.codegenNode && !isDeadCode(ast.codegenNode)) {
    context.push(`return `);
    genNode(ast.codegenNode, context);
    context.push(`\n`);
  }

  context.deindent();
  context.push(`}`);

  const code = codeParts.join('');

  return {
    code,
    preamble,
    ast,
    map: sourceMapGen ? sourceMapGen.toJSON() : undefined,
  };
}

// ============================================================
// Codegen Context
// ============================================================

function createCodegenContext(
  ast: RootNode,
  options: CodegenOptions,
): {
  context: CodegenContext;
  codeParts: string[];
  sourceMapGen: SourceMapGenerator | null;
} {
  const helpers = new Map<string, string>();
  // FIX: P1-26 移除冗余的局部 indentLevel 变量，消除双重跟踪问题。
  // 之前 context.indentLevel 和局部 indentLevel 同时存在，可能导致不同步。
  // 现在只使用 context.indentLevel 作为唯一的缩进级别来源。
  const codeParts: string[] = [];

  // Source map support
  const sourceMapGen: SourceMapGenerator | null = options.sourceMap
    ? new SourceMapGenerator(options.filename ?? 'template.html')
    : null;

  if (sourceMapGen) {
    sourceMapGen.addSource(options.filename ?? 'template.html', ast.loc.source);
  }

  // Track current generated position for source mapping
  let currentLine = 0;
  let currentColumn = 0;

  const context: CodegenContext = {
    source: ast.loc.source,
    line: 1,
    column: 1,
    offset: 0,
    indentLevel: 0,
    pure: false,

    helper(key: string): string {
      const mapped = helperNameMap[key] ?? key;
      helpers.set(key, mapped);
      return mapped;
    },

    push(c: string, node?: BaseNode): void {
      codeParts.push(c);

      // Update generated position tracking
      for (let i = 0; i < c.length; i++) {
        if (c[i] === '\n') {
          currentLine++;
          currentColumn = 0;
        } else {
          currentColumn++;
        }
      }

      // Add source mapping if source map is enabled and node has location info
      if (sourceMapGen && node?.loc?.start) {
        sourceMapGen.addMapping(
          node.loc.start.line - 1, // Convert to 0-based
          node.loc.start.column - 1,
          currentLine,
          currentColumn - c.length, // Map to the start of this push
        );
      }
    },

    indent(): void {
      context.indentLevel++;
    },

    deindent(withoutNewline?: boolean): void {
      if (context.indentLevel > 0) {
        context.indentLevel--;
      }
      if (!withoutNewline) {
        codeParts.push(`\n${'  '.repeat(context.indentLevel)}`);
        currentLine++;
        currentColumn = context.indentLevel * 2;
      }
    },

    newline(): void {
      // FIX: P0-1 修复 newline() 引用未定义变量 indentLevel，改为使用 context.indentLevel
      codeParts.push(`\n${'  '.repeat(context.indentLevel)}`);
      currentLine++;
      currentColumn = context.indentLevel * 2;
    },
  };

  return { context, codeParts, sourceMapGen };
}

// ============================================================
// Generate helper imports
// ============================================================

function genHelperImports(helpers: string[], runtimeModuleName?: string): string {
  if (helpers.length === 0) return '';

  const imports = helpers.map((h) => helperNameMap[h] ?? h);
  const uniqueImports = [...new Set(imports)];

  // FIX: P1-13 使模块名可配置，通过编译选项 runtimeModuleName 传入，默认值改为 '@lytjs/core'
  const moduleName = runtimeModuleName ?? '@lytjs/core';
  return `import { ${uniqueImports.join(', ')} } from '${moduleName}';\n`;
}

// ============================================================
// Generate node
// ============================================================

function genNode(node: JSChildNode | TemplateChildNode, context: CodegenContext): void {
  switch (node.type) {
    case NodeTypes.VNODE_CALL:
      genVNodeCall(node as VNodeCall, context);
      break;
    case NodeTypes.JS_CALL_EXPRESSION:
      genCallExpression(node as JSCallExpression, context);
      break;
    case NodeTypes.JS_OBJECT_EXPRESSION:
      genObjectExpression(node as JSObjectExpression, context);
      break;
    case NodeTypes.JS_PROPERTY:
      genProperty(node as JSProperty, context);
      break;
    case NodeTypes.JS_ARRAY_EXPRESSION:
      genArrayExpression(node as JSArrayExpression, context);
      break;
    case NodeTypes.JS_CONDITIONAL_EXPRESSION:
      genConditional(node as JSConditionalExpression, context);
      break;
    case NodeTypes.TEXT:
      genText(node as TextNode, context);
      break;
    case NodeTypes.INTERPOLATION:
      genInterpolation(node as InterpolationNode, context);
      break;
    case NodeTypes.SIMPLE_EXPRESSION:
      genExpression(node as SimpleExpressionNode, context);
      break;
    case NodeTypes.COMPOUND_EXPRESSION:
      genCompoundExpression(node as CompoundExpressionNode, context);
      break;
    case NodeTypes.ELEMENT:
      genElement(node as ElementNode, context);
      break;
    default: {
      // Fallback: exhaustive check for unknown node types.
      // This branch should never be reached if all NodeTypes are handled above.
      const nodeType = (node as { type?: string | number }).type;
      throw new Error(`[LytJS compiler] Codegen: unknown node type "${nodeType ?? 'unknown'}"`);
    }
  }
}

// ============================================================
// Generate VNodeCall
// ============================================================

function genVNodeCall(node: VNodeCall, context: CodegenContext): void {
  const { tag, props, children, patchFlag, isBlock } = node;

  if (isBlock) {
    // Block 节点：生成 openBlock() 前缀
    context.push(`${context.helper('OPEN_BLOCK')}()`, node);
    context.push('\n');
    context.indent();

    context.push(`${context.helper('CREATE_BLOCK')}(`, node);
  } else {
    // 普通节点：生成 createVNode 调用
    context.push(`${context.helper('CREATE_VNODE')}(`, node);
  }

  // Tag
  genNodeExpr(tag, context);
  context.push(', ', node);

  // Props
  if (props) {
    genNode(props, context);
  } else {
    context.push('null', node);
  }

  // Children
  if (children !== undefined) {
    context.push(', ', node);
    if (typeof children === 'string') {
      context.push(JSON.stringify(children), node);
    } else if (Array.isArray(children)) {
      genChildrenArray(children, context);
    } else {
      genNode(children, context);
    }
  }

  // Patch flag
  if (patchFlag !== undefined) {
    context.push(', ', node);
    const flagStr = typeof patchFlag === 'string' ? patchFlag : String(patchFlag);
    context.push(flagStr, node);
    const flagNum = parseInt(flagStr, 10);
    if (!isNaN(flagNum)) {
      context.push(` /* ${describePatchFlag(flagNum)} */`, node);
    }
  }

  context.push(')', node);

  if (isBlock) {
    context.push('\n');
    context.deindent();
  }
}

// ============================================================
// Generate CallExpression
// ============================================================

function genCallExpression(node: JSCallExpression, context: CodegenContext): void {
  const callee =
    typeof node.callee === 'string' ? context.helper(node.callee) : String(node.callee);

  context.push(`${callee}(`, node);

  for (let i = 0; i < node.arguments.length; i++) {
    const arg = node.arguments[i];
    if (arg === undefined) continue;
    if (i > 0) {
      context.push(', ', node);
    }
    if (typeof arg === 'string') {
      context.push(arg, node);
    } else if (Array.isArray(arg)) {
      genChildrenArray(arg, context);
    } else {
      genNode(arg, context);
    }
  }

  context.push(')', node);
}

// ============================================================
// Generate ObjectExpression
// ============================================================

function genObjectExpression(node: JSObjectExpression, context: CodegenContext): void {
  const { properties } = node;

  if (properties.length === 0) {
    context.push('{}', node);
    return;
  }

  context.push('{ ', node);

  for (let i = 0; i < properties.length; i++) {
    const prop = properties[i];
    if (prop === undefined) continue;
    if (i > 0) {
      context.push(', ', node);
    }
    genNode(prop, context);
  }

  context.push(' }', node);
}

// ============================================================
// Generate Property
// ============================================================

function genProperty(node: JSProperty, context: CodegenContext): void {
  const { key, value } = node;

  if (key.type === NodeTypes.SIMPLE_EXPRESSION) {
    context.push(key.content, node);
  } else {
    genNode(key, context);
  }

  context.push(': ', node);
  genNode(value, context);
}

// ============================================================
// Generate ArrayExpression
// ============================================================

function genArrayExpression(node: JSArrayExpression, context: CodegenContext): void {
  context.push('[', node);

  for (let i = 0; i < node.elements.length; i++) {
    const el = node.elements[i];
    if (el === undefined) continue;
    if (i > 0) {
      context.push(', ', node);
    }
    genNode(el, context);
  }

  context.push(']', node);
}

// ============================================================
// Generate ConditionalExpression
// ============================================================

function genConditional(node: JSConditionalExpression, context: CodegenContext): void {
  const { test, consequent, alternate } = node;

  context.push('(', node);

  if (typeof test === 'string') {
    context.push(test, node);
  } else {
    genNode(test, context);
  }

  context.push(' ? ', node);

  if (typeof consequent === 'string') {
    context.push(consequent, node);
  } else if (Array.isArray(consequent)) {
    genChildrenArray(consequent, context);
  } else {
    genNode(consequent, context);
  }

  context.push(' : ', node);

  if (typeof alternate === 'string') {
    context.push(alternate, node);
  } else if (Array.isArray(alternate)) {
    genChildrenArray(alternate, context);
  } else if (alternate) {
    genNode(alternate, context);
  }

  context.push(')', node);
}

// ============================================================
// Generate Text
// ============================================================

function genText(node: TextNode, context: CodegenContext): void {
  context.push(JSON.stringify(node.content), node);
}

// ============================================================
// Generate Interpolation
// ============================================================

function genInterpolation(node: InterpolationNode, context: CodegenContext): void {
  context.push(`${context.helper('TO_DISPLAY_STRING')}(`, node);
  genNode(node.content, context);
  context.push(')', node);
}

// ============================================================
// Generate Expression
// ============================================================

function genExpression(node: SimpleExpressionNode, context: CodegenContext): void {
  context.push(node.content, node);
}

// ============================================================
// Generate CompoundExpression
// ============================================================

function genCompoundExpression(node: CompoundExpressionNode, context: CodegenContext): void {
  for (const child of node.children) {
    if (typeof child === 'string') {
      context.push(child, node);
    } else if (child.type === NodeTypes.SIMPLE_EXPRESSION) {
      context.push(child.content, node);
    } else if (child.type === NodeTypes.INTERPOLATION) {
      context.push(`${context.helper('TO_DISPLAY_STRING')}(`, node);
      genNode(child.content, context);
      context.push(')', node);
    } else {
      genNode(child, context);
    }
  }
}

// ============================================================
// Generate Element
// ============================================================

function genElement(node: ElementNode, context: CodegenContext): void {
  if (node.codegenNode) {
    genNode(node.codegenNode, context);
  } else {
    const callee = context.helper('CREATE_VNODE');
    context.push(`${callee}(${JSON.stringify(node.tag)}`, node);

    if (node.props.length > 0) {
      context.push(', { ', node);
      for (let i = 0; i < node.props.length; i++) {
        const prop = node.props[i];
        if (prop === undefined) continue;
        if (i > 0) context.push(', ', node);
        if (prop.type === NodeTypes.ATTRIBUTE) {
          context.push(`${JSON.stringify(prop.name)}: `, node);
          if (prop.value) {
            context.push(JSON.stringify(prop.value.content), node);
          } else {
            context.push('true', node);
          }
        }
      }
      context.push(' }', node);
    }

    if (node.children.length > 0) {
      context.push(', ', node);
      genChildrenArray(node.children, context);
    }

    context.push(')', node);
  }
}

// ============================================================
// Generate children array
// ============================================================

function genChildrenArray(children: TemplateChildNode[], context: CodegenContext): void {
  context.push('[', undefined);

  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (child === undefined) continue;
    if (i > 0) {
      context.push(', ', undefined);
    }
    genNode(child, context);
  }

  context.push(']', undefined);
}

// ============================================================
// Generate node expression (string or node)
// ============================================================

function genNodeExpr(expr: string | JSChildNode, context: CodegenContext): void {
  if (typeof expr === 'string') {
    context.push(expr, undefined);
  } else {
    genNode(expr, context);
  }
}

// ============================================================
// Helpers
// ============================================================
