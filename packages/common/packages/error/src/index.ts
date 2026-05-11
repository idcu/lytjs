/**
 * @lytjs/common-error
 * 错误处理工具
 */

import { ERROR_MAX_WARNED_MESSAGES } from '@lytjs/common-constants';

// ============================================================
// 错误码枚举
// ============================================================

export enum LytErrorCodes {
  // === 编译器错误 (1-999) ===
  INVALID_EXPRESSION = 1001,
  UNEXPECTED_TOKEN = 1002,
  UNEXPECTED_EOF = 1003,
  INVALID_IDENTIFIER = 1004,
  INVALID_DIRECTIVE = 1005,
  INVALID_TEMPLATE_REF = 1006,
  INVALID_VNODE_SLOT = 1007,
  X_INVALID_SLOT_CONTENT = 1008,
  X_V_FOR_MALFORMED_EXPRESSION = 1009,
  X_V_FOR_NESTED_ITERATION = 1010,
  X_V_IF_SAME_KEY = 1011,
  X_V_IF_NO_EXPRESSION = 1012,
  X_V_IF_SIBLING_IF = 1013,
  X_V_FOR_NO_EXPRESSION = 1014,
  X_V_FOR_MISSING_KEY = 1015,
  X_V_FOR_TEMPLATE_KEY_PLACEMENT = 1016,
  X_KEY_EXPECTED = 1017,
  X_INVALID_V_FOR = 1018,
  X_MISSING_END_TAG = 1019,
  X_INVALID_END_TAG = 1020,
  X_INTERPOLATION_NO_EXPRESSION = 1021,
  X_MISSING_DYNAMIC_DIRECTIVE_ARGUMENT = 1022,
  X_V_BIND_INVALID_SAME_NAME_ARGUMENT = 1023,
  X_V_BIND_INVALID_DYNAMIC_ARGUMENT = 1024,
  X_V_ON_INVALID_DYNAMIC_ARGUMENT = 1025,
  X_V_MODEL_INVALID_EXPRESSION = 1026,
  X_V_MODEL_ON_SCOPE_VARIABLE = 1027,
  X_INVALID_V_MODEL_MODIFIER = 1028,
  X_V_MODEL_MALFORMED_MODIFIER = 1029,
  X_V_MODEL_INVALID_MODIFIER_ON_INPUT = 1030,
  X_V_MODEL_PROP_CANNOT_BE_SET = 1031,
  X_V_MODEL_CANNOT_BE_USED_ON_PROPS = 1032,
  X_V_SLOT_EXTRANEOUS_DEFAULT_SLOT_CHILDREN = 1033,
  X_V_SLOT_DUPLICATE_SLOT_NAMES = 1034,
  X_V_SLOT_MISSING_SLOT_NAME = 1035,
  X_V_SLOT_MIXED_SLOT_USAGE = 1036,
  X_V_SLOT_DUPLICATE_SLOT_NAMES_IN_SAME_SCOPE = 1037,
  X_V_SLOT_EXPECTED_SLOT_NAME = 1038,
  X_V_SLOT_NAMED_EXPECTED_DEFAULT = 1039,
  X_V_SLOT_NAMED_NO_DEFAULT = 1040,
  X_V_SLOT_DEFAULT_DUPLICATE = 1041,
  X_V_SLOT_EXTRANEOUS_ATTRS_IN_SLOTS = 1042,

  // === 运行时错误 (2000-2999) ===
  SETUP_FUNCTION_ERROR = 2001,
  RENDER_ERROR = 2002,
  WATCH_CALLBACK_ERROR = 2003,
  WATCH_GETTER_ERROR = 2004,
  WATCH_CLEANUP_ERROR = 2005,
  LIFECYCLE_HOOK_ERROR = 2006,
  PROVIDE_INJECT_ERROR = 2007,
  NEXT_TICK_ERROR = 2008,
  DIRECTIVE_ERROR = 2009,
  TRANSITION_ERROR = 2010,
  KEEP_ALIVE_ERROR = 2011,
  TELEPORT_ERROR = 2012,
  SUSPENSE_ERROR = 2013,

  // === 渲染器错误 (3000-3999) ===
  INVALID_VNODE_TYPE = 3001,
  INVALID_VNODE_KEY = 3002,
  INVALID_DOM_NODE = 3003,
  INVALID_HYDRATION_NODE = 3004,
  INVALID_PATCH_FLAG = 3005,
  INVALID_REF = 3006,
  INVALID_SLOT = 3007,
  INVALID_CHILDREN = 3008,
  INVALID_PROPS = 3009,
  INVALID_EVENT = 3010,
  INVALID_ATTR = 3011,
  INVALID_CLASS = 3012,
  INVALID_STYLE = 3013,
  INVALID_DIRECTIVE_VALUE = 3014,
  INVALID_TEMPLATE = 3015,
  INVALID_MOUNT_TARGET = 3016,
  INVALID_UNMOUNT_TARGET = 3017,

