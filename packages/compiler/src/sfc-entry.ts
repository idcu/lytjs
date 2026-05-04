export { parseSFC, compileSFC, generateComponentTypes } from './sfc';
export {
  KNOWN_CUSTOM_BLOCKS,
  registerCustomBlockProcessor,
  getCustomBlockProcessor,
  unregisterCustomBlockProcessor,
  getRegisteredCustomBlockProcessors,
} from './sfc';
export type {
  SFCDescriptor,
  SFCTemplateBlock,
  SFCScriptBlock,
  SFCStyleBlock,
  SFCCustomBlock,
  SFCParseOptions,
  SFCCompileOptions,
  SFCCompileResult,
  CustomBlockProcessor,
  ComponentTypeInfo,
  PropDeclaration,
  EmitDeclaration,
} from './sfc';
