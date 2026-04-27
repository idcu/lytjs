/**
 * Lyt.js Plugin SDK — 核心入口
 *
 * 提供插件开发 SDK 的完整导出：
 * - 类型系统（types）
 * - 插件管理器（PluginManager）
 * - 插件验证器（PluginValidator）
 * - 插件注册中心（PluginRegistry）
 * - 插件脚手架（PluginScaffold）
 */

// ============================================================
// 类型导出
// ============================================================

export type {
  LytPlugin,
  LytPluginManifest,
  LytPluginAPI,
  LytPluginHook,
  LytPluginPermission,
  LytPluginCategory,
  LytPluginConfig,
  LytPluginResult,
  ValidationResult,
} from './types';

export { PluginInstaller } from './types';

// ============================================================
// 插件管理器
// ============================================================

export { PluginManager } from './plugin-manager';
export type { PluginManagerConfig } from './plugin-manager';

// ============================================================
// 插件验证器
// ============================================================

export { PluginValidator } from './plugin-validator';

// ============================================================
// 插件注册中心
// ============================================================

export { PluginRegistry } from './plugin-registry';
export type { RegistrySearchOptions, RegistrySearchResult, CategoryInfo } from './plugin-registry';

// ============================================================
// 插件脚手架
// ============================================================

export { PluginScaffold } from './plugin-scaffold';
export type { ScaffoldOptions } from './plugin-scaffold';
