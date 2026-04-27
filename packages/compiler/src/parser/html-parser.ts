/**
 * Lyt.js 模板编译器 — HTML 解析器
 *
 * 基于状态机的 HTML 模板解析器，将模板字符串解析为 AST（抽象语法树）。
 * 支持标签、属性、文本、注释、表达式插值 {{ }} 等语法。
 *
 * 解析状态：
 *   TEXT        — 文本内容
 *   TAG_OPEN    — 遇到 '<'，开始解析标签
 *   TAG_NAME    — 解析标签名
 *   ATTRIBUTE   — 解析属性
 *   TAG_CLOSE   — 解析闭合标签
 *   COMMENT     — 解析注释 <!-- -->
 */

import {
  type RootNode,
  type ElementNode,
  type TextNode,
  type AttributeNode,
  type DirectiveNode,
  type Position,
  createRootNode,
  createElementNode,
  createTextNode,
  createAttributeNode,
  createDirectiveNode,
  createPosition,
} from '../ast/nodes';

// ============================================================
// 常量定义
// ============================================================

/** HTML 自闭合标签集合 */
const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img',
  'input', 'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

/** Lyt.js 支持的指令名称集合 */
const DIRECTIVE_NAMES = new Set(['if', 'each', 'bind', 'on', 'slot', 'ref']);

// ============================================================
// 解析器状态枚举
// ============================================================

const enum ParseState {
  TEXT,       // 文本内容
  TAG_OPEN,   // 遇到 '<'
  TAG_NAME,   // 解析标签名
  ATTRIBUTE,  // 解析属性
  TAG_CLOSE,  // 解析闭合标签 '</'
  COMMENT,    // 解析注释
}

// ============================================================
// 解析器上下文
// ============================================================

/** 解析器上下文，维护解析过程中的状态 */
class ParserContext {
  /** 原始模板字符串 */
  template: string;
  /** 当前解析位置（字符索引） */
  pos: number;
  /** 当前行号 */
  line: number;
  /** 当前列号 */
  column: number;
  /** 当前解析状态 */
  state: ParseState;
  /** 根节点 */
  root: RootNode;
  /** 当前正在解析的元素节点 */
  currentElement: ElementNode | null;
  /** 父元素栈，用于处理嵌套标签 */
  parentStack: ElementNode[];
  /** 当前正在解析的文本内容缓冲区 */
  textBuffer: string;
  /** 文本内容的起始位置 */
  textStart: number;
  /** 当前正在解析的标签名缓冲区 */
  tagNameBuffer: string;
  /** 标签名的起始位置 */
  tagNameStart: number;
  /** 当前正在解析的属性名缓冲区 */
  attrNameBuffer: string;
  /** 当前正在解析的属性值缓冲区 */
  attrValueBuffer: string;
  /** 属性值的起始引号字符 */
  attrValueQuote: string;
  /** 是否正在解析属性值 */
  inAttrValue: boolean;
  /** 注释缓冲区 */
  commentBuffer: string;
  /** 是否为闭合标签（</tag>） */
  isClosingTag: boolean;

  constructor(template: string) {
    this.template = template;
    this.pos = 0;
    this.line = 1;
    this.column = 1;
    this.state = ParseState.TEXT;
    this.root = createRootNode(createPosition(0, template.length, 1, 1));
    this.currentElement = null;
    this.parentStack = [];
    this.textBuffer = '';
    this.textStart = 0;
    this.tagNameBuffer = '';
    this.tagNameStart = 0;
    this.attrNameBuffer = '';
    this.attrValueBuffer = '';
    this.attrValueQuote = '';
    this.inAttrValue = false;
    this.commentBuffer = '';
    this.isClosingTag = false;
  }

  /** 获取当前位置信息 */
  currentPos(): Position {
    return createPosition(this.pos, this.pos, this.line, this.column);
  }

  /** 推进一个字符，更新行号和列号 */
  advance(): string {
    const ch = this.template[this.pos++];
    if (ch === '\n') {
      this.line++;
      this.column = 1;
    } else {
      this.column++;
    }
    return ch;
  }

  /** 查看当前字符但不推进 */
  peek(): string {
    return this.template[this.pos] || '';
  }

  /** 查看后面第 n 个字符 */
  peekAt(offset: number): string {
    return this.template[this.pos + offset] || '';
  }

  /** 是否已到达模板末尾 */
  isEOF(): boolean {
    return this.pos >= this.template.length;
  }

  /** 当前字符是否匹配指定字符串 */
  startsWith(str: string): boolean {
    return this.template.substring(this.pos, this.pos + str.length) === str;
  }

  /** 跳过空白字符 */
  skipWhitespace(): void {
    while (!this.isEOF() && /\s/.test(this.peek())) {
      this.advance();
    }
  }
}

