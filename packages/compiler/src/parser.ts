// src/parser.ts
// HTML template parser


import {
  NodeTypes,
  ElementTypes,
  TextModes,
  TagType,
  BARE_DIRECTIVE_NAMES,
  BARE_DIRECTIVE_CONFLICTS,
  BARE_DIRECTIVE_VALUE_PATTERNS,
} from './constants';
import { VOID_ELEMENTS, escapeRegExp } from '@lytjs/common-string';
import { warn } from '@lytjs/common-error';
import type {
  RootNode,
  ElementNode,
  TextNode,
  CommentNode,
  InterpolationNode,
  AttributeNode,
  DirectiveNode,
  SimpleExpressionNode,
  TemplateChildNode,
  ParentNode,
  ParserContext,
  ParserOptions,
  SourceLocation,
} from './types';
import {
  createRoot,
  createElement,
  createText,
  createComment,
  createInterpolation,
  createAttribute,
  createDirective,
  createSimpleExpression,
} from './ast';

// ============================================================
// Parser utilities
// ============================================================

// Pre-compiled RegExp constants (avoid re-creation on every call)
const RE_ADVANCE_SPACES = /^[\t\r\n\f ]+/;
const RE_DOCTYPE = /^<![\s\S]*?>/;
const RE_END_TAG = /^<\/([a-zA-Z][a-zA-Z0-9-]*)/;
const RE_TAG_NAME = /^([a-zA-Z][a-zA-Z0-9-]*)/;
const RE_ATTR_NAME = /^[^\t\r\n\f />][^\t\r\n\f />=]*/;
const RE_V_DIRECTIVE = /^v-([a-zA-Z][a-zA-Z0-9-]*)(?::(.+))?$/;
const RE_UNQUOTED_ATTR_VALUE = /^[^\t\r\n\f >]+/;
const RE_COMPONENT_TAG = /^[A-Z]/;

// FIX: P1-1 COMPILER-NEW-02 - 输入长度限制，防止极端输入下的性能问题
const MAX_INPUT_LENGTH = 10000;
const MAX_REGEX_INPUT_LENGTH = 5000;

// End tag RegExp cache (avoid re-creation on every parseElement call)
const END_TAG_CACHE_MAX_SIZE = 100;
const endTagCache = new Map<string, RegExp>();
function getEndTagRegex(tag: string): RegExp {
  let regex = endTagCache.get(tag);
  if (!regex) {
    regex = new RegExp(`^<\\/\\s*${escapeRegExp(tag)}\\s*>`);
    endTagCache.set(tag, regex);
    // Evict oldest entry when cache exceeds max size
    if (endTagCache.size > END_TAG_CACHE_MAX_SIZE) {
      const oldestKey = endTagCache.keys().next().value;
      if (oldestKey !== undefined) {
        endTagCache.delete(oldestKey);
      }
    }
  }
  return regex;
}

function advanceBy(context: ParserContext, numberOfCharacters: number): void {
  const { source } = context;
  advancePositionWithMutation(context, source, numberOfCharacters);
  context.source = source.slice(numberOfCharacters);
}

function advancePositionWithMutation(
  context: ParserContext,
  source: string,
  numberOfCharacters: number,
): void {
  for (let i = 0; i < numberOfCharacters; i++) {
    const char = source.charCodeAt(i);
    if (char === 10 /* \n */) {
      context.line++;
      context.column = 0;
    } else if (char === 13 /* \r */) {
      context.line++;
      context.column = 0;
      // Skip \n in \r\n sequence
      if (source.charCodeAt(i + 1) === 10) {
        i++;
      }
    } else {
      context.column++;
    }
  }
  context.offset += numberOfCharacters;
}

function advanceSpaces(context: ParserContext): void {
  const match = RE_ADVANCE_SPACES.exec(context.source);
  if (match) {
    advanceBy(context, match[0].length);
  }
}

function getCursor(context: ParserContext): {
  offset: number;
  line: number;
  column: number;
} {
  return { offset: context.offset, line: context.line, column: context.column };
}

