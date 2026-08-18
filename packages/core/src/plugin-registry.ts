// src/plugin-registry.ts
// @lytjs/core - 插件注册表（复用独立包 @lytjs/plugin，保持向后兼容）

/**
 * 插件注册表
 *
 * 由独立包 @lytjs/plugin 提供，此处仅做兼容性转出。
 */
export { PluginRegistry } from '@lytjs/plugin';
export type {
  RegisteredPlugin,
  RegistrationResult,
  DependencyResult,
  PluginLifecycleEvent,
  PluginEventListener,
} from '@lytjs/plugin';