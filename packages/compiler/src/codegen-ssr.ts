// src/codegen-ssr.ts
// SSR code generator - generates renderToString format code from AST
//
// SSR 模式下：
// - 跳过事件绑定（v-on）
// - 跳过双向绑定（v-model）
// - 跳过 v-show
// - 保留 v-if/v-for/v-text/v-html/v-bind
// - 生成 renderToString 格式的代码

import { NodeTypes } from './constants';
import type {
  RootNode,
  ElementNode,
  TextNode,
  InterpolationNode,
  SimpleExpressionNode,
  CompoundExpressionNode,
  TemplateChildNode,
  JSChildNode,
  JSConditionalExpression,
  JSCallExpression,
  JSObjectExpression,
  VNodeCall,
  CodegenResult,
  CodegenOptions,
} from './types';

// ============================================================
// Main SSR generate function
// ============================================================

export function generateSSR(ast: RootNode, _options: CodegenOptions = {}): CodegenResult {
  const parts: string[] = [];

  // Generate the render function
  parts.push(`function render(_ctx) {\n`);
  parts.push(`  return renderToString(`);

  // Generate children as string concatenation
  const body = genSSRChildren(ast.children);
  parts.push(body);

  parts.push(`);\n`);
  parts.push(`}\n\n`);

  // Helper function
  parts.push(`function renderToString(vnode) {\n`);
  parts.push(`  if (typeof vnode === 'string') return vnode;\n`);
  parts.push(`  if (vnode == null) return '';\n`);
  parts.push(`  if (Array.isArray(vnode)) return vnode.map(renderToString).join('');\n`);
  parts.push(`  const { tag, props, children } = vnode;\n`);
  parts.push(`  let html = '<' + tag;\n`);
  parts.push(`  if (props) {\n`);
  parts.push(`    for (const [key, value] of Object.entries(props)) {\n`);
  parts.push(`      if (value != null && value !== false) {\n`);
  parts.push(`        html += ' ' + key + '="' + value + '"';\n`);
  parts.push(`      }\n`);
  parts.push(`    }\n`);
  parts.push(`  }\n`);
  parts.push(`  html += '>';\n`);
  parts.push(`  if (children != null) {\n`);
  parts.push(`    html += renderToString(children);\n`);
  parts.push(`  }\n`);
  parts.push(`  html += '</' + tag + '>';\n`);
  parts.push(`  return html;\n`);
  parts.push(`}\n`);

  return {
    code: parts.join(''),
    preamble: '',
    ast,
  };
}

// ============================================================
// Generate SSR children
// ============================================================

function genSSRChildren(children: TemplateChildNode[]): string {
  const parts: string[] = [];

  for (const child of children) {
    if (!child) continue;

    switch (child.type) {
      case NodeTypes.TEXT:
        parts.push(JSON.stringify((child as TextNode).content));
        break;

      case NodeTypes.INTERPOLATION: {
        const node = child as InterpolationNode;
        const content = (node.content as SimpleExpressionNode).content;
        parts.push(`String(${content})`);
        break;
      }

      case NodeTypes.ELEMENT: {
        const element = child as ElementNode;
        parts.push(genSSRElement(element));
        break;
      }

      case NodeTypes.COMMENT:
        // Comments are omitted in SSR
        break;

      case NodeTypes.JS_CONDITIONAL_EXPRESSION: {
        const cond = child as JSConditionalExpression;
        parts.push(genSSRConditional(cond));
        break;
      }

      case NodeTypes.JS_CALL_EXPRESSION: {
        const call = child as JSCallExpression;
        parts.push(genSSRCallExpression(call));
        break;
      }

      case NodeTypes.COMPOUND_EXPRESSION: {
        const compound = child as CompoundExpressionNode;
        const childParts: string[] = [];
        for (const c of compound.children) {
          if (typeof c === 'string') {
            childParts.push(c);
          } else if (c.type === NodeTypes.SIMPLE_EXPRESSION) {
            childParts.push((c as SimpleExpressionNode).content);
          } else if (c.type === NodeTypes.INTERPOLATION) {
            const content = ((c as InterpolationNode).content as SimpleExpressionNode).content;
            childParts.push(`String(${content})`);
          }
        }
        parts.push(`(${childParts.join(' + ')})`);
        break;
      }

      default:
        break;
    }
  }

  if (parts.length === 0) return "''";
  if (parts.length === 1) return parts[0]!;
  return parts.join(' + ');
}