function getSelection(
  context: ParserContext,
  start: { offset: number; line: number; column: number },
): SourceLocation {
  const end = getCursor(context);
  return {
    start,
    end,
    source: context.originalSource.slice(start.offset, end.offset),
  };
}

// ============================================================
// Main parse function
// ============================================================

export function parse(source: string, options: ParserOptions = {}): RootNode {
  // FIX: P1-1 COMPILER-NEW-02 - 输入长度检查，如果超过限制使用分段解析
  if (source.length > MAX_INPUT_LENGTH) {
    if (__DEV__) {
      warn(
        `Input length (${source.length}) exceeds maximum recommended length (${MAX_INPUT_LENGTH}). ` +
        `Parsing may be slower for large inputs.`
      );
    }
  }

  const context = createParserContext(source, options);
  const root = createRoot([], source);

  parseChildren(context, root, TextModes.DATA);

  root.loc = getSelection(context, { offset: 0, line: 1, column: 1 });

  return root;
}

function createParserContext(source: string, options: ParserOptions): ParserContext {
  return {
    options,
    originalSource: source,
    source,
    offset: 0,
    line: 1,
    column: 1,
    inPre: false,
    inVPre: false,
  };
}

// FIX: P1-2 COMPILER-NEW-03 - 创建带行列位置信息的解析错误
function createParseError(
  context: ParserContext,
  message: string,
): Error {
  const { line, column, offset } = context;
  return new Error(
    `[LytJS compiler] Parse error at line ${line}, column ${column} (offset ${offset}): ${message}`
  );
}

// ============================================================
// Parse children
// ============================================================

function parseChildren(context: ParserContext, parent: ParentNode, mode: number): void {
  let nodes: TemplateChildNode[] = [];

  while (!isEnd(context, mode)) {
    const s = context.source;
    let node: TemplateChildNode | undefined;

    if (mode === TextModes.DATA || mode === TextModes.RCDATA) {
      if (s.startsWith('<!--')) {
        node = parseComment(context);
      } else if (s.startsWith('{{')) {
        node = parseInterpolation(context);
      } else if (s.startsWith('<')) {
        if (s[1] === '/') {
          break;
        }
        if (s.startsWith('<!DOCTYPE') || s.startsWith('<!')) {
          const match = s.match(RE_DOCTYPE);
          if (match) {
            advanceBy(context, match[0].length);
            continue;
          }
          // DOCTYPE/声明格式异常，跳过到行尾或文件尾防止无限循环
          if (__DEV__) {
            warn(`Invalid DOCTYPE/declaration at position ${context.offset}`);
          }
          const lineEnd = s.indexOf('\n');
          advanceBy(context, lineEnd === -1 ? s.length : lineEnd);
          continue;
        }
        node = parseElement(context);
      }
    }

    if (!node) {
      node = parseText(context);
    }

    if (node) {
      nodes.push(node);
    }
  }

  // Handle whitespace condensing
  if (mode === TextModes.DATA && parent.type !== NodeTypes.ELEMENT) {
    nodes = condenseWhitespace(nodes);
  }

  parent.children = nodes;
}

function condenseWhitespace(nodes: TemplateChildNode[]): TemplateChildNode[] {
  const condensed: TemplateChildNode[] = [];
  let prevText: TextNode | undefined;
  // Track indices of whitespace-only text nodes to remove in a single pass (O(n))
  const whitespaceIndicesToRemove = new Set<number>();

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]!;
    if (node.type === NodeTypes.TEXT) {
      if (!node.content.trim()) {
        if (prevText) {
          prevText.content += node.content;
        } else if (condensed.length > 0) {
          whitespaceIndicesToRemove.add(condensed.length);
          prevText = node;
          condensed.push(node);
        }
        continue;
      }
    }

    if (node.type === NodeTypes.TEXT && prevText && !prevText.content.trim()) {
      // Mark the previous whitespace-only text node for removal
      whitespaceIndicesToRemove.add(condensed.length - 1);
    }

    if (node.type === NodeTypes.TEXT) {
      prevText = node;
    } else {
      prevText = undefined;
    }

    condensed.push(node);
  }

  // Filter out marked whitespace nodes in a single pass (O(n))
  if (whitespaceIndicesToRemove.size > 0) {
    return condensed.filter((_, idx) => !whitespaceIndicesToRemove.has(idx));
  }

  return condensed;
}