  // === 组件错误 (4000-4999) ===
  INVALID_COMPONENT = 4001,
  INVALID_PROP_TYPE = 4002,
  MISSING_PROP = 4003,
  INVALID_EMIT_EVENT = 4004,
  INVALID_SETUP_RETURN = 4005,
  INVALID_INJECT_KEY = 4006,
  DUPLICATE_KEYS = 4007,
  CIRCULAR_REFERENCE = 4008,
  INVALID_COMPUTED = 4009,
  INVALID_WATCH_SOURCE = 4010,
  COMPONENT_IS_MISSING_TEMPLATE = 4011,
  COMPONENT_ASYNC_ERROR = 4012,
}

// ============================================================
// 错误分类
// ============================================================

export type ErrorCategoryType = 'compiler' | 'runtime' | 'renderer' | 'component';

export const ErrorCategory = {
  COMPILER: 'compiler' as const,
  RUNTIME: 'runtime' as const,
  RENDERER: 'renderer' as const,
  COMPONENT: 'component' as const,
};

// ============================================================
// 错误消息映射
// ============================================================

const errorMessages: Record<LytErrorCodes, string> = {
  [LytErrorCodes.INVALID_EXPRESSION]: '无效的表达式。',
  [LytErrorCodes.UNEXPECTED_TOKEN]: '意外的标记。',
  [LytErrorCodes.UNEXPECTED_EOF]: '表达式意外结束。',
  [LytErrorCodes.INVALID_IDENTIFIER]: '无效的标识符。',
  [LytErrorCodes.INVALID_DIRECTIVE]: '无效的指令。',
  [LytErrorCodes.INVALID_TEMPLATE_REF]: '无效的模板引用。',
  [LytErrorCodes.INVALID_VNODE_SLOT]: '无效的虚拟节点插槽。',
  [LytErrorCodes.X_INVALID_SLOT_CONTENT]: '无效的插槽内容。',
  [LytErrorCodes.X_V_FOR_MALFORMED_EXPRESSION]: 'v-for 表达式格式错误。',
  [LytErrorCodes.X_V_FOR_NESTED_ITERATION]: '不支持嵌套的 v-for 迭代。',
  [LytErrorCodes.X_V_IF_SAME_KEY]: 'v-if/v-else-if/v-else 必须使用唯一的 key。',
  [LytErrorCodes.X_V_IF_NO_EXPRESSION]: 'v-if/v-else-if 需要表达式。',
  [LytErrorCodes.X_V_IF_SIBLING_IF]: 'v-if 和 v-else-if/v-else 必须是兄弟节点。',
  [LytErrorCodes.X_V_FOR_NO_EXPRESSION]: 'v-for 需要表达式。',
  [LytErrorCodes.X_V_FOR_MISSING_KEY]: 'v-for 需要 key 属性。',
  [LytErrorCodes.X_V_FOR_TEMPLATE_KEY_PLACEMENT]: '使用 v-for 时，key 必须放在 <template> 标签上。',
  [LytErrorCodes.X_KEY_EXPECTED]: '在 v-for/v-if 上期望一个 key。',
  [LytErrorCodes.X_INVALID_V_FOR]: 'v-for 使用无效。',
  [LytErrorCodes.X_MISSING_END_TAG]: '缺少结束标签。',
  [LytErrorCodes.X_INVALID_END_TAG]: '无效的结束标签。',
  [LytErrorCodes.X_INTERPOLATION_NO_EXPRESSION]: '插值需要表达式。',
  [LytErrorCodes.X_MISSING_DYNAMIC_DIRECTIVE_ARGUMENT]: '缺少动态指令参数。',
  [LytErrorCodes.X_V_BIND_INVALID_SAME_NAME_ARGUMENT]: 'v-bind 不能使用与指令参数相同的名称。',
  [LytErrorCodes.X_V_BIND_INVALID_DYNAMIC_ARGUMENT]: 'v-bind 的动态参数无效。',
  [LytErrorCodes.X_V_ON_INVALID_DYNAMIC_ARGUMENT]: 'v-on 的动态参数无效。',
  [LytErrorCodes.X_V_MODEL_INVALID_EXPRESSION]: 'v-model 表达式无效。',
  [LytErrorCodes.X_V_MODEL_ON_SCOPE_VARIABLE]: 'v-model 不能用于作用域变量。',
  [LytErrorCodes.X_INVALID_V_MODEL_MODIFIER]: 'v-model 修饰符无效。',
  [LytErrorCodes.X_V_MODEL_MALFORMED_MODIFIER]: 'v-model 修饰符格式错误。',
  [LytErrorCodes.X_V_MODEL_INVALID_MODIFIER_ON_INPUT]: 'input 元素上的 v-model 修饰符无效。',
  [LytErrorCodes.X_V_MODEL_PROP_CANNOT_BE_SET]: 'v-model 属性无法设置。',
  [LytErrorCodes.X_V_MODEL_CANNOT_BE_USED_ON_PROPS]: 'v-model 不能用于 props。',
  [LytErrorCodes.X_V_SLOT_EXTRANEOUS_DEFAULT_SLOT_CHILDREN]: '默认插槽中发现多余的子元素。',
  [LytErrorCodes.X_V_SLOT_DUPLICATE_SLOT_NAMES]: '插槽名称重复。',
  [LytErrorCodes.X_V_SLOT_MISSING_SLOT_NAME]: 'v-slot 缺少插槽名称。',
  [LytErrorCodes.X_V_SLOT_MIXED_SLOT_USAGE]: '不允许混合使用插槽。',
  [LytErrorCodes.X_V_SLOT_DUPLICATE_SLOT_NAMES_IN_SAME_SCOPE]: '同一作用域中插槽名称重复。',
  [LytErrorCodes.X_V_SLOT_EXPECTED_SLOT_NAME]: 'v-slot 期望插槽名称。',
  [LytErrorCodes.X_V_SLOT_NAMED_EXPECTED_DEFAULT]: '命名插槽期望默认插槽内容。',
  [LytErrorCodes.X_V_SLOT_NAMED_NO_DEFAULT]: '命名插槽没有默认插槽内容。',
  [LytErrorCodes.X_V_SLOT_DEFAULT_DUPLICATE]: '默认插槽重复。',
  [LytErrorCodes.X_V_SLOT_EXTRANEOUS_ATTRS_IN_SLOTS]: '插槽出口中有多余的属性。',
  [LytErrorCodes.SETUP_FUNCTION_ERROR]: 'setup 函数错误。',
  [LytErrorCodes.RENDER_ERROR]: '渲染函数错误。',
  [LytErrorCodes.WATCH_CALLBACK_ERROR]: 'watch 回调错误。',
  [LytErrorCodes.WATCH_GETTER_ERROR]: 'watch getter 错误。',
  [LytErrorCodes.WATCH_CLEANUP_ERROR]: 'watch 清理函数错误。',
  [LytErrorCodes.LIFECYCLE_HOOK_ERROR]: '生命周期钩子错误。',
  [LytErrorCodes.PROVIDE_INJECT_ERROR]: 'provide/inject 错误。',
  [LytErrorCodes.NEXT_TICK_ERROR]: 'nextTick 回调错误。',
  [LytErrorCodes.DIRECTIVE_ERROR]: '指令错误。',
  [LytErrorCodes.TRANSITION_ERROR]: '过渡动画错误。',
  [LytErrorCodes.KEEP_ALIVE_ERROR]: 'KeepAlive 错误。',
  [LytErrorCodes.TELEPORT_ERROR]: 'Teleport 错误。',
  [LytErrorCodes.SUSPENSE_ERROR]: 'Suspense 错误。',
  [LytErrorCodes.INVALID_VNODE_TYPE]: '无效的虚拟节点类型。',
  [LytErrorCodes.INVALID_VNODE_KEY]: '无效的虚拟节点 key。',
  [LytErrorCodes.INVALID_DOM_NODE]: '无效的 DOM 节点。',
  [LytErrorCodes.INVALID_HYDRATION_NODE]: '无效的水合节点。',
  [LytErrorCodes.INVALID_PATCH_FLAG]: '无效的更新标志。',
  [LytErrorCodes.INVALID_REF]: '无效的 ref。',
  [LytErrorCodes.INVALID_SLOT]: '无效的插槽。',
  [LytErrorCodes.INVALID_CHILDREN]: '无效的子元素。',
  [LytErrorCodes.INVALID_PROPS]: '无效的 props。',
  [LytErrorCodes.INVALID_EVENT]: '无效的事件处理器。',
  [LytErrorCodes.INVALID_ATTR]: '无效的属性。',
  [LytErrorCodes.INVALID_CLASS]: '无效的 class 值。',
  [LytErrorCodes.INVALID_STYLE]: '无效的 style 值。',
  [LytErrorCodes.INVALID_DIRECTIVE_VALUE]: '无效的指令值。',
  [LytErrorCodes.INVALID_TEMPLATE]: '无效的模板。',
  [LytErrorCodes.INVALID_MOUNT_TARGET]: '挂载失败：未找到目标元素。',
  [LytErrorCodes.INVALID_UNMOUNT_TARGET]: '卸载失败：未找到目标元素。',
  [LytErrorCodes.INVALID_COMPONENT]: '无效的组件。',
  [LytErrorCodes.INVALID_PROP_TYPE]: '无效的 prop 类型。',
  [LytErrorCodes.MISSING_PROP]: '缺少必填的 prop。',
  [LytErrorCodes.INVALID_EMIT_EVENT]: '无效的 emit 事件。',
  [LytErrorCodes.INVALID_SETUP_RETURN]: 'setup 返回值无效。',
  [LytErrorCodes.INVALID_INJECT_KEY]: '无效的 inject key。',
  [LytErrorCodes.DUPLICATE_KEYS]: '检测到重复的 key。',
  [LytErrorCodes.CIRCULAR_REFERENCE]: '检测到循环引用。',
  [LytErrorCodes.INVALID_COMPUTED]: '无效的计算属性。',
  [LytErrorCodes.INVALID_WATCH_SOURCE]: '无效的 watch 源。',
  [LytErrorCodes.COMPONENT_IS_MISSING_TEMPLATE]: '组件缺少 template 或 render 函数。',
  [LytErrorCodes.COMPONENT_ASYNC_ERROR]: '异步组件错误。',
};

