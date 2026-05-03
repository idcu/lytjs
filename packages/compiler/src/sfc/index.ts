// src/sfc/index.ts
// SFC barrel export - aggregates all SFC-related APIs

// Parse
export { parseSFC } from './parse';
export type {
  SFCDescriptor,
  SFCTemplateBlock,
  SFCScriptBlock,
  SFCStyleBlock,
  SFCCustomBlock,
  SFCParseOptions,
} from './parse';

// Compile
export { compileSFC } from './compile';
export type { SFCCompileOptions, SFCCompileResult } from './compile';

// Custom blocks
export {
  KNOWN_CUSTOM_BLOCKS,
  registerCustomBlockProcessor,
  getCustomBlockProcessor,
  unregisterCustomBlockProcessor,
  getRegisteredCustomBlockProcessors,
} from './custom-blocks';
export type { CustomBlockProcessor } from './custom-blocks';

// TypeScript declarations
export { generateComponentTypes } from './typescript';
export type {
  ComponentTypeInfo,
  PropDeclaration,
  EmitDeclaration,
} from './typescript';