function isEnd(context: ParserContext, mode: number): boolean {
  const s = context.source;
  switch (mode) {
    case TextModes.DATA:
      if (s.startsWith('</')) {
        const match = s.match(RE_END_TAG);
        return !!match;
      }
      return !s;
    case TextModes.RCDATA:
    case TextModes.RAWTEXT:
    case TextModes.CDATA: {
      if (s.startsWith('</')) {
        return true;
      }
      return !s;
    }
    default:
      return !s;
  }
}

// ============================================================
// Parse text
// ============================================================

function parseText(context: ParserContext): TextNode {
  const start = getCursor(context);
  const endTokens = ['<', '{{'];

  // FIX: P2-42 对大输入使用分段处理，避免 searchLength 截断导致遗漏结束标记。
  // 当输入超过 MAX_REGEX_INPUT_LENGTH 时，先在截断范围内搜索，
  // 如果未找到结束标记，则继续在剩余部分搜索。
  let endIndex = context.source.length;
  let searchStart = 0;
  while (searchStart < context.source.length) {
    const searchLength = Math.min(
      context.source.length - searchStart,
      MAX_REGEX_INPUT_LENGTH,
    );
    const segment = context.source.slice(searchStart, searchStart + searchLength);
    let segmentEndIndex = searchLength;
    for (const token of endTokens) {
      const index = segment.indexOf(token, 0, searchLength);
      if (index !== -1 && index < segmentEndIndex) {
        segmentEndIndex = index;
      }
    }
    if (segmentEndIndex < searchLength) {
      // 在当前分段中找到了结束标记
      endIndex = searchStart + segmentEndIndex;
      break;
    }
    // 当前分段未找到结束标记，继续搜索下一段
    searchStart += searchLength;
  }

  const content = context.source.slice(0, endIndex);
  advanceBy(context, endIndex);

  return createText(content, getSelection(context, start));
}

// ============================================================
// Parse interpolation {{ expression }}
// ============================================================

function parseInterpolation(context: ParserContext): InterpolationNode | undefined {
  const start = getCursor(context);
  // 字符串感知扫描：跳过引号内的 }}，避免误判
  // 使用状态机方式处理转义，正确处理连续反斜杠序列
  let endIndex = 2;
  let inString: string | null = null;
  let backslashCount = 0;
  while (endIndex < context.source.length) {
    const char = context.source[endIndex];
    if (inString) {
      if (char === '\\') {
        backslashCount++;
      } else if (char === inString && backslashCount % 2 === 0) {
        inString = null;
        backslashCount = 0;
      } else {
        backslashCount = 0;
      }
    } else {
      backslashCount = 0;
      if (char === '"' || char === "'") {
        inString = char;
      } else if (char === '}' && endIndex + 1 < context.source.length && context.source[endIndex + 1] === '}') {
        break;
      }
    }
    endIndex++;
  }
  const closeIndex = endIndex < context.source.length ? endIndex : -1;

  if (closeIndex === -1) {
    if (__DEV__) {
      warn('Unclosed interpolation expression.');
    }
    return undefined;
  }

  // Advance past {{
  advanceBy(context, 2);

  // closeIndex is relative to original source (which still starts with {{),
  // and we already advanced past {{ (2 chars), so the content length is closeIndex - 2.
  const rawContent = context.source.slice(0, closeIndex - 2);

  const content = rawContent.trim();

  advanceBy(context, rawContent.length + 2);

  const expression = createSimpleExpression(content, false, getSelection(context, start), false);

  return createInterpolation(expression, getSelection(context, start));
}

// ============================================================
// Parse comment
// ============================================================

function parseComment(context: ParserContext): CommentNode {
  const start = getCursor(context);

  advanceBy(context, 4);

  const endIndex = context.source.indexOf('-->');
  let content: string;
  if (endIndex === -1) {
    content = context.source;
    advanceBy(context, context.source.length);
  } else {
    content = context.source.slice(0, endIndex);
    advanceBy(context, endIndex + 3);
  }

  return createComment(content, getSelection(context, start));
}