// ============================================================
// 错误修复建议映射
// ============================================================

const errorSuggestions: Partial<Record<LytErrorCodes, string>> = {
  [LytErrorCodes.INVALID_EXPRESSION]: '检查语法错误或缺少的括号。',
  [LytErrorCodes.UNEXPECTED_TOKEN]: '确保标记符合预期的语法。',
  [LytErrorCodes.UNEXPECTED_EOF]: '检查未闭合的括号或标签。',
  [LytErrorCodes.INVALID_IDENTIFIER]: '变量名必须以字母或下划线开头。',
  [LytErrorCodes.INVALID_DIRECTIVE]:
    '有效的指令：v-if、v-else-if、v-else、v-for、v-on、v-bind、v-model、v-show、v-slot、v-scope、v-once、v-memo、ref。',
  [LytErrorCodes.X_V_FOR_MALFORMED_EXPRESSION]:
    '使用格式：v-for="item in items" 或 v-for="(item, index) in items"。',
  [LytErrorCodes.X_V_FOR_NESTED_ITERATION]: '使用组件包装器或计算属性代替。',
  [LytErrorCodes.X_V_IF_SAME_KEY]: '给每个 v-if/v-else-if 一个唯一的条件 key。',
  [LytErrorCodes.X_V_IF_NO_EXPRESSION]: '添加表达式：v-if="condition" 或删除该指令。',
  [LytErrorCodes.X_V_IF_SIBLING_IF]: '将 v-if 和 v-else-if/v-else 元素放在同一层级作为直接兄弟。',
  [LytErrorCodes.X_V_FOR_NO_EXPRESSION]: '添加表达式：v-for="item in items"。',
  [LytErrorCodes.X_V_FOR_MISSING_KEY]: '添加 :key="item.id" 属性以实现稳定的列表渲染。',
  [LytErrorCodes.X_V_FOR_TEMPLATE_KEY_PLACEMENT]:
    '确保 key 属性直接放在使用 v-for 的 <template> 标签上。',
  [LytErrorCodes.X_KEY_EXPECTED]: '在 v-for 或 v-if 上添加唯一的 key 属性。',
  [LytErrorCodes.X_INVALID_V_FOR]: '检查 v-for 的语法是否正确。',
  [LytErrorCodes.X_MISSING_END_TAG]: '添加结束标签 </tag>。',
  [LytErrorCodes.X_INVALID_END_TAG]: '确保结束标签与开始标签匹配。',
  [LytErrorCodes.X_INTERPOLATION_NO_EXPRESSION]: '在插值中使用 {{ expression }} 格式。',
  [LytErrorCodes.X_MISSING_DYNAMIC_DIRECTIVE_ARGUMENT]: '添加参数：v-bind:[attrName]="value"。',
  [LytErrorCodes.X_V_BIND_INVALID_SAME_NAME_ARGUMENT]: '删除参数或使用不同的指令。',
  [LytErrorCodes.X_V_BIND_INVALID_DYNAMIC_ARGUMENT]: '确保动态参数是有效的属性名。',
  [LytErrorCodes.X_V_ON_INVALID_DYNAMIC_ARGUMENT]: '确保动态参数是有效的事件名。',
  [LytErrorCodes.X_V_MODEL_INVALID_EXPRESSION]:
    '使用有效的属性路径：v-model="object.property" 或 v-model="variable"。',
  [LytErrorCodes.X_V_MODEL_ON_SCOPE_VARIABLE]:
    'v-model 不能绑定到 v-for 循环变量。请改用数据属性。',
  [LytErrorCodes.X_INVALID_V_MODEL_MODIFIER]: '使用 .trim、.number 或 .lazy 修饰符。',
  [LytErrorCodes.X_V_MODEL_MALFORMED_MODIFIER]: '检查 v-model 修饰符的格式是否正确。',
  [LytErrorCodes.X_V_MODEL_INVALID_MODIFIER_ON_INPUT]:
    '仅在 input 元素上使用 .trim 或 .number 修饰符。',
  [LytErrorCodes.X_V_MODEL_PROP_CANNOT_BE_SET]: '使用数据属性或计算属性 setter。',
  [LytErrorCodes.X_V_MODEL_CANNOT_BE_USED_ON_PROPS]: 'Props 是只读的。使用 emit 来更新父组件。',
  [LytErrorCodes.X_V_SLOT_EXTRANEOUS_DEFAULT_SLOT_CHILDREN]:
    '删除默认插槽中多余的子元素或使用命名插槽。',
  [LytErrorCodes.X_V_SLOT_DUPLICATE_SLOT_NAMES]: '为每个插槽使用唯一的名称。',
  [LytErrorCodes.X_V_SLOT_MISSING_SLOT_NAME]: '添加插槽名称：v-slot:header 或使用 #header 语法。',
  [LytErrorCodes.X_V_SLOT_MIXED_SLOT_USAGE]: '统一使用 v-slot 语法或旧的 slot 语法，不要混用。',
  [LytErrorCodes.X_V_SLOT_DUPLICATE_SLOT_NAMES_IN_SAME_SCOPE]:
    '确保同一作用域中的所有插槽名称都是唯一的。',
  [LytErrorCodes.X_V_SLOT_EXPECTED_SLOT_NAME]: '在 v-slot 指令中指定插槽名称。',
  [LytErrorCodes.X_V_SLOT_NAMED_EXPECTED_DEFAULT]: '为命名插槽提供默认内容或确保正确传递。',
  [LytErrorCodes.X_V_SLOT_NAMED_NO_DEFAULT]: '为命名插槽提供默认内容或使其成为可选。',
  [LytErrorCodes.X_V_SLOT_DEFAULT_DUPLICATE]: '删除重复的默认插槽。',
  [LytErrorCodes.X_V_SLOT_EXTRANEOUS_ATTRS_IN_SLOTS]: '删除插槽出口上的多余属性。',
  [LytErrorCodes.SETUP_FUNCTION_ERROR]: '检查 setup() 函数中的代码，确保没有语法错误或运行时错误。',
  [LytErrorCodes.RENDER_ERROR]: '检查 render 函数或 template 中的代码，确保其正确返回虚拟节点。',
  [LytErrorCodes.WATCH_CALLBACK_ERROR]: '检查 watch 的回调函数，确保其正确处理变化。',
  [LytErrorCodes.WATCH_GETTER_ERROR]: '检查 watch 的 getter 函数，确保其正确返回要观察的值。',
  [LytErrorCodes.WATCH_CLEANUP_ERROR]: '检查 watch 的清理函数，确保其正确执行。',
  [LytErrorCodes.LIFECYCLE_HOOK_ERROR]: '检查生命周期钩子函数，确保其正确实现。',
  [LytErrorCodes.PROVIDE_INJECT_ERROR]: '检查 provide 和 inject 的使用，确保 key 正确且值可访问。',
  [LytErrorCodes.NEXT_TICK_ERROR]: '检查 nextTick 的回调函数，确保其正确实现。',
  [LytErrorCodes.DIRECTIVE_ERROR]: '检查自定义指令的实现，确保其正确处理绑定。',
  [LytErrorCodes.TRANSITION_ERROR]: '检查 Transition 组件的配置，确保过渡动画正确设置。',
  [LytErrorCodes.KEEP_ALIVE_ERROR]: '检查 KeepAlive 组件的使用，确保其正确缓存组件。',
  [LytErrorCodes.TELEPORT_ERROR]: '检查 Teleport 的 to 目标是否存在。',
  [LytErrorCodes.SUSPENSE_ERROR]: '检查 Suspense 组件的使用，确保正确处理异步加载。',
  [LytErrorCodes.INVALID_VNODE_TYPE]: '确保传递给 h() 的第一个参数是有效的组件、标签名或函数。',
  [LytErrorCodes.INVALID_VNODE_KEY]: '确保 key 是字符串或数字类型。',
  [LytErrorCodes.INVALID_DOM_NODE]: '确保目标是有效的 DOM 节点。',
  [LytErrorCodes.INVALID_HYDRATION_NODE]: '确保服务端渲染的标记与客户端匹配。',
  [LytErrorCodes.INVALID_PATCH_FLAG]: '确保使用有效的 patch 标志。',
  [LytErrorCodes.INVALID_REF]: '确保 ref 正确创建和使用。',
  [LytErrorCodes.INVALID_SLOT]: '确保插槽正确定义和传递。',
  [LytErrorCodes.INVALID_CHILDREN]: '确保子元素是有效的虚拟节点或字符串/数字。',
  [LytErrorCodes.INVALID_PROPS]: '确保 props 的类型和值正确。',
  [LytErrorCodes.INVALID_EVENT]: '确保事件处理器是有效的函数。',
  [LytErrorCodes.INVALID_ATTR]: '确保属性名称和值有效。',
  [LytErrorCodes.INVALID_CLASS]: '确保 class 值是字符串、数组或对象。',
  [LytErrorCodes.INVALID_STYLE]: '确保 style 值是字符串或对象。',
  [LytErrorCodes.INVALID_DIRECTIVE_VALUE]: '确保指令值是有效的。',
  [LytErrorCodes.INVALID_TEMPLATE]: '检查模板语法是否正确。',
  [LytErrorCodes.INVALID_MOUNT_TARGET]: '确保挂载目标在 DOM 中存在：检查选择器或元素引用。',
  [LytErrorCodes.INVALID_UNMOUNT_TARGET]: '确保卸载的目标是有效的组件实例。',
  [LytErrorCodes.INVALID_COMPONENT]: '确保组件已正确导入和注册。',
  [LytErrorCodes.INVALID_PROP_TYPE]:
    '用正确的类型定义 props：{ type: String } 或 { type: [String, Number] }。',
  [LytErrorCodes.MISSING_PROP]: '提供必填的 prop 或将其设为可选。',
  [LytErrorCodes.INVALID_EMIT_EVENT]: '确保事件名在 emits 选项中定义。',
  [LytErrorCodes.INVALID_SETUP_RETURN]: '从 setup() 返回对象以暴露响应式状态。',
  [LytErrorCodes.INVALID_INJECT_KEY]: '确保 inject 的 key 已在祖先组件中 provide。',
  [LytErrorCodes.DUPLICATE_KEYS]: '为列表中的每个项使用唯一的 key，通常使用 item.id。',
  [LytErrorCodes.CIRCULAR_REFERENCE]: '检查组件或数据依赖关系，避免循环引用。',
  [LytErrorCodes.INVALID_COMPUTED]: '确保计算属性返回值或具有正确的 getter/setter。',
  [LytErrorCodes.INVALID_WATCH_SOURCE]: '确保 watch 的源是 ref、reactive 或 getter 函数。',
  [LytErrorCodes.COMPONENT_IS_MISSING_TEMPLATE]: '在组件中添加 template 属性或 render 函数。',
  [LytErrorCodes.COMPONENT_ASYNC_ERROR]: '检查异步组件的加载器函数，确保它正确返回 Promise。',
};

