// src/index.ts
// @lytjs/core-vnode - VNode 渲染模式专用入口
// 只导入 VNode 相关的渲染器，完全排除 Signal 相关代码

// ==================== createApp（VNode 专用） ====================

export { createApp } from './create-app';

// ==================== VNode 辅助函数 ====================

export { h, h as createElement } from './h';

// ==================== 组件定义 ====================

export { defineComponent, defineAsyncComponent } from './define-component';

// ==================== 调度 ====================

export { nextTick } from './next-tick';

// ==================== 组件/指令解析 ====================

export { resolveComponent, resolveDirective } from './resolve';

// ==================== 指令辅助 ====================

export { withDirectives, withMemo } from './directives';

// ==================== Composition API ====================

export { useSlots, useAttrs, useModel } from './composition';

// ==================== Web Component ====================

export {
  defineCustomElement,
  useShadowRoot,
  useHost,
  useWebComponentSlots,
  injectChildStyles,
} from './web-component';
export type { DefineCustomElementOptions } from './web-component';

// ==================== 生命周期 ====================

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
} from './lifecycle';

// ==================== Re-export from sub-packages ====================

// 响应式 API（不含 Signal 相关 API）
export { ref, reactive, computed, watch, watchEffect, effect } from '@lytjs/reactivity';

// VNode API
export { createVNode, Fragment, Text, Comment, cloneVNode, mergeProps } from '@lytjs/vdom';

// 编译器
export { compile } from '@lytjs/compiler';

// ==================== 类型导出 ====================

export type {
  App,
  AppConfig,
  AppOptions,
  Plugin,
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
