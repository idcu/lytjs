/**
 * Lyt.js 错误码系统
 *
 * 定义所有模块的错误码，使用 LYT_* 前缀。
 * 按模块分类，每个模块有独立的编号范围。
 * 纯原生零依赖 TypeScript 实现。
 */

// ============================================================
// 错误码枚举（按模块分类，每个模块 1000 编号范围）
// ============================================================

export enum LytErrorCodes {
  // ============================================================
  // 编译器错误 (1000-1999)
  // ============================================================
  LYT_COMPILER_PARSE_ERROR = 1001,
  LYT_COMPILER_INVALID_EXPRESSION = 1002,
  LYT_COMPILER_INVALID_TEMPLATE = 1003,
  LYT_COMPILER_INVALID_DIRECTIVE = 1004,
  LYT_COMPILER_CODEGEN_ERROR = 1005,
  LYT_COMPILER_SFC_PARSE_ERROR = 1006,
  LYT_COMPILER_TRANSFORM_ERROR = 1007,

  // ============================================================
  // 渲染器错误 (2000-2999)
  // ============================================================
  LYT_RENDERER_MOUNT_FAILED = 2001,
  LYT_RENDERER_PATCH_FAILED = 2002,
  LYT_RENDERER_HYDRATION_MISMATCH = 2003,
  LYT_RENDERER_INVALID_VNODE = 2004,
  LYT_RENDERER_UNMOUNT_FAILED = 2005,

  // ============================================================
  // 组件错误 (3000-3999)
  // ============================================================
  LYT_COMPONENT_INVALID_PROPS = 3001,
  LYT_COMPONENT_MISSING_RENDER = 3002,
  LYT_COMPONENT_LIFECYCLE_ERROR = 3003,
  LYT_COMPONENT_INVALID = 3004,
  LYT_COMPONENT_EMIT_INVALID = 3005,
  LYT_COMPONENT_RENDER_ERROR = 3006,

  // ============================================================
  // 路由错误 (4000-4999)
  // ============================================================
  LYT_ROUTER_INVALID_ROUTE = 4001,
  LYT_ROUTER_NAVIGATION_FAILED = 4002,
  LYT_ROUTER_DUPLICATE_ROUTE = 4003,
  LYT_ROUTER_NAVIGATION_ABORTED = 4004,
  LYT_ROUTER_GUARD_ERROR = 4005,

  // ============================================================
  // Store 错误 (5000-5999)
  // ============================================================
  LYT_STORE_ALREADY_EXISTS = 5001,
  LYT_STORE_NOT_FOUND = 5002,
  LYT_STORE_DISPOSED = 5003,
  LYT_STORE_PATCH_ERROR = 5004,

  // ============================================================
  // 响应式错误 (6000-6999)
  // ============================================================
  LYT_REACTIVITY_READONLY_SET = 6001,
  LYT_REACTIVITY_READONLY_DELETE = 6002,
  LYT_REACTIVITY_EFFECT_ERROR = 6003,
  LYT_REACTIVITY_COMPUTED_CYCLE = 6004,
  LYT_REACTIVITY_EFFECT_DISPOSED = 6005,
  LYT_REACTIVITY_CIRCULAR_DEPENDENCY = 6006,
  LYT_REACTIVITY_SIGNAL_DISPOSED = 6007,

  // ============================================================
  // 核心错误 (7000-7999)
  // ============================================================
  LYT_CORE_PLUGIN_ERROR = 7001,
  LYT_CORE_MOUNT_NO_CONTAINER = 7002,
  LYT_CORE_ALREADY_MOUNTED = 7003,
  LYT_CORE_INVALID_ARGUMENT = 7004,
  LYT_CORE_NOT_FOUND = 7005,
  LYT_CORE_ALREADY_EXISTS = 7006,
  LYT_CORE_OPERATION_FAILED = 7007,

  // ============================================================
  // CLI 错误 (8000-8999)
  // ============================================================
  LYT_CLI_SCAFFOLD_FAILED = 8001,
  LYT_CLI_BUILD_FAILED = 8002,
  LYT_CLI_DEV_SERVER_ERROR = 8003,
  LYT_CLI_CONFIG_INVALID = 8004,
  LYT_CLI_HMR_CONNECTION_FAILED = 8005,