/**
 * 获取错误码对应的修复建议
 */
export function getErrorSuggestion(code: number): string | undefined {
  return errorSuggestions[code as LytErrorCodes];
}

// ============================================================
// 错误工具函数
// ============================================================

/**
 * 源码位置
 */
export interface SourceLocation {
  start: { line: number; column: number; offset: number };
  end: { line: number; column: number; offset: number };
  source: string;
}

/**
 * 获取错误码对应的错误消息
 */
export function getErrorMessage(code: number): string {
  return (errorMessages as Record<number, string>)[code] ?? `Unknown error code: ${code}`;
}

/**
 * 获取错误码对应的分类
 */
export function getCategory(code: number): ErrorCategoryType {
  // RENDER_ERROR (2002) 属于渲染器错误，需在通用范围检查之前处理
  // 因为 2002 落在 [2000, 3000) 的 RUNTIME 范围内，需要特殊覆盖为 RENDERER
  if (code === LytErrorCodes.RENDER_ERROR) return ErrorCategory.RENDERER;
  if (code >= 1000 && code < 2000) return ErrorCategory.COMPILER;
  if (code >= 2000 && code < 3000) return ErrorCategory.RUNTIME;
  if (code >= 3000 && code < 4000) return ErrorCategory.RENDERER;
  if (code >= 4000 && code < 5000) return ErrorCategory.COMPONENT;
  return ErrorCategory.RUNTIME;
}

