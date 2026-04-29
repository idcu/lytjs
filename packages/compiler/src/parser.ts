// src/parser.ts
// HTML template parser

import { NodeTypes, ElementTypes, TextModes, TagType } from './constants';
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
  let line = context.line;
  for (let i = 0; i < numberOfCharacters; i++) {
    const char = source[i];
    if (char === '\n') {
      line++;
    }
  }
  context.line = line;
  context.column += numberOfCharacters;
  context.offset += numberOfCharacters;
}

function advanceSpaces(context: ParserContext): void {
  const match = /^[\t\r\n\f ]+/.exec(context.source);
  if (match) {
    advanceBy(context, match[0].length);
  }
}

function getCursor(context: ParserContext): { offset: number; line: number; column: number } {
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

// ============================================================
// Parse children
// ============================================================

function parseChildren(
  context: ParserContext,
  parent: ParentNode,
  mode: number,
): void {
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
          const match = s.match(/^<![\s\S]*?>/);
          if (match) {
            advanceBy(context, match[0].length);
            continue;
          }
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
  if (
    mode === TextModes.DATA &&
    parent.type !== NodeTypes.ELEMENT
  ) {
    nodes = condenseWhitespace(nodes);
  }

  parent.children = nodes;
}

function condenseWhitespace(nodes: TemplateChildNode[]): TemplateChildNode[] {
  const condensed: TemplateChildNode[] = [];
  let prevText: TextNode | undefined;

  for (const node of nodes) {
    if (node.type === NodeTypes.TEXT) {
      if (!node.content.trim()) {
        if (prevText) {
          prevText.content += node.content;
        } else if (condensed.length > 0) {
          prevText = node;
          condensed.push(node);
        }
        continue;
      }
    }

    if (node.type === NodeTypes.TEXT && prevText && !prevText.content.trim()) {
      const idx = condensed.indexOf(prevText);
      if (idx !== -1) {
        condensed.splice(idx, 1);
      }
    }

    if (node.type === NodeTypes.TEXT) {
      prevText = node;
    } else {
      prevText = undefined;
    }

    condensed.push(node);
  }

  return condensed;
}

function isEnd(context: ParserContext, mode: number): boolean {
  const s = context.source;
  switch (mode) {
    case TextModes.DATA:
      if (s.startsWith('</')) {
        const match = s.match(/^<\/([a-zA-Z][a-zA-Z0-9-]*)/);
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

  let endIndex = context.source.length;
  for (const token of endTokens) {
    const index = context.source.indexOf(token);
    if (index !== -1 && index < endIndex) {
      endIndex = index;
    }
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
  const closeIndex = context.source.indexOf('}}', 2);

  if (closeIndex === -1) {
    return undefined;
  }

  // Advance past {{
  advanceBy(context, 2);

  const rawContent = context.source.slice(0, closeIndex - 2 + 2 - 2);

  const content = rawContent.trim();

  advanceBy(context, rawContent.length + 2);

  const expression = createSimpleExpression(
    content,
    false,
    getSelection(context, start),
    false,
  );

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
  if (tag === 'textarea' || tag === 'title') {
    textMode = TextModes.RCDATA;
  } else if (tag === 'style' || tag === 'script') {
    textMode = TextModes.RAWTEXT;
  }

  parseChildren(context, element, textMode);

  if (context.source.startsWith(`</`)) {
    const endTagMatch = context.source.match(new RegExp(`^<\\/\\s*${tag}\\s*>`));
    if (endTagMatch) {
      advanceBy(context, endTagMatch[0].length);
    }
  }

  element.loc = getSelection(context, start);
  return element;
}

// ============================================================
// Parse tag
// ============================================================

function parseTag(
  context: ParserContext,
  type: number,
): ElementNode | undefined {
  const start = getCursor(context);
  advanceBy(context, 1);

  const tagMatch = context.source.match(/^([a-zA-Z][a-zA-Z0-9-]*)/);
  if (!tagMatch) {
    return undefined;
  }

  const tag = tagMatch[1]!;
  advanceBy(context, tag.length);

  let tagType: number = ElementTypes.ELEMENT;
  if (isComponentTag(tag)) {
    tagType = ElementTypes.COMPONENT;
  } else if (tag === 'template') {
    tagType = ElementTypes.TEMPLATE;
  } else if (tag === 'slot') {
    tagType = ElementTypes.SLOT;
  }

  const props: (AttributeNode | DirectiveNode)[] = [];
  while (context.source.length > 0 && !context.source.startsWith('>') && !context.source.startsWith('/>')) {
    const prop = parseAttribute(context, tagType);
    if (prop) {
      props.push(prop);
    }
    advanceSpaces(context);
  }

  let isSelfClosing = false;
  if (context.source.startsWith('/>')) {
    isSelfClosing = true;
    advanceBy(context, 2);
  } else if (context.source.startsWith('>')) {
    advanceBy(context, 1);
  }

  if (type === TagType.End) {
    return undefined;
  }

  const element = createElement(tag, props, [], getSelection(context, start));
  element.tagType = tagType as typeof element.tagType;
  element.isSelfClosing = isSelfClosing;

  return element;
}

// ============================================================
// Parse attribute or directive
// ============================================================

function parseAttribute(
  context: ParserContext,
  _tagType: number,
): AttributeNode | DirectiveNode | undefined {
  const start = getCursor(context);

  const match = context.source.match(/^[^\t\r\n\f />][^\t\r\n\f />=]*/);
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
    const dirMatch = rawName.match(/^v-([a-zA-Z][a-zA-Z0-9-]*)(?::(.+))?$/);
    if (dirMatch) {
      return parseDirective(context, dirMatch[1]!, dirMatch[2], start);
    }
  }

  advanceSpaces(context);

  let value: TextNode | undefined;

  if (context.source.startsWith('=')) {
    advanceBy(context, 1);
    advanceSpaces(context);
    value = parseAttributeValue(context);
  }

  return createAttribute(rawName, value, getSelection(context, start));
}

function parseAttributeValue(context: ParserContext): TextNode {
  const start = getCursor(context);
  let content: string;

  if (context.source.startsWith('"')) {
    advanceBy(context, 1);
    const endIndex = context.source.indexOf('"');
    content = endIndex >= 0 ? context.source.slice(0, endIndex) : context.source;
    advanceBy(context, content.length + 1);
  } else if (context.source.startsWith("'")) {
    advanceBy(context, 1);
    const endIndex = context.source.indexOf("'");
    content = endIndex >= 0 ? context.source.slice(0, endIndex) : context.source;
    advanceBy(context, content.length + 1);
  } else {
    const match = context.source.match(/^[^\t\r\n\f >]+/);
    content = match ? match[0] : '';
    advanceBy(context, content.length);
  }

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
    name === 'show' ||
    name === 'slot' ||
    name === 'once' ||
    name === 'else-if' ||
    name === 'else'
  ) {
    advanceSpaces(context);

    if (context.source.startsWith('=')) {
      advanceBy(context, 1);
      advanceSpaces(context);

      const valueStart = getCursor(context);
      let valueContent: string;

      if (context.source.startsWith('"')) {
        advanceBy(context, 1);
        const endIndex = context.source.indexOf('"');
        valueContent = endIndex >= 0 ? context.source.slice(0, endIndex) : context.source;
        advanceBy(context, valueContent.length + 1);
      } else if (context.source.startsWith("'")) {
        advanceBy(context, 1);
        const endIndex = context.source.indexOf("'");
        valueContent = endIndex >= 0 ? context.source.slice(0, endIndex) : context.source;
        advanceBy(context, valueContent.length + 1);
      } else {
        const match = context.source.match(/^[^\t\r\n\f >]+/);
        valueContent = match ? match[0] : '';
        advanceBy(context, valueContent.length);
      }

      exp = createSimpleExpression(valueContent, false, getSelection(context, valueStart), false);
    }
  }

  return createDirective(name, arg, exp, modifiers, getSelection(context, start));
}

// ============================================================
// Helpers
// ============================================================

function isComponentTag(tag: string): boolean {
  return /^[A-Z]/.test(tag) || tag.includes('-');
}