// ============================================================
// Generate SSR element
// ============================================================

function genSSRElement(element: ElementNode): string {
  const tag = element.tag;
  const parts: string[] = [];

  // Start tag
  parts.push(`'<${tag}'`);

  // Process props (attributes and SSR-relevant directives)
  const propParts: string[] = [];
  for (const prop of element.props) {
    if (prop.type === NodeTypes.ATTRIBUTE) {
      const name = prop.name;
      const value = prop.value ? prop.value.content : '';
      propParts.push(`' ${name}="${value}"'`);
    } else if (prop.type === NodeTypes.DIRECTIVE) {
      // In SSR mode, only process bind directives (v-bind)
      // Skip v-on, v-model, v-show
      if (prop.name === 'bind') {
        const argContent = prop.arg
          ? (prop.arg as SimpleExpressionNode).content
          : undefined;
        const expContent = prop.exp
          ? (prop.exp as SimpleExpressionNode).content
          : undefined;
        if (argContent && expContent) {
          propParts.push(`' ${argContent}="' + ${expContent} + '"'`);
        }
      }
      // v-html: handled specially
      if (prop.name === 'html') {
        const expContent = prop.exp
          ? (prop.exp as SimpleExpressionNode).content
          : undefined;
        if (expContent) {
          propParts.push(`' innerHTML="' + ${expContent} + '"'`);
        }
      }
      // v-text: handled specially - set textContent
      if (prop.name === 'text') {
        const expContent = prop.exp
          ? (prop.exp as SimpleExpressionNode).content
          : undefined;
        if (expContent) {
          propParts.push(`' textContent="' + ${expContent} + '"'`);
        }
      }
    }
  }

  if (propParts.length > 0) {
    parts.push(' + ' + propParts.join(' + '));
  }

  // Self-closing check
  const voidElements = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img',
    'input', 'link', 'meta', 'param', 'source', 'track', 'wbr',
  ]);

  if (voidElements.has(tag)) {
    parts.push(" + '>'");
    return `(${parts.join('')})`;
  }

  parts.push(" + '>'");

  // Children
  if (element.children.length > 0) {
    const childrenStr = genSSRChildren(element.children);
    parts.push(' + ' + childrenStr);
  }

  // End tag
  parts.push(` + '</${tag}>'`);

  return `(${parts.join('')})`;
}

// ============================================================
// Generate SSR conditional expression
// ============================================================

function genSSRConditional(cond: JSConditionalExpression): string {
  const testStr = genSSRExpr(cond.test);
  const consequentStr = genSSRBranch(cond.consequent);
  const alternateStr = cond.alternate ? genSSRBranch(cond.alternate) : "''";
  return `(${testStr} ? ${consequentStr} : ${alternateStr})`;
}