/**
 * LytJS 框架错误类
 */
export class LytError extends Error {
  code: number;
  loc?: SourceLocation;

  constructor(code: number, message?: string, loc?: SourceLocation) {
    super(message ?? getErrorMessage(code));
    this.name = 'LytError';
    this.code = code;
    this.loc = loc;
  }
}

// ============================================================
// 统一错误格式化
// ============================================================

export interface FormattedError {
  title: string;
  message: string;
  suggestion?: string;
  category: string;
  code: number;
  location?: string;
  stack?: string;
}

/**
 * 格式化错误信息，包含友好的提示和修复建议
 */
export function formatError(error: Error | LytError | string): FormattedError {
  const code = (error as LytError).code ?? 0;
  const category = getCategoryName(getCategory(code));
  const suggestion = getErrorSuggestion(code);

  const location = (error as LytError).loc?.start
    ? `line ${(error as LytError).loc!.start.line}, column ${(error as LytError).loc!.start.column}`
    : undefined;

  const title = code > 0 ? `[${category}] Error ${code}` : 'Error';

  return {
    title,
    message: error instanceof Error ? error.message : String(error),
    suggestion,
    category,
    code,
    location,
    stack: error instanceof Error ? error.stack : undefined,
  };
}

/**
 * 获取分类名称
 */
