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
  DATA: "data" as const,
  PROPS: "props" as const,
  SETUP: "setup" as const,
  LITERAL_CONST: "literal-const" as const,
} as const;

export { PatchFlags } from "@lytjs/common-vnode";

// Runtime helper names
export const VNodeHook = {
  BEFORE_MOUNT: "bm",
  MOUNTED: "m",
  BEFORE_UPDATE: "bu",
  UPDATED: "u",
  BEFORE_UNMOUNT: "bum",
  UNMOUNTED: "um",
} as const;

// Runtime helper symbols
export const RENDER_HELPER = "renderHelper" as const;

// Helper name mapping for codegen
export const helperNameMap: Record<string, string> = {
  CREATE_VNODE: "createElementVNode",
  CREATE_ELEMENT_VNODE: "createElementVNode",
  CREATE_COMMENT: "createCommentVNode",
  CREATE_TEXT: "createTextVNode",
  CREATE_STATIC: "createStaticVNode",
  RESOLVE_COMPONENT: "resolveComponent",
  RESOLVE_DYNAMIC_COMPONENT: "resolveDynamicComponent",
  RESOLVE_DIRECTIVE: "resolveDirective",
  RENDER_LIST: "renderList",
  RENDER_SLOT: "renderSlot",
  CREATE_SLOTS: "createSlots",
  TO_DISPLAY_STRING: "toDisplayString",
  MERGE_PROPS: "mergeProps",
  TO_HANDLER_KEY: "toHandlerKey",
  SET_BLOCK_TRACKING: "setBlockTracking",
  CREATE_BLOCK: "createBlock",
  OPEN_BLOCK: "openBlock",
  WITH_CTX: "withCtx",
  NORMALIZE_CLASS: "normalizeClass",
  NORMALIZE_STYLE: "normalizeStyle",
  NORMALIZE_PROPS: "normalizeProps",
  GUARD_REACTIVE_PROPS: "guardReactiveProps",
};
