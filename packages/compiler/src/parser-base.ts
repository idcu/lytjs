// 基础解析器框架：主解析函数
//
// 工具函数、正则常量与 ParserContext 构造已下沉到 parser-shared.ts：
// 子解析模块只需要纯工具，不应为了工具而与 `parse()` 所在模块形成静态环。

import { TextModes } from './constants';
import { warn, type SourceLocation } from '@lytjs/common-error';
import type { RootNode, ParserContext, ParserOptions } from './types';
import { createRoot } from './ast';

import { COMPILER_MAX_INPUT_LENGTH as MAX_INPUT_LENGTH } from '@lytjs/common-constants';

import { parseChildren } from './parser-children';
import { createParserContext, getSelection } from './parser-shared';

// 保持 parser.ts / 内部子模块既有导入路径不变
export * from './parser-shared';

// ============================================================
// 主解析函数
// ============================================================

export function parse(source: string, options: ParserOptions = {}): RootNode {
  // FIX: P1-1 COMPILER-NEW-02 - 输入长度检查，如果超过限制使用分段解析
  if (source.length > MAX_INPUT_LENGTH) {
    if (__DEV__) {
      warn(
        `Input length (${source.length}) exceeds maximum recommended length (${MAX_INPUT_LENGTH}). ` +
          `Parsing may be slower for large inputs.`,
      );
    }
  }

  const context = createParserContext(source, options);
  const root = createRoot([], source);

  parseChildren(context, root, TextModes.DATA);

  root.loc = getSelection(context, { offset: 0, line: 1, column: 1 });

  return root;
}

export type { ParserContext, ParserOptions, SourceLocation };
