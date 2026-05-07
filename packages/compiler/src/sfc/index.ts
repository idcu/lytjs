// src/sfc/index.ts
// SFC barrel export - aggregates all SFC-related APIs

// 解析
export { parseSFC } from './parse';
export type {
  SFCDescriptor,
  SFCTemplateBlock,
  SFCScriptBlock,
  SFCStyleBlock,
  SFCCustomBlock,
  SFCParseOptions,
} from './parse';

// 编译
export { compileSFC } from './compile';
export type { SFCCompileOptions, SFCCompileResult } from './compile';

// 自定义块
export {
  KNOWN_CUSTOM_BLOCKS,
  registerCustomBlockProcessor,
  getCustomBlockProcessor,
  unregisterCustomBlockProcessor,
  getRegisteredCustomBlockProcessors,
} from './custom-blocks';
export type { CustomBlockProcessor } from './custom-blocks';

// TypeScript 声明
export { generateComponentTypes } from './typescript';
export type {
  ComponentTypeInfo,
  PropDeclaration,
  EmitDeclaration,
} from './typescript';
