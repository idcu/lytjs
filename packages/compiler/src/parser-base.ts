// src/parser-base.ts
// Base parser framework: utilities, constants, main parse function

import {
  TextModes,
} from './constants';
import { escapeRegExp } from '@lytjs/common-string';
import { warn } from '@lytjs/common-error';
import type {
  RootNode,
  ParserContext,
  ParserOptions,
  SourceLocation,
} from './types';
import { createRoot } from './ast';

import {
  COMPILER_MAX_INPUT_LENGTH,
  COMPILER_END_TAG_CACHE_MAX_SIZE,
} from '@lytjs/common-constants';

import { parseChildren } from './parser-children';

// Pre-compiled RegExp constants (avoid re-creation on every call)
const RE_ADVANCE_SPACES = /^[\t\r\n\f ]+/;
const RE_DOCTYPE = /^<!\[\s\S\]*?>/;
const RE_END_TAG = /^<\/([a-zA-Z][a-zA-Z0-9-]*)/;
const RE_TAG_NAME = /^([a-zA-Z][a-zA-Z0-9-]*)/;
const RE_ATTR_NAME = /^[^\t\r\n\f />][^\t\r\n\f />=]*/;
const RE_V_DIRECTIVE = /^v-([a-zA-Z][a-zA-Z0-9-]*)(?::(.+))?$/;
const RE_UNQUOTED_ATTR_VALUE = /^[^\t\r\n\f >]+/;
const RE_COMPONENT_TAG = /^[A-Z]/;

// FIX: P2-23 正则表达式缓存 - 模块级预编译正则，避免每次调用都编译
const RE_QUOTED_ATTR_VALUE = /^(['"])(.*)\1/;
const RE_IN_OF_EXPRESSION = /^(?:in|of)\s+(.+)$/;
const RE_COMMA_INDEX_IN_OF = /^(?:,\s*(\w+))?\s+(?:in|of)\s+(.+)$/;

// End tag RegExp cache (avoid re-creation on every parseElement call)
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

// ============================================================
// Parser utilities
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
// Helpers
// ============================================================

function isComponentTag(tag: string): boolean {
  return RE_COMPONENT_TAG.test(tag) || tag.includes('-');
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

// ============================================================
// Exports for sub-modules (internal use only)
// ============================================================

export {
  advanceBy,
  advanceSpaces,
  getCursor,
  getSelection,
  createParseError,
  isComponentTag,
  getEndTagRegex,
  // Re-export regex needed by sub-modules
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
