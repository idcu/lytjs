/**
 * Lyt.js Vapor Mode - 模板编译器
 *
 * 将 HTML 模板编译为直接 DOM 操作的渲染函数。
 * 编译后的函数直接创建 DOM 元素并绑定信号，无需 VDOM 中间层。
 *
 * 支持的语法：
 *   - 文本插值: {{ expression }}
 *   - 事件绑定: on:event="handler"
 *   - 属性绑定: :prop="expression"
 *   - 条件渲染: v-if="expression"
 *   - 列表渲染: v-each="item in expression"
 */

import type { VaporElement } from './vapor-reactive';
import { getVaporDOMFactory } from './vapor-renderer';
import type { Signal } from '@lytjs/reactivity/signal';
import { effect } from '@lytjs/reactivity/signal';
import { bindIf, bindEach } from './vapor-reactive';
import { LytError } from '@lytjs/common';

// ================================================================
//  类型定义
// ================================================================

/** 编译后的渲染函数 */
export type VaporRenderFunction = (ctx: Record<string, unknown>) => VaporElement

/** AST 节点类型 */
type ASTNodeType = 'element' | 'text' | 'interpolation' | 'fragment'

/** AST 节点 */
interface ASTNode {
  type: ASTNodeType
  tag?: string
  text?: string
  expression?: string
  props?: Record<string, string>
  events?: Record<string, string>
  directives?: {
    if?: string
    each?: { item: string; expression: string }
  }
  children?: ASTNode[]
}

/** 编译结果 */
export interface VaporCompileResult {
  /** 渲染函数 */
  render: VaporRenderFunction
  /** AST（调试用） */
  ast: ASTNode
}

// ================================================================
//  HTML 解析
// ================================================================

/**
 * 简单的 HTML 模板解析器
 *
 * 将模板字符串解析为 AST 树。
 */
function parseTemplate(template: string): ASTNode {
  const root: ASTNode = { type: 'fragment', children: [] };
  let remaining = template.trim();

  while (remaining.length > 0) {
    // 尝试匹配开始标签
    const tagMatch = remaining.match(/^<([a-zA-Z][a-zA-Z0-9-]*)([\s\S]*?)(\/?)>/);
    if (tagMatch) {
      const tagName = tagMatch[1];
      const attrsStr = tagMatch[2];
      const selfClosing = tagMatch[3] === '/';

      // 解析属性
      const { props, events, directives } = parseAttributes(attrsStr);

      const node: ASTNode = {
        type: 'element',
        tag: tagName,
        props,
        events,
        directives,
        children: [],
      };

      remaining = remaining.slice(tagMatch[0].length);

      if (selfClosing) {
        (root.children ?? []).push(node);
        continue;
      }

      // 查找匹配的结束标签
      const endTag = `</${tagName}>`;
      const endIdx = findClosingTag(remaining, tagName);

      if (endIdx === -1) {
        throw new LytError('LYT_RENDERER_VAPOR_COMPILER_ERROR', `未找到闭合标签: </${tagName}>`);
      }

      const innerContent = remaining.slice(0, endIdx);
      remaining = remaining.slice(endIdx + endTag.length);

      // 递归解析子节点
      const innerAST = parseTemplate(innerContent);
      node.children = innerAST.children || [];

      (root.children ?? []).push(node);
    } else {
      // 文本内容
      const nextTagIdx = remaining.indexOf('<');
      let textContent: string;
      if (nextTagIdx === -1) {
        textContent = remaining;
        remaining = '';
      } else {
        textContent = remaining.slice(0, nextTagIdx);
        remaining = remaining.slice(nextTagIdx);
      }

      if (textContent.trim()) {
        // 检查是否包含插值
        if (textContent.includes('{{')) {
          const parts = parseTextInterpolation(textContent);
          for (const part of parts) {
            if (part.type === 'text') {
              (root.children ?? []).push({ type: 'text', text: part.value });
            } else {
              (root.children ?? []).push({ type: 'interpolation', expression: part.value });
            }
          }
        } else {
          (root.children ?? []).push({ type: 'text', text: textContent });
        }
      }
    }
  }

  return root;
}

/**
 * 查找闭合标签的位置（处理嵌套标签）
 */
function findClosingTag(content: string, tagName: string): number {
  let depth = 1;
  let pos = 0;
  const openTag = `<${tagName}`;
  const closeTag = `</${tagName}>`;

  while (pos < content.length && depth > 0) {
    const nextOpen = content.indexOf(openTag, pos);
    const nextClose = content.indexOf(closeTag, pos);

    if (nextClose === -1) return -1;

    if (nextOpen !== -1 && nextOpen < nextClose) {
      // 检查是否是真正的开始标签（不是闭合标签的一部分）
      const charAfterOpen = content[nextOpen + openTag.length];
      if (charAfterOpen === '>' || charAfterOpen === ' ' || charAfterOpen === '/') {
        depth++;
        pos = nextOpen + openTag.length;
      } else {
        pos = nextClose + closeTag.length;
        depth--;
      }
    } else {
      pos = nextClose + closeTag.length;
      depth--;
    }
  }

  return depth === 0 ? pos - closeTag.length : -1;
}

