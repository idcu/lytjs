/**
 * Lyt.js WASM 模拟层 — 浏览器优化的 HTML 解析器
 *
 * 轻量级 HTML tokenizer 和 AST builder，模拟 WASM 性能特征。
 * 提供与主解析器 (html-parser.ts) 相同的输出格式，但接口设计为
 * WASM-ready，便于后续替换为真实的 WebAssembly 实现。
 *
 * 性能特征（模拟）：
 *   - tokenize 使用基于索引的扫描，避免正则回溯
 *   - buildAST 使用预分配数组
 *   - parseInterpolation 使用手动状态机
 */

import {
  type RootNode,
  type ElementNode,
  type TextNode,
  type ASTNode,
  type Position,
  createRootNode,
  createElementNode,
  createTextNode,
  createAttributeNode,
  createDirectiveNode,
  createPosition,
} from './ast/nodes';

// ============================================================
// Token 类型定义
// ============================================================

/** Token 类型枚举 */
export type TokenType =
  | 'tag-open'
  | 'tag-close'
  | 'text'
  | 'attr'
  | 'comment'
  | 'interpolation';

/** Token 接口 */
export interface Token {
  type: TokenType;
  value: string;
  loc: TokenLocation;
}

/** Token 位置信息 */
export interface TokenLocation {
  start: number;
  end: number;
  line: number;
  column: number;
}

/** 表达式节点（用于插值解析） */
export interface Expression {
  type: 'identifier' | 'member' | 'call' | 'binary' | 'literal' | 'compound';
  value: string;
  children?: Expression[];
}

// ============================================================
// 常量
// ============================================================

const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img',
  'input', 'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

const DIRECTIVE_NAMES = new Set(['if', 'each', 'bind', 'on', 'slot', 'ref']);

// ============================================================
// Tokenizer
// ============================================================

/**
 * 快速 HTML tokenizer（模拟 WASM 性能）
 *
 * 使用基于索引的线性扫描，避免正则表达式的回溯开销。
 * 输出 Token 数组供 buildAST 使用。
 *
 * @param html HTML 模板字符串
 * @returns Token 数组
 */
export function tokenize(html: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;
  let line = 1;
  let column = 1;
  const len = html.length;

  function currentLoc(): TokenLocation {
    return { start: pos, end: pos, line, column };
  }

  function advance(): string {
    const ch = html[pos++];
    if (ch === '\n') {
      line++;
      column = 1;
    } else {
      column++;
    }
    return ch;
  }

  function peek(): string {
    return html[pos] || '';
  }

  function peekAt(offset: number): string {
    return html[pos + offset] || '';
  }

  function startsWith(str: string): boolean {
    return html.substring(pos, pos + str.length) === str;
  }

  while (pos < len) {
    const ch = peek();

    // 注释 <!-- ... -->
    if (ch === '<' && startsWith('<!--')) {
      const loc = currentLoc();
      advance(); // <
      advance(); // !
      advance(); // -
      advance(); // -
      const commentStart = pos;
      while (pos < len && !startsWith('-->')) {
        advance();
      }
      const commentValue = html.slice(commentStart, pos);
      if (startsWith('-->')) {
        advance(); advance(); advance(); // -->
      }
      tokens.push({
        type: 'comment',
        value: commentValue,
        loc: { ...loc, end: pos },
      });
      continue;
    }

    // 闭合标签 </tag>
    if (ch === '<' && peekAt(1) === '/') {
      const loc = currentLoc();
      advance(); // <
      advance(); // /
      const nameStart = pos;
      while (pos < len && !/[\s>]/.test(peek())) {
        advance();
      }
      const tagName = html.slice(nameStart, pos).toLowerCase();
      // 跳过空白和 >
      while (pos < len && peek() !== '>') advance();
      if (pos < len) advance(); // >
      tokens.push({
        type: 'tag-close',
        value: tagName,
        loc: { ...loc, end: pos },
      });
      continue;
    }

    // 开始标签 <tag ...>
    if (ch === '<' && /[a-zA-Z]/.test(peekAt(1))) {
      const loc = currentLoc();
      advance(); // <
      const nameStart = pos;
      while (pos < len && !/[\s>/]/.test(peek())) {
        advance();
      }
      const tagName = html.slice(nameStart, pos).toLowerCase();
      tokens.push({
        type: 'tag-open',
        value: tagName,
        loc: { ...loc, end: pos },
      });

      // 解析属性
      while (pos < len) {
        // 跳过空白
        while (pos < len && /\s/.test(peek())) advance();

        if (pos >= len) break;

        // 自闭合 />
        if (peek() === '/' && peekAt(1) === '>') {
          advance(); advance();
          break;
        }

        // 标签结束 >
        if (peek() === '>') {
          advance();
          break;
        }

        // 属性
        const attrLoc = currentLoc();
        const attrNameStart = pos;
        while (pos < len && !/[\s=/>]/.test(peek())) advance();
        const attrName = html.slice(attrNameStart, pos);

        // 跳过空白
        while (pos < len && /\s/.test(peek())) advance();

        let attrValue = '';
        if (peek() === '=') {
          advance(); // =
          while (pos < len && /\s/.test(peek())) advance();

          const quote = peek();
          if (quote === '"' || quote === "'") {
            advance(); // opening quote
            const valStart = pos;
            while (pos < len && peek() !== quote) advance();
            attrValue = html.slice(valStart, pos);
            if (pos < len) advance(); // closing quote
          } else {
            const valStart = pos;
            while (pos < len && !/[\s>]/.test(peek())) advance();
            attrValue = html.slice(valStart, pos);
          }
        }

        tokens.push({
          type: 'attr',
          value: `${attrName}=${attrValue}`,
          loc: { ...attrLoc, end: pos },
        });
      }

      // void 标签自动闭合
      if (VOID_TAGS.has(tagName)) {
        tokens.push({
          type: 'tag-close',
          value: tagName,
          loc: { start: pos, end: pos, line, column },
        });
      }

      continue;
    }

    // 插值表达式 {{ ... }}
    if (ch === '{' && peekAt(1) === '{') {
      const loc = currentLoc();
      advance(); advance(); // {{
      const exprStart = pos;
      while (pos < len && !(peek() === '}' && peekAt(1) === '}')) {
        advance();
      }
      const exprValue = html.slice(exprStart, pos).trim();
      if (pos < len) { advance(); advance(); } // }}
      tokens.push({
        type: 'interpolation',
        value: exprValue,
        loc: { ...loc, end: pos },
      });
      continue;
    }

    // 普通文本
    const textLoc = currentLoc();
    const textStart = pos;
    while (pos < len && peek() !== '<' && !(peek() === '{' && peekAt(1) === '{')) {
      advance();
    }
    const textValue = html.slice(textStart, pos);
    if (textValue.length > 0) {
      tokens.push({
        type: 'text',
        value: textValue,
        loc: { ...textLoc, end: pos },
      });
    }
  }

  return tokens;
}