function getCategoryName(category: ErrorCategoryType): string {
  const names: Record<ErrorCategoryType, string> = {
    [ErrorCategory.COMPILER]: 'Compiler',
    [ErrorCategory.RUNTIME]: 'Runtime',
    [ErrorCategory.RENDERER]: 'Renderer',
    [ErrorCategory.COMPONENT]: 'Component',
  };
  return names[category] ?? 'Unknown';
}

/**
 * 打印格式化错误到控制台
 */
export function printFormattedError(error: Error | LytError | string): void {
  const formatted = formatError(error);
  const parts: string[] = [];

  parts.push(`\x1b[1m\x1b[31m${formatted.title}\x1b[0m`);

  if (formatted.location) {
    parts.push(`  Location: ${formatted.location}`);
  }

  parts.push(`  ${formatted.message}`);

  if (formatted.suggestion) {
    parts.push(`\x1b[32m  💡 Suggestion: ${formatted.suggestion}\x1b[0m`);
  }

  console.error(parts.join('\n'));
}

/**
 * 通用错误创建函数
 */
function createLytError(
  kind: 'compiler' | 'renderer' | 'component',
  code: number,
  loc?: SourceLocation,
  additionalMessage?: string,
): LytError {
  const message = getErrorMessage(code) + (additionalMessage ? ` ${additionalMessage}` : '');
  const error = new LytError(code, message, loc);
  error.name = `${kind.charAt(0).toUpperCase() + kind.slice(1)}Error`;
  return error;
}