  // ============================================================
  // DevTools 错误 (9000-9999)
  // ============================================================
  LYT_DEVTOOLS_CONNECTION_FAILED = 9001,
  LYT_DEVTOOLS_PANEL_ERROR = 9002,
  LYT_DEVTOOLS_PERF_OVERFLOW = 9003,
  LYT_DEVTOOLS_COMPONENT_TREE_ERROR = 9004,

  // ============================================================
  // Plugin 错误 (10000-10999)
  // ============================================================
  LYT_PLUGIN_INSTALL_FAILED = 10001,
  LYT_PLUGIN_ALREADY_INSTALLED = 10002,
  LYT_PLUGIN_INVALID = 10003,
  LYT_PLUGIN_UNINSTALL_FAILED = 10004,

  // ============================================================
  // Vapor 渲染器错误 (11000-11099)
  // ============================================================
  LYT_RENDERER_VAPOR_ERROR = 11001,
  LYT_RENDERER_VAPOR_COMPILER_ERROR = 11002,
  LYT_RENDERER_VAPOR_COMPONENT_ERROR = 11003,

  // ============================================================
  // SSR 错误 (11100-11999)
  // ============================================================
  LYT_SSR_STREAM_ERROR = 11101,
  LYT_SSR_SUSPENSE_TIMEOUT = 11102,
  LYT_SSR_HYDRATION_ERROR = 11103,
  LYT_SSR_ISLAND_ERROR = 11104,
}

// ============================================================
// 错误码分类常量
// ============================================================

export const ErrorCategory = {
  COMPILER: 'COMPILER',
  RENDERER: 'RENDERER',
  COMPONENT: 'COMPONENT',
  ROUTER: 'ROUTER',
  STORE: 'STORE',
  REACTIVITY: 'REACTIVITY',
  CORE: 'CORE',
  CLI: 'CLI',
  DEVTOOLS: 'DEVTOOLS',
  PLUGIN: 'PLUGIN',
  SSR: 'SSR',
} as const;

export type ErrorCategoryType = (typeof ErrorCategory)[keyof typeof ErrorCategory];

// ============================================================
// 错误码到消息的映射
// ============================================================

