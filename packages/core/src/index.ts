// src/index.ts
// @lytjs/core - 核心入口

export { createApp } from './create-app';

// ── 内置组件 ────────────────────────────────────────────────────────────
// ⚠️ 2026-10-02 新增：此前 core **完全没有**转出内置组件。后果实测：
//   · 官方文档示例 `import { Suspense, useSuspense } from '@lytjs/core'`
//     里的 `Suspense` 拿到的是 **undefined**；
//   · 模板里写 `<Suspense>` / `<Teleport>` / `<Transition>` 会**静默渲染为空**
//     （组件对象落进 `STATEFUL_COMPONENT`，而 `mountComponent` 找不到 `render`）。
// 组件本体在 `@lytjs/component`，这里只做**转出**（不复制实现），
// 避免出现第二个真相源。
export { Suspense, Teleport, Transition, TransitionGroup, KeepAlive } from '@lytjs/component';

// ── Suspense 相关 API ──────────────────────────────────────────────────
// ⚠️ 2026-10-03 新增：文档示例写的是 `import { Suspense, useSuspense } from '@lytjs/core'`，
// 而 `useSuspense` **也不在** core 的转出面里（与内置组件同一类漏转，本轮第三次遇到）。
// 实测症状：调用方拿到 `undefined` ⇒ `await useSuspense(p)` 抛「not a function」
// ⇒ async setup 被判失败 ⇒ 视图永远停在首帧 `undefined`，且**不报错**。
export {
  useSuspense,
  startTransition,
  createSuspenseResource,
  SuspenseResource,
  isSuspensePending,
  getSuspenseError,
  resolveSuspense,
  abortSuspense,
  linkSuspenseBoundary,
} from '@lytjs/component';
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
export { compile } from '@lytjs/compiler';

// ---------------------------------------------------------------------------
// 模板运行时辅助函数 —— **编译器产物的 import 契约**
//
// VNode 模式的编译产物默认从 '@lytjs/core' 导入 helper
// （见 compiler 的 `genHelperImports`，默认 runtimeModuleName = '@lytjs/core'）。
// 因此 core 的导出面必须覆盖 `helperNameMap` 中出现的**每一个**名字，
// 否则产物会因「ESM 具名导入失败」而整模块崩掉 —— 此前 openBlock / createBlock /
// toDisplayString / renderList / sanitizeHTML / createElementVNode 等就处于这种状态
// （2026-09-26 全维度审计发现，现由 `scripts/check-runtime-contract.ts` 持续守卫）。
//
// ⚠️ 全部经 `./runtime-helpers` 转出，与 `template-compiler.ts` 的注入对象**同源**；
// 不要在这里另写一份清单，否则会出现「守卫绿、执行时 undefined」的落差。
// ---------------------------------------------------------------------------
export {
  // VNode 原语
  createVNode,
  createTextVNode,
  createCommentVNode,
  createStaticVNode,
  createElementVNode,
  Fragment,
  Text,
  Comment,
  cloneVNode,
  mergeProps,
  // Block Tree
  createBlock,
  openBlock,
  closeBlock,
  setBlockTracking,
  trackDynamicChild,
  getCurrentBlock,
  getBlockStackDepth,
  resetBlockStack,
  // 插值 / 列表 / 插槽 / props 归一化
  toDisplayString,
  renderList,
  createSlots,
  withCtx,
  normalizeProps,
  guardReactiveProps,
  toHandlerKey,
  // DOM 侧：class / style 归一化 + HTML 消毒
  normalizeClass,
  normalizeStyle,
  sanitizeHTML,
  // 插槽渲染：<slot> 编译为 renderSlot(_ctx.$slots, name, props, fallback)
  renderSlot,
} from './runtime-helpers';
export type { Block } from './runtime-helpers';

// 运行时模板编译（`options.template` 的支持，见 template-compiler.ts）
export { compileTemplateToRender, clearTemplateRenderCache } from './template-compiler';

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