/**
 * 解析属性字符串
 */
function parseAttributes(attrsStr: string): {
  props: Record<string, string>
  events: Record<string, string>
  directives: { if?: string; each?: { item: string; expression: string } }
} {
  const props: Record<string, string> = {};
  const events: Record<string, string> = {};
  const directives: { if?: string; each?: { item: string; expression: string } } = {};

  // 匹配属性
  const attrRegex = /([a-zA-Z@:][a-zA-Z0-9@:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let match: RegExpExecArray | null;

  while ((match = attrRegex.exec(attrsStr)) !== null) {
    const attrName = match[1];
    const attrValue = match[2] || match[3];

    if (attrName.startsWith('on:')) {
      // 事件绑定
      const eventName = attrName.slice(3);
      events[eventName] = attrValue;
    } else if (attrName.startsWith(':')) {
      // 动态属性绑定
      const propName = attrName.slice(1);
      props[propName] = attrValue;
    } else if (attrName === 'v-if') {
      directives.if = attrValue;
    } else if (attrName === 'v-each') {
      // 格式: "item in expression"
      const eachParts = attrValue.match(/^\s*(\w+)\s+in\s+(.+)\s*$/);
      if (eachParts) {
        directives.each = { item: eachParts[1], expression: eachParts[2] };
      }
    } else {
      // 静态属性
      props[attrName] = attrValue;
    }
  }

  return { props, events, directives };
}

/**
 * 解析文本插值
 */
function parseTextInterpolation(text: string): Array<{ type: 'text' | 'interpolation'; value: string }> {
  const parts: Array<{ type: 'text' | 'interpolation'; value: string }> = [];
  const regex = /\{\{([\s\S]*?)\}\}/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'interpolation', value: match[1].trim() });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return parts;
}

// ================================================================
//  代码生成
// ================================================================

/**
 * 将 AST 节点编译为渲染函数
 *
 * @param template  HTML 模板字符串
 * @returns 编译结果
 */
export function compileToVapor(template: string): VaporCompileResult {
  const ast = parseTemplate(template);
  const render = generateRenderFunction(ast);
  return { render, ast };
}

/**
 * 从 AST 生成渲染函数
 */
function generateRenderFunction(ast: ASTNode): VaporRenderFunction {
  return function vaporRender(ctx: Record<string, unknown>): VaporElement {
    const factory = getVaporDOMFactory();
    return renderASTNode(ast, ctx, factory);
  };
}

/**
 * 递归渲染 AST 节点为 DOM 元素
 */