const errorMessageMap: Record<number, string> = {
  // 编译器错误 (1000-1999)
  [LytErrorCodes.LYT_COMPILER_PARSE_ERROR]: '模板解析错误，请检查模板语法是否正确。',
  [LytErrorCodes.LYT_COMPILER_INVALID_EXPRESSION]: '无效的表达式，请检查表达式语法。',
  [LytErrorCodes.LYT_COMPILER_INVALID_TEMPLATE]: '无效的模板，请检查模板内容。',
  [LytErrorCodes.LYT_COMPILER_INVALID_DIRECTIVE]: '无效的指令，请确认指令名称是否正确。',
  [LytErrorCodes.LYT_COMPILER_CODEGEN_ERROR]: '代码生成错误，请检查模板编译配置。',
  [LytErrorCodes.LYT_COMPILER_SFC_PARSE_ERROR]: '单文件组件解析错误，请检查 SFC 语法。',
  [LytErrorCodes.LYT_COMPILER_TRANSFORM_ERROR]: '模板转换错误，请检查 AST 转换逻辑。',

  // 渲染器错误 (2000-2999)
  [LytErrorCodes.LYT_RENDERER_MOUNT_FAILED]: '挂载失败，请检查容器元素是否存在。',
  [LytErrorCodes.LYT_RENDERER_PATCH_FAILED]: '补丁更新失败，请检查 VNode 结构。',
  [LytErrorCodes.LYT_RENDERER_HYDRATION_MISMATCH]: '水合不匹配，服务端与客户端渲染结果不一致。',
  [LytErrorCodes.LYT_RENDERER_INVALID_VNODE]: '无效的虚拟节点，VNode 缺少必要的 type 属性。',
  [LytErrorCodes.LYT_RENDERER_UNMOUNT_FAILED]: '卸载失败，请检查组件是否已挂载。',

  // 组件错误 (3000-3999)
  [LytErrorCodes.LYT_COMPONENT_INVALID_PROPS]: '组件属性无效，请检查传入的 props。',
  [LytErrorCodes.LYT_COMPONENT_MISSING_RENDER]: '组件缺少 template 或 render 函数。',
  [LytErrorCodes.LYT_COMPONENT_LIFECYCLE_ERROR]: '组件生命周期错误，请检查生命周期钩子函数。',
  [LytErrorCodes.LYT_COMPONENT_INVALID]: '无效的组件定义，请检查组件配置。',
  [LytErrorCodes.LYT_COMPONENT_EMIT_INVALID]: '无效的事件发射，请检查 emits 声明。',
  [LytErrorCodes.LYT_COMPONENT_RENDER_ERROR]: '组件渲染错误，请检查 render 函数。',

  // 路由错误 (4000-4999)
  [LytErrorCodes.LYT_ROUTER_INVALID_ROUTE]: '无效的路由，请确认路由路径是否已注册。',
  [LytErrorCodes.LYT_ROUTER_NAVIGATION_FAILED]: '导航失败，请检查目标路由是否有效。',
  [LytErrorCodes.LYT_ROUTER_DUPLICATE_ROUTE]: '路由已存在，请避免重复注册相同的路由路径。',
  [LytErrorCodes.LYT_ROUTER_NAVIGATION_ABORTED]: '导航被中止，可能被导航守卫拦截。',
  [LytErrorCodes.LYT_ROUTER_GUARD_ERROR]: '路由守卫错误，请检查守卫函数。',

  // Store 错误 (5000-5999)
  [LytErrorCodes.LYT_STORE_ALREADY_EXISTS]: 'Store 已存在，请避免重复创建相同 ID 的 store。',
  [LytErrorCodes.LYT_STORE_NOT_FOUND]: 'Store 未找到，请确认 store 是否已注册。',
  [LytErrorCodes.LYT_STORE_DISPOSED]: 'Store 已被销毁，无法继续操作。',
  [LytErrorCodes.LYT_STORE_PATCH_ERROR]: 'Store 状态更新错误，请检查 patch 数据。',

  // 响应式错误 (6000-6999)
  [LytErrorCodes.LYT_REACTIVITY_READONLY_SET]: '无法修改只读响应式属性。',
  [LytErrorCodes.LYT_REACTIVITY_READONLY_DELETE]: '无法删除只读响应式属性。',
  [LytErrorCodes.LYT_REACTIVITY_EFFECT_ERROR]: '副作用函数执行错误。',
  [LytErrorCodes.LYT_REACTIVITY_COMPUTED_CYCLE]: '计算属性检测到循环依赖。',
  [LytErrorCodes.LYT_REACTIVITY_EFFECT_DISPOSED]: '副作用函数已被销毁，无法再次执行。',
  [LytErrorCodes.LYT_REACTIVITY_CIRCULAR_DEPENDENCY]: '响应式循环依赖，computed 在其自身的计算图中。',
  [LytErrorCodes.LYT_REACTIVITY_SIGNAL_DISPOSED]: 'Signal 已被销毁，无法继续操作。',

  // 核心错误 (7000-7999)
  [LytErrorCodes.LYT_CORE_PLUGIN_ERROR]: '插件错误，请检查插件配置和安装逻辑。',
  [LytErrorCodes.LYT_CORE_MOUNT_NO_CONTAINER]: '找不到挂载目标容器。',
  [LytErrorCodes.LYT_CORE_ALREADY_MOUNTED]: '应用已经挂载，不能重复挂载。',
  [LytErrorCodes.LYT_CORE_INVALID_ARGUMENT]: '参数无效，请检查传入的值类型和范围。',
  [LytErrorCodes.LYT_CORE_NOT_FOUND]: '资源未找到，请确认名称或路径是否正确。',
  [LytErrorCodes.LYT_CORE_ALREADY_EXISTS]: '资源已存在，请使用不同的名称。',
  [LytErrorCodes.LYT_CORE_OPERATION_FAILED]: '操作执行失败，请检查相关配置和状态。',

  // CLI 错误 (8000-8999)
  [LytErrorCodes.LYT_CLI_SCAFFOLD_FAILED]: '项目脚手架创建失败，请检查模板和目标目录。',
  [LytErrorCodes.LYT_CLI_BUILD_FAILED]: '项目构建失败，请检查构建配置和源代码。',
  [LytErrorCodes.LYT_CLI_DEV_SERVER_ERROR]: '开发服务器启动失败，请检查端口和配置。',
  [LytErrorCodes.LYT_CLI_CONFIG_INVALID]: '配置文件无效，请检查配置格式和必填字段。',
  [LytErrorCodes.LYT_CLI_HMR_CONNECTION_FAILED]: '热模块替换连接失败，请检查 WebSocket 配置。',

  // DevTools 错误 (9000-9999)
  [LytErrorCodes.LYT_DEVTOOLS_CONNECTION_FAILED]: 'DevTools 连接失败，请检查扩展和运行时版本是否匹配。',
  [LytErrorCodes.LYT_DEVTOOLS_PANEL_ERROR]: 'DevTools 面板加载错误，请尝试刷新页面。',
  [LytErrorCodes.LYT_DEVTOOLS_PERF_OVERFLOW]: '性能数据溢出，请减少监控的组件数量或缩短采集周期。',
  [LytErrorCodes.LYT_DEVTOOLS_COMPONENT_TREE_ERROR]: '组件树解析错误，请检查组件实例状态。',

  // Plugin 错误 (10000-10999)
  [LytErrorCodes.LYT_PLUGIN_INSTALL_FAILED]: '插件安装失败，请检查插件包和安装逻辑。',
  [LytErrorCodes.LYT_PLUGIN_ALREADY_INSTALLED]: '插件已安装，请避免重复安装相同插件。',
  [LytErrorCodes.LYT_PLUGIN_INVALID]: '无效的插件，请检查插件是否满足接口要求。',
  [LytErrorCodes.LYT_PLUGIN_UNINSTALL_FAILED]: '插件卸载失败，请检查插件是否已被正确清理。',

  // Vapor 渲染器错误 (11000-11099)
  [LytErrorCodes.LYT_RENDERER_VAPOR_ERROR]: 'Vapor 渲染器错误，请检查 DOM 工厂函数和容器配置。',
  [LytErrorCodes.LYT_RENDERER_VAPOR_COMPILER_ERROR]: 'Vapor 编译器错误，请检查模板语法和闭合标签。',
  [LytErrorCodes.LYT_RENDERER_VAPOR_COMPONENT_ERROR]: 'Vapor 组件错误，请确保组件提供了 template 或 render 函数。',

  // SSR 错误 (11100-11999)
  [LytErrorCodes.LYT_SSR_STREAM_ERROR]: 'SSR 流式渲染错误，请检查流管道配置。',
  [LytErrorCodes.LYT_SSR_SUSPENSE_TIMEOUT]: 'SSR Suspense 超时，请检查异步组件的加载时间。',
  [LytErrorCodes.LYT_SSR_HYDRATION_ERROR]: 'SSR 水合错误，服务端与客户端渲染结果不一致。',
  [LytErrorCodes.LYT_SSR_ISLAND_ERROR]: 'SSR Island 组件错误，请检查孤岛组件的序列化和渲染逻辑。',
};

