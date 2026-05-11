// src/parser-base.ts
// 基础解析器框架：工具函数、常量、主解析函数

import {
  TextModes,
} from './constants';
import { escapeRegExp } from '@lytjs/common-string';
import { 
  warn,
  createCompilerError,
  LytErrorCodes,
  type SourceLocation,
  getErrorSuggestion
} from '@lytjs/common-error';
import type {
  RootNode,
  ParserContext,
  ParserOptions,
} from './types';
import { createRoot } from './ast';

import {
  COMPILER_MAX_INPUT_LENGTH as MAX_INPUT_LENGTH,
  COMPILER_END_TAG_CACHE_MAX_SIZE as END_TAG_CACHE_MAX_SIZE,
} from '@lytjs/common-constants';

import { parseChildren } from './parser-children';

// 预编译 RegExp 常量（避免每次调用时重新创建）
const RE_ADVANCE_SPACES = /^[\t\r\n\f ]+/;
const RE_DOCTYPE = /^<!\[\s\S\]*?>/;
const RE_TAG_NAME = /^([a-zA-Z][a-zA-Z0-9-]*)/;
const RE_ATTR_NAME = /^[^\t\r\n\f />][^\t\r\n\f />=]*/;
const RE_V_DIRECTIVE = /^v-([a-zA-Z][a-zA-Z0-9-]*)(?::(.+))?$/;
const RE_UNQUOTED_ATTR_VALUE = /^[^\t\r\n\f >]+/;
const RE_COMPONENT_TAG = /^[A-Z]/;

// FIX: P2-23 正则表达式缓存 - 模块级预编译正则，避免每次调用都编译
const RE_QUOTED_ATTR_VALUE = /^(['"])(.*)\1/;
const RE_IN_OF_EXPRESSION = /^(?:in|of)\s+(.+)$/;
const RE_COMMA_INDEX_IN_OF = /^(?:,\s*(\w+))?\s+(?:in|of)\s+(.+)$/;

// 结束标签 RegExp 缓存（避免每次 parseElement 调用时重新创建）
const endTagCache = new Map<string, RegExp>();
function getEndTagRegex(tag: string): RegExp {
  let regex = endTagCache.get(tag);
  if (!regex) {
    regex = new RegExp(`^<\\/\\s*${escapeRegExp(tag)}\\s*>`);
    endTagCache.set(tag, regex);
    // 当缓存超过最大大小时淘汰最旧的条目
    if (endTagCache.size > END_TAG_CACHE_MAX_SIZE) {
      const oldestKey = endTagCache.keys().next().value;
      if (oldestKey !== undefined) {
        endTagCache.delete(oldestKey);
      }
    }
  }
  return regex;
}

// ============================================================
// 解析器工具函数
// ============================================================

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
      // 跳过 \r\n 序列中的 \n
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

// FIX: P1-2 COMPILER-NEW-03 - 创建带行列位置信息的解析错误
function createParseError(
  context: ParserContext,
  message: string,
  code: LytErrorCodes = LytErrorCodes.UNEXPECTED_TOKEN,
): Error {
  const { line, column, offset } = context;
  
  const loc: SourceLocation = {
    start: { line, column, offset },
    end: { line, column: column + 1, offset: offset + 1 },
    source: context.originalSource,
  };
  
  // 创建带源码片段的错误消息
  const snippet = extractCodeSnippet(context.originalSource, line, column);
  const suggestion = getErrorSuggestion(code);
  
  const fullMessage = `Parse error at line ${line}, column ${column}: ${message}` +
    `\n\n${snippet}` +
    (suggestion ? `\n\n💡 Suggestion: ${suggestion}` : '');
  
  const error = createCompilerError(code, loc, fullMessage);
  return error;
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

// ============================================================
// 源码片段显示
// ============================================================

/**
 * 从源代码中提取错误位置附近的片段，包含行号和指示箭头
 */
function extractCodeSnippet(
  source: string,
  line: number,
  column: number,
  contextLines: number = 2
): string {
  const lines = source.split('\n');
  const startLine = Math.max(0, line - contextLines - 1);
  const endLine = Math.min(lines.length, line + contextLines);
  
  const snippet: string[] = [];
  const maxLineNumberWidth = String(endLine).length;
  
  for (let i = startLine; i < endLine; i++) {
    const currentLine = i + 1;
    const lineContent = lines[i];
    
    snippet.push(
      `${String(currentLine).padStart(maxLineNumberWidth)} | ${lineContent}`
    );
    
    if (currentLine === line) {
      snippet.push(
        `${' '.repeat(maxLineNumberWidth)} | ${' '.repeat(column - 1)}^`
      );
    }
  }
  
  return snippet.join('\n');
}

// ============================================================
// 辅助函数
// ============================================================

function isComponentTag(tag: string): boolean {
  return RE_COMPONENT_TAG.test(tag) || tag.includes('-');
}

// ============================================================
// 主解析函数
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

// ============================================================
// 子模块导出（仅供内部使用）
// ============================================================

export {
  advanceBy,
  advanceSpaces,
  getCursor,
  getSelection,
  createParseError,
  isComponentTag,
  getEndTagRegex,
  // 重新导出子模块需要的正则表达式
  RE_ATTR_NAME,
  RE_V_DIRECTIVE,
  RE_QUOTED_ATTR_VALUE,
  RE_UNQUOTED_ATTR_VALUE,
  RE_TAG_NAME,
  RE_COMPONENT_TAG,
  RE_IN_OF_EXPRESSION,
  RE_COMMA_INDEX_IN_OF,
  RE_DOCTYPE,
};
export type {
  ParserContext,
  ParserOptions,
  SourceLocation,
};
