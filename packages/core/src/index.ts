// src/index.ts
// @lytjs/core - 核心入口

export { createApp } from './create-app';
export { h, h as createElement } from './h';
export { defineComponent, defineAsyncComponent } from './define-component';
export { nextTick } from './next-tick';
export { resolveComponent, resolveDirective, resolveDynamicComponent } from './resolve';
export { withDirectives, withMemo } from './directives';
export {
  useSlots,
  useAttrs,
  useModel,
  useTemplateRef,
  defineModel,
  useId,
  useCssModule,
  useCssVars,
} from './composition';
export {
  defineCustomElement,
  useShadowRoot,
  useHost,
  useWebComponentSlots,
  injectChildStyles,
} from './web-component';
export type { DefineCustomElementOptions } from './web-component';
export {
  onMounted,
  onUnmounted,
  onUpdated,
  onBeforeMount,
  onBeforeUnmount,
  onBeforeUpdate,
  onErrorCaptured,
  onRenderTracked,
  onRenderTriggered,
  // FIX: P2-batch2-6 补充导出 onActivated/onDeactivated 生命周期钩子
  onActivated,
  onDeactivated,
} from './lifecycle';

// 插件系统增强
export { PluginRegistry } from './plugin-registry';
export { PluginValidator } from './plugin-validator';
export type { ValidationReport, ValidationIssue } from './plugin-validator';

// 配置 Schema 系统
export { ConfigValidator, validateConfig } from './config-validator';
export { ConfigTransformer, transformConfig, mergeConfig } from './config-transformer';
export type {
  ConfigSchema,
  SchemaType,
  StringSchema,
  NumberSchema,
  BooleanSchema,
  ObjectSchema,
  ArraySchema,
  EnumSchema,
  UnionSchema,
  StringFormat,
  ConfigValidationReport,
  ConfigValidationError,
  ValidationErrorCode,
  ConfigTransformReport,
  ValidationContext,
  ValidationResult,
} from './config-schema';

// Plugin SDK
export {
  definePlugin,
  validatePluginConfig,
  transformPluginConfig,
  mergePluginConfig,
  createPluginTester,
  testPluginInstall,
} from './plugin-sdk';
export type {
  PluginConfig,
  PluginDefinition,
  PluginTesterOptions,
  PluginTester,
} from './plugin-sdk';

// 全局配置系统
export {
  ConfigManager,
  getGlobalConfig,
  setGlobalConfig,
  getConfig,
  setConfig,
  watchConfig,
  configPresets,
  applyConfigPreset,
} from './config';
export type {
  ConfigChangeCallback,
  ConfigOptions,
  ConfigValue,
  ConfigObject,
  ConfigArray,
} from './config';

// Re-export from sub-packages
export { ref, reactive, computed, watch, watchEffect, effect } from '@lytjs/reactivity';
export { createVNode, Fragment, Text, Comment, cloneVNode, mergeProps } from '@lytjs/vdom';
export { compile } from '@lytjs/compiler';

export type {
  App,
  AppConfig,
  AppOptions,
  Plugin,
  PluginInstallFunction,
  PluginWithCleanup,
  PluginFunctionWithCleanup,
  EnhancedPlugin,
  PluginMeta,
  PluginDependency,
  RegisteredPlugin,
  RegistrationResult,
  DependencyResult,
  PluginLifecycleEvent,
  PluginEventListener,
  Component,
  ComponentOptions,
  VNode,
  VNodeChildren,
  Renderer,
  Directive,
  DirectiveBinding,
  DirectiveArguments,
  AsyncComponentLoader,
  AsyncComponentOptions,
  ErrorCapturedHook,
  DebuggerHook,
  DebuggerEvent,
  ComponentPublicInstance,
} from './types';

// Common 子包集成点
export {
  registerIntegrations,
  getHttpClient,
  getQueryUtils,
  getSecurityUtils,
  getCacheUtils,
  safeEscapeHtml,
  safeParseQueryString,
} from './common-integration';
export type {
  HttpClientLike,
  QueryUtilsLike,
  SecurityUtilsLike,
  CacheUtilsLike,
  CoreIntegrations,
} from './common-integration';

// 错误边界系统（v6.3 新增）
export {
  ErrorBoundary,
  useErrorHandler,
  useErrorBoundaryReset,
  setGlobalErrorReporter,
  getGlobalErrorReporter,
  errorLogManager,
} from './error-boundary';
export type {
  ErrorBoundaryProps,
  FallbackProps,
  ErrorInfo,
  ErrorReporter,
  ErrorContext,
  ErrorLog,
} from './error-boundary';
