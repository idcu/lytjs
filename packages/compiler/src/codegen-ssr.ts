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
import { escapeHTML } from '@lytjs/common-string';
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
// 模块级常量
// ============================================================

const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img',
  'input', 'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

// ============================================================
// 辅助函数
// ============================================================

// FIX: P2-1 消除 escapeHtml 函数重复定义
// 复用 @lytjs/common-string 中的 escapeHTML 函数
// 注意：生成的代码字符串中仍内联 escapeHtml 函数，确保运行时独立可用
export const escapeHtml = escapeHTML;

// ============================================================
// 主 SSR 生成函数
// ============================================================

export function generateSSR(ast: RootNode, _options: CodegenOptions = {}): CodegenResult {
  const parts: string[] = [];

  // 生成 render 函数
  parts.push(`function render(_ctx) {\n`);
  parts.push(`  return renderToString(`);

  // 将 children 生成为字符串拼接
  const body = genSSRChildren(ast.children);
  parts.push(body);

  parts.push(`);\n`);
  parts.push(`}\n\n`);

  // escapeHtml helper (used by renderToString and interpolation output)
  parts.push(`function escapeHtml(str) {\n`);
  parts.push(`  return String(str)\n`);
  parts.push(`    .replace(/&/g, '&amp;')\n`);
  parts.push(`    .replace(/</g, '&lt;')\n`);
  parts.push(`    .replace(/>/g, '&gt;')\n`);
  parts.push(`    .replace(/"/g, '&quot;')\n`);
  parts.push(`    .replace(/'/g, '&#39;');\n`);
  parts.push(`}\n\n`);

  // 辅助函数
  // NOTE: renderToString is intentionally inlined into each compilation result
  // to ensure every compiled output is self-contained and independently executable,
  // without relying on external runtime imports. This trades a small amount of
  // code duplication for maximum portability and zero runtime coupling.
  // FIX: P2-15 提取 voidElements 为模块级常量，避免每次调用都创建新 Set
  parts.push(`const VOID_ELEMENTS = new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);\n\n`);
  parts.push(`function renderToString(vnode) {\n`);
  parts.push(`  if (typeof vnode === 'string') return vnode;\n`);
  parts.push(`  if (vnode == null) return '';\n`);
  parts.push(`  if (Array.isArray(vnode)) return vnode.map(renderToString).join('');\n`);
  parts.push(`  const { tag, props, children } = vnode;\n`);
  parts.push(`  let html = '<' + tag;\n`);
  parts.push(`  if (props) {\n`);
  parts.push(`    for (const [key, value] of Object.entries(props)) {\n`);
  // FIX: P2-46 布尔属性特殊处理：值为 true 时只输出属性名（如 disabled），
  // 值为 false 或 null 时跳过，其他值正常输出带引号的属性值
  parts.push(`      if (value === true) {\n`);
  parts.push(`        html += ' ' + key;\n`);
  parts.push(`      } else if (value != null && value !== false) {\n`);
  parts.push(`        html += ' ' + key + '="' + escapeHtml(value) + '"';\n`);
  parts.push(`      }\n`);
  parts.push(`    }\n`);
  parts.push(`  }\n`);
  parts.push(`  html += '>';\n`);
  parts.push(`  if (!VOID_ELEMENTS.has(tag)) {\n`);
  parts.push(`    if (children != null) {\n`);
  parts.push(`      html += renderToString(children);\n`);
  parts.push(`    }\n`);
  parts.push(`    html += '</' + tag + '>';\n`);
  parts.push(`  }\n`);
  parts.push(`  return html;\n`);
  parts.push(`}\n`);

  return {
    code: parts.join(''),
    preamble: '',
    ast,
  };
}