/**
 * 创建编译器错误
 */
export const createCompilerError = (
  code: number,
  loc?: SourceLocation,
  additionalMessage?: string,
): LytError => createLytError('compiler', code, loc, additionalMessage);

/**
 * 创建渲染器错误
 */
export const createRendererError = (
  code: number,
  loc?: SourceLocation,
  additionalMessage?: string,
): LytError => createLytError('renderer', code, loc, additionalMessage);

/**
 * 创建组件错误
 */
export const createComponentError = (
  code: number,
  loc?: SourceLocation,
  additionalMessage?: string,
): LytError => createLytError('component', code, loc, additionalMessage);

// ============================================================
// 开发模式与警告
// ============================================================

// 统一使用全局 __DEV__ 作为开发模式检测。
// devMode 作为设置函数（setDevMode）的兼容接口保留，但内部统一读写 __DEV__。
// 测试中通过 setDevMode(true/false) 切换即可。

declare const __DEV__: boolean;

/**
 * 设置开发模式（兼容接口，内部统一设置 globalThis.__DEV__）
 */
export function setDevMode(enabled: boolean): void {
  if (typeof globalThis !== 'undefined') {
    (globalThis as Record<string, unknown>).__DEV__ = enabled;
  }
}

/**
 * 获取当前开发模式状态
 */
export function getDevMode(): boolean {
  return typeof __DEV__ !== 'undefined' ? __DEV__ : false;
}

/**
 * 输出警告信息（仅在开发模式下）
 */
export function warn(message: string): void {
  if (!__DEV__) return;
  console.warn(`[LytJS]: ${message}`);
}

// 已警告消息集合 - 使用 FIFO 策略避免内存无限增长
// 当达到上限时，删除最早添加的条目，而非清空全部
const warnedMessages = new Set<string>();

/**
 * 输出一次性警告信息（相同消息只输出一次）
 * 使用 FIFO 策略：达到上限时删除最早的条目，避免已抑制的警告重新出现
 */
export function warnOnce(message: string): void {
  if (!__DEV__) return;
  if (warnedMessages.has(message)) return;
  // FIFO eviction: 当达到上限时，删除最早添加的条目
  if (warnedMessages.size >= ERROR_MAX_WARNED_MESSAGES) {
    const first = warnedMessages.values().next().value;
    if (first !== undefined) {
      warnedMessages.delete(first);
    }
  }
  warnedMessages.add(message);
  console.warn(`[LytJS]: ${message}`);
}

/**
 * 输出错误信息
 * 在生产环境中仍然输出错误，开发模式下附加额外调试信息
 */
export function error(message: string): void {
  if (!__DEV__) {
    console.error(`[LytJS]: ${message}`);
    return;
  }
  console.error(`[LytJS] Error: ${message}\n  (dev mode - see stack trace above for details)`);
}

/**
 * 重置已警告消息集合（用于测试）
 */
export function resetWarnedMessages(): void {
  warnedMessages.clear();
}

// ============================================================
// 安全执行工具（从 @lytjs/shared 迁移）
// ============================================================

/**
 * 安全地执行函数，捕获错误并返回结果或默认值
 *
 * @param fn - 要执行的函数
 * @param defaultValue - 出错时的默认值
 * @param context - 可选的上下文信息，用于错误日志
 * @returns 函数结果或默认值
 * @example
 * ```ts
 * safeExec(() => JSON.parse('invalid'), null) // null
 * safeExec(() => JSON.parse('{}'), null) // {}
 * ```
 */
export function safeExec<T>(fn: () => T, defaultValue: T, context?: string): T {
  try {
    return fn();
  } catch (err) {
    // FIX: P2-41 错误日志不完整：添加上下文信息
    if (__DEV__ && context) {
      warn(`safeExec failed in "${context}": ${err instanceof Error ? err.message : String(err)}`);
    }
    return defaultValue;
  }
}

/**
 * 安全地解析 JSON
 *
 * @param str - JSON 字符串
 * @param defaultValue - 解析失败时的默认值
 * @param context - 可选的上下文信息，用于错误日志
 * @returns 解析结果或默认值
 * @example
 * ```ts
 * safeJsonParse('{"a":1}', {}) // { a: 1 }
 * safeJsonParse('invalid', {}) // {}
 * ```
 */
export function safeJsonParse<T>(str: string, defaultValue: T, context?: string): T {
  return safeExec(() => JSON.parse(str) as T, defaultValue, context ?? 'safeJsonParse');
}

// ============================================================
// 错误恢复机制（FIX: P2-43 错误恢复机制缺失）
// ============================================================

/**
 * 增强的错误对象，包含上下文信息和恢复建议
 */
export interface EnhancedError extends Error {
  code?: number;
  context?: Record<string, unknown>;
  recoverable?: boolean;
  recoverySuggestion?: string;
}

/**
 * 创建增强的错误对象
 *
 * @param message - 错误消息
 * @param options - 错误选项
 * @returns 增强的错误对象
 */