function renderASTNode(
  node: ASTNode,
  ctx: Record<string, unknown>,
  factory: (tag: string) => VaporElement
): VaporElement {
  if (node.type === 'fragment') {
    // 片段节点：如果只有一个子节点，直接返回该子节点
    if (node.children && node.children.length === 1) {
      return renderASTNode(node.children[0], ctx, factory);
    }
    // 多个子节点：创建一个容器
    const container = factory('div') as Record<string, unknown>;
    container.nodeType = 11; // DocumentFragment
    container.childNodes = container.childNodes || [];
    if (node.children) {
      for (const child of node.children) {
        const childEl = renderASTNode(child, ctx, factory);
        container.appendChild ? (container as VaporElement).appendChild(childEl) : (container.childNodes as VaporElement[]).push(childEl);
      }
    }
    return container as VaporElement;
  }

  if (node.type === 'text') {
    const el = factory('#text') as Record<string, unknown>;
    el.textContent = node.text || '';
    el.nodeType = 3;
    return el as VaporElement;
  }

  if (node.type === 'interpolation') {
    const el = factory('span') as Record<string, unknown>;
    const expression = node.expression || '';
    const value = resolveExpression(ctx, expression);

    if (isSignalValue(value)) {
      // 响应式文本插值
      const sig = value as Signal<unknown>;
      const textNode = factory('#text') as Record<string, unknown>;
      textNode.nodeType = 3;
      textNode.textContent = String(sig());
      const dispose = effect(() => {
        textNode.textContent = sig() === null || sig() === undefined ? '' : String(sig());
      });
      // 将文本节点包装在 span 中
      (el as VaporElement).appendChild(textNode as VaporElement);
      // 存储清理函数以便后续使用
      (el as Record<string, unknown>)._bindingCleanup = dispose;
    } else {
      el.textContent = value !== null && value !== undefined ? String(value) : '';
    }
    return el as VaporElement;
  }

  if (node.type === 'element') {
    // 处理 v-each 指令（响应式）
    if (node.directives?.each) {
      const { item, expression } = node.directives.each;
      const arrayValue = resolveExpression(ctx, expression);

      if (isSignalValue(arrayValue)) {
        // 响应式列表渲染：使用 bindEach
        const container = factory('#fragment') as Record<string, unknown>;
        container.childNodes = [];
        container.nodeType = 11;
        const containerEl = container as VaporElement;

        bindEach(containerEl, arrayValue, (arrayItem: unknown, index: number) => {
          const itemCtx = { ...ctx, [item]: arrayItem, index };
          const itemEl = factory(node.tag || 'div');
          // 复制静态属性
          if (node.props) {
            for (const [key, value] of Object.entries(node.props)) {
              if (key === 'class' || key === 'className') {
                itemEl.className = value;
              } else {
                (itemEl as Record<string, unknown>)[key] = value;
              }
            }
          }
          // 渲染子节点
          if (node.children) {
            for (const child of node.children) {
              const childEl = renderASTNode(child, itemCtx, factory);
              itemEl.appendChild(childEl);
            }
          }
          return itemEl;
        });

        return containerEl;
      }

      // 非响应式：静态展开
      const array = Array.isArray(arrayValue) ? arrayValue : [];
      const container = factory('#fragment') as Record<string, unknown>;
      container.childNodes = [];
      container.nodeType = 11;
      if (array.length > 0) {
        for (let i = 0; i < array.length; i++) {
          const itemCtx = { ...ctx, [item]: array[i], index: i };
          const itemEl = factory(node.tag || 'div') as Record<string, unknown>;
          if (node.props) {
            for (const [key, value] of Object.entries(node.props)) {
              if (key === 'class' || key === 'className') {
                itemEl.className = value;
              } else {
                itemEl[key] = value;
              }
            }
          }
          if (node.children) {
            for (const child of node.children) {
              const childEl = renderASTNode(child, itemCtx, factory);
              (itemEl as VaporElement).appendChild(childEl);
            }
          }
          (container as VaporElement).appendChild(itemEl as VaporElement);
        }
      }
      return container as VaporElement;
    }

    const el = factory(node.tag || 'div');
    const elRecord = el as Record<string, unknown>;

    // 处理 v-if 指令（响应式）
    if (node.directives?.if) {
      const conditionValue = resolveExpression(ctx, node.directives.if);
      if (isSignalValue(conditionValue)) {
        // 响应式条件渲染：使用 bindIf
        bindIf(el, conditionValue);
      } else if (!conditionValue) {
        // 静态条件：直接隐藏
        elRecord.style = elRecord.style || {};
        (elRecord.style as Record<string, string>).display = 'none';
        elRecord.hidden = true;
      }
    }

    // 应用静态属性和动态属性
    if (node.props) {
      for (const [key, value] of Object.entries(node.props)) {
        if (key.startsWith(':')) {
          // 动态属性绑定
          const propName = key.slice(1);
          const propValue = resolveExpression(ctx, value);
          if (isSignalValue(propValue)) {
            // 响应式属性绑定
            const sig = propValue as Signal<unknown>;
            const dispose = effect(() => {
              elRecord[propName] = sig();
            });
            (el as Record<string, unknown>)._propBindingCleanup = dispose;
          } else {
            elRecord[propName] = propValue;
          }
        } else if (key === 'class' || key === 'className') {
          el.className = value;
        } else {
          elRecord[key] = value;
        }
      }
    }

    // 绑定事件
    if (node.events) {
      for (const [eventName, handlerName] of Object.entries(node.events)) {
        const handler = resolveExpression(ctx, handlerName);
        if (typeof handler === 'function') {
          el.addEventListener(eventName, handler);
        }
      }
    }

    // 渲染子节点
    if (node.children) {
      for (const child of node.children) {
        const childEl = renderASTNode(child, ctx, factory);
        // 如果子节点是片段（nodeType 11），将其子元素展开到当前元素
        if ((childEl as Record<string, unknown>).nodeType === 11 && (childEl as Record<string, unknown>).childNodes) {
          for (const fragmentChild of (childEl as Record<string, unknown>).childNodes as VaporElement[]) {
            el.appendChild(fragmentChild);
          }
        } else {
          el.appendChild(childEl);
        }
      }
    }

    return el;
  }

  // 默认返回空 div
  return factory('div');
}

/**
 * 从上下文中解析表达式
 *
 * 支持简单属性访问和点号路径。
 * 如果解析结果是 Signal，返回 Signal 本身（不调用）。
 */
function resolveExpression(ctx: Record<string, unknown>, expression: string): unknown {
  const trimmed = expression.trim();

  // 处理简单标识符
  if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(trimmed)) {
    return ctx[trimmed];
  }

  // 处理点号路径: a.b.c
  const parts = trimmed.split('.');
  let current: unknown = ctx;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/**
 * 从上下文中解析表达式的当前值
 *
 * 如果值是 Signal，自动调用获取当前值。
 */
function resolveValue(ctx: Record<string, unknown>, expression: string): unknown {
  const value = resolveExpression(ctx, expression);
  if (typeof value === 'function') {
    // 尝试判断是否是 Signal（有 _subscribe 属性）
    const sig = value as unknown as Record<string, unknown>;
    if (sig._subscribe) {
      return (value as Signal<unknown>)();
    }
  }
  return value;
}

/**
 * 判断一个值是否是 Signal
 */
function isSignalValue(value: unknown): value is Signal<unknown> {
  if (typeof value !== 'function') return false;
  const sig = value as unknown as Record<string, unknown>;
  return !!(sig._subscribe);
}

// ================================================================
//  导出
// ================================================================

export { parseTemplate, renderASTNode, resolveExpression };