// ============================================================
// 主解析函数
// ============================================================

/**
 * 解析 HTML 模板字符串，生成 AST
 * @param template 模板字符串
 * @returns 根节点（AST 树）
 */
export function parseHTML(template: string): RootNode {
  const ctx = new ParserContext(template);

  while (!ctx.isEOF()) {
    switch (ctx.state) {
      case ParseState.TEXT:
        parseText(ctx);
        break;
      case ParseState.TAG_OPEN:
        parseTagOpen(ctx);
        break;
      case ParseState.TAG_NAME:
        parseTagName(ctx);
        break;
      case ParseState.ATTRIBUTE:
        parseAttribute(ctx);
        break;
      case ParseState.TAG_CLOSE:
        parseTagClose(ctx);
        break;
      case ParseState.COMMENT:
        parseComment(ctx);
        break;
    }
  }

  // 解析结束后，如果还有未处理的文本缓冲区，生成文本节点
  flushTextBuffer(ctx);

  return ctx.root;
}

// ============================================================
// 各状态的解析处理函数
// ============================================================

/**
 * 解析文本内容
 * 在 TEXT 状态下，逐字符读取直到遇到 '<' 或 '{{'
 */
function parseText(ctx: ParserContext): void {
  // 如果是文本状态的起始，记录起始位置
  if (ctx.textBuffer === '') {
    ctx.textStart = ctx.pos;
  }

  while (!ctx.isEOF()) {
    const ch = ctx.peek();

    // 遇到 '<'，切换到标签解析状态
    if (ch === '<') {
      // 先刷新已收集的文本
      flushTextBuffer(ctx);
      ctx.advance(); // 消耗 '<'
      ctx.state = ParseState.TAG_OPEN;
      return;
    }

    // 遇到 '{{'，继续收集文本（表达式包含在文本节点中）
    if (ch === '{' && ctx.peekAt(1) === '{') {
      // 收集整个表达式文本 {{ expr }}
      ctx.textBuffer += ctx.advance(); // {
      ctx.textBuffer += ctx.advance(); // {
      // 继续收集直到 }}
      while (!ctx.isEOF()) {
        const c = ctx.peek();
        ctx.textBuffer += ctx.advance();
        if (c === '}' && ctx.peek() === '}') {
          ctx.textBuffer += ctx.advance(); // 第二个 }
          break;
        }
      }
      continue;
    }

    // 普通文本字符
    ctx.textBuffer += ctx.advance();
  }
}

/**
 * 解析标签开始 '<'
 * 判断是普通标签、闭合标签还是注释
 */
function parseTagOpen(ctx: ParserContext): void {
  ctx.skipWhitespace();

  // 检查是否为注释 <!--
  if (ctx.startsWith('!--')) {
    ctx.state = ParseState.COMMENT;
    ctx.commentBuffer = '';
    // 跳过 '!--'
    ctx.advance();
    ctx.advance();
    ctx.advance();
    return;
  }

  // 检查是否为闭合标签 </
  if (ctx.peek() === '/') {
    ctx.isClosingTag = true;
    ctx.advance(); // 消耗 '/'
  } else {
    ctx.isClosingTag = false;
  }

  // 进入标签名解析状态
  ctx.tagNameBuffer = '';
  ctx.tagNameStart = ctx.pos;
  ctx.state = ParseState.TAG_NAME;
}

/**
 * 解析标签名
 * 读取标签名字符直到遇到空白或 '>' 或 '/'
 */
function parseTagName(ctx: ParserContext): void {
  while (!ctx.isEOF()) {
    const ch = ctx.peek();

    // 标签名结束条件：空白字符、'>'、'/'
    if (/\s/.test(ch) || ch === '>' || ch === '/') {
      break;
    }

    ctx.tagNameBuffer += ctx.advance();
  }

  if (ctx.isClosingTag) {
    // 闭合标签：匹配父栈中的元素，弹出匹配的元素
    ctx.state = ParseState.TAG_CLOSE;
    return;
  }

  // 创建新的元素节点
  const tagLoc = createPosition(
    ctx.tagNameStart,
    ctx.pos,
    ctx.line,
    ctx.column - ctx.tagNameBuffer.length
  );
  const element = createElementNode(ctx.tagNameBuffer.toLowerCase(), tagLoc);

  // 设置为当前元素
  ctx.currentElement = element;
  ctx.state = ParseState.ATTRIBUTE;
}

/**
 * 解析属性
 * 在标签名之后、'>' 之前解析所有属性
 */
