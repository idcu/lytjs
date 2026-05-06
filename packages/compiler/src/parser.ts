/**
 * @module parser
 * 模板解析器 - 聚合导出入口
 *
 * 此文件已拆分为多个子模块以降低复杂度：
 * - parser-base.ts: 基础框架和主解析函数
 * - parser-children.ts: 子节点解析
 * - parser-text.ts: 文本和插值解析
 * - parser-comment.ts: 注释解析
 * - parser-element.ts: 元素解析
 * - parser-attribute.ts: 属性和指令解析
 */

// parser-base.ts: 基础框架和主解析函数
export {
  parse,
  advanceBy,
  advanceSpaces,
  getCursor,
  getSelection,
  createParseError,
  isComponentTag,
  getEndTagRegex,
  RE_ATTR_NAME,
  RE_V_DIRECTIVE,
  RE_QUOTED_ATTR_VALUE,
  RE_UNQUOTED_ATTR_VALUE,
  RE_TAG_NAME,
  RE_COMPONENT_TAG,
  RE_IN_OF_EXPRESSION,
  RE_COMMA_INDEX_IN_OF,
  RE_DOCTYPE,
} from './parser-base';
export type {
  ParserContext,
  ParserOptions,
  SourceLocation,
} from './parser-base';

// parser-children.ts: 子节点解析
export {
  parseChildren,
} from './parser-children';

// parser-text.ts: 文本和插值解析
export {
  parseText,
  parseInterpolation,
} from './parser-text';

// parser-comment.ts: 注释解析
export {
  parseComment,
} from './parser-comment';

// parser-element.ts: 元素解析
export {
  parseElement,
} from './parser-element';

// parser-attribute.ts: 属性和指令解析
export {
  parseAttribute,
} from './parser-attribute';
