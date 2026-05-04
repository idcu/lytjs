// src/index.ts
// @lytjs/core-signal - Signal 渲染模式专用入口
// 只导入 Signal 相关的渲染器，完全排除 VDOM 相关代码

// ==================== createApp（Signal 专用） ====================

export { createApp } from './create-app';

// ==================== 组件定义 ====================

export { defineComponent } from './define-component';

// ==================== 调度 ====================

export { nextTick } from './next-tick';

// ==================== 生命周期 ====================

export {
  onMounted,
  onUnmounted,
  onBeforeMount,
  onBeforeUnmount,
  onErrorCaptured,
} from './lifecycle';

// ==================== Re-export from sub-packages ====================

// 响应式 API（包含 Signal 相关 API）
export {
  ref,
  reactive,
  computed,
  watch,
  watchEffect,
  effect,
  // Signal API
  signal,
  computedSignal,
  readonlySignal,
  set,
  update,
  valueOf,
  signalBatch,
  signalUntrack,
} from '@lytjs/reactivity';

// Signal 类型
export type {
  Signal,
  ComputedSignal,
  WritableSignal,
  ReadonlySignal,
} from '@lytjs/reactivity';

// 编译器
export { compile } from '@lytjs/compiler';

// DOM 运行时（Signal 模式核心）
export {
  insert,
  remove,
  createTemplate,
  createElement,
  createTextNode,
  setText,
  setHTML,
  setAttribute,
  removeAttribute,
  setProperty,
  setStyle,
  setClass,
  toggleClass,
  addEventListener,
  createEventHandler,
  reconcileArray,
  bindEffect,
  batchDOM,
  onCleanup,
  runCleanups,
  createCleanupScope,
} from '@lytjs/dom-runtime';
export type { ReconcileOptions, CleanupFn } from '@lytjs/dom-runtime';

// ==================== 类型导出 ====================

export type {
  App,
  AppConfig,
  AppOptions,
  Plugin,
  Component,
  ComponentOptions,
  Directive,
  DirectiveBinding,
  DirectiveArguments,
  ErrorCapturedHook,
  DebuggerHook,
  DebuggerEvent,
  ComponentPublicInstance,
} from './types';
