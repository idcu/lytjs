// packages/ecosystem/packages/plugin/src/index.ts
// 通用插件系统 - 主入口

// 类型
export type {
  PluginInstallFunction,
  Plugin,
  PluginMeta,
  PluginDependency,
  EnhancedPlugin,
  RegisteredPlugin,
  RegistrationResult,
  DependencyResult,
  PluginLifecycleEvent,
  PluginEventListener,
} from './types';

// 插件注册表
export { PluginRegistry } from './registry';

// 插件验证器
export { PluginValidator } from './validator';
export type { ValidationReport, ValidationIssue } from './validator';