// ============================================================
// 生成 SSR children
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
        // FIX: P1-14 SSR 插值表达式白名单验证，防止代码注入
        const isValidExpr = /^[a-zA-Z_$][a-zA-Z0-9_$]*(\.[a-zA-Z_$][a-zA-Z0-9_$]*)*$/.test(content);
        if (!isValidExpr) {
          if (__DEV__) {
            console.warn(
              `[lytjs/compiler] Invalid interpolation expression in SSR: "${content}". ` +
              `Only simple property access paths are allowed.`,
            );
          }
          parts.push(`'[invalid expression]'`);
        } else {
          parts.push(`escapeHtml(String(${content}))`);
        }
        break;
      }

      case NodeTypes.ELEMENT: {
        const element = child as ElementNode;
        parts.push(genSSRElement(element));
        break;
      }

      case NodeTypes.COMMENT:
        // 注释在 SSR 中被省略
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
            // FIX: P0-1 CompoundExpression 中的表达式需要转义输出，防止 XSS
            childParts.push(`escapeHtml(String(${(c as SimpleExpressionNode).content}))`);
          } else if (c.type === NodeTypes.INTERPOLATION) {
            const content = ((c as InterpolationNode).content as SimpleExpressionNode).content;
            // FIX: P1-4 SSR CompoundExpression 插值白名单验证，防止代码注入
            const isValidExpr = /^[a-zA-Z_$][a-zA-Z0-9_$]*(\.[a-zA-Z_$][a-zA-Z0-9_$]*)*$/.test(content);
            if (!isValidExpr) {
              if (__DEV__) {
                console.warn(
                  `[lytjs/compiler] Invalid interpolation expression in SSR CompoundExpression: "${content}". ` +
                  `Only simple property access paths are allowed.`,
                );
              }
              childParts.push(`'[invalid expression]'`);
            } else {
              childParts.push(`escapeHtml(String(${content}))`);
            }
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
// 生成 SSR 元素
// ============================================================

function genSSRElement(element: ElementNode): string {
  const tag = element.tag;
  const parts: string[] = [];

  // 开始标签
  parts.push(`'<${tag}'`);

  // 处理 props（属性和 SSR 相关指令）
  const propParts: string[] = [];
  // 收集 v-html/v-text 内容以便在 children 区域渲染（而非属性）
  let directiveChildren: string | undefined;

  for (const prop of element.props) {
    if (prop.type === NodeTypes.ATTRIBUTE) {
      const name = prop.name;
      const value = prop.value ? escapeHtml(prop.value.content) : '';
      propParts.push(`' ${name}="${value}"'`);
    } else if (prop.type === NodeTypes.DIRECTIVE) {
      // 在 SSR 模式下，只处理 bind 指令（v-bind）
      // 跳过 v-on、v-model、v-show
      if (prop.name === 'bind') {
        const argContent = prop.arg
          ? (prop.arg as SimpleExpressionNode).content
          : undefined;
        const expContent = prop.exp
          ? (prop.exp as SimpleExpressionNode).content
          : undefined;
        // FIX: P2-17 对 v-bind 属性值进行 HTML 转义，防止 XSS 攻击
        if (argContent && expContent) {
          propParts.push(`' ${argContent}="' + escapeHtml(String(${expContent})) + '"'`);
        }
      }
      // v-html: output raw HTML content as children (not as attribute)
      if (prop.name === 'html') {
        const expContent = prop.exp
          ? (prop.exp as SimpleExpressionNode).content
          : undefined;
        if (expContent) {
          // FIX: P0-1 v-html SSR 模式下需要转义输出，防止 XSS
          directiveChildren = (directiveChildren ? directiveChildren + ' + ' : '') + `escapeHtml(String(${expContent}))`;
        }
      }
      // v-text: output escaped text content as children (not as attribute)
      if (prop.name === 'text') {
        const expContent = prop.exp
          ? (prop.exp as SimpleExpressionNode).content
          : undefined;
        if (expContent) {
          directiveChildren = (directiveChildren ? directiveChildren + ' + ' : '') + `escapeHtml(String(${expContent}))`;
        }
      }
    }
  }

  if (propParts.length > 0) {
    parts.push(' + ' + propParts.join(' + '));
  }

  // 自闭合检查
  if (VOID_ELEMENTS.has(tag)) {
    parts.push(" + '>'");
    return `(${parts.join('')})`;
  }

  parts.push(" + '>'");

  // Children：指令 children（v-html/v-text）优先，否则渲染元素 children
  if (directiveChildren) {
    parts.push(' + ' + directiveChildren);
  } else if (element.children.length > 0) {
    const childrenStr = genSSRChildren(element.children);
    parts.push(' + ' + childrenStr);
  }

  // 结束标签
  parts.push(` + '</${tag}>'`);

  return `(${parts.join('')})`;
}

// ============================================================
// 生成 SSR 条件表达式
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
    // FIX: P0-1 SSR 表达式需要转义输出，防止 XSS
    return `escapeHtml(String(${(branch as SimpleExpressionNode).content}))`;
  }

  if (branch.type === NodeTypes.TEXT) {
    return JSON.stringify((branch as TextNode).content);
  }

  return "''";
}