// ============================================================
// Parse element
// ============================================================

function parseElement(context: ParserContext): ElementNode | undefined {
  const start = getCursor(context);

  const element = parseTag(context, TagType.Start);

  if (!element) {
    return undefined;
  }

  if (element.isSelfClosing) {
    return element;
  }

  const tag = element.tag;

  let textMode: number = TextModes.DATA;
  if (tag === 'textarea' || tag === 'title' || tag === 'xmp') {
    textMode = TextModes.RCDATA;
  } else if (
    tag === 'style' ||
    tag === 'script' ||
    tag === 'iframe' ||
    tag === 'noembed' ||
    tag === 'noframes' ||
    tag === 'noscript' ||
    tag === 'plaintext'
  ) {
    textMode = TextModes.RAWTEXT;
  }

  parseChildren(context, element, textMode);

  if (context.source.startsWith(`</`)) {
    const endTagMatch = context.source.match(getEndTagRegex(tag));
    if (endTagMatch) {
      advanceBy(context, endTagMatch[0].length);
    } else {
      // FIX: P1-2 COMPILER-NEW-03 - 使用带行列位置信息的错误
      const errorMessage = `Element <${tag}> was left open. Expected closing tag </${tag}>.`;
      if (__DEV__) {
        warn(errorMessage);
      }

      if (context.options.onError) {
        context.options.onError(createParseError(context, errorMessage));
      }
    }
  }

  element.loc = getSelection(context, start);
  return element;
}

// ============================================================
// Parse tag
// ============================================================

function parseTag(context: ParserContext, type: number): ElementNode | undefined {
  const start = getCursor(context);
  advanceBy(context, 1);

  const tagMatch = context.source.match(RE_TAG_NAME);
  if (!tagMatch) {
    return undefined;
  }

  const tag = tagMatch[1]!;
  advanceBy(context, tag.length);

  let tagType: (typeof ElementTypes)[keyof typeof ElementTypes] = ElementTypes.ELEMENT;
  if (isComponentTag(tag)) {
    tagType = ElementTypes.COMPONENT;
  } else if (tag === 'template') {
    tagType = ElementTypes.TEMPLATE;
  } else if (tag === 'slot') {
    tagType = ElementTypes.SLOT;
  }

  const props: (AttributeNode | DirectiveNode)[] = [];
  const MAX_ATTRIBUTES = 1000;
  let attrCount = 0;
  while (
    context.source.length > 0 &&
    !context.source.startsWith('>') &&
    !context.source.startsWith('/>')
  ) {
    attrCount++;
    if (attrCount > MAX_ATTRIBUTES) {
      if (__DEV__) {
        warn(
          `Too many attributes (${attrCount}), ` +
            `stopping attribute parsing to prevent infinite loop.`,
        );
      }
      const tagEnd = context.source.indexOf('>');
      if (tagEnd !== -1) {
        advanceBy(context, tagEnd);
      }
      break;
    }
    const prop = parseAttribute(context, tagType, tag);
    if (prop) {
      props.push(prop);
    }
    advanceSpaces(context);
  }

  let isSelfClosing = false;
  if (context.source.startsWith('/>')) {
    isSelfClosing = true;
    advanceBy(context, 2);

    // Warn when non-void elements use self-closing syntax (e.g. <div />)
    // This is not valid HTML and may cause hydration issues.
    if (type === TagType.Start && !VOID_ELEMENTS.has(tag)) {
      // FIX: P1-2 COMPILER-NEW-03 - 使用带行列位置信息的错误
      const errorMessage =
        `Non-void element <${tag}> uses self-closing syntax. ` +
        `This is not valid HTML and may cause hydration issues. ` +
        `Use <${tag}></${tag}> instead.`;
      if (__DEV__) {
        warn(errorMessage);
      }
      if (context.options.onError) {
        context.options.onError(createParseError(context, errorMessage));
      }
    }
  } else if (context.source.startsWith('>')) {
    advanceBy(context, 1);
  }

  if (type === TagType.End) {
    return undefined;
  }

  const element = createElement(tag, props, [], getSelection(context, start));
  // Safe: tagType is assigned from ElementTypes constants (COMPONENT/TEMPLATE/SLOT/ELEMENT)
  // which are valid values for the ElementNode.tagType union type.
  element.tagType = tagType as typeof element.tagType;
  element.isSelfClosing = isSelfClosing;

  return element;
}

