// src/parser-children.ts
// Parse children and whitespace condensing

import { NodeTypes, TextModes } from './constants';
import { warn } from '@lytjs/common-error';
import type { TextNode, TemplateChildNode, ParentNode, ParserContext } from './types';

import { advanceBy, RE_DOCTYPE } from './parser-base';

import { parseComment } from './parser-comment';
import { parseInterpolation, parseText } from './parser-text';
import { parseElement } from './parser-element';

// ============================================================
// Parse children
// ============================================================

// Circular dependency note: parseChildren calls parseComment, parseInterpolation,
// parseElement, parseText which are defined in sub-modules. parseElement calls
// parseChildren back. This is safe with ES modules because all function references
// are resolved at runtime (after all modules are loaded), not at import time.

export function parseChildren(context: ParserContext, parent: ParentNode, mode: number): void {
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

// FIX: P2-7 完善类型守卫：添加 TextMode 类型守卫
/**
 * 检查是否为 RCDATA 模式（支持实体解析的原始文本）
 * 类型守卫：缩小 number 类型到具体的 TextMode 常量
 */
function isRCDATAMode(mode: number): mode is typeof TextModes.RCDATA {
  return mode === TextModes.RCDATA;
}

/**
 * 检查是否为 RAWTEXT 模式（不解析实体和标签的原始文本）
 * 类型守卫：缩小 number 类型到具体的 TextMode 常量
 */
function isRAWTEXTMode(mode: number): mode is typeof TextModes.RAWTEXT {
  return mode === TextModes.RAWTEXT;
}

/**
 * 检查是否为 CDATA 模式（不解析任何内容的原始文本）
 * 类型守卫：缩小 number 类型到具体的 TextMode 常量
 */
function isCDATAMode(mode: number): mode is typeof TextModes.CDATA {
  return mode === TextModes.CDATA;
}

/**
 * 检查是否为 DATA 模式（标准 HTML 解析模式）
 * 类型守卫：缩小 number 类型到具体的 TextMode 常量
 */
function isDATAMode(mode: number): mode is typeof TextModes.DATA {
  return mode === TextModes.DATA;
}

function isEnd(context: ParserContext, mode: number): boolean {
  const s = context.source;
  // FIX: P2-7 使用类型守卫进行模式检查
  if (isDATAMode(mode)) {
    if (s.startsWith('</')) {
      const match = s.match(/^<\/([a-zA-Z][a-zA-Z0-9-]*)/);
      return !!match;
    }
    return !s;
  }
  if (isRCDATAMode(mode) || isRAWTEXTMode(mode) || isCDATAMode(mode)) {
    if (s.startsWith('</')) {
      return true;
    }
    return !s;
  }
  return !s;
}
