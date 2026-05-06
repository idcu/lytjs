// src/parser-attribute.ts
// Attribute and directive parsing: parseAttribute, parseDirective, parseQuotedValue, etc.

import {
  ElementTypes,
  BARE_DIRECTIVE_NAMES,
  BARE_DIRECTIVE_CONFLICTS,
  BARE_DIRECTIVE_VALUE_PATTERNS,
} from './constants';
import { warn } from '@lytjs/common-error';
import type {
  TextNode,
  AttributeNode,
  DirectiveNode,
  SimpleExpressionNode,
  ParserContext,
} from './types';
import {
  createText,
  createAttribute,
  createDirective,
  createSimpleExpression,
} from './ast';

import {
  advanceBy,
  advanceSpaces,
  getCursor,
  getSelection,
  RE_ATTR_NAME,
  RE_V_DIRECTIVE,
  RE_QUOTED_ATTR_VALUE,
  RE_UNQUOTED_ATTR_VALUE,
} from './parser-base';

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
      // FIX: P2-23 使用预编译正则，避免每次调用都编译
      const quoteMatch = RE_QUOTED_ATTR_VALUE.exec(afterEq);
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

export function parseAttribute(
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