// ============================================================
// 错误码到分类的映射
// ============================================================

function getCategoryForCode(code: number): string {
  if (code >= 1000 && code < 2000) return ErrorCategory.COMPILER;
  if (code >= 2000 && code < 3000) return ErrorCategory.RENDERER;
  if (code >= 3000 && code < 4000) return ErrorCategory.COMPONENT;
  if (code >= 4000 && code < 5000) return ErrorCategory.ROUTER;
  if (code >= 5000 && code < 6000) return ErrorCategory.STORE;
  if (code >= 6000 && code < 7000) return ErrorCategory.REACTIVITY;
  if (code >= 7000 && code < 8000) return ErrorCategory.CORE;
  if (code >= 8000 && code < 9000) return ErrorCategory.CLI;
  if (code >= 9000 && code < 10000) return ErrorCategory.DEVTOOLS;
  if (code >= 10000 && code < 11000) return ErrorCategory.PLUGIN;
  if (code >= 11000 && code < 11100) return ErrorCategory.RENDERER;
  if (code >= 11100 && code < 12000) return ErrorCategory.SSR;
  return 'UNKNOWN';
}

// ============================================================
// 导出的辅助函数
// ============================================================

/**
 * 根据错误码获取人类可读的错误消息
 */
export function getErrorMessage(code: number): string {
  return errorMessageMap[code] || '未知错误。';
}

/**
 * 根据错误码获取错误分类
 */
export function getCategory(code: number): string {
  return getCategoryForCode(code);
}