function parseAttribute(ctx: ParserContext): void {
  ctx.skipWhitespace();

  // 检查标签是否结束
  if (ctx.isEOF()) return;

  const ch = ctx.peek();

  // 遇到 '>'，标签结束
  if (ch === '>') {
    ctx.advance();
    finishOpenTag(ctx);
    return;
  }

  // 遇到 '/>'，自闭合标签结束
  if (ch === '/' && ctx.peekAt(1) === '>') {
    ctx.advance(); // /
    ctx.advance(); // >
    finishOpenTag(ctx, true);
    return;
  }

  // 解析属性名
  ctx.attrNameBuffer = '';
  ctx.attrValueBuffer = '';
  ctx.inAttrValue = false;
  ctx.attrValueQuote = '';

  const attrNameStart = ctx.pos;

  // 读取属性名（遇到 '='、空白、'>'、'/' 结束）
  while (!ctx.isEOF()) {
    const c = ctx.peek();
    if (/\s/.test(c) || c === '=' || c === '>' || c === '/') {
      break;
    }
    ctx.attrNameBuffer += ctx.advance();
  }

  ctx.skipWhitespace();

  // 检查是否有属性值（下一个字符是 '='）
  if (ctx.peek() === '=') {
    ctx.advance(); // 消耗 '='
    ctx.skipWhitespace();

    // 读取属性值
    const quote = ctx.peek();
    if (quote === '"' || quote === "'") {
      // 带引号的属性值
      ctx.attrValueQuote = quote;
      ctx.advance(); // 消耗引号
      ctx.inAttrValue = true;

      while (!ctx.isEOF()) {
        const c = ctx.peek();
        if (c === ctx.attrValueQuote) {
          ctx.advance(); // 消耗结束引号
          ctx.inAttrValue = false;
          break;
        }
        ctx.attrValueBuffer += ctx.advance();
      }
    } else {
      // 无引号属性值（遇到空白或 '>' 结束）
      while (!ctx.isEOF()) {
        const c = ctx.peek();
        if (/\s/.test(c) || c === '>' || c === '/') {
          break;
        }
        ctx.attrValueBuffer += ctx.advance();
      }
    }
  }

  // 创建属性或指令节点
  const attrLoc = createPosition(attrNameStart, ctx.pos, ctx.line, ctx.column);
  const attrNode = createAttributeOrDirective(ctx.attrNameBuffer, ctx.attrValueBuffer || null, attrLoc);

  if (ctx.currentElement) {
    if (attrNode.type === 'Directive') {
      ctx.currentElement.directives.push(attrNode as DirectiveNode);
    } else {
      ctx.currentElement.props.push(attrNode as AttributeNode);
    }
  }
}

/**
 * 解析闭合标签
 * 匹配父栈中的元素并弹出
 */
function parseTagClose(ctx: ParserContext): void {
  ctx.skipWhitespace();

  // 期望遇到 '>'
  if (ctx.peek() === '>') {
    ctx.advance();
  }

  const tagName = ctx.tagNameBuffer.toLowerCase();

  // 从父栈中找到匹配的元素并弹出
  let found = false;
  for (let i = ctx.parentStack.length - 1; i >= 0; i--) {
    if (ctx.parentStack[i].tag === tagName) {
      // 弹出从匹配位置到栈顶的所有元素
      ctx.parentStack.splice(i);
      ctx.currentElement = ctx.parentStack.length > 0
        ? ctx.parentStack[ctx.parentStack.length - 1]
        : null;
      found = true;
      break;
    }
  }

  if (!found) {
    // 未找到匹配的开始标签，忽略此闭合标签
  }

  ctx.state = ParseState.TEXT;
}

/**
 * 解析注释 <!-- -->
 * 收集注释内容直到遇到 '-->'
 */
function parseComment(ctx: ParserContext): void {
  while (!ctx.isEOF()) {
    if (ctx.startsWith('-->')) {
      ctx.advance(); // -
      ctx.advance(); // -
      ctx.advance(); // >
      ctx.state = ParseState.TEXT;
      return;
    }
    ctx.commentBuffer += ctx.advance();
  }
}

// ============================================================
// 辅助函数
// ============================================================

/**
 * 刷新文本缓冲区，创建文本节点并添加到当前父节点或根节点
 */
function flushTextBuffer(ctx: ParserContext): void {
  const text = ctx.textBuffer.trim();
  if (text.length === 0) {
    ctx.textBuffer = '';
    return;
  }

  const textNode = createTextNode(
    text,
    createPosition(ctx.textStart, ctx.pos, ctx.line, ctx.column)
  );

  // 添加到当前元素或根节点
  if (ctx.currentElement) {
    ctx.currentElement.children.push(textNode);
  } else {
    ctx.root.children.push(textNode);
  }

  ctx.textBuffer = '';
}