// ============================================================
// AST Builder
// ============================================================

/**
 * 从 Token 数组构建 AST
 *
 * @param tokens tokenize() 输出的 Token 数组
 * @returns AST 节点数组（顶层子节点）
 */
export function buildAST(tokens: Token[]): ASTNode[] {
  const root = createRootNode(createPosition(0, 0, 1, 1));
  const parentStack: ElementNode[] = [];
  let currentElement: ElementNode | null = null;
  let i = 0;

  function addChild(node: ElementNode | TextNode): void {
    if (currentElement) {
      currentElement.children.push(node);
    } else {
      root.children.push(node);
    }
  }

  while (i < tokens.length) {
    const token = tokens[i];

    switch (token.type) {
      case 'tag-open': {
        const tag = token.value;
        const loc = createPosition(
          token.loc.start, token.loc.end,
          token.loc.line, token.loc.column
        );
        const element = createElementNode(tag, loc);

        // 收集后续的 attr tokens
        i++;
        while (i < tokens.length && tokens[i].type === 'attr') {
          const attrToken = tokens[i];
          const attrLoc = createPosition(
            attrToken.loc.start, attrToken.loc.end,
            attrToken.loc.line, attrToken.loc.column
          );
          const eqIndex = attrToken.value.indexOf('=');
          let attrName: string;
          let attrValue: string | null;

          if (eqIndex !== -1) {
            attrName = attrToken.value.slice(0, eqIndex);
            attrValue = attrToken.value.slice(eqIndex + 1);
          } else {
            attrName = attrToken.value;
            attrValue = null;
          }

          const node = createAttributeOrDirective(attrName, attrValue, attrLoc);
          if (node.type === 'Directive') {
            element.directives.push(node);
          } else {
            element.props.push(node);
          }
          i++;
        }

        // 检查是否自闭合（下一个 token 是 tag-close 且同名）
        if (i < tokens.length && tokens[i].type === 'tag-close' && tokens[i].value === tag) {
          element.isSelfClosing = true;
          i++; // 跳过闭合标签
          addChild(element);
        } else {
          addChild(element);
          parentStack.push(element);
          currentElement = element;
        }

        continue; // 已经递增了 i
      }

      case 'tag-close': {
        const tagName = token.value;
        // 从父栈中找到匹配的元素
        for (let j = parentStack.length - 1; j >= 0; j--) {
          if (parentStack[j].tag === tagName) {
            parentStack.splice(j);
            break;
          }
        }
        currentElement = parentStack.length > 0
          ? parentStack[parentStack.length - 1]
          : null;
        break;
      }

      case 'text': {
        const text = token.value.trim();
        if (text.length > 0) {
          const loc = createPosition(
            token.loc.start, token.loc.end,
            token.loc.line, token.loc.column
          );
          addChild(createTextNode(text, loc));
        }
        break;
      }

      case 'interpolation': {
        const loc = createPosition(
          token.loc.start, token.loc.end,
          token.loc.line, token.loc.column
        );
        addChild(createTextNode(`{{ ${token.value} }}`, loc));
        break;
      }

      case 'comment': {
        // 注释被忽略，不生成 AST 节点
        break;
      }
    }

    i++;
  }

  return root.children;
}