export function createEnhancedError(
  message: string,
  options?: {
    code?: number;
    cause?: unknown;
    context?: Record<string, unknown>;
    recoverable?: boolean;
    recoverySuggestion?: string;
  },
): EnhancedError {
  const error = new Error(message, { cause: options?.cause }) as EnhancedError;
  error.name = 'LytEnhancedError';
  if (options?.code !== undefined) error.code = options.code;
  if (options?.context !== undefined) error.context = options.context;
  if (options?.recoverable !== undefined) error.recoverable = options.recoverable;
  if (options?.recoverySuggestion !== undefined)
    error.recoverySuggestion = options.recoverySuggestion;
  return error;
}

/**
 * 错误恢复回调类型
 */
export type ErrorRecoveryHandler<T> = (error: EnhancedError) => T | undefined;

/**
 * 带恢复机制的安全执行函数
 * FIX: P2-43 错误恢复机制缺失
 *
 * @param fn - 要执行的函数
 * @param options - 执行选项
 * @returns 函数结果或恢复值
 * @example
 * ```ts
 * const result = safeExecWithRecovery(
 *   () => riskyOperation(),
 *   {
 *     defaultValue: 'fallback',
 *     onError: (err) => console.error(err),
 *     onRecover: (err) => 'recovered value',
 *     maxRetries: 3,
 *   }
 * );
 * ```
 */
export function safeExecWithRecovery<T>(
  fn: () => T,
  options: {
    defaultValue: T;
    context?: string;
    onError?: (error: EnhancedError) => void;
    onRecover?: ErrorRecoveryHandler<T>;
    maxRetries?: number;
    retryDelay?: number;
  },
): T {
  const { defaultValue, context, onError, onRecover, maxRetries = 0, retryDelay = 0 } = options;
  let lastError: EnhancedError | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return fn();
    } catch (err) {
      const enhancedError = createEnhancedError(err instanceof Error ? err.message : String(err), {
        cause: err,
        context: {
          attempt: attempt + 1,
          maxRetries: maxRetries + 1,
          operation: context ?? 'safeExecWithRecovery',
        },
        recoverable: attempt < maxRetries,
        recoverySuggestion:
          attempt < maxRetries
            ? `Will retry in ${retryDelay}ms (attempt ${attempt + 1}/${maxRetries + 1})`
            : 'No more retries available, using default value',
      });

      lastError = enhancedError;

      if (__DEV__) {
        warn(
          `safeExecWithRecovery failed (attempt ${attempt + 1}/${maxRetries + 1})` +
            `${context ? ` in "${context}"` : ''}: ${enhancedError.message}`,
        );
      }

      // 调用错误回调
      if (onError) {
        onError(enhancedError);
      }

      // 尝试恢复
      if (onRecover && enhancedError.recoverable) {
        const recoveredValue = onRecover(enhancedError);
        if (recoveredValue !== undefined) {
          return recoveredValue;
        }
      }

      // 如果不是最后一次尝试，等待后重试
      if (attempt < maxRetries && retryDelay > 0) {
        // 注意：同步延迟，仅在必要时使用
        const start = Date.now();
        while (Date.now() - start < retryDelay) {
          // 忙等待
        }
      }
    }
  }

  // 所有尝试都失败了，如果有错误回调则调用
  if (lastError && onError) {
    onError(lastError);
  }
  // 返回默认值
  return defaultValue;
}

/**
 * 异步版本的带恢复机制的安全执行函数
 * FIX: P2-43 错误恢复机制缺失（异步版本）
 */
export async function safeExecWithRecoveryAsync<T>(
  fn: () => T | Promise<T>,
  options: {
    defaultValue: T;
    context?: string;
    onError?: (error: EnhancedError) => void | Promise<void>;
    onRecover?: (error: EnhancedError) => T | undefined | Promise<T | undefined>;
    maxRetries?: number;
    retryDelay?: number;
  },
): Promise<T> {
  const { defaultValue, context, onError, onRecover, maxRetries = 0, retryDelay = 0 } = options;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const enhancedError = createEnhancedError(err instanceof Error ? err.message : String(err), {
        cause: err,
        context: {
          attempt: attempt + 1,
          maxRetries: maxRetries + 1,
          operation: context ?? 'safeExecWithRecoveryAsync',
        },
        recoverable: attempt < maxRetries,
        recoverySuggestion:
          attempt < maxRetries
            ? `Will retry in ${retryDelay}ms (attempt ${attempt + 1}/${maxRetries + 1})`
            : 'No more retries available, using default value',
      });

      if (__DEV__) {
        warn(
          `safeExecWithRecoveryAsync failed (attempt ${attempt + 1}/${maxRetries + 1})` +
            `${context ? ` in "${context}"` : ''}: ${enhancedError.message}`,
        );
      }

      // 调用错误回调
      if (onError) {
        await onError(enhancedError);
      }

      // 尝试恢复
      if (onRecover && enhancedError.recoverable) {
        const recoveredValue = await onRecover(enhancedError);
        if (recoveredValue !== undefined) {
          return recoveredValue;
        }
      }

      // 如果不是最后一次尝试，等待后重试
      if (attempt < maxRetries && retryDelay > 0) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
  }

  // 所有尝试都失败了，返回默认值
  return defaultValue;
}
