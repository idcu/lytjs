// src/parser-text.ts
// Text and interpolation parsing: parseText, parseInterpolation

import type { TextNode, InterpolationNode, ParserContext } from './types';
import { createText, createInterpolation, createSimpleExpression } from './ast';
import { warn } from '@lytjs/common-error';
import { advanceBy, getCursor, getSelection } from './parser-base';

import { COMPILER_MAX_REGEX_INPUT_LENGTH as MAX_REGEX_INPUT_LENGTH } from '@lytjs/common-constants';

// ============================================================
// Parse text
// ============================================================

export function parseText(context: ParserContext): TextNode {
  const start = getCursor(context);
  const endTokens = ['<', '{{'];

  // FIX: P2-42 对大输入使用分段处理，避免 searchLength 截断导致遗漏结束标记。
  // 当输入超过 MAX_REGEX_INPUT_LENGTH 时，先在截断范围内搜索，
  // 如果未找到结束标记，则继续在剩余部分搜索。
  let endIndex = context.source.length;
  let searchStart = 0;
  while (searchStart < context.source.length) {
    const searchLength = Math.min(context.source.length - searchStart, MAX_REGEX_INPUT_LENGTH);
    const segment = context.source.slice(searchStart, searchStart + searchLength);
    let segmentEndIndex = searchLength;
    for (const token of endTokens) {
      // FIX: P2-14 删除 indexOf 第三个参数（死参数）
      // String.prototype.indexOf 只接受两个参数：searchString 和 position
      const index = segment.indexOf(token, 0);
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

export function parseInterpolation(context: ParserContext): InterpolationNode | undefined {
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
      } else if (
        char === '}' &&
        endIndex + 1 < context.source.length &&
        context.source[endIndex + 1] === '}'
      ) {
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