// ============================================================
// 生成 SSR 表达式
// ============================================================

function genSSRExpr(expr: JSChildNode | string): string {
  if (typeof expr === 'string') return expr;
  if (expr.type === NodeTypes.SIMPLE_EXPRESSION) {
    return (expr as SimpleExpressionNode).content;
  }
  return "'[expr]'";
}

// ============================================================
// 生成 SSR VNodeCall
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
        // 跳过事件处理器（on*）
        if (key.startsWith('on') && key.length > 2 && key[2] === key[2]!.toUpperCase()) {
          continue;
        }
        // 跳过 style（v-show 生成的）
        if (key === 'style') {
          continue;
        }
        const value =
          prop.value.type === NodeTypes.SIMPLE_EXPRESSION
            ? (prop.value as SimpleExpressionNode).content
            : "'[value]'";
        // FIX: P0-1 属性值 SSR 模式下需要转义输出，防止 XSS
        parts.push(` + ' ${key}="' + escapeHtml(String(${value})) + '"'`);
      }
    }
  }

  if (VOID_ELEMENTS.has(tag)) {
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
// 生成 SSR 调用表达式
// ============================================================

function genSSRCallExpression(call: JSCallExpression): string {
  const callee = typeof call.callee === 'string' ? call.callee : String(call.callee);

  // 处理 renderList
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
      const secondArg = args[1];
      // 第二个参数是表示箭头函数的 CompoundExpressionNode：
      // children: ['(item, index) => { ', ...arrowBody, ' }']
      let arrowParams = 'item';
      let arrowBodyStr = "''";
      if (
        secondArg &&
        !Array.isArray(secondArg) &&
        typeof secondArg !== 'string' &&
        secondArg.type === NodeTypes.COMPOUND_EXPRESSION
      ) {
        const compound = secondArg as CompoundExpressionNode;
        const children = compound.children;
        // 从第一个子节点字符串中提取箭头函数参数
        const firstChild = children[0];
        if (typeof firstChild === 'string') {
          // 使用平衡括号提取来处理解构中的嵌套花括号
          const arrowStart = firstChild.indexOf('=>');
          if (arrowStart !== -1) {
            const parenStart = firstChild.indexOf('(');
            if (parenStart !== -1 && parenStart < arrowStart) {
              // 查找匹配的右括号，考虑嵌套括号
              let depth = 0;
              let parenEnd = -1;
              for (let i = parenStart; i < arrowStart; i++) {
                if (firstChild[i] === '(') depth++;
                else if (firstChild[i] === ')') depth--;
                if (depth === 0) {
                  parenEnd = i;
                  break;
                }
              }
              if (parenEnd !== -1) {
                arrowParams = firstChild.slice(parenStart + 1, parenEnd).trim();
              }
            }
          }
        }
        // Extract the body (everything between first and last child)
        const bodyChildren = children.slice(1, -1);
        if (bodyChildren.length > 0) {
          arrowBodyStr = genSSRChildren(bodyChildren as TemplateChildNode[]);
        }
      } else if (
        secondArg &&
        !Array.isArray(secondArg) &&
        typeof secondArg !== 'string' &&
        secondArg.type === NodeTypes.SIMPLE_EXPRESSION
      ) {
        arrowBodyStr = (secondArg as SimpleExpressionNode).content;
      }
      return `(${listExpr}).flatMap((${arrowParams}) => ${arrowBodyStr}).join('')`;
    }
  }

  return "'[call]'";
}