// ============================================================
// 插值表达式解析
// ============================================================

/**
 * 解析插值表达式字符串为 Expression 节点
 *
 * @param expr 表达式字符串（不含 {{ }}）
 * @returns Expression 节点
 */
export function parseInterpolation(expr: string): Expression {
  expr = expr.trim();

  // 字面量
  if (/^['"`]/.test(expr) || /^\d+$/.test(expr) || expr === 'true' || expr === 'false' || expr === 'null') {
    return { type: 'literal', value: expr };
  }

  // 函数调用
  if (/^\w+(\.\w+)*\s*\(/.test(expr)) {
    return { type: 'call', value: expr };
  }

  // 成员访问
  if (/^\w+(\.\w+)+$/.test(expr)) {
    return { type: 'member', value: expr };
  }

  // 二元表达式
  if (/[+\-*/<>!=&|?]/.test(expr) && !expr.includes('=>')) {
    return { type: 'binary', value: expr };
  }

  // 复合表达式（包含多个标识符和运算符）
  if (/\w.*\w/.test(expr) && expr.includes(' ')) {
    return { type: 'compound', value: expr };
  }

  // 纯标识符
  if (/^\w+$/.test(expr)) {
    return { type: 'identifier', value: expr };
  }

  return { type: 'compound', value: expr };
}

// ============================================================
// 辅助函数
// ============================================================

/**
 * 根据属性名创建属性节点或指令节点
 */
function createAttributeOrDirective(
  rawName: string,
  rawValue: string | null,
  loc: Position
): ElementNode['props'][0] | ElementNode['directives'][0] {
  // v- 前缀指令
  if (rawName.startsWith('v-')) {
    const rest = rawName.slice(2);

    if (rest.startsWith('on')) {
      const eventPart = rest.slice(2);
      const dotIndex = eventPart.indexOf('.');
      let eventName = eventPart;
      const modifiers: string[] = [];
      if (dotIndex !== -1) {
        eventName = eventPart.slice(0, dotIndex);
        modifiers.push(...eventPart.slice(dotIndex + 1).split('.'));
      }
      return createDirectiveNode('on', rawValue || '', eventName, modifiers, loc);
    }

    if (rest.startsWith('bind')) {
      const arg = rest.slice(4).replace(/^:/, '');
      return createDirectiveNode('bind', rawValue || '', arg, [], loc);
    }

    if (rest.startsWith('slot')) {
      const arg = rest.slice(4).replace(/^:/, '');
      return createDirectiveNode('slot', rawValue || '', arg, [], loc);
    }

    if (rest === 'model') {
      return createDirectiveNode('bind', rawValue || '', 'model', [], loc);
    }

    if (rest === 'ref') {
      return createDirectiveNode('ref', rawValue || '', '', [], loc);
    }

    const colonIndex = rest.indexOf(':');
    const directiveName = colonIndex !== -1 ? rest.slice(0, colonIndex) : rest;
    if (DIRECTIVE_NAMES.has(directiveName)) {
      const arg = colonIndex !== -1 ? rest.slice(colonIndex + 1) : '';
      return createDirectiveNode(
        directiveName as any,
        rawValue || '',
        arg,
        [],
        loc
      );
    }
  }

  // : 简写
  if (rawName.startsWith(':')) {
    return createDirectiveNode('bind', rawValue || '', rawName.slice(1), [], loc);
  }

  // @ 简写
  if (rawName.startsWith('@')) {
    const eventPart = rawName.slice(1);
    const dotIndex = eventPart.indexOf('.');
    let eventName = eventPart;
    const modifiers: string[] = [];
    if (dotIndex !== -1) {
      eventName = eventPart.slice(0, dotIndex);
      modifiers.push(...eventPart.slice(dotIndex + 1).split('.'));
    }
    return createDirectiveNode('on', rawValue || '', eventName, modifiers, loc);
  }

  // # 简写
  if (rawName.startsWith('#')) {
    return createDirectiveNode('slot', rawValue || '', rawName.slice(1), [], loc);
  }

  // 普通属性
  return createAttributeNode(rawName, rawValue, loc);
}
