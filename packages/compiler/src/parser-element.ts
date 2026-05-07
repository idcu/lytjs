// src/parser-element.ts
// Element parsing: parseElement, parseTag

import {
  ElementTypes,
  TagType,
  TextModes,
} from './constants';
import { VOID_ELEMENTS } from '@lytjs/common-string';
import { warn } from '@lytjs/common-error';
import type {
  ElementNode,
  ParserContext,
  AttributeNode,
  DirectiveNode,
} from './types';
import { createElement } from './ast';

import {
  advanceBy,
  advanceSpaces,
  getCursor,
  getSelection,
  createParseError,
  isComponentTag,
  getEndTagRegex,
  RE_TAG_NAME,
} from './parser-base';
import { parseChildren } from './parser-children';
import { parseAttribute } from './parser-attribute';

// ============================================================
// Parse element
// ============================================================

export function parseElement(context: ParserContext): ElementNode | undefined {
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

  // FIX: P1-T2 通过 createElement 的 tagType 参数直接传入，避免类型断言
  const element = createElement(tag, props, [], getSelection(context, start), tagType);
  element.isSelfClosing = isSelfClosing;

  return element;
}