function genSSRBranch(
  branch: JSChildNode | TemplateChildNode | TemplateChildNode[] | string | undefined,
): string {
  if (branch === undefined) return "''";
  if (typeof branch === 'string') return JSON.stringify(branch);
  if (Array.isArray(branch)) return genSSRChildren(branch);

  if (branch.type === NodeTypes.JS_CONDITIONAL_EXPRESSION) {
    return genSSRConditional(branch as JSConditionalExpression);
  }

  if (branch.type === NodeTypes.VNODE_CALL) {
    return genSSRVNodeCall(branch as VNodeCall);
  }

  if (branch.type === NodeTypes.JS_CALL_EXPRESSION) {
    return genSSRCallExpression(branch as JSCallExpression);
  }

  if (branch.type === NodeTypes.ELEMENT) {
    return genSSRElement(branch as ElementNode);
  }

  if (branch.type === NodeTypes.SIMPLE_EXPRESSION) {
    return `String(${(branch as SimpleExpressionNode).content})`;
  }

  if (branch.type === NodeTypes.TEXT) {
    return JSON.stringify((branch as TextNode).content);
  }

  return "''";
}

// ============================================================
// Generate SSR expression
// ============================================================

function genSSRExpr(expr: JSChildNode | string): string {
  if (typeof expr === 'string') return expr;
  if (expr.type === NodeTypes.SIMPLE_EXPRESSION) {
    return (expr as SimpleExpressionNode).content;
  }
  return "'[expr]'";
}

// ============================================================
// Generate SSR VNodeCall
// ============================================================

function genSSRVNodeCall(vnode: VNodeCall): string {
  const tag = typeof vnode.tag === 'string' ? vnode.tag.replace(/"/g, '') : String(vnode.tag);
  const parts: string[] = [`'<${tag}'`];

  // Props
  if (vnode.props && vnode.props.type === NodeTypes.JS_OBJECT_EXPRESSION) {
    const objExpr = vnode.props as JSObjectExpression;
    for (const prop of objExpr.properties) {
      if (prop.type === NodeTypes.JS_PROPERTY) {
        const key =
          prop.key.type === NodeTypes.SIMPLE_EXPRESSION
            ? (prop.key as SimpleExpressionNode).content.replace(/"/g, '')
            : String(prop.key);
        // Skip event handlers (on*)
        if (key.startsWith('on') && key.length > 2 && key[2] === key[2]!.toUpperCase()) {
          continue;
        }
        // Skip style (v-show generated)
        if (key === 'style') {
          continue;
        }
        const value =
          prop.value.type === NodeTypes.SIMPLE_EXPRESSION
            ? (prop.value as SimpleExpressionNode).content
            : "'[value]'";
        parts.push(` + ' ${key}="' + ${value} + '"'`);
      }
    }
  }

  const voidElements = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img',
    'input', 'link', 'meta', 'param', 'source', 'track', 'wbr',
  ]);

  if (voidElements.has(tag)) {
    parts.push(" + '>'");
    return `(${parts.join('')})`;
  }

  parts.push(" + '>'");

  // Children
  if (vnode.children !== undefined) {
    if (typeof vnode.children === 'string') {
      parts.push(` + ${JSON.stringify(vnode.children)}`);
    } else if (Array.isArray(vnode.children)) {
      const childrenStr = genSSRChildren(vnode.children as TemplateChildNode[]);
      parts.push(' + ' + childrenStr);
    } else {
      const childStr = genSSRBranch(vnode.children as JSChildNode);
      parts.push(' + ' + childStr);
    }
  }

  parts.push(` + '</${tag}>'`);
  return `(${parts.join('')})`;
}

// ============================================================
// Generate SSR call expression
// ============================================================

function genSSRCallExpression(call: JSCallExpression): string {
  const callee = typeof call.callee === 'string' ? call.callee : String(call.callee);

  // Handle renderList
  if (callee === 'renderList' || callee === 'RENDER_LIST') {
    const args = call.arguments;
    if (args.length >= 2) {
      const firstArg = args[0];
      const listExpr =
        typeof firstArg === 'string'
          ? firstArg
          : firstArg && !Array.isArray(firstArg) && firstArg.type === NodeTypes.SIMPLE_EXPRESSION
            ? (firstArg as SimpleExpressionNode).content
            : '[]';
      // For SSR, renderList should produce a map().join('')
      return `(${listExpr}).map(...)`;
    }
  }

  return "'[call]'";
}