/**
 * 完成开始标签的解析
 * 将当前元素添加到父节点，并处理自闭合和 void 标签
 */
function finishOpenTag(ctx: ParserContext, isSelfClosing: boolean = false): void {
  if (!ctx.currentElement) return;

  ctx.currentElement.isSelfClosing = isSelfClosing;

  // 判断是否为 void 标签（如 <br>、<img>）
  const isVoid = VOID_TAGS.has(ctx.currentElement.tag);

  // 确定父节点：栈顶元素或 null（根级别）
  const parent = ctx.parentStack.length > 0
    ? ctx.parentStack[ctx.parentStack.length - 1]
    : null;

  // 将当前元素添加到父节点的 children 或 root.children
  if (parent) {
    parent.children.push(ctx.currentElement);
  } else {
    ctx.root.children.push(ctx.currentElement);
  }

  if (!isSelfClosing && !isVoid) {
    // 非自闭合、非 void 标签：压入父栈，后续子节点将添加到此元素
    ctx.parentStack.push(ctx.currentElement);
    // currentElement 保持不变（仍指向当前打开的元素）
  } else {
    // 自闭合或 void 标签：恢复 currentElement 为父元素
    ctx.currentElement = parent;
  }

  ctx.state = ParseState.TEXT;
}

/**
 * 将子节点添加到当前父元素或根节点
 */
function addChild(ctx: ParserContext, node: ElementNode | TextNode): void {
  if (ctx.currentElement) {
    ctx.currentElement.children.push(node);
  } else {
    ctx.root.children.push(node);
  }
}

/**
 * 根据属性名创建属性节点或指令节点
 *
 * 支持的语法：
 *   - 普通属性：class="foo"
 *   - 动态属性：:class="expr" 或 v-bind:class="expr"
 *   - 事件绑定：@click="handler" 或 v-on:click="handler"
 *   - 指令：v-if="cond"、v-each="item in items"、v-bind:value="expr"、
 *           v-on:click="handler"、v-slot="name"、v-ref="el"
 */
function createAttributeOrDirective(
  rawName: string,
  rawValue: string | null,
  loc: Position
): AttributeNode | DirectiveNode {
  // 处理 v- 前缀的指令
  if (rawName.startsWith('v-')) {
    const rest = rawName.slice(2); // 去掉 'v-'

    // v-on:event → 事件指令
    if (rest.startsWith('on')) {
      const eventPart = rest.slice(2); // 去掉 'on'
      const dotIndex = eventPart.indexOf('.');
      let eventName = eventPart;
      const modifiers: string[] = [];

      if (dotIndex !== -1) {
        eventName = eventPart.slice(0, dotIndex);
        modifiers.push(...eventPart.slice(dotIndex + 1).split('.'));
      }

      return createDirectiveNode(
        'on',
        rawValue || '',
        eventName,
        modifiers,
        loc
      );
    }

    // v-bind:arg → 绑定指令
    if (rest.startsWith('bind')) {
      const arg = rest.slice(4).replace(/^:/, ''); // 去掉 'bind' 和可能的 ':'
      return createDirectiveNode('bind', rawValue || '', arg, [], loc);
    }

    // v-slot:name → 插槽指令
    if (rest.startsWith('slot')) {
      const arg = rest.slice(4).replace(/^:/, '');
      return createDirectiveNode('slot', rawValue || '', arg, [], loc);
    }

    // v-model → 双向绑定（映射为 bind + on）
    if (rest === 'model') {
      return createDirectiveNode('bind', rawValue || '', 'model', [], loc);
    }

    // v-ref → 引用指令
    if (rest === 'ref') {
      return createDirectiveNode('ref', rawValue || '', '', [], loc);
    }

    // 其他 v- 指令（v-if, v-each 等）
    const colonIndex = rest.indexOf(':');
    const directiveName = colonIndex !== -1 ? rest.slice(0, colonIndex) : rest;

    if (DIRECTIVE_NAMES.has(directiveName)) {
      const arg = colonIndex !== -1 ? rest.slice(colonIndex + 1) : '';
      return createDirectiveNode(
        directiveName as DirectiveNode['name'],
        rawValue || '',
        arg,
        [],
        loc
      );
    }
  }

  // 处理 : 简写（动态属性）
  if (rawName.startsWith(':')) {
    const arg = rawName.slice(1);
    return createDirectiveNode('bind', rawValue || '', arg, [], loc);
  }

  // 处理 @ 简写（事件绑定）
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

  // 处理 # 简写（插槽）
  if (rawName.startsWith('#')) {
    const arg = rawName.slice(1);
    return createDirectiveNode('slot', rawValue || '', arg, [], loc);
  }

  // 普通属性
  return createAttributeNode(rawName, rawValue, loc);
}
