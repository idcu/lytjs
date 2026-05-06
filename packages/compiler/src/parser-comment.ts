// src/parser-comment.ts
// Comment parsing: parseComment

import type { CommentNode, ParserContext } from './types';
import { createComment } from './ast';
import { advanceBy, getCursor, getSelection } from './parser-base';

// ============================================================
// Parse comment
// ============================================================

export function parseComment(context: ParserContext): CommentNode {
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
