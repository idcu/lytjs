/**
 * Lyt.js Plugin Registry — 核心入口
 *
 * 提供插件注册表的完整导出：
 * - PluginManifest 类型
 * - PluginRegistry 类
 * - 内置插件清单（BUILT_IN_PLUGINS）
 * - 默认注册表工厂（createDefaultRegistry）
 */

export { PluginRegistry } from './registry';
export type { PluginManifest } from './registry';

export { BUILT_IN_PLUGINS, createDefaultRegistry } from './built-in-plugins';