// ============================================================
// Parse attribute or directive
// ============================================================

/**
 * 尝试将裸属性名解析为指令（"所见即所得"模式）
 *
 * @returns DirectiveNode 如果匹配为裸指令；undefined 如果不匹配
 */
function tryParseBareDirective(
  rawName: string,
  currentTag: string,
  _tagType: (typeof ElementTypes)[keyof typeof ElementTypes],
  context: ParserContext,
  start: { offset: number; line: number; column: number },
): AttributeNode | DirectiveNode | undefined {
  // 检查是否显式关闭了裸指令名解析
  if (context.options.bareDirectives === false) {
    return undefined;
  }

  // 处理 attr- 转义前缀：attr-for="..." → 普通属性 for="..."
  if (rawName.startsWith('attr-')) {
    const escapedName = rawName.slice(5); // 去掉 "attr-" 前缀
    advanceSpaces(context);

    let value: TextNode | undefined;
    if (context.source.startsWith('=')) {
      advanceBy(context, 1);
      advanceSpaces(context);
      value = parseAttributeValue(context);
    }

    return createAttribute(escapedName, value, getSelection(context, start));
  }

  // 检查是否为裸指令名
  if (!BARE_DIRECTIVE_NAMES.has(rawName)) {
    return undefined;
  }

  // 上下文感知冲突检测
  const conflictTags = BARE_DIRECTIVE_CONFLICTS[rawName];
  if (conflictTags && conflictTags.has(currentTag)) {
    return undefined; // 在冲突标签上，视为普通属性
  }

  // 值格式启发式检测（仅对有定义模式的指令生效）
  const valuePattern = BARE_DIRECTIVE_VALUE_PATTERNS[rawName];
  if (valuePattern) {
    // 预读属性值（不消费），检查是否符合指令值格式
    const savedSource = context.source;
    advanceSpaces(context);

    if (context.source.startsWith('=')) {
      // 跳过 '=' 和空白
      const afterEq = context.source.slice(1).trimStart();
      // 提取引号内的值
      const quoteMatch = afterEq.match(/^(['"])(.*)\1/);
      if (quoteMatch) {
        const attrValue = quoteMatch[2]!;
        if (!valuePattern.test(attrValue)) {
          // 值格式不匹配指令模式，还原上下文并视为普通属性
          context.source = savedSource;
          return undefined;
        }
      }
    }

    // 还原上下文（实际值解析由 parseDirective 完成）
    context.source = savedSource;
  }

  // 匹配成功，解析为指令
  return parseDirective(context, rawName, undefined, start);
}

function parseAttribute(
  context: ParserContext,
  _tagType: (typeof ElementTypes)[keyof typeof ElementTypes],
  currentTag: string,
): AttributeNode | DirectiveNode | undefined {
  const start = getCursor(context);

  const match = context.source.match(RE_ATTR_NAME);
  if (!match) {
    return undefined;
  }

  const rawName = match[0]!;
  advanceBy(context, rawName.length);

  if (rawName.startsWith(':')) {
    return parseDirective(context, 'bind', rawName.slice(1), start);
  }
  if (rawName.startsWith('@')) {
    return parseDirective(context, 'on', rawName.slice(1), start);
  }
  if (rawName.startsWith('#')) {
    return parseDirective(context, 'slot', rawName.slice(1), start);
  }

  if (rawName.startsWith('v-')) {
    const dirMatch = rawName.match(RE_V_DIRECTIVE);
    if (dirMatch) {
      return parseDirective(context, dirMatch[1]!, dirMatch[2], start);
    }
  }

  // ===== 裸指令名识别（"所见即所得"模式）=====
  const bareResult = tryParseBareDirective(rawName, currentTag, _tagType, context, start);
  if (bareResult) {
    return bareResult;
  }
  // ===== 裸指令名识别结束 =====

  advanceSpaces(context);

  let value: TextNode | undefined;

  if (context.source.startsWith('=')) {
    advanceBy(context, 1);
    advanceSpaces(context);
    value = parseAttributeValue(context);
  }

  return createAttribute(rawName, value, getSelection(context, start));
}

// ============================================================
// Parse quoted value (shared by parseAttributeValue and parseDirective)
// ============================================================

// FIX: P2-23 提取公共逻辑，避免代码重复
/**
 * 解析带引号的字符串值，支持转义字符
 * @param context 解析上下文
 * @param quote 引号字符（" 或 '）
 * @returns 解析出的内容（不包含引号）
 */
function parseQuotedString(context: ParserContext, quote: '"' | "'"): string {
  advanceBy(context, 1);
  // 状态机方式处理转义：追踪连续反斜杠数量，奇数个反斜杠表示下一个引号被转义
  let endIndex = 0;
  let backslashCount = 0;
  while (endIndex < context.source.length) {
    const char = context.source[endIndex];
    if (char === '\\') {
      backslashCount++;
    } else {
      if (char === quote && backslashCount % 2 === 0) {
        break;
      }
      backslashCount = 0;
    }
    endIndex++;
  }

  let content: string;
  if (endIndex < context.source.length) {
    content = context.source.slice(0, endIndex);
  } else {
    if (__DEV__) {
      warn('Unclosed attribute value.');
    }
    content = context.source;
  }
  advanceBy(context, content.length + 1);
  return content;
}

function parseQuotedValue(context: ParserContext): string {
  let content: string;

  if (context.source.startsWith('"')) {
    content = parseQuotedString(context, '"');
  } else if (context.source.startsWith("'")) {
    content = parseQuotedString(context, "'");
  } else {
    const match = context.source.match(RE_UNQUOTED_ATTR_VALUE);
    content = match ? match[0] : '';
    advanceBy(context, content.length);
  }

  return content;
}

function parseAttributeValue(context: ParserContext): TextNode {
  const start = getCursor(context);
  const content = parseQuotedValue(context);
  return createText(content, getSelection(context, start));
}

function parseDirective(
  context: ParserContext,
  name: string,
  rawArg: string | undefined,
  start: { offset: number; line: number; column: number },
): DirectiveNode {
  advanceSpaces(context);

  let arg: SimpleExpressionNode | undefined;
  let exp: SimpleExpressionNode | undefined;
  let modifiers: string[] = [];

  if (rawArg !== undefined) {
    const parts = rawArg.split('.');
    const argContent = parts[0];
    modifiers = parts.slice(1);

    if (argContent !== undefined && argContent.startsWith('[') && argContent.endsWith(']')) {
      const content = argContent.slice(1, -1);
      arg = createSimpleExpression(content, false, getSelection(context, start), false);
    } else if (argContent !== undefined) {
      arg = createSimpleExpression(argContent, true, getSelection(context, start), true);
    }
  }

  if (
    name === 'bind' ||
    name === 'on' ||
    name === 'model' ||
    name === 'if' ||
    name === 'for' ||
    name === 'each' ||
    name === 'show' ||
    name === 'text' ||
    name === 'html' ||
    name === 'slot' ||
    name === 'once' ||
    name === 'memo' ||
    name === 'pre' ||
    name === 'cloak' ||
    name === 'else-if' ||
    name === 'else'
  ) {
    advanceSpaces(context);

    if (context.source.startsWith('=')) {
      advanceBy(context, 1);
      advanceSpaces(context);

      const valueStart = getCursor(context);
      const valueContent = parseQuotedValue(context);

      exp = createSimpleExpression(valueContent, false, getSelection(context, valueStart), false);
    }
  }

  return createDirective(name, arg, exp, modifiers, getSelection(context, start));
}

// ============================================================
// Helpers
// ============================================================

function isComponentTag(tag: string): boolean {
  return RE_COMPONENT_TAG.test(tag) || tag.includes('-');
}
