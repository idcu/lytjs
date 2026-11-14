// src/parser-children.ts
// Parse children and whitespace condensing

import { NodeTypes, TextModes } from './constants';
import { warn } from '@lytjs/common-error';
import type { TextNode, TemplateChildNode, ParentNode, ParserContext } from './types';

import { advanceBy, getCursor, getSelection, RE_DOCTYPE } from './parser-shared';
import { createText } from './ast';

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

export function parseChildren(
  context: ParserContext,
  parent: ParentNode,
  mode: number,
  rawTagName?: string,
): void {
  let nodes: TemplateChildNode[] = [];

  while (!isEnd(context, mode, rawTagName)) {
    const s = context.source;
    let node: TemplateChildNode | undefined;

    // P0-2：RAWTEXT（script/style/textarea 之外的原始文本）唯一的终止符是
    // 匹配的 `</tag`。`<` 与 `{{` 在原始文本里都是普通字符，若交给 parseText
    // （以 `<`/`{{` 为终止符），source 以 `<` 开头时会 advanceBy(0) ⇒ 无限循环
    // 并持续 push 空文本节点。
    if (isRAWTEXTMode(mode) && rawTagName) {
      const closeIndex = findRawTextEnd(s, rawTagName);
      const contentEnd = closeIndex === -1 ? s.length : closeIndex;
      if (contentEnd > 0) {
        const start = getCursor(context);
        nodes.push(createText(s.slice(0, contentEnd), getSelection(context, start)));
        advanceBy(context, contentEnd);
      }
      continue;
    }

    if (mode === TextModes.DATA || mode === TextModes.RCDATA) {
      if (s.startsWith('<!--')) {
        node = parseComment(context);
        // C-14：comments === false 时仍消费注释，但不让它进入 AST。
        if (context.options.comments === false) {
          continue;
        }
      } else if (s.startsWith('{{')) {
        node = parseInterpolation(context);
      } else if (s.startsWith('<')) {
        if (s[1] === '/') {
          break;
        }
        // ⚠️ 2026-10-31 修（P0）：`<![CDATA[ ... ]]>` 是**文本**，不是 DOCTYPE。
        //   此前被 `startsWith('<!')` 收走，RE_DOCTYPE 匹配失败后直接跳到行尾
        //   ⇒ CDATA 里的内容整段静默消失（实测 `<![CDATA[x>y]]>` 编译成空 div）。
        if (s.startsWith('<![CDATA[')) {
          const cdataStart = getCursor(context);
          const closeIdx = s.indexOf(']]>');
          const inner = closeIdx === -1 ? s.slice(9) : s.slice(9, closeIdx);
          advanceBy(context, closeIdx === -1 ? s.length : closeIdx + 3);
          if (inner) {
            nodes.push(createText(inner, getSelection(context, cdataStart)));
          }
          continue;
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
        if (!node) {
          // ⚠️ C-10 修：`<` 不能作为标签起始（如 `a < 2` / `<<div>`）时，
          //   parseTag 已不改动游标。这里把 `<` 当普通文本消费掉一个字符；
          //   不能交给 parseText —— 它以 `<` 为终止符，会 advanceBy(0) 死循环。
          const textStart = getCursor(context);
          advanceBy(context, 1);
          node = createText('<', getSelection(context, textStart));
        }
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
  // C-14：whitespace 此前只声明未读取；'preserve' 时原样保留空白文本节点。
  if (
    mode === TextModes.DATA &&
    parent.type !== NodeTypes.ELEMENT &&
    context.options.whitespace !== 'preserve'
  ) {
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

/**
 * 查找原始文本（RAWTEXT）中匹配的结束标签 `</tag` 的起始下标。
 * `<` 后必须紧跟 `/tag`，且 tag 之后是空白、`>`、`/` 或文件尾，
 * 否则视为普通文本（例如 `<script>` 里的 `</b>` 不是结束标签）。
 */
function findRawTextEnd(source: string, tagName: string): number {
  const lower = source.toLowerCase();
  const needle = `</${tagName.toLowerCase()}`;
  let from = 0;
  while (from <= lower.length) {
    const idx = lower.indexOf(needle, from);
    if (idx === -1) return -1;
    const next = source[idx + needle.length];
    if (next === undefined || next === '>' || next === '/' || /\s/.test(next)) {
      return idx;
    }
    from = idx + needle.length;
  }
  return -1;
}

function isEnd(context: ParserContext, mode: number, rawTagName?: string): boolean {
  const s = context.source;
  // FIX: P2-7 使用类型守卫进行模式检查
  if (isDATAMode(mode)) {
    if (s.startsWith('</')) {
      const match = s.match(/^<\/([a-zA-Z][a-zA-Z0-9-]*)/);
      return !!match;
    }
    return !s;
  }
  // RAWTEXT 只认匹配的结束标签；其他 `</x` 属于文本内容，不能提前终止。
  if (isRAWTEXTMode(mode) && rawTagName) {
    if (!s) return true;
    return findRawTextEnd(s, rawTagName) === 0;
  }
  if (isRCDATAMode(mode) || isRAWTEXTMode(mode) || isCDATAMode(mode)) {
    if (s.startsWith('</')) {
      return true;
    }
    return !s;
  }
  return !s;
}
