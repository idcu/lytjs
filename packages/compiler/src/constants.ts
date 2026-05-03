// src/constants.ts
// All enums as `as const` objects (isolatedModules forbids const enum)

export const NodeTypes = {
  ROOT: 0,
  ELEMENT: 1,
  TEXT: 2,
  COMMENT: 3,
  INTERPOLATION: 4,
  ATTRIBUTE: 5,
  DIRECTIVE: 6,
  SIMPLE_EXPRESSION: 7,
  COMPOUND_EXPRESSION: 8,
  VNODE_CALL: 9,
  JS_CALL_EXPRESSION: 10,
  JS_OBJECT_EXPRESSION: 11,
  JS_PROPERTY: 12,
  JS_ARRAY_EXPRESSION: 13,
  JS_FUNCTION_EXPRESSION: 14,
  JS_CONDITIONAL_EXPRESSION: 15,
  JS_CACHE_EXPRESSION: 16,
} as const;

export const ElementTypes = {
  ELEMENT: 0,
  COMPONENT: 1,
  SLOT: 2,
  TEMPLATE: 3,
} as const;

export const ConstantTypes = {
  NOT_CONSTANT: 0,
  CAN_SKIP_PATCH: 1,
  CAN_HOIST: 2,
  CAN_STRINGIFY: 3,
} as const;

export const TagType = {
  Start: 0,
  End: 1,
} as const;

export const TextModes = {
  DATA: 0,
  RCDATA: 1,
  RAWTEXT: 2,
  CDATA: 3,
} as const;

export const BindingTypes = {
  DATA: 'data' as const,
  PROPS: 'props' as const,
  SETUP: 'setup' as const,
  LITERAL_CONST: 'literal-const' as const,
} as const;

export { PatchFlags } from '@lytjs/common-vnode';

// Runtime helper names
export const VNodeHook = {
  BEFORE_MOUNT: 'bm',
  MOUNTED: 'm',
  BEFORE_UPDATE: 'bu',
  UPDATED: 'u',
  BEFORE_UNMOUNT: 'bum',
  UNMOUNTED: 'um',
} as const;

// Runtime helper symbols
export const RENDER_HELPER = 'renderHelper' as const;

// Helper name mapping for codegen
export const helperNameMap: Record<string, string> = {
  CREATE_VNODE: 'createElementVNode',
  CREATE_ELEMENT_VNODE: 'createElementVNode',
  CREATE_COMMENT: 'createCommentVNode',
  CREATE_TEXT: 'createTextVNode',
  CREATE_STATIC: 'createStaticVNode',
  RESOLVE_COMPONENT: 'resolveComponent',
  RESOLVE_DYNAMIC_COMPONENT: 'resolveDynamicComponent',
  RESOLVE_DIRECTIVE: 'resolveDirective',
  RENDER_LIST: 'renderList',
  RENDER_SLOT: 'renderSlot',
  CREATE_SLOTS: 'createSlots',
  TO_DISPLAY_STRING: 'toDisplayString',
  MERGE_PROPS: 'mergeProps',
  TO_HANDLER_KEY: 'toHandlerKey',
  SET_BLOCK_TRACKING: 'setBlockTracking',
  CREATE_BLOCK: 'createBlock',
  OPEN_BLOCK: 'openBlock',
  WITH_CTX: 'withCtx',
  NORMALIZE_CLASS: 'normalizeClass',
  NORMALIZE_STYLE: 'normalizeStyle',
  NORMALIZE_PROPS: 'normalizeProps',
  GUARD_REACTIVE_PROPS: 'guardReactiveProps',
  SANITIZE_HTML: 'sanitizeHTML',
  WITH_MEMO: 'withMemo',
} as const;

/**
 * 支持的裸指令名集合（"所见即所得"模式）
 * 这些指令名在模板中无需 v- 前缀即可被识别
 */
export const BARE_DIRECTIVE_NAMES = new Set([
  'if',
  'else-if',
  'else',
  'for',
  'each',
  'model',
  'show',
  'text',
  'html',
  'once',
  'memo',
  'pre',
  'cloak',
]);

/**
 * 裸指令名与 HTML 原生属性的冲突规则
 * key: 指令名, value: 在这些标签上不识别为指令（视为原生属性）
 */
export const BARE_DIRECTIVE_CONFLICTS: Record<string, Set<string>> = {
  for: new Set(['label', 'output']),
  show: new Set(['dialog']),
  text: new Set([]), // text 仅与 SVG <text> 元素标签冲突，不影响属性解析
};

/**
 * 需要通过值格式启发式判断的指令名
 * key: 指令名, value: 用于匹配指令值格式的正则表达式
 */
export const BARE_DIRECTIVE_VALUE_PATTERNS: Record<string, RegExp> = {
  for: /^\s*\(?[\w$]+\s*(?:,\s*[\w$]+)?\s+(?:in|of)\s+/, // "item in list" 或 "(item, index) of items"
};